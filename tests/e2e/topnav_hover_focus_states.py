"""Top navigation hover + focus state visual regression.

Captures each top-nav menubar trigger in four states across three
breakpoints where the desktop menubar is visible (lg = 1024+):

  states:      idle | hover | focus | open
  breakpoints: lg-1024 | xl-1440 | xxl-1920

At mobile widths the desktop menubar is hidden and a Sheet-based drawer
takes over; the drawer trigger is captured separately in its own
idle / hover / focus / open states at 375px.

Output goes to tests/reports/topnav-states/. `tests/e2e/diff_heatmaps.py`
already scans that root via its SOURCES list once seeded; see the small
patch in this change for the added source directory. First run seeds
baselines; later runs fail on >2% pixel drift, which is well above
antialiasing jitter but catches real color / underline regressions.

Determinism measures:
- prefers-reduced-motion: reduce disables the underline fade so we
  capture the *steady-state* color, not a mid-transition frame.
- We wait 250ms after each state change (150ms transition + slack).
- Element screenshots (not viewport) so a hero copy edit does not
  invalidate every nav shot.

Run:
    python3 tests/e2e/topnav_hover_focus_states.py
    python3 tests/e2e/diff_heatmaps.py
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

OUT = Path("tests/reports/topnav-states")
OUT.mkdir(parents=True, exist_ok=True)

BASE_URL = os.environ.get("TOPNAV_BASE_URL", "http://localhost:8080/")

# Only breakpoints where the desktop menubar is visible (lg = 1024+).
DESKTOP_VIEWPORTS = {
    "lg-1024": (1024, 900),
    "xl-1440": (1440, 900),
    "xxl-1920": (1920, 1080),
}

# Groups worth capturing. Keep the list short so the baseline stays
# reviewable; Home + Setup + Settings cover every trigger style
# (default, mid-menu, right-anchored dropdown).
GROUPS = ["home", "project", "setup", "settings"]

SETTLE_MS = 250  # 150ms transition + 100ms slack


async def capture_desktop(page, vp_name: str, w: int, h: int) -> int:
    await page.set_viewport_size({"width": w, "height": h})
    await page.goto(BASE_URL, wait_until="networkidle")
    await page.wait_for_timeout(400)

    # Ensure the menubar is mounted before we probe triggers.
    menubar = page.locator('nav[aria-label="Primary"] [role="menubar"]').first
    await menubar.wait_for(state="visible", timeout=5000)

    count = 0
    for group in GROUPS:
        trigger = page.locator(f'[data-group="{group}"]').first
        if await trigger.count() == 0:
            print(f"  skip {vp_name}/{group}: trigger not present")
            continue

        # idle: move mouse far away, blur any focused element.
        await page.mouse.move(0, 0)
        await page.evaluate("() => document.activeElement?.blur?.()")
        await page.wait_for_timeout(SETTLE_MS)
        await trigger.screenshot(path=str(OUT / f"{vp_name}__{group}__idle.png"))

        # hover: move over the trigger center.
        box = await trigger.bounding_box()
        if box:
            await page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            await page.wait_for_timeout(SETTLE_MS)
            await trigger.screenshot(path=str(OUT / f"{vp_name}__{group}__hover.png"))

        # focus: keyboard modality so the focus ring renders.
        await page.evaluate('() => document.documentElement.setAttribute("data-input-modality", "keyboard")')
        await page.mouse.move(0, 0)
        await trigger.focus()
        await page.wait_for_timeout(SETTLE_MS)
        await trigger.screenshot(path=str(OUT / f"{vp_name}__{group}__focus.png"))

        # open: click; capture the trigger only (dropdown is a Radix
        # portal outside the trigger bounding box and covered by
        # existing menu tests).
        await trigger.click()
        await page.wait_for_timeout(SETTLE_MS)
        await trigger.screenshot(path=str(OUT / f"{vp_name}__{group}__open.png"))
        # close the menu before moving on.
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(SETTLE_MS)

        count += 4

    return count


async def capture_mobile(page) -> int:
    await page.set_viewport_size({"width": 375, "height": 800})
    await page.goto(BASE_URL, wait_until="networkidle")
    await page.wait_for_timeout(400)

    trigger = page.locator('button[aria-label="Open menu"]').first
    if await trigger.count() == 0:
        print("  skip mobile: drawer trigger not present")
        return 0

    prefix = "mobile-375__drawer"

    # idle
    await page.mouse.move(0, 0)
    await page.evaluate("() => document.activeElement?.blur?.()")
    await page.wait_for_timeout(SETTLE_MS)
    await trigger.screenshot(path=str(OUT / f"{prefix}__idle.png"))

    # hover
    box = await trigger.bounding_box()
    if box:
        await page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        await page.wait_for_timeout(SETTLE_MS)
        await trigger.screenshot(path=str(OUT / f"{prefix}__hover.png"))

    # focus
    await page.evaluate('() => document.documentElement.setAttribute("data-input-modality", "keyboard")')
    await page.mouse.move(0, 0)
    await trigger.focus()
    await page.wait_for_timeout(SETTLE_MS)
    await trigger.screenshot(path=str(OUT / f"{prefix}__focus.png"))

    # open: trigger visible while the sheet is open (data-state=open).
    await trigger.click()
    await page.wait_for_timeout(SETTLE_MS + 150)  # allow drawer slide to settle
    await trigger.screenshot(path=str(OUT / f"{prefix}__open.png"))
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(SETTLE_MS)

    return 4


async def main() -> int:
    async with async_playwright() as pw:
        try:
            browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        except Exception:
            browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(
                headless=True,
                executable_path=(
                    "/nix/store/nw961dvpvik5m19kbay4cg27wxgl3sdv-"
                    "playwright-chromium-headless-shell/chrome-linux/"
                    "headless_shell"
                ),
            )

        context = await browser.new_context(
            reduced_motion="reduce",
            device_scale_factor=1,
        )
        page = await context.new_page()

        total = 0
        for vp_name, (w, h) in DESKTOP_VIEWPORTS.items():
            n = await capture_desktop(page, vp_name, w, h)
            total += n
            print(f"{vp_name}: {n} shot(s)")

        n = await capture_mobile(page)
        total += n
        print(f"mobile-375: {n} shot(s)")

        await browser.close()
        print(f"topnav-states: {total} PNG(s) under {OUT}")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
