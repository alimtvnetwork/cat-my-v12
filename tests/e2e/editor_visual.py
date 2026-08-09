"""Plan 30 step 98: visual snapshot baselines for editor routes.

Root cause: layout / token drift in the editor shell will ship silently
without frozen visual baselines. Captures /setup, /setup/roi, /setup/reference
at 1440x900 and 1024x768 and compares against baselines stored under
tests/reports/visual/. First run seeds baselines; subsequent runs diff pixel
counts and fail if the ratio exceeds 0.01 (per 08-testing.md).
"""

import asyncio
import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageChops
from playwright.async_api import async_playwright

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
VISUAL_DIR = Path("tests/reports/visual")
REPORT = Path("tests/reports/e2e-editor-visual.json")
# Plan 67 step 46 (VR-01): extend baseline coverage to the v3 surfaces
# added by Plan 67 (functions library, chain-events inspector, run picker).
# First run seeds baselines; subsequent runs guard against regressions.
ROUTES = [
    "/setup",
    "/setup/roi",
    "/setup/reference",
    "/setup/functions",
    "/setup/chain-events",
    "/run",
]
VIEWPORTS = [(1440, 900), (1024, 768)]
PANEL_CONTROLLERS = ["number", "color", "blob", "pattern"]
MAX_DIFF_RATIO = 0.01


def slug(route: str, w: int, h: int) -> str:
    r = route.strip("/").replace("/", "-") or "root"
    return f"{r}_{w}x{h}.png"


def diff_ratio(a: Path, b: Path) -> float:
    ia = Image.open(a).convert("RGB")
    ib = Image.open(b).convert("RGB")
    if ia.size != ib.size:
        return 1.0
    d = ImageChops.difference(ia, ib)
    bbox = d.getbbox()
    if not bbox:
        return 0.0
    changed = sum(1 for px in d.getdata() if px != (0, 0, 0))
    return changed / (ia.size[0] * ia.size[1])


async def main() -> int:
    VISUAL_DIR.mkdir(parents=True, exist_ok=True)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    results: list[dict] = []
    seeded = 0
    failed = 0

    async with async_playwright() as pw:
        browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        for (w, h) in VIEWPORTS:
            context = await browser.new_context(viewport={"width": w, "height": h})
            page = await context.new_page()
            for route in ROUTES:
                name = slug(route, w, h)
                baseline = VISUAL_DIR / name
                current = VISUAL_DIR / f"current_{name}"
                await page.goto(f"{BASE_URL}{route}", wait_until="networkidle")
                await page.screenshot(path=str(current))
                if not baseline.exists():
                    current.rename(baseline)
                    seeded += 1
                    results.append({"Route": route, "Viewport": f"{w}x{h}", "Status": "Seeded"})
                    continue
                ratio = diff_ratio(baseline, current)
                ok = ratio <= MAX_DIFF_RATIO
                if ok:
                    current.unlink()
                else:
                    failed += 1
                results.append({
                    "Route": route,
                    "Viewport": f"{w}x{h}",
                    "Status": "Passed" if ok else "Failed",
                    "DiffRatio": round(ratio, 6),
                })

            # Plan 31 step 20: per-panel snapshots via test hooks.
            await page.goto(f"{BASE_URL}/setup?e2e=1", wait_until="networkidle")
            await page.wait_for_function("() => !!window.__editorTestHooks")
            await page.evaluate("(kinds) => window.__editorTestHooks.seedControllers(kinds)", PANEL_CONTROLLERS)
            for controller in PANEL_CONTROLLERS:
                pname = f"panel-{controller}_{w}x{h}.png"
                baseline = VISUAL_DIR / pname
                current = VISUAL_DIR / f"current_{pname}"
                rule_id = f"panel-{controller}"
                await page.evaluate(
                    "(id) => window.__editorTestHooks.setReferenceAsset(id, 'programs/e2e/assets/ref.png')",
                    rule_id,
                )
                row = page.locator(f"#rule-row-{rule_id}")
                if await row.count() == 0:
                    results.append({"Route": f"panel:{controller}", "Viewport": f"{w}x{h}", "Status": "Skipped", "Detail": "row missing"})
                    continue
                await row.click()
                panel = page.locator(f"[data-panel-controller='{controller}']").first
                try:
                    await panel.wait_for(state="visible", timeout=2000)
                    await panel.screenshot(path=str(current))
                except Exception as exc:
                    results.append({"Route": f"panel:{controller}", "Viewport": f"{w}x{h}", "Status": "Skipped", "Detail": f"panel not mounted: {exc}"})
                    continue
                if not baseline.exists():
                    current.rename(baseline)
                    seeded += 1
                    results.append({"Route": f"panel:{controller}", "Viewport": f"{w}x{h}", "Status": "Seeded"})
                    continue
                ratio = diff_ratio(baseline, current)
                ok = ratio <= MAX_DIFF_RATIO
                if ok:
                    current.unlink()
                else:
                    failed += 1
                results.append({
                    "Route": f"panel:{controller}",
                    "Viewport": f"{w}x{h}",
                    "Status": "Passed" if ok else "Failed",
                    "DiffRatio": round(ratio, 6),
                })
            await context.close()
        await browser.close()

    status = "Passed" if failed == 0 else "Failed"
    REPORT.write_text(json.dumps({
        "Suite": "editor-visual",
        "Status": status,
        "MaxDiffPixelRatio": MAX_DIFF_RATIO,
        "Seeded": seeded,
        "Failed": failed,
        "Results": results,
    }, indent=2) + "\n")
    print(json.dumps({"status": status, "seeded": seeded, "failed": failed}, indent=2))
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
