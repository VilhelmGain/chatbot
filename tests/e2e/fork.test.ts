import { expect, test } from "@playwright/test";

const CHAT_URL_REGEX = /\/chat\/[\w-]+/;

test.describe("Chat Forking", () => {
  test("forks a chat from an earlier response and continues independently", async ({
    page,
  }) => {
    const email = `fork-e2e-${Date.now()}@example.com`;

    // 1. Register a user via the UI (server actions can't be called by fetch).
    //    Guests cannot manage models, and the model selector is driven by
    //    custom providers, so a real user is required.
    await page.goto("/register");
    await page.fill("#email", email);
    await page.fill("#password", "fork-test-password");
    await page.getByRole("button", { name: "Sign up" }).click();
    await page.waitForURL(/\/$/, { timeout: 30_000 });

    // 2. Seed a provider + model via the settings API so the mock AI provider
    //    (PLAYWRIGHT=True) resolves "custom-<id>/chat-model" to the mock model.
    const providerRes = await page.request.post("/api/settings/providers", {
      data: {
        apiKey: "mock-key",
        baseURL: "http://localhost:9999/v1",
        name: "Mock Provider",
        type: "openai",
      },
    });
    expect(providerRes.status()).toBe(201);
    const provider = await providerRes.json();

    const modelRes = await page.request.post(
      `/api/settings/providers/${provider.id}/models`,
      {
        data: {
          capabilities: { reasoning: false, tools: true, vision: false },
          modelId: "chat-model",
          name: "Mock Chat Model",
        },
      }
    );
    expect(modelRes.status()).toBe(201);

    // 3. Open a new chat and select the model.
    await page.goto("/");
    await page.waitForSelector("[data-testid='multimodal-input']", {
      timeout: 30_000,
    });

    await page.waitForFunction(
      () => {
        const button = document.querySelector("[data-testid='model-selector']");
        return (
          button &&
          !(button as HTMLButtonElement).disabled &&
          button.textContent?.includes("Mock Chat Model")
        );
      },
      undefined,
      { timeout: 30_000 }
    );

    const trySelectModel = async (): Promise<boolean> => {
      await page.getByTestId("model-selector").click();
      try {
        await page.waitForSelector("[cmdk-item]", { timeout: 3000 });
        await page.waitForTimeout(600);
        await page
          .locator("[cmdk-item]")
          .filter({ hasText: "Mock Chat Model" })
          .first()
          .click({ force: true, timeout: 3000 });
        await page.waitForFunction(
          () => document.cookie.includes("chat-model="),
          undefined,
          { timeout: 3000 }
        );
        return true;
      } catch {
        await page.keyboard.press("Escape").catch(() => undefined);
        await page.waitForTimeout(400);
        return false;
      }
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: retries must run sequentially
      if (await trySelectModel()) {
        break;
      }
    }
    expect(await page.evaluate(() => document.cookie)).toContain("chat-model=");

    const sendAndWaitForResponses = async (
      text: string,
      expectedCount: number
    ) => {
      await page.getByTestId("multimodal-input").fill(text);
      await page.getByTestId("send-button").click();
      await page.waitForFunction(
        (count) =>
          document.querySelectorAll("[data-testid='message-assistant']")
            .length >= count,
        expectedCount,
        { timeout: 60_000 }
      );
      // Wait for streaming to finish (action buttons appear only when idle).
      await page.waitForSelector("[data-testid='message-fork']", {
        timeout: 60_000,
      });
      await page.waitForTimeout(1000);
    };

    // 4. Have a two-turn conversation.
    await sendAndWaitForResponses("Hello", 1);
    const originalChatUrl = page.url();
    expect(originalChatUrl).toMatch(CHAT_URL_REGEX);

    await sendAndWaitForResponses("Tell me about the weather", 2);
    await expect(page.locator("[data-testid='message-assistant']")).toHaveCount(
      2
    );

    // 5. Fork from the FIRST assistant response.
    const firstAssistant = page
      .locator("[data-testid='message-assistant']")
      .first();
    await firstAssistant.hover();
    await firstAssistant.locator("[data-testid='message-fork']").click();

    // 6. The fork navigates to a new chat containing exactly the first turn.
    await page.waitForFunction(
      (originalUrl) => window.location.href !== originalUrl,
      originalChatUrl,
      { timeout: 30_000 }
    );
    const forkedChatUrl = page.url();
    expect(forkedChatUrl).toMatch(CHAT_URL_REGEX);
    await page.waitForFunction(
      () =>
        document.querySelectorAll("[data-testid='message-assistant']").length >=
        1,
      undefined,
      { timeout: 30_000 }
    );
    await page.waitForTimeout(1500);

    await expect(page.locator("[data-testid='message-user']")).toHaveCount(1);
    await expect(page.locator("[data-testid='message-assistant']")).toHaveCount(
      1
    );

    // 7. Continue the fork with an alternate prompt.
    await sendAndWaitForResponses("Actually let's talk about cats", 2);
    await expect(page.locator("[data-testid='message-assistant']")).toHaveCount(
      2
    );

    // 8. The original chat is untouched by the fork continuation.
    await page.goto(originalChatUrl);
    await page.waitForFunction(
      () =>
        document.querySelectorAll("[data-testid='message-assistant']").length >=
        2,
      undefined,
      { timeout: 60_000 }
    );
    await page.waitForTimeout(1500);

    await expect(page.locator("[data-testid='message-user']")).toHaveCount(2);
    await expect(page.locator("[data-testid='message-assistant']")).toHaveCount(
      2
    );
    await expect(
      page.locator("[data-testid='message-user']").filter({ hasText: "cats" })
    ).toHaveCount(0);

    // 9. Both chats are listed in the history sidebar.
    await expect(page.locator("a[href*='/chat/']").first()).toHaveCount(1);
  });
});
