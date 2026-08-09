"""Homepage screenshot regression capture.

Captures the Home route at four breakpoints (mobile / sm / md / xl) and
writes deterministic PNGs to `tests/reports/home-regression/`. Baselines
are managed by `tests/e2e/diff_heatmaps.py`, which now includes this
directory in `SOURCES` — first run seeds baselines, later runs produce
red-tinted heatmaps and fail when >2% of pixels change.

Why a dedicated capture per breakpoint:
- The Home hero uses breakpoint-specific spacing tokens (mt-hmi-4 at
  mobile, mt-hmi-3 at sm+). A single desktop capture would miss any
  regression on the tight mobile stack the user has corrected twice.
- Workflow cards flip from 1 col to md:grid-cols-2 at 768px, so a
  capture between 640 and 768 catches accidental column changes.
- Card gap + container padding scale via `clamp()`; deterministic
  viewport widths make those scales reproducible.

Determinism measures:
- `prefers-reduced-motion: reduce` disables entrance/hover animations.
- We wait for `networkidle` and an extra 800ms so `clamp()` values and
  any font-load reflow settle before the shot.
- The utility strip is captured separately so a hero-only change does
  not swamp the diff for the strip and vice versa.

Run:
    python3 tests/e2e/home_visual_regression.py
    python3 tests/e2e/diff_heatmaps.py
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

OUT = Path("tests/reports/home-regression")
OUT.mkdir(parents=True, exist_ok=True)

BASE_URL = os.environ.get("HOME_BASE_URL", "http://localhost:8080/")

# name -> (width, height). Height is generous so full-page-ish captures
# do not clip the utility strip at the bottom of the hero.
VIEWPORTS = {
    "mobile-375": (375, 1400),
    "sm-640": (640, 1400),
    "md-900": (900, 1400),
    "xl-1440": (1440, 1400),
}

# Selectors captured per viewport. Keep the list short and structural so
# a small copy edit does not fail every shot.
SHOTS = [
    # (slug, selector). None selector = whole visible viewport.
    ("hero", "main"),
    ("workflow-grid", "div.grid.grid-cols-1"),
    ("utility-strip", '[data-testid="home-utility-strip"]'),
]


async def capture(page, name: str, w: int, h: int) -> list[str]:
    await page.set_viewport_size({"width": w, "height": h})
    await page.goto(BASE_URL, wait_until="networkidle")
    # Let `clamp()`-driven paddings and any late layout settle.
    await page.wait_for_timeout(800)

    written: list[str] = []
    for slug, sel in SHOTS:
        path = OUT / f"{name}__{slug}.png"
        if sel is None:
            await page.screenshot(path=str(path))
        else:
            try:
                loc = page.locator(sel).first
                await loc.wait_for(state="visible", timeout=3000)
                await loc.screenshot(path=str(path))
            except Exception as exc:  # pragma: no cover - diagnostic
                print(f"  skip {name}/{slug}: {exc}")
                continue
        written.append(path.name)
    return written


async def main() -> int:
    async with async_playwright() as pw:
        # nix-store chromium; PLAYWRIGHT_BROWSERS_PATH=/ finds it in dev
        # sandbox, but not every CI image ships the pre-set path. Fall
        # back to the known nix headless-shell when the default fails.
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
        for name, (w, h) in VIEWPORTS.items():
            written = await capture(page, name, w, h)
            total += len(written)
            print(f"{name}: {len(written)} shot(s)")

        await browser.close()
        print(f"home-regression: {total} PNG(s) under {OUT}")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
