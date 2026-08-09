"""Plan 86 Step 41: smoke test for the seed-profile setup utility.

Boots the app, waits for the boot-time auto-seed summary, then
dispatches `cmd:apply-seed-profile` for two frozen SS-07 profiles
via `_helpers.apply_seed_profile`. Asserts that the structured
`[seed-v2] cmd:apply-seed-profile done` log line fires with the
expected profileId each time. This is the observability proof for
Step 41: if the helper's gate ever stops matching the log format
emitted by `src/lib/seed/apply-profile-command.ts`, this spec fails
loudly with the last 10 console messages instead of hanging.

Run: `python3 tests/e2e/apply_seed_profile_flow.py`.
"""

import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

from _helpers import (
    apply_seed_profile,
    attach_console_and_seed_gate,
    wait_for_auto_seed,
    APPLY_PROFILE_DONE_PREFIX,
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
        await wait_for_auto_seed(auto_seed_done, console_msgs)

        for pid in ("prof-default-pcb", "prof-soic-inspection"):
            result = await apply_seed_profile(page, console_msgs, pid)
            assert result["line"] is not None, (
                f"apply_seed_profile({pid}) returned no done line"
            )
            assert APPLY_PROFILE_DONE_PREFIX in result["line"], (
                f"unexpected done line: {result['line']!r}"
            )
            assert pid in result["line"], (
                f"done line missing profile id {pid!r}: {result['line']!r}"
            )
            print(f"ok: {pid} -> {result['line']}")

        await page.screenshot(path=str(REPORTS / "apply-seed-profile-flow.png"))
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
