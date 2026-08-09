"""
Hover stability gate: Setup QuickAction chips and utility strip chips must
NOT shift position (x/y/width/height) between rest and :hover states.

Enforces the user rule: hover should animate color/glow only, never move.
Runs across mobile, tablet, and desktop viewports and against the engine
selected via E2E_BROWSER (chromium|webkit|firefox, default chromium).
"""

import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).parent
REPORT_DIR = ROOT.parent / "reports" / f"hover-no-shift-{os.environ.get('E2E_BROWSER', 'chromium')}"
REPORT_DIR.mkdir(parents=True, exist_ok=True)

VIEWPORTS = [
    ("mobile", 390, 844),
    ("tablet", 834, 1112),
    ("desktop", 1280, 1800),
]

# Chips we guard. Selectors intentionally structural — they match the
# item-inline utility-strip chips and the QuickActionButton (group/qa) chips.
TARGETS = [
    ("utility-chip", "a.item-inline, button.item-inline"),
    ("setup-chip", ".group\\/qa"),
]

TOLERANCE_PX = 1.5  # sub-pixel jitter budget; anything above == real shift


async def measure_one(page, selector, index):
    """Bounding box of a single indexed match, at the current scroll pos."""
    return await page.evaluate(
        """([sel, i]) => {
            const el = document.querySelectorAll(sel)[i];
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, w: r.width, h: r.height };
        }""",
        [selector, index],
    )


async def count(page, selector):
    return await page.eval_on_selector_all(selector, "els => els.length")


async def run_engine(engine_name):
    failures = []
    summary = {"engine": engine_name, "viewports": {}}

    async with async_playwright() as pw:
        engine = getattr(pw, engine_name)
        browser = await engine.launch(headless=True)

        for vp_name, w, h in VIEWPORTS:
            ctx = await browser.new_context(viewport={"width": w, "height": h})
            page = await ctx.new_page()
            await page.goto("http://localhost:8080/", wait_until="domcontentloaded")
            await page.wait_for_load_state("networkidle")
            # Force reduced-motion off so we test the real animation path.
            await page.emulate_media(reduced_motion="no-preference")

            vp_report = {}
            for label, selector in TARGETS:
                n = await count(page, selector)
                if not n:
                    vp_report[label] = {"count": 0, "skipped": "no matches"}
                    continue

                shifts = []
                for i in range(n):
                    handles = await page.query_selector_all(selector)
                    handle = handles[i]
                    await handle.scroll_into_view_if_needed()
                    await page.wait_for_timeout(60)
                    # Measure rest AFTER scrolling so scroll offset can't
                    # masquerade as a hover-induced shift.
                    rest = await measure_one(page, selector, i)
                    await handle.hover()
                    await page.wait_for_timeout(320)
                    hovered = await measure_one(page, selector, i)
                    d = {
                        "dx": abs(hovered["x"] - rest["x"]),
                        "dy": abs(hovered["y"] - rest["y"]),
                        "dw": abs(hovered["w"] - rest["w"]),
                        "dh": abs(hovered["h"] - rest["h"]),
                    }
                    shifts.append(d)
                    if max(d.values()) > TOLERANCE_PX:
                        failures.append(
                            f"[{engine_name}/{vp_name}/{label}#{i}] shift {d} > {TOLERANCE_PX}px"
                        )
                    await page.mouse.move(0, 0)
                    await page.wait_for_timeout(80)

                if shifts:
                    last = (await page.query_selector_all(selector))[-1]
                    await last.scroll_into_view_if_needed()
                    await last.hover()
                    await page.wait_for_timeout(320)
                    shot = REPORT_DIR / f"{vp_name}-{label}-hover.png"
                    await page.screenshot(path=str(shot))
                    await page.mouse.move(0, 0)

                vp_report[label] = {
                    "count": n,
                    "max_shift_px": max((max(s.values()) for s in shifts), default=0),
                }


            summary["viewports"][vp_name] = vp_report
            await ctx.close()

        await browser.close()

    (REPORT_DIR / "summary.json").write_text(json.dumps(summary, indent=2))
    return failures, summary


async def main():
    engine = os.environ.get("E2E_BROWSER", "chromium")
    failures, summary = await run_engine(engine)
    print(json.dumps(summary, indent=2))
    if failures:
        print("\nHOVER SHIFT FAILURES:")
        for f in failures:
            print(" -", f)
        raise SystemExit(1)
    print(f"\nOK: no hover position shifts (tolerance {TOLERANCE_PX}px).")


if __name__ == "__main__":
    asyncio.run(main())
