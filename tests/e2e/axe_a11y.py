"""Axe-core a11y sweep across primary routes; fails on any WCAG 2 AA violation.

Root cause of prior gap: Plan 09 Step 6 required an accessibility gate but
none of the routes had ever been asserted against WCAG. This script injects
axe-core (pinned CDN version) into each route, runs the AA ruleset, and
writes a JSON report to tests/reports/a11y-axe.json. Non-zero exit on
violations so CI and the READY banner can gate on it.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
AXE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.0/axe.min.js"
REPORT_PATH = Path("tests/reports/a11y-axe.json")
ROUTES = [
    "/",
    "/setup",
    "/setup/functions",
    "/setup/chain-events",
    "/run",
    "/errors",
    "/ops",
    "/settings/license",
    "/setup/rules",
    "/setup/rules/new",
    "/projects",
    "/projects/proj-default-pcb-refdes",
]
AXE_OPTIONS = {"runOnly": {"type": "tag", "values": ["wcag2a", "wcag2aa"]}}


async def audit_route(page, path: str) -> dict:
    url = f"{BASE_URL}{path}"
    await page.goto(url, wait_until="networkidle")
    await page.add_script_tag(url=AXE_CDN)
    result = await page.evaluate(
        "async (opts) => await window.axe.run(document, opts)",
        AXE_OPTIONS,
    )
    violations = result.get("violations", [])
    summary = [
        {
            "Id": v["id"],
            "Impact": v.get("impact"),
            "Nodes": len(v.get("nodes", [])),
            "NodeDetails": [
                {
                    "Target": n.get("target"),
                    "Html": (n.get("html") or "")[:400],
                    "FailureSummary": n.get("failureSummary"),
                }
                for n in v.get("nodes", [])[:5]
            ],
            "Help": v.get("help"),
        }
        for v in violations
    ]
    return {"Route": path, "Url": url, "Violations": summary, "Count": len(summary)}


async def main() -> int:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    results: list[dict] = []
    async with async_playwright() as playwright:
        browser = await getattr(playwright, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        for route in ROUTES:
            results.append(await audit_route(page, route))

        # Plan 80 step 15: resolve the first seeded project id after visiting
        # /projects, then audit the V4 project editor route. Silent skip only
        # if seeding truly produced zero projects (that itself is a bug).
        try:
            first_href = await page.eval_on_selector(
                'a[href^="/projects/"]',
                'el => el.getAttribute("href")',
            )
        except Exception as exc:  # noqa: BLE001
            print(f"[axe] could not resolve first project link: {exc}", file=sys.stderr)
            first_href = None
        if first_href and first_href not in ("/projects", "/projects/"):
            results.append(await audit_route(page, first_href))
        else:
            print("[axe] WARNING: no seeded project found; /projects/$projectId not audited", file=sys.stderr)

        await browser.close()

    total = sum(r["Count"] for r in results)
    status = "Passed" if total == 0 else "Failed"
    report = {"Status": status, "Total": total, "Routes": results, "Ruleset": "wcag2a+wcag2aa"}
    REPORT_PATH.write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    return 0 if total == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
