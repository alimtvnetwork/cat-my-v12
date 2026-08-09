"""Plan 30 step 96: Axe WCAG AA sweep across /setup, /setup/roi, /setup/reference.

Root cause: color contrast + a11y regressions on the editor routes ship silent
without a dedicated Axe gate. This suite fails on any color-contrast violation
and reports (but does not fail) other WCAG AA findings for triage.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
AXE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.0/axe.min.js"
REPORT = Path("tests/reports/a11y-axe-editor.json")
ROUTES = ["/setup", "/setup/roi", "/setup/reference"]
OPTS = {"runOnly": {"type": "tag", "values": ["wcag2a", "wcag2aa"]}}
PANEL_CONTROLLERS = ["number", "color", "blob", "pattern"]


async def audit(page, path: str) -> dict:
    url = f"{BASE_URL}{path}"
    await page.goto(url, wait_until="networkidle")
    await page.add_script_tag(url=AXE_CDN)
    result = await page.evaluate("async (o) => await window.axe.run(document, o)", OPTS)
    violations = [
        {"Id": v["id"], "Impact": v.get("impact"), "Nodes": len(v.get("nodes", [])), "Help": v.get("help")}
        for v in result.get("violations", [])
    ]
    contrast = sum(1 for v in violations if v["Id"] == "color-contrast")
    return {"Route": path, "Url": url, "Violations": violations, "Count": len(violations), "ContrastViolations": contrast}


async def audit_panel(page, controller: str) -> dict:
    url = f"{BASE_URL}/setup?e2e=1"
    await page.goto(url, wait_until="networkidle")
    await page.wait_for_function("() => !!window.__editorTestHooks")
    await page.evaluate("(kinds) => window.__editorTestHooks.seedControllers(kinds)", PANEL_CONTROLLERS)
    await page.locator(f"#rule-row-panel-{controller}").click()
    await page.add_script_tag(url=AXE_CDN)
    result = await page.evaluate("async (o) => await window.axe.run(document, o)", OPTS)
    violations = [
        {"Id": v["id"], "Impact": v.get("impact"), "Nodes": len(v.get("nodes", [])), "Help": v.get("help")}
        for v in result.get("violations", [])
    ]
    contrast = sum(1 for v in violations if v["Id"] == "color-contrast")
    return {"Panel": controller, "Url": url, "Violations": violations, "Count": len(violations), "ContrastViolations": contrast}


async def main() -> int:
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    results = []
    async with async_playwright() as pw:
        browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()
        for r in ROUTES:
            results.append(await audit(page, r))
        for controller in PANEL_CONTROLLERS:
            results.append(await audit_panel(page, controller))
        await browser.close()
    contrast_total = sum(r["ContrastViolations"] for r in results)
    other_total = sum(r["Count"] - r["ContrastViolations"] for r in results)
    status = "Passed" if contrast_total == 0 else "Failed"
    REPORT.write_text(json.dumps({
        "Status": status,
        "Ruleset": "wcag2a+wcag2aa",
        "Gate": "zero color-contrast violations on /setup*",
        "ContrastViolations": contrast_total,
        "OtherViolations": other_total,
        "Routes": results,
    }, indent=2) + "\n")
    print(json.dumps({"status": status, "contrast": contrast_total, "other": other_total}, indent=2))
    return 0 if contrast_total == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
