"""Regression: AddressBar sanitizes __lovable_* and e2e query params.

Verifies via the running preview at http://localhost:8080:
  1. Navigating to a URL that contains `__lovable_token`, `__lovable_sha`
     and `e2e` params results in the AddressBar input rendering a
     clean query with those keys stripped.
  2. Legitimate query params (e.g. `tab=rules`) are preserved.
  3. The rendered address never contains `??` (double question mark).
  4. Committing (Enter) on a path with those internal params sanitizes
     them out of the resulting URL as well.

DOM-only signals. Screenshot under tests/reports/.
"""

import asyncio
from pathlib import Path
from playwright.async_api import async_playwright, expect

from _helpers import attach_console_and_seed_gate, wait_for_auto_seed

REPORTS = Path("tests/reports")
REPORTS.mkdir(parents=True, exist_ok=True)


async def main() -> None:
    async with async_playwright() as playwright:
        browser = await getattr(playwright, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()

        console_msgs, auto_seed_done = attach_console_and_seed_gate(page)

        # 1. Land on a route with a mix of internal + legitimate params.
        dirty_url = (
            "http://localhost:8080/projects"
            "?__lovable_token=abc123"
            "&tab=rules"
            "&__lovable_sha=deadbeef"
            "&e2e=1"
            "&sort=newest"
        )
        await page.goto(dirty_url, wait_until="domcontentloaded")
        await wait_for_auto_seed(auto_seed_done, console_msgs)

        bar = page.get_by_test_id("titlebar-address-bar")
        await expect(bar).to_be_visible(timeout=5000)
        field = bar.locator("input")

        # AddressBar renders sanitized value only when NOT focused.
        # After navigation focus sits on <body>, so idle-state format applies.
        rendered = await field.input_value()
        print(f"rendered address (idle): {rendered!r}")

        assert "__lovable" not in rendered, (
            f"__lovable_* leaked into AddressBar: {rendered}"
        )
        assert "e2e=" not in rendered, f"e2e leaked into AddressBar: {rendered}"
        assert "tab=rules" in rendered, (
            f"legitimate param 'tab=rules' dropped: {rendered}"
        )
        assert "sort=newest" in rendered, (
            f"legitimate param 'sort=newest' dropped: {rendered}"
        )
        assert "??" not in rendered, f"double ? in rendered address: {rendered}"
        assert rendered.count("?") <= 1, f"too many ? in rendered address: {rendered}"
        print("idle-state sanitation OK")

        await page.screenshot(path=str(REPORTS / "address-bar-sanitized-idle.png"))

        # 2. Commit a NEW dirty path via Enter and confirm the resulting
        # window.location plus the re-rendered idle value are both clean.
        await field.click()
        await field.fill(
            "/errors?__lovable_token=xyz&keep=me&e2e=1&__lovable_sha=beef",
        )
        await page.keyboard.press("Enter")
        await page.wait_for_url("**/errors**", timeout=5000)

        final_url = page.url
        print(f"final url after Enter: {final_url}")
        assert "__lovable" not in final_url, (
            f"__lovable_* survived navigation: {final_url}"
        )
        assert "e2e=" not in final_url, f"e2e survived navigation: {final_url}"
        assert "keep=me" in final_url, (
            f"legitimate param dropped on commit: {final_url}"
        )
        assert "??" not in final_url, f"double ? in final url: {final_url}"

        # Re-read the AddressBar after navigation (input blurred).
        await page.evaluate("document.activeElement && document.activeElement.blur()")
        await page.wait_for_timeout(150)
        rendered_after = await field.input_value()
        print(f"rendered address after nav: {rendered_after!r}")
        assert "__lovable" not in rendered_after
        assert "e2e=" not in rendered_after
        assert "??" not in rendered_after
        assert "keep=me" in rendered_after

        await page.screenshot(path=str(REPORTS / "address-bar-sanitized-after-nav.png"))
        print("commit-path sanitation OK")

        await browser.close()


asyncio.run(main())
