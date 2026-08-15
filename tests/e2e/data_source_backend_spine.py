"""Playwright E2E smoke for data-source toggle. (T-003)

- Start from seed mode
- Mock or real BE on :8787
- Toggle to backend after health probe
- Verify settings persist localStorage key
"""
import asyncio
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright, expect

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")

async def main() -> int:
    async with async_playwright() as playwright:
        try:
            browser = await getattr(playwright, os.environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        except Exception:
            browser = await getattr(playwright, 'chromium').launch(
                headless=True,
                executable_path=(
                    "/nix/store/nw961dvpvik5m19kbay4cg27wxgl3sdv-"
                    "playwright-chromium-headless-shell/chrome-linux/"
                    "headless_shell"
                ),
            )

        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # Ensure seed mode initially
        await page.add_init_script("window.localStorage.setItem('ca.data-source', 'seed');")

        # Mock health probe to instantly succeed
        await page.route("**/api/health*", lambda route: route.fulfill(status=200, json={"status": "ok"}))

        await page.goto(f"{BASE_URL}/settings", wait_until="networkidle")

        # Find the toggle for 'backend'
        toggle = page.get_by_role("radio", name="Use live backend")
        
        # In ToggleGroup, it's rendered as button with role="radio"? Wait, ToggleGroupItem uses Radix ToggleGroup.
        # Radix ToggleGroup uses role="radio" and state attribute.
        toggle = page.locator("button[aria-label='Use live backend']")
        await expect(toggle).to_be_visible()
        await toggle.click()

        # Wait for the confirmation dialog and click Switch
        switch_btn = page.locator("button:has-text('Switch')")
        await expect(switch_btn).to_be_visible()
        await switch_btn.click()

        # Wait for the probe and state update to settle
        await page.wait_for_timeout(1000)

        ds = await page.evaluate("window.localStorage.getItem('ca.data-source')")
        
        if ds != "backend":
            print(f"Assertion failed: expected 'backend', got {ds}")
            await browser.close()
            return 1
            
        print("T-003 passed: successfully persisted backend toggle")
        await browser.close()
        return 0

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
