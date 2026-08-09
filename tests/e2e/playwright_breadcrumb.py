"""Plan 66 SH-03: multi-segment breadcrumb resolves dynamic route params.

Seeds a project via zustand-persist localStorage, navigates to a deep
`/projects/$projectId/rulesets` route, and asserts the breadcrumb shows
the project NAME (not the raw ID). Also asserts no hydration error is
emitted on the console.
"""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path(__file__).parent.parent / "reports"
SHOTS = OUT / "screenshots" / "plan66" / "05-breadcrumb"
SHOTS.mkdir(parents=True, exist_ok=True)

PROJECT_ID = "01hjkmultisegtest0000000001"
PROJECT_NAME = "Multi-Segment Breadcrumb Fixture"

async def main() -> int:
    async with async_playwright() as pw:
        browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await ctx.new_page()
        console = []
        page.on("console", lambda m: console.append(f"{m.type}:{m.text}"))
        await page.goto("http://localhost:8080/", wait_until="commit")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=8000)
        except Exception:
            pass
        seed = {
            "state": {
                "projects": {PROJECT_ID: {"id": PROJECT_ID, "name": PROJECT_NAME, "createdAt": 1, "rulesetIds": []}},
                "rulesets": {},
            },
            "version": 0,
        }
        await page.evaluate(f"window.localStorage.setItem('ca:projects:v1', {json.dumps(json.dumps(seed))})")
        await page.goto(f"http://localhost:8080/projects/{PROJECT_ID}/rulesets", wait_until="commit")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=8000)
        except Exception:
            pass
        await page.wait_for_selector('nav[aria-label="Breadcrumb"]')
        # wait for hydration + resolver pass
        await page.wait_for_function(
            f"() => document.querySelector('nav[aria-label=\"Breadcrumb\"]').innerText.includes({json.dumps(PROJECT_NAME)})",
            timeout=5000,
        )
        await page.screenshot(path=str(SHOTS / "1_project_rulesets.png"))
        crumb_text = await page.locator('nav[aria-label="Breadcrumb"]').inner_text()
        errors = [c for c in console if c.startswith("error:")]
        hydration_errors = [c for c in errors if "Hydration failed" in c]
        result = {
            "route": f"/projects/{PROJECT_ID}/rulesets",
            "crumb_text": crumb_text,
            "shows_project_name": PROJECT_NAME in crumb_text,
            "hides_raw_id": PROJECT_ID not in crumb_text,
            "hydration_errors": hydration_errors,
        }
        (OUT / "e2e-breadcrumb.json").write_text(json.dumps(result, indent=2))
        await browser.close()
        print(json.dumps(result, indent=2))
        ok = result["shows_project_name"] and result["hides_raw_id"] and not hydration_errors
        return 0 if ok else 1

sys.exit(asyncio.run(main()))
