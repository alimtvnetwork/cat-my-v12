"""WCAG contrast checks for icon+label item rows across key routes and breakpoints.

Uses axe-core scoped to the color-contrast rule (WCAG 2.1 AA) against each
item row surface (primary CTA, secondary CTA, utility strip chips) at
mobile / tablet / desktop viewports. Non-zero exit on any violation so the
release pipeline gates on it.

Report: tests/reports/item-rows-contrast.json
"""

import asyncio
import json
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
AXE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.0/axe.min.js"
REPORT_PATH = Path("tests/reports/item-rows-contrast.json")

VIEWPORTS = [
    ("mobile", 375, 812),
    ("tablet", 834, 1112),
    ("desktop", 1440, 900),
]

# Route -> list of CSS selectors that identify item rows to audit.
# Selectors are optional per route: missing ones are skipped, not failed,
# so seed-state differences (e.g. no recent project) do not flake the gate.
TARGETS = {
    "/": [
        '[data-testid="home-primary-cta"]',
        '[data-testid="home-create-project"]',
        '[data-testid="home-utility-strip"] a',
    ],
}

AXE_OPTIONS = {
    "runOnly": {"type": "rule", "values": ["color-contrast"]},
    # Include children so labels + icons inside the row are all evaluated.
    "resultTypes": ["violations"],
}


async def audit(page, path: str, selectors: list[str]) -> list[dict]:
    await page.goto(f"{BASE_URL}{path}", wait_until="networkidle")
    await page.add_script_tag(url=AXE_CDN)

    found: list[dict] = []
    for sel in selectors:
        handles = await page.query_selector_all(sel)
        if not handles:
            # Not present in this seed state; skip rather than fail.
            continue
        # Run axe scoped to each matched element so hover/state variants
        # don't bleed into the report.
        for idx, _ in enumerate(handles):
            scoped_sel = f"({sel})[{idx}]"  # informational only
            result = await page.evaluate(
                """async ({ sel, idx, opts }) => {
                    const nodes = document.querySelectorAll(sel);
                    const el = nodes[idx];
                    if (!el) return { violations: [] };
                    return await window.axe.run(el, opts);
                }""",
                {"sel": sel, "idx": idx, "opts": AXE_OPTIONS},
            )
            for v in result.get("violations", []):
                found.append(
                    {
                        "route": path,
                        "selector": scoped_sel,
                        "id": v["id"],
                        "impact": v.get("impact"),
                        "nodes": [
                            {
                                "target": n.get("target"),
                                "html": (n.get("html") or "")[:400],
                                "failure": n.get("failureSummary"),
                            }
                            for n in v.get("nodes", [])[:5]
                        ],
                    }
                )
    return found


async def main() -> int:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    report: dict = {"base": BASE_URL, "viewports": {}}
    total_violations = 0

    async with async_playwright() as pw:
        browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        try:
            for label, w, h in VIEWPORTS:
                context = await browser.new_context(viewport={"width": w, "height": h})
                page = await context.new_page()
                per_route: dict = {}
                for route, selectors in TARGETS.items():
                    violations = await audit(page, route, selectors)
                    per_route[route] = violations
                    total_violations += len(violations)
                report["viewports"][label] = per_route
                await context.close()
        finally:
            await browser.close()

    REPORT_PATH.write_text(json.dumps(report, indent=2))
    print(f"item-rows-contrast: {total_violations} violation(s) -> {REPORT_PATH}")

    if total_violations:
        for vp, routes in report["viewports"].items():
            for route, vs in routes.items():
                for v in vs:
                    print(f"  [{vp}] {route} {v['selector']} -> {v['id']} ({v['impact']})")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
