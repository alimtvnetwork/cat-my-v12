import { test, expect } from "@playwright/test";

// Task 132: Write E2E test for Rule Creation

test("Verify drawing and saving a rule", async ({ page }) => {
  await page.goto("/setup/rules/new");
  // standard locators
  await page.locator(".canvas-area").click({ position: { x: 100, y: 100 } });
  await page.locator(".canvas-area").click({ position: { x: 200, y: 200 } });

  await page.getByRole("button", { name: /save/i }).click();
  await expect(page.getByText("Rule saved")).toBeVisible();
});
