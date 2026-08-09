"""Stress vertical centering on real home item rows when labels get long.

Two scenarios per viewport (mobile / tablet / desktop):

1. Truncate: swap each label span for a 60-char string and force the row
   to a narrow max-width with overflow:hidden + text-overflow:ellipsis.
   Row must stay on one line; icon and label centers must line up.

2. Wrap: for chip strips (multi-child flex-wrap rows), swap each chip's
   label for a long string and shrink the container so chips wrap onto
   multiple visual lines. For every chip, icon and label centers on the
   same line must align.

Screenshots land in tests/reports/item-rows-long-labels/.
Non-zero exit on any centering breach (> 1.5 px spread).
"""

import asyncio
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
ENGINE = os.environ.get("E2E_BROWSER", "chromium")
OUT = Path("tests/reports/item-rows-long-labels" + ("" if ENGINE == "chromium" else f"-{ENGINE}"))
CENTER_BUDGET = 1.5

VIEWPORTS = [
    ("mobile", 375, 812),
    ("tablet", 834, 1112),
    ("desktop", 1440, 900),
]

LONG = "Reticulating splines across the manifold for calibration run"

# Single-row surfaces (measure children stay centered even when truncated).
SINGLE_ROW = [
    '[data-testid="home-primary-cta"]',
    '[data-testid="home-create-project"]',
]
# Multi-chip surface (measure alignment holds after wrap).
CHIP_STRIP = '[data-testid="home-utility-strip"] a'
CHIP_STRIP_PARENT = '[data-testid="home-utility-strip"]'


TRUNCATE_JS = r"""
({ sel, long }) => {

    const rows = document.querySelectorAll(sel);
    const out = [];
    rows.forEach((row) => {
        row.style.maxWidth = '220px';
        row.style.overflow = 'hidden';
        Array.from(row.querySelectorAll('span')).forEach((s) => {
            s.textContent = long;
            s.style.overflow = 'hidden';
            s.style.textOverflow = 'ellipsis';
            s.style.whiteSpace = 'nowrap';
            s.style.minWidth = '0';
        });
        const rect = row.getBoundingClientRect();
        const kids = Array.from(row.children).filter((c) => {
            const r = c.getBoundingClientRect();
            const cs = getComputedStyle(c);
            return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0;
        });
        const centers = kids.map((c) => {
            const r = c.getBoundingClientRect();
            return r.top + r.height / 2;
        });
        out.push({
            height: rect.height,
            childCount: kids.length,
            centerDelta: centers.length ? Math.max(...centers) - Math.min(...centers) : 0,
        });
    });
    return out;
}
"""

WRAP_JS = r"""
({ parentSel, chipSel, long }) => {
    const parent = document.querySelector(parentSel);
    if (parent) parent.style.maxWidth = '260px';
    const chips = Array.from(document.querySelectorAll(chipSel));
    chips.forEach((chip) => {
        Array.from(chip.querySelectorAll('span')).forEach((s) => {
            if (!s.classList.contains('sr-only')) s.textContent = long;
        });
    });
    // Group chips by their vertical band (top rounded to nearest 4px).
    const bands = new Map();
    chips.forEach((chip) => {
        const r = chip.getBoundingClientRect();
        const key = Math.round(r.top / 4) * 4;
        if (!bands.has(key)) bands.set(key, []);
        bands.get(key).push(chip);
    });
    const lines = [];
    for (const [top, group] of bands) {
        const perChipDeltas = group.map((chip) => {
            const kids = Array.from(chip.children).filter((c) => {
                const r = c.getBoundingClientRect();
                const cs = getComputedStyle(c);
                return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0;
            });
            const centers = kids.map((c) => {
                const r = c.getBoundingClientRect();
                return r.top + r.height / 2;
            });
            return centers.length ? Math.max(...centers) - Math.min(...centers) : 0;
        });
        // Row-level: chip centers within the same visual line.
        const chipCenters = group.map((chip) => {
            const r = chip.getBoundingClientRect();
            return r.top + r.height / 2;
        });
        lines.push({
            top,
            chipCount: group.length,
            rowCenterDelta: chipCenters.length ? Math.max(...chipCenters) - Math.min(...chipCenters) : 0,
            maxIntraChipDelta: perChipDeltas.length ? Math.max(...perChipDeltas) : 0,
        });
    }
    return { lineCount: lines.length, lines };
}
"""


async def run() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    breaches: list[str] = []

    async with async_playwright() as pw:
        browser = await getattr(pw, ENGINE).launch(headless=True)
        try:
            for label, w, h in VIEWPORTS:
                context = await browser.new_context(viewport={"width": w, "height": h})
                page = await context.new_page()
                await page.goto(f"{BASE_URL}/", wait_until="networkidle")

                # --- Truncate scenario ---
                for sel in SINGLE_ROW:
                    results = await page.evaluate(TRUNCATE_JS, {"sel": sel, "long": LONG})
                    for i, r in enumerate(results):
                        tag = f"trunc [{label}] {sel}#{i}"
                        if r["childCount"] < 2:
                            continue
                        if r["centerDelta"] > CENTER_BUDGET:
                            breaches.append(f"{tag} centerDelta={r['centerDelta']:.2f}")
                        # Row should stay a single line: height under ~60px.
                        if r["height"] > 80:
                            breaches.append(f"{tag} wrapped unexpectedly h={r['height']:.1f}")

                # --- Wrap scenario ---
                wrap = await page.evaluate(
                    WRAP_JS,
                    {"parentSel": CHIP_STRIP_PARENT, "chipSel": CHIP_STRIP, "long": LONG},
                )
                for line in wrap["lines"]:
                    tag = f"wrap [{label}] chips@top={line['top']}"
                    if line["rowCenterDelta"] > CENTER_BUDGET:
                        breaches.append(f"{tag} rowCenterDelta={line['rowCenterDelta']:.2f}")
                    if line["maxIntraChipDelta"] > CENTER_BUDGET:
                        breaches.append(f"{tag} intraChipDelta={line['maxIntraChipDelta']:.2f}")

                await page.screenshot(path=str(OUT / f"home_{label}.png"))
                print(
                    f"[{label}] wrap lines={wrap['lineCount']} "
                    f"maxRowDelta={max((l['rowCenterDelta'] for l in wrap['lines']), default=0):.2f}"
                )
                await context.close()
        finally:
            await browser.close()

    print(f"long-labels: {len(breaches)} breach(es)")
    for b in breaches:
        print(f"  {b}")
    return 1 if breaches else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
