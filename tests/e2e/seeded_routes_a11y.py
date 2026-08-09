"""Plan 86 Step 43: a11y + visual checks on seeded UI surfaces.

Applies the `prof-default-pcb` seed profile through the frozen
command bus, then for each of the 7 routes covered by Step 42
(`tests/e2e/seeded_routes_coverage.py`):

  1. injects axe-core (pinned CDN) and runs the WCAG 2 A/AA ruleset
  2. captures a full-viewport PNG as a visual baseline

Writes a combined report to
`tests/reports/seeded-routes/a11y.json` and per-route PNGs beside
it. Exits non-zero if any route emits an axe violation at impact
`serious` or `critical`, so seed-driven regressions in the
populated screens are surfaced as a hard failure. Lower-severity
violations are still recorded in the JSON report for triage.

Root cause guarded: Step 42 proved the routes render; without a
paired a11y+visual sweep against the *populated* seed state, seed
value changes can silently break labels, focus order, contrast, or
landmarks, and we would not know until a user hit it.

Run: `python3 tests/e2e/seeded_routes_a11y.py`.
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from playwright.async_api import async_playwright

from _helpers import (
    apply_seed_profile,
    attach_console_and_seed_gate,
    wait_for_auto_seed,
)

BASE = "http://localhost:8080"
AXE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.0/axe.min.js"
AXE_OPTIONS = {"runOnly": {"type": "tag", "values": ["wcag2a", "wcag2aa"]}}
BLOCKING_IMPACTS = {"serious", "critical"}

REPORTS = Path("tests/reports/seeded-routes")
REPORTS.mkdir(parents=True, exist_ok=True)

PROJECT_ID = "proj-default-pcb-refdes"
RULESET_ID = "rs-refdes-verify"

ROUTES = [
    "/projects",
    f"/projects/{PROJECT_ID}",
    f"/projects/{PROJECT_ID}/categories",
    f"/projects/{PROJECT_ID}/rulesets",
    f"/projects/{PROJECT_ID}/rulesets/{RULESET_ID}",
    "/settings",
    "/errors",
]


async def audit_route(page, path: str) -> dict:
    await page.goto(f"{BASE}{path}", wait_until="domcontentloaded")
    await page.wait_for_timeout(400)
    await page.add_script_tag(url=AXE_CDN)
    result = await page.evaluate(
        "async (opts) => await window.axe.run(document, opts)",
        AXE_OPTIONS,
    )
    violations = result.get("violations", [])
    slug = path.strip("/").replace("/", "_") or "root"
    await page.screenshot(path=str(REPORTS / f"a11y-{slug}.png"))

    summary = [
        {
            "id": v["id"],
            "impact": v.get("impact"),
            "nodeCount": len(v.get("nodes", [])),
            "help": v.get("help"),
            "nodes": [
                {
                    "target": n.get("target"),
                    "html": (n.get("html") or "")[:280],
                }
                for n in v.get("nodes", [])[:3]
            ],
        }
        for v in violations
    ]
    blocking = [v for v in summary if v["impact"] in BLOCKING_IMPACTS]
    return {
        "route": path,
        "violations": summary,
        "blockingCount": len(blocking),
        "totalCount": len(summary),
    }


async def main() -> int:
    async with async_playwright() as playwright:
        browser = await getattr(playwright, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        page_errors: list[str] = []
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))
        console_msgs, auto_seed_done = attach_console_and_seed_gate(page)

        await page.goto(BASE, wait_until="domcontentloaded")
        await wait_for_auto_seed(auto_seed_done, console_msgs)
        applied = await apply_seed_profile(page, console_msgs, "prof-default-pcb")
        print(f"applied profile: {applied['line']}")

        results = []
        for path in ROUTES:
            outcome = await audit_route(page, path)
            print(
                f"axe {path}: total={outcome['totalCount']} "
                f"blocking={outcome['blockingCount']}"
            )
            results.append(outcome)

        await browser.close()

    total_blocking = sum(r["blockingCount"] for r in results)
    total_violations = sum(r["totalCount"] for r in results)
    status = "passed" if total_blocking == 0 else "failed"
    report = {
        "status": status,
        "profile": "prof-default-pcb",
        "ruleset": "wcag2a+wcag2aa",
        "blockingImpacts": sorted(BLOCKING_IMPACTS),
        "totalBlocking": total_blocking,
        "totalViolations": total_violations,
        "routes": results,
    }
    (REPORTS / "a11y.json").write_text(json.dumps(report, indent=2))
    print(
        f"seeded-routes a11y: status={status} "
        f"blocking={total_blocking} totalViolations={total_violations}"
    )
    return 0 if total_blocking == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
