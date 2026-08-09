"""Plan 83 backlog #24 (e2e 2/3): Ctrl+Shift+E error history hotkey.

Verifies both branches of the `errors.history.ctrl` shortcut wired at
`src/components/app-shell/LayoutHotkeys.tsx`:

  A. Empty history: pressing the shortcut emits an info toast
     ("No errors in history yet") and logs an
     `[hotkey] error-history opened with empty history` info line.
  B. Populated history: after forcing a failing reseed (same technique
     as `seed_reset_flow.py`), the same shortcut opens the Global
     Error Modal in history mode.

DOM-only signals; no store imports.
"""

import asyncio
from pathlib import Path
from playwright.async_api import async_playwright, expect

from _helpers import (
    BREAK_STORAGE_JS,
    DISPATCH_RESET,
    attach_console_and_seed_gate,
    wait_for_auto_seed,
)

REPORTS = Path("tests/reports")
REPORTS.mkdir(parents=True, exist_ok=True)


async def main() -> None:
    async with async_playwright() as playwright:
        browser = await getattr(playwright, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()

        console_msgs, auto_seed_done = attach_console_and_seed_gate(page)

        await page.goto("http://localhost:8080", wait_until="domcontentloaded")
        # Deterministic gate on the boot-time auto-seed summary; see
        # tests/e2e/seed_reset_flow.py for the rationale.
        await wait_for_auto_seed(auto_seed_done, console_msgs)

        # ---- A. Empty history branch ----------------------------------
        await page.keyboard.press("Control+Shift+E")
        toast = page.get_by_text("No errors in history yet", exact=False)
        await expect(toast).to_be_visible(timeout=4000)
        await page.screenshot(path=str(REPORTS / "error-history-empty.png"))
        empty_log = [
            m for m in console_msgs
            if "error-history opened with empty history" in m
        ]
        assert empty_log, "expected empty-history info log"
        print("empty branch: info toast + log confirmed")

        # Let the toast fade.
        await page.wait_for_timeout(3500)

        # ---- B. Populated history branch ------------------------------
        await page.evaluate(BREAK_STORAGE_JS)
        await page.evaluate(DISPATCH_RESET)
        # Error toast surfaces after the aggregate rolls up.
        await expect(
            page.get_by_text("Reseed partially", exact=False),
        ).to_be_visible(timeout=8000)
        await page.wait_for_timeout(500)

        console_msgs.clear()
        await page.keyboard.press("Control+Shift+E")

        dialog = page.locator('[role="dialog"]')
        await expect(dialog).to_be_visible(timeout=4000)
        await page.screenshot(path=str(REPORTS / "error-history-open.png"))
        opened_log = [
            m for m in console_msgs if "error-history opened count=" in m
        ]
        assert opened_log, "expected populated-history log"
        print("populated branch: modal opened")

        await browser.close()


asyncio.run(main())