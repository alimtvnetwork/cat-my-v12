import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "HD 1920x1080", width: 1920, height: 1080 },
  { name: "Laptop 1366x768", width: 1366, height: 768 },
  { name: "Small 1024x600", width: 1024, height: 600 },
];

for (const viewport of VIEWPORTS) {
  test.describe(`Responsive Layout — ${viewport.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/");
    });

    test("navigation is visible and not overflowing", async ({ page }) => {
      const nav = page.locator("nav").first();
      const box = await nav.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(viewport.width);
      }
    });

    test("no horizontal scrollbar appears", async ({ page }) => {
      await page.goto("/setup/rules");
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 5); // 5px tolerance
    });
  });
}
