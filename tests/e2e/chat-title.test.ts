import { expect, test } from "@playwright/test";

test.describe("Chat Title Rename & Regenerate", () => {
  test("renames a chat via menu and double-click, regenerates title, and reverts empty titles", async ({
    page,
  }) => {
    const email = `chat-title-e2e-${Date.now()}@example.com`;

    // 1. Register a user via the UI (server actions can't be called by fetch).
    await page.goto("/register");
    await page.fill("#email", email);
    await page.fill("#password", "chat-title-test-password");
    await page.getByRole("button", { name: "Sign up" }).click();
    await page.waitForURL(/\/$/, { timeout: 30_000 });

    // 2. Seed a provider + model so the mock AI provider (PLAYWRIGHT=True)
    //    resolves "custom-<id>/chat-model" to the mock chat model.
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

    // 3. Open a new chat and select the model so the chat-model cookie is set.
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

    // 4. Send a first message so a chat is created and a title is generated.
    await page.getByTestId("multimodal-input").fill("Hello");
    await page.getByTestId("send-button").click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll("[data-testid='message-assistant']").length >=
        1,
      undefined,
      { timeout: 60_000 }
    );
    await page.waitForSelector("[data-testid='message-fork']", {
      timeout: 60_000,
    });
    // Let the history refetch land so the chat row appears in the sidebar.
    await page.waitForTimeout(1500);

    const sidebarLink = page.locator("a[href*='/chat/']").first();
    await expect(sidebarLink).toBeVisible();

    const chatItem = page
      .locator("li[data-slot='sidebar-menu-item']")
      .filter({ has: sidebarLink });
    const titleInput = page.getByTestId("chat-title-input");

    // 5. Rename via the three-dot menu.
    await chatItem.getByRole("button", { name: "More" }).click();
    await page.getByRole("menuitem", { name: "Rename" }).click();
    await expect(titleInput).toBeVisible();
    await titleInput.fill("My custom title");
    await titleInput.press("Enter");
    await expect(sidebarLink).toContainText("My custom title");

    // 6. Rename via double-clicking the sidebar title.
    await sidebarLink.dblclick();
    await expect(titleInput).toBeVisible();
    await titleInput.fill("Double clicked title");
    await titleInput.press("Enter");
    await expect(sidebarLink).toContainText("Double clicked title");

    // 7. Regenerate the title from the first user message. The mock model
    //    returns "Hello! How can I help you today?" for a "hello" prompt.
    await chatItem.getByRole("button", { name: "More" }).click();
    await page.getByRole("menuitem", { name: "Regenerate title" }).click();
    await expect(sidebarLink).toContainText(
      "Hello! How can I help you today?",
      { timeout: 60_000 }
    );

    // 8. An empty/whitespace-only rename reverts to the previous title.
    await chatItem.getByRole("button", { name: "More" }).click();
    await page.getByRole("menuitem", { name: "Rename" }).click();
    await expect(titleInput).toBeVisible();
    await titleInput.fill("   ");
    await titleInput.press("Enter");
    await expect(sidebarLink).toContainText("Hello! How can I help you today?");
  });
});
