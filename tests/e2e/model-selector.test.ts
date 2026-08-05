import { expect, test } from "@playwright/test";

test.describe("Model Selector", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/models", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: {
          capabilities: {
            "custom-test/deepseek-v3.2": {
              reasoning: true,
              tools: true,
              vision: false,
            },
            "custom-test/kimi-k2.5": {
              reasoning: true,
              reasoningEfforts: ["low", "medium", "high", "max"],
              tools: true,
              vision: true,
            },
          },
          models: [
            {
              description: "Test provider",
              id: "custom-test/deepseek-v3.2",
              name: "DeepSeek V3.2",
              provider: "custom-test",
              providerKey: "deepseek",
            },
            {
              description: "Test provider",
              id: "custom-test/kimi-k2.5",
              name: "Kimi K2.5",
              provider: "custom-test",
              providerKey: "moonshotai",
            },
          ],
          providerNames: { "custom-test": "Available" },
        },
      });
    });
    await page.goto("/");
  });

  test("displays a model button", async ({ page }) => {
    const modelButton = page.getByTestId("model-selector");
    await expect(modelButton).toBeVisible();
  });

  test("opens model selector popover on click", async ({ page }) => {
    const modelButton = page.getByTestId("model-selector");
    await modelButton.click();

    await expect(page.getByPlaceholder("Search models...")).toBeVisible();
  });

  test("can search for models", async ({ page }) => {
    const modelButton = page.getByTestId("model-selector");
    await modelButton.click();

    const searchInput = page.getByPlaceholder("Search models...");
    await searchInput.fill("DeepSeek");

    await expect(
      page.getByRole("option", { name: /DeepSeek V3\.2/ })
    ).toBeVisible();
  });

  test("can close model selector by clicking outside", async ({ page }) => {
    const modelButton = page.getByTestId("model-selector");
    await modelButton.click();

    await expect(page.getByPlaceholder("Search models...")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByPlaceholder("Search models...")).not.toBeVisible();
  });

  test("shows available models", async ({ page }) => {
    const modelButton = page.getByTestId("model-selector");
    await modelButton.click();

    const availableModels = page.getByRole("group", { name: "Available" });
    await expect(availableModels).toBeVisible();
    await expect(
      availableModels.getByRole("option", { name: /DeepSeek V3\.2/ })
    ).toBeVisible();
    await expect(
      availableModels.getByRole("option", { name: /Kimi K2\.5/ })
    ).toBeVisible();
  });

  test("selects a default-only model immediately", async ({ page }) => {
    const modelButton = page.getByTestId("model-selector");
    await modelButton.click();

    await page.getByRole("option", { name: /DeepSeek V3\.2/ }).click();

    await expect(page.getByPlaceholder("Search models...")).not.toBeVisible();
    await expect(modelButton).toContainText("DeepSeek V3.2");
  });

  test("keeps the picker open to configure a model with reasoning levels", async ({
    page,
  }) => {
    const modelButton = page.getByTestId("model-selector");
    await modelButton.click();

    const kimiOption = page.getByRole("option", { name: /Kimi K2\.5/ });
    await kimiOption.click();

    await expect(page.getByPlaceholder("Search models...")).toBeVisible();
    await expect(page.getByTestId("reasoning-effort-picker")).toBeVisible();
    await expect(modelButton).toContainText("DeepSeek V3.2");
    await expect(kimiOption).toContainText("Confirm");
  });

  test("confirms the default reasoning level by clicking the model again", async ({
    page,
  }) => {
    const modelButton = page.getByTestId("model-selector");
    await modelButton.click();

    const kimiOption = page.getByRole("option", { name: /Kimi K2\.5/ });
    await kimiOption.click();
    await kimiOption.click();

    await expect(page.getByPlaceholder("Search models...")).not.toBeVisible();
    await expect(modelButton).toContainText("Kimi K2.5");
    await expect(modelButton).not.toContainText("high");
  });

  test("changes reasoning effort and confirms it with the model", async ({
    page,
  }) => {
    const modelButton = page.getByTestId("model-selector");
    await modelButton.click();

    const kimiOption = page.getByRole("option", { name: /Kimi K2\.5/ });
    await kimiOption.click();

    const highEffort = page.getByRole("button", {
      name: "Set reasoning effort to high",
    });
    await highEffort.click();
    await expect(highEffort).toHaveAttribute("aria-pressed", "true");

    await kimiOption.click();

    await expect(page.getByPlaceholder("Search models...")).not.toBeVisible();
    await expect(modelButton).toContainText("Kimi K2.5");
    await expect(modelButton).toContainText("high");
  });

  test("supports keyboard interaction on the reasoning slider", async ({
    page,
  }) => {
    await page.getByTestId("model-selector").click();
    await page.getByRole("option", { name: /Kimi K2\.5/ }).click();

    const slider = page.getByRole("slider", { name: "Reasoning effort" });
    await slider.focus();
    await slider.press("End");

    await expect(slider).toHaveAttribute("aria-valuenow", "4");
    await expect(
      page.getByRole("button", { name: "Set reasoning effort to max" })
    ).toHaveAttribute("aria-pressed", "true");
  });
});
