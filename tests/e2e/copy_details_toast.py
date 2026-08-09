"""Plan 83 backlog #24 (e2e 3/3): "Copy details" toast action.

Verifies backlog item 25 wired at `src/lib/errors/notify.ts`:
every error toast surfaces a "Copy details" action chip. When
clicked, the clipboard receives an `id: <cid>\ncode: ...\nlabel: ...`
payload and a "Copied error details" success toast is shown.

Uses the same forced-failure reseed path as `seed_reset_flow.py` to
deterministically raise an error toast. Grants clipboard permission
so `navigator.clipboard.writeText` resolves under headless Chromium.
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

READ_CLIPBOARD_JS = "async () => navigator.clipboard.readText()"


async def main() -> None:
    async with async_playwright() as playwright:
        browser = await getattr(playwright, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
        )
        await context.grant_permissions(
            ["clipboard-read", "clipboard-write"],
            origin="http://localhost:8080",
        )
        page = await context.new_page()

        console_msgs, auto_seed_done = attach_console_and_seed_gate(page)

        await page.goto("http://localhost:8080", wait_until="domcontentloaded")
        # Deterministic gate on the boot-time auto-seed summary; see
        # tests/e2e/seed_reset_flow.py for the rationale.
        await wait_for_auto_seed(auto_seed_done, console_msgs)

        # Force the failing reseed path so notify.ts emits an error toast.
        await page.evaluate(BREAK_STORAGE_JS)
        await page.evaluate(DISPATCH_RESET)

        # Locate the error toast; scope the "Copy details" action to it.
        toast = page.get_by_text("Reseed partially", exact=False).first
        await expect(toast).to_be_visible(timeout=8000)
        await page.screenshot(path=str(REPORTS / "copy-details-toast.png"))

        # Sonner renders the action as a button labelled "Copy details".
        copy_btn = page.get_by_role("button", name="Copy details").first
        await expect(copy_btn).to_be_visible(timeout=3000)
        await copy_btn.click()

        # Success toast confirms the write. Two nodes match: the sonner
        # toast body and the `a11y-live-polite` sr-only announcer.
        # Assert on the toast body specifically.
        await expect(
            page.locator("[data-title]").filter(
                has_text="Copied error details",
            ),
        ).to_be_visible(timeout=4000)

        # Verify the clipboard payload shape.
        clip = await page.evaluate(READ_CLIPBOARD_JS)
        assert isinstance(clip, str) and clip.startswith("id: "), (
            f"unexpected clipboard payload: {clip!r}"
        )
        assert "code: " in clip, f"missing code line: {clip!r}"
        assert "label: " in clip, f"missing label line: {clip!r}"
        # 8-char correlation id per spec/21-app/40-error-manage.md.
        first_line = clip.splitlines()[0]
        cid = first_line.replace("id: ", "").strip()
        assert len(cid) == 8, f"correlation id length != 8: {cid!r}"
        print(f"clipboard payload ok, cid={cid}")

        copied_log = [
            m for m in console_msgs if "[notify] copied details cid=" in m
        ]
        assert copied_log, "expected [notify] copied details log line"

        await browser.close()


asyncio.run(main())