import { test, expect } from "@playwright/test";

test.describe("Optimistic UI Updates for Rules", () => {
  test("creates rule optimistically without waiting for network", async ({
    page,
  }) => {
    await page.goto("/setup/rules");
    await page.waitForSelector("[data-testid='rule-list']");

    // Intercept and delay the create rule API call
    await page.route("**/rules/**", async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.continue();
    });

    const beforeCount = await page
      .locator("[data-testid='rule-item']")
      .count();

    // Trigger rule creation
    await page.click("[data-testid='add-rule-btn']");
    await page.fill("[data-testid='rule-name-input']", "Optimistic Rule");
    await page.click("[data-testid='save-rule-btn']");

    // UI should show new item immediately (optimistic)
    const afterCount = await page
      .locator("[data-testid='rule-item']")
      .count();
    expect(afterCount).toBeGreaterThan(beforeCount);
  });
});
