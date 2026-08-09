"""Alignment metrics report for item rows.

For each viewport, measures every child of each item-row surface and records
- vertical center delta (max child center Y - min child center Y)
- max computed line-height / font-size ratio (leading-none should be <= 1.05)

Persists a timestamped run under tests/reports/alignment/history/, updates
tests/reports/alignment/latest.json, compares against the previous run,
and writes tests/reports/alignment/report.html summarizing current metrics
plus regressions (a metric that got worse beyond a small tolerance).

Non-zero exit only when a metric breaches the absolute budget:
- center delta > 1.5 px
- line-height ratio > 1.05
Regressions within budget are highlighted but do not fail the run.
"""

import asyncio
import json
import os
import sys
import time
from pathlib import Path

from playwright.async_api import async_playwright

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
OUT_DIR = Path("tests/reports/alignment")
HISTORY_DIR = OUT_DIR / "history"
LATEST = OUT_DIR / "latest.json"
HTML = OUT_DIR / "report.html"

CENTER_BUDGET_PX = 1.5
LH_BUDGET = 1.05
# Regression tolerance: only flag if current > previous + delta.
REGRESSION_CENTER_DELTA = 0.25
REGRESSION_LH_DELTA = 0.02

VIEWPORTS = [
    ("mobile", 375, 812),
    ("tablet", 834, 1112),
    ("desktop", 1440, 900),
]

# route -> named surfaces -> selector for each row instance
SURFACES = {
    "/": {
        "primary_cta": '[data-testid="home-primary-cta"]',
        "create_project": '[data-testid="home-create-project"]',
        "utility_chip": '[data-testid="home-utility-strip"] a',
    },
}

MEASURE_JS = """
(sel) => {
    const rows = Array.from(document.querySelectorAll(sel));
    return rows.map((row) => {
        const children = Array.from(row.children).filter((c) => {
            const r = c.getBoundingClientRect();
            const cs = getComputedStyle(c);
            if (cs.display === 'none' || cs.visibility === 'hidden') return false;
            return r.width > 0 && r.height > 0;
        });
        if (children.length < 2) return null;
        const centers = children.map((c) => {
            const r = c.getBoundingClientRect();
            return r.top + r.height / 2;
        });
        const ratios = children.map((c) => {
            const cs = getComputedStyle(c);
            const fs = parseFloat(cs.fontSize) || 0;
            const lh = parseFloat(cs.lineHeight);
            if (!fs || !isFinite(lh)) return 1;
            return lh / fs;
        });
        return {
            childCount: children.length,
            centerDelta: Math.max(...centers) - Math.min(...centers),
            maxLhRatio: Math.max(...ratios),
        };
    }).filter(Boolean);
}
"""


async def collect() -> dict:
    run: dict = {"ts": int(time.time()), "base": BASE_URL, "viewports": {}}
    async with async_playwright() as pw:
        browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        try:
            for label, w, h in VIEWPORTS:
                context = await browser.new_context(viewport={"width": w, "height": h})
                page = await context.new_page()
                per_route: dict = {}
                for route, surfaces in SURFACES.items():
                    await page.goto(f"{BASE_URL}{route}", wait_until="networkidle")
                    per_surface: dict = {}
                    for name, sel in surfaces.items():
                        rows = await page.evaluate(MEASURE_JS, sel)
                        if not rows:
                            continue
                        per_surface[name] = {
                            "rows": rows,
                            "maxCenterDelta": max(r["centerDelta"] for r in rows),
                            "maxLhRatio": max(r["maxLhRatio"] for r in rows),
                        }
                    per_route[route] = per_surface
                run["viewports"][label] = per_route
                await context.close()
        finally:
            await browser.close()
    return run


def load_previous() -> dict | None:
    if not LATEST.exists():
        return None
    try:
        return json.loads(LATEST.read_text())
    except Exception:
        return None


def diff(prev: dict | None, curr: dict) -> list[dict]:
    if not prev:
        return []
    regressions: list[dict] = []
    for vp, routes in curr["viewports"].items():
        prev_vp = prev.get("viewports", {}).get(vp, {})
        for route, surfaces in routes.items():
            prev_route = prev_vp.get(route, {})
            for name, m in surfaces.items():
                p = prev_route.get(name)
                if not p:
                    continue
                d_center = m["maxCenterDelta"] - p["maxCenterDelta"]
                d_lh = m["maxLhRatio"] - p["maxLhRatio"]
                if d_center > REGRESSION_CENTER_DELTA or d_lh > REGRESSION_LH_DELTA:
                    regressions.append(
                        {
                            "viewport": vp,
                            "route": route,
                            "surface": name,
                            "centerDelta": {"prev": p["maxCenterDelta"], "curr": m["maxCenterDelta"], "diff": d_center},
                            "lhRatio": {"prev": p["maxLhRatio"], "curr": m["maxLhRatio"], "diff": d_lh},
                        }
                    )
    return regressions


