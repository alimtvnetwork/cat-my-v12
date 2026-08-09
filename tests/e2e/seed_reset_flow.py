"""Plan 100 Phase G: end-to-end coverage for the seed.reset flow.

Verifies both success and failure branches of the `cmd:reset-and-reseed`
command wired at `src/routes/__root.tsx`:

1. Success path: dispatching the command yields a sonner "Reseed complete"
   toast and does NOT populate `useErrorStore.currentError`.
2. Failure path: patching `Storage.prototype.removeItem` to throw on the
   seed flag keys forces `resetSeedFlags` into the partial-failure branch,
   which routes through `showToastError` (sonner toast + capture into
   `useErrorStore`). We assert the toast label, verify the 8-char
   correlation id badge is rendered, then click "View Details" to
   confirm the Global Error Modal opens from the same captured record.

Uses only DOM signals and the exposed console; no direct store imports.
Screenshots saved under tests/reports/.
"""

import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright, expect

from _helpers import (
    BREAK_STORAGE_JS,
    DISPATCH_RESET as DISPATCH,
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
        # Wait for AutoSeedFromFacade to finish the auto pass so we don't
        # race the manual command against the boot-time seeder. Uses the
        # deterministic `[seed/orchestrator] summary {mode: auto, ...}`
        # console line instead of a fixed sleep; a 15s ceiling covers
        # cold Vite compiles without hanging CI.
        await wait_for_auto_seed(auto_seed_done, console_msgs)

        # -----------------------------------------------------------------
        # 1. Success path.
        # -----------------------------------------------------------------
        await page.evaluate(DISPATCH)
        toast = page.get_by_text("Reseed complete", exact=False)
        await expect(toast).to_be_visible(timeout=8000)
        await page.screenshot(path=str(REPORTS / "seed-reset-success.png"))
        print("success: Reseed complete toast visible")

        # Modal should NOT be open on the success path.
        assert not await page.locator('[role="dialog"]').filter(
            has_text="Something went wrong"
        ).is_visible(), "unexpected error dialog on success path"

        # Let the toast fade so the failure toast is unambiguous.
        await page.wait_for_timeout(4500)

        # -----------------------------------------------------------------
        # 2. Failure path: force resetSeedFlags to hit `failed.length > 0`.
        # -----------------------------------------------------------------
        await page.evaluate(BREAK_STORAGE_JS)
        await page.evaluate(DISPATCH)

        # `showToastError` calls into errorStore.captureException and
        # renders a sonner toast tagged with the correlation id.
        failure_toast = page.get_by_text("Reseed partially reset", exact=False)
        await expect(failure_toast).to_be_visible(timeout=8000)
        await page.screenshot(path=str(REPORTS / "seed-reset-failure.png"))

        # The description carries the id-badge `[id: XXXXXXXX]` (8 chars,
        # types/errors.ts). Grep the sonner region for it.
        error_toast = page.locator('[data-sonner-toast][data-type="error"]').first
        await expect(error_toast).to_be_visible(timeout=8000)
        sonner_text = await error_toast.inner_text()
        import re
        m = re.search(r"\[id:\s*([A-Za-z0-9]{8})\]", sonner_text)
        assert m, f"correlation id badge missing from toast; body was: {sonner_text[:400]}"
        correlation_id = m.group(1)
        print(f"failure: toast visible with correlation id {correlation_id}")

        # Structured telemetry warning must have fired.
        assert any("[seed/telemetry] fatal" in msg for msg in console_msgs), (
            "expected [seed/telemetry] fatal log not observed"
        )

        # Click "View Details" -> Global Error Modal opens with the same
        # captured record.
        await page.get_by_role("button", name="View Details").first.click()
        modal = page.get_by_role("dialog")
        await expect(modal).to_be_visible(timeout=5000)
        modal_text = await modal.inner_text()
        assert correlation_id in modal_text, (
            f"error modal missing correlation id {correlation_id}; body was: {modal_text[:400]}"
        )
        await page.screenshot(path=str(REPORTS / "seed-reset-failure-modal.png"))
        print("failure: Global Error Modal shows the same correlation id")

        await browser.close()
        print(json.dumps({"ok": True}))


asyncio.run(main())
