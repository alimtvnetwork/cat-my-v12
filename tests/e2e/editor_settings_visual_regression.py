"""Editor and Settings screenshot regression capture.

Captures the rule editor surfaces (Setup > Rules list + a seeded rule
editor) and every Settings sub-route at the same four breakpoints as
`home_visual_regression.py` (mobile-375, sm-640, md-900, xl-1440).

Determinism measures mirror the home capture:
- `prefers-reduced-motion: reduce` disables entrance/hover animations.
- Wait for `networkidle` + 800ms so any late layout settles.
- Structural selectors ('main') so a small copy edit does not fail
  every shot.

Output: tests/reports/editor-settings-regression/<route>__<viewport>.png
Baselines and heatmap diffs are handled by `diff_heatmaps.py`.

Run:
    python3 tests/e2e/editor_settings_visual_regression.py
    python3 tests/e2e/diff_heatmaps.py
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

OUT = Path("tests/reports/editor-settings-regression")
OUT.mkdir(parents=True, exist_ok=True)

BASE_URL = os.environ.get("EDITOR_BASE_URL", "http://localhost:8080")

VIEWPORTS = {
    "mobile-375": (375, 1400),
    "sm-640": (640, 1400),
    "md-900": (900, 1400),
    "xl-1440": (1440, 1400),
}

# Route slug -> path. Seeded rule id 1 comes from the monotonic integer
# alias table (`rule-id-alias.ts`); the seed guarantees at least one row.
ROUTES = [
    ("editor-rules-list", "/setup/rules"),
    ("editor-rule-detail", "/setup/rules/1"),
    ("editor-categories", "/setup/categories"),
    ("editor-roi", "/setup/roi"),
    ("settings-index", "/settings"),
    ("settings-camera", "/settings/camera"),
    ("settings-lighting", "/settings/lighting"),
    ("settings-trigger", "/settings/trigger"),
    ("settings-shortcuts", "/settings/shortcuts"),
    ("settings-license", "/settings/license"),
]


async def capture(page, route_slug: str, path: str, vp_name: str, w: int, h: int) -> bool:
    await page.set_viewport_size({"width": w, "height": h})
    try:
        await page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=15000)
    except Exception as exc:
        print(f"  skip {route_slug}@{vp_name}: goto failed: {exc}")
        return False
    await page.wait_for_timeout(800)
    try:
        loc = page.locator("main").first
        await loc.wait_for(state="visible", timeout=3000)
        await loc.screenshot(path=str(OUT / f"{route_slug}__{vp_name}.png"))
    except Exception:
        await page.screenshot(path=str(OUT / f"{route_slug}__{vp_name}.png"))
    return True


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
        for route_slug, path in ROUTES:
            for vp_name, (w, h) in VIEWPORTS.items():
                if await capture(page, route_slug, path, vp_name, w, h):
                    total += 1
            print(f"{route_slug}: captured")

        await browser.close()
        print(f"editor-settings-regression: {total} PNG(s) under {OUT}")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