def status(center: float, lh: float) -> tuple[str, str]:
    if center > CENTER_BUDGET_PX or lh > LH_BUDGET:
        return ("fail", "#b91c1c")
    if center > CENTER_BUDGET_PX * 0.66 or lh > 1.02:
        return ("watch", "#b45309")
    return ("pass", "#047857")


def render_html(curr: dict, regressions: list[dict], prev_ts: int | None) -> str:
    rows_html = []
    for vp, routes in curr["viewports"].items():
        for route, surfaces in routes.items():
            for name, m in surfaces.items():
                s, color = status(m["maxCenterDelta"], m["maxLhRatio"])
                rows_html.append(
                    f"<tr><td>{vp}</td><td>{route}</td><td>{name}</td>"
                    f"<td style='text-align:right'>{m['maxCenterDelta']:.2f} px</td>"
                    f"<td style='text-align:right'>{m['maxLhRatio']:.3f}</td>"
                    f"<td style='color:{color};font-weight:600'>{s}</td></tr>"
                )
    reg_html = ""
    if regressions:
        reg_rows = "".join(
            f"<tr><td>{r['viewport']}</td><td>{r['route']}</td><td>{r['surface']}</td>"
            f"<td>{r['centerDelta']['prev']:.2f} &rarr; {r['centerDelta']['curr']:.2f} "
            f"(+{r['centerDelta']['diff']:.2f})</td>"
            f"<td>{r['lhRatio']['prev']:.3f} &rarr; {r['lhRatio']['curr']:.3f} "
            f"(+{r['lhRatio']['diff']:.3f})</td></tr>"
            for r in regressions
        )
        reg_html = (
            "<h2>Regressions vs previous run</h2>"
            f"<p>Compared against run ts={prev_ts}.</p>"
            "<table><thead><tr><th>Viewport</th><th>Route</th><th>Surface</th>"
            "<th>Center delta</th><th>Line-height ratio</th></tr></thead>"
            f"<tbody>{reg_rows}</tbody></table>"
        )
    else:
        reg_html = "<h2>Regressions</h2><p>None vs previous run.</p>"
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Alignment metrics</title>
<style>
  body {{ font: 14px/1.4 system-ui, sans-serif; margin: 2rem; color: #111; }}
  h1 {{ margin: 0 0 .25rem; }}
  .meta {{ color: #666; margin-bottom: 1.5rem; }}
  table {{ border-collapse: collapse; margin-bottom: 2rem; }}
  th, td {{ border: 1px solid #e5e7eb; padding: .4rem .75rem; }}
  th {{ background: #f9fafb; text-align: left; }}
  code {{ background: #f3f4f6; padding: 0 .25rem; border-radius: 3px; }}
</style></head><body>
<h1>Item-row alignment metrics</h1>
<div class="meta">Run ts={curr['ts']} &middot; base {curr['base']} &middot;
budgets: center &le; {CENTER_BUDGET_PX}px, line-height ratio &le; {LH_BUDGET}</div>
<table><thead><tr><th>Viewport</th><th>Route</th><th>Surface</th>
<th>Max center delta</th><th>Max lh ratio</th><th>Status</th></tr></thead>
<tbody>{''.join(rows_html)}</tbody></table>
{reg_html}
</body></html>"""


async def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    prev = load_previous()
    curr = await collect()

    # Budget check.
    breached: list[str] = []
    for vp, routes in curr["viewports"].items():
        for route, surfaces in routes.items():
            for name, m in surfaces.items():
                if m["maxCenterDelta"] > CENTER_BUDGET_PX:
                    breached.append(f"{vp} {route} {name}: centerDelta={m['maxCenterDelta']:.2f}px")
                if m["maxLhRatio"] > LH_BUDGET:
                    breached.append(f"{vp} {route} {name}: lhRatio={m['maxLhRatio']:.3f}")

    regressions = diff(prev, curr)
    HTML.write_text(render_html(curr, regressions, prev.get("ts") if prev else None))
    (HISTORY_DIR / f"{curr['ts']}.json").write_text(json.dumps(curr, indent=2))
    LATEST.write_text(json.dumps(curr, indent=2))

    print(f"alignment-report: {len(regressions)} regression(s), {len(breached)} breach(es) -> {HTML}")
    for r in regressions:
        print(f"  regression {r['viewport']} {r['route']} {r['surface']}")
    for b in breached:
        print(f"  breach {b}")
    return 1 if breached else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
