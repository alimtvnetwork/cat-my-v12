import { test, expect } from "@playwright/test";

test.describe("Lighting Controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/setup/rules");
  });

  test("light correction slider triggers facade mutation", async ({ page }) => {
    await page.waitForSelector("[data-testid='lighting-panel']");
    const slider = page.locator("[data-testid='light-correction-slider']");
    await expect(slider).toBeVisible();

    // Drag slider to 75%
    const box = await slider.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2);
      await page.mouse.up();
    }

    // Expect the PUT /lighting request to have been made
    const request = await page.waitForRequest((req) =>
      req.url().includes("/api/lighting") && req.method() === "PUT"
    );
    expect(request).toBeTruthy();
  });

  test("flashlight toggles fire facade calls", async ({ page }) => {
    const fl1 = page.locator("[data-testid='flashlight-1-toggle']");
    await fl1.click();
    const req = await page.waitForRequest((r) =>
      r.url().includes("/api/lighting")
    );
    expect(req).toBeTruthy();
  });
});
