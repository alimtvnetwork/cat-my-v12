"""Editor visual regression across UI density modes.

Captures key editor surfaces at two densities (comfortable, compact)
and four breakpoints, so a padding/header regression in either mode
shows up as a heatmap diff.

Density is set by seeding the persisted zustand payload for
`StorageKey.UiPrefs` ("ca.uiPrefs.v1") on the localhost origin before
navigating to each route, so the store hydrates directly into the
requested mode with no post-load toggle race.

Output: tests/reports/editor-density-regression/<route>__<density>__<viewport>.png
Baselines and diffs are handled by `diff_heatmaps.py`.

Run:
    python3 tests/e2e/editor_density_visual_regression.py
    python3 tests/e2e/diff_heatmaps.py
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

OUT = Path("tests/reports/editor-density-regression")
OUT.mkdir(parents=True, exist_ok=True)

BASE_URL = os.environ.get("EDITOR_BASE_URL", "http://localhost:8080")
STORAGE_KEY = "ca.uiPrefs.v1"

VIEWPORTS = {
    "mobile-375": (375, 1400),
    "sm-640": (640, 1400),
    "md-900": (900, 1400),
    "xl-1440": (1440, 1400),
}

# Focus on surfaces where density visibly changes header/padding/icon sizing:
# right rail (Inspector), left tools rail, editor top bar, and a floating
# panel host route.
ROUTES = [
    ("editor-rules-list", "/setup/rules"),
    ("editor-rule-detail", "/setup/rules/1"),
    ("editor-roi", "/setup/roi"),
    ("settings-index", "/settings"),
]

DENSITIES = ("comfortable", "compact")


def prefs_payload(density: str) -> str:
    # Matches the zustand persist envelope: { state, version }.
    return json.dumps(
        {
            "state": {
                "showStatusBar": False,
                "headerDensity": density,
            },
            "version": 0,
        }
    )


async def seed_density(page, density: str) -> None:
    # The ui-prefs store persists through `createFacadeStateStorage()`,
    # which is `idb-keyval` on the browser (DB "keyval-store", store "keyval").
    # Seed both idb-keyval and localStorage so whichever the store hydrates
    # from lands on the requested density.
    await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=15000)
    payload = prefs_payload(density)
    await page.evaluate(
        """async ([k, v]) => {
          window.localStorage.setItem(k, v);
          await new Promise((resolve, reject) => {
            const req = indexedDB.open('keyval-store', 1);
            req.onupgradeneeded = () => req.result.createObjectStore('keyval');
            req.onerror = () => reject(req.error);
            req.onsuccess = () => {
              const db = req.result;
              const tx = db.transaction('keyval', 'readwrite');
              tx.objectStore('keyval').put(v, k);
              tx.oncomplete = () => { db.close(); resolve(); };
              tx.onerror = () => reject(tx.error);
            };
          });
        }""",
        [STORAGE_KEY, payload],
    )


async def capture(page, route_slug: str, path: str, density: str, vp_name: str, w: int, h: int) -> bool:
    await page.set_viewport_size({"width": w, "height": h})
    try:
        await page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=15000)
    except Exception as exc:
        print(f"  skip {route_slug}@{density}/{vp_name}: goto failed: {exc}")
        return False
    await page.wait_for_timeout(800)
    # Sanity check: the density attribute should be stamped on the editor shell.
    try:
        stamped = await page.evaluate(
            "() => document.querySelector('.editor-shell')?.getAttribute('data-density')"
            " ?? document.body.getAttribute('data-density')"
        )
        if stamped and stamped != density:
            print(f"  warn {route_slug}@{density}/{vp_name}: stamped='{stamped}'")
    except Exception:
        pass
    try:
        loc = page.locator("main").first
        await loc.wait_for(state="visible", timeout=3000)
        await loc.screenshot(path=str(OUT / f"{route_slug}__{density}__{vp_name}.png"))
    except Exception:
        await page.screenshot(path=str(OUT / f"{route_slug}__{density}__{vp_name}.png"))
    return True


async def main() -> int:
    async with async_playwright() as pw:
        browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(
            reduced_motion="reduce",
            device_scale_factor=1,
            viewport={"width": 1280, "height": 1400},
        )
        page = await context.new_page()

        total = 0
        for density in DENSITIES:
            await seed_density(page, density)
            for route_slug, path in ROUTES:
                for vp_name, (w, h) in VIEWPORTS.items():
                    if await capture(page, route_slug, path, density, vp_name, w, h):
                        total += 1
                print(f"{route_slug} [{density}]: captured")

        await browser.close()
        print(f"editor-density-regression: {total} PNG(s) under {OUT}")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
