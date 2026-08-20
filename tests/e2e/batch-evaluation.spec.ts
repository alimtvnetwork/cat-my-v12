import { test, expect } from "@playwright/test";

test.describe("Batch Rule Evaluation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/setup/rules");
  });

  test("Test All Rules button triggers batch evaluation", async ({ page }) => {
    // Mock the batch score endpoint
    await page.route("**/score/batch", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          Ok: true,
          Data: {
            results: [
              { ruleId: "rule-1", is_pass: true, confidence: 92.5, label: "pattern_match_stub" },
              {
                ruleId: "rule-2",
                is_pass: false,
                confidence: 45.0,
                label: "grayscale_tolerance_stub",
              },
            ],
            total: 2,
          },
          RequestedAt: new Date().toISOString(),
        }),
      });
    });

    const testAllBtn = page.locator("[data-testid='test-all-rules-btn']");
    if (await testAllBtn.isVisible()) {
      await testAllBtn.click();

      // Expect at least one rule result to appear
      await page.waitForSelector("[data-testid='rule-result-item']", { timeout: 5000 });
      const results = page.locator("[data-testid='rule-result-item']");
      await expect(results).toHaveCount(2);
    }
  });

  test("progress bar shows during batch evaluation", async ({ page }) => {
    await page.route("**/score/batch", async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ Ok: true, Data: { results: [], total: 0 }, RequestedAt: "" }),
      });
    });

    const testAllBtn = page.locator("[data-testid='test-all-rules-btn']");
    if (await testAllBtn.isVisible()) {
      await testAllBtn.click();
      // Progress bar should appear during evaluation
      const progressBar = page.locator("[role='progressbar']");
      await expect(progressBar).toBeVisible({ timeout: 2000 });
    }
  });
});
