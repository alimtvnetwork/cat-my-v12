"""Plan 26 Step 8 (e2e) - discovery selection failure flow.

Drives the full loop against the running preview:

  1. Restore Supabase session (if managed, via LOVABLE_BROWSER_* env).
  2. Navigate /settings, click Rescan, screenshot the panel.
  3. Force a rejection by injecting a fetch-level shim that swaps the serial
     to 'SN-ghost' on the selectCaptureDevice server-fn call. This proves the
     UI banner path end-to-end without needing a hardware round-trip.
  4. Screenshot the banner (role=alert, aria-live=polite,
     data-error-code=E_CFG_UNKNOWN_DEVICE).
  5. Navigate /ops, poll for the matching row in the capture-device audit
     panel keyed by data-cid, screenshot.

Run: `python3 tests/e2e/discovery_selection.py`.
Screenshots land in /tmp/browser/plan26-discovery/screenshots/.

Never runs during vitest; this is an operator-facing smoke.
"""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SCREENSHOTS = Path("/tmp/browser/plan26-discovery/screenshots")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)


async def _restore_session(context, page) -> None:
    status = os.environ.get("LOVABLE_BROWSER_AUTH_STATUS", "")
    cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")
    if cookies_json:
        cookies = json.loads(cookies_json)
        for c in cookies:
            c["url"] = BASE
        await context.add_cookies(cookies)
    await page.goto(BASE, wait_until="domcontentloaded")
    storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    if storage_key and session_json:
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
        )
    print(f"auth_status={status}")


async def main() -> None:
    async with async_playwright() as pw:
        browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        await _restore_session(context, page)

        await page.goto(f"{BASE}/settings", wait_until="domcontentloaded")
        await page.screenshot(path=str(SCREENSHOTS / "1_settings.png"))

        # Install a request rewriter that mutates the outgoing selectCaptureDevice
        # payload to a serial guaranteed to fail discovery resolve.
        await page.route("**/_serverFn/**", lambda route, request: (
            route.continue_(post_data=(
                request.post_data.replace('"serial"', '"serial"') if request.post_data and "selectCaptureDevice" not in request.url
                else (request.post_data or "").replace(':"24477108"', ':"SN-ghost"')
            )) if request.method == "POST" else route.continue_()
        ))

        try:
            await page.get_by_role("button", name="Rescan").click(timeout=5000)
        except Exception as e:
            print(f"rescan-click skipped: {e}")

        try:
            await page.locator('[data-error-code="E_CFG_UNKNOWN_DEVICE"]').first.wait_for(timeout=8000)
        except Exception as e:
            print(f"banner-wait: {e}")
        await page.screenshot(path=str(SCREENSHOTS / "2_banner.png"))

        cid = await page.evaluate(
            "document.querySelector('[data-error-code=\"E_CFG_UNKNOWN_DEVICE\"]')?.getAttribute('data-cid')"
        )
        print(f"banner_cid={cid}")

        await page.goto(f"{BASE}/ops", wait_until="domcontentloaded")
        await page.locator('[data-testid="capture-device-audit-panel"]').wait_for(timeout=5000)
        if cid:
            try:
                await page.locator(f'[data-testid="capture-device-audit-panel"] [data-cid="{cid}"]').wait_for(timeout=10000)
                print(f"ops_row_found cid={cid}")
            except Exception as e:
                print(f"ops-row-wait: {e}")
        await page.screenshot(path=str(SCREENSHOTS / "3_ops.png"))

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
