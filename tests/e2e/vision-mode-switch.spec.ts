import { test, expect } from "@playwright/test";

test.describe("Vision Standard UI - Image Source Mode Switch", () => {
  test("toggles between static and live modes", async ({ page }) => {
    // Navigate to a project editor page
    await page.goto("/projects/proj-default-pcb-refdes");

    // Wait for the toggle to be visible
    const staticToggle = page.getByRole("radio", { name: /Static Image Mode/i });
    const liveToggle = page.getByRole("radio", { name: /Live Camera Mode/i });

    await expect(staticToggle).toBeVisible();
    await expect(liveToggle).toBeVisible();

    // Verify default is static mode (or at least can be selected)
    await staticToggle.click();
    await expect(staticToggle).toHaveAttribute("aria-checked", "true");

    // Verify static image viewer is present
    await expect(page.getByAltText("Static Reference")).toBeVisible();

    // Switch to live mode
    await liveToggle.click();
    await expect(liveToggle).toHaveAttribute("aria-checked", "true");

    // Verify live camera viewer is present (or empty state)
    // Check for "Camera Disconnected" text or video feed
    const liveViewerContent = page.locator("text=Camera Disconnected");
    await expect(liveViewerContent).toBeVisible();
  });
});
