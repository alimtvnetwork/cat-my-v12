"""Plan 66 SH-01: assert exactly one app-shell header (`header[data-app-shell="true"]`)
mounts across every audited route, and the "Control Automation" wordmark
appears exactly once per route.
"""
import asyncio, json, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
ROUTES = ["/", "/setup", "/setup/rules", "/projects", "/run", "/trial-run"]
REPORT = Path("tests/reports/e2e-single-header.json")
SHOTS = Path("tests/reports/screenshots/plan66/03-single-header/after")

async def run() -> list[dict]:
    SHOTS.mkdir(parents=True, exist_ok=True)
    results: list[dict] = []
    async with async_playwright() as p:
        b = await getattr(p, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 900})
        pg = await ctx.new_page()
        for r in ROUTES:
            await pg.goto(f"{BASE}{r}", wait_until="networkidle")
            await pg.wait_for_timeout(400)
            counts = await pg.evaluate(
                "() => ({ shell: document.querySelectorAll('header[data-app-shell=\"true\"]').length,"
                " wordmark: Array.from(document.querySelectorAll('*')).filter(e => e.childNodes.length===1 && e.textContent.trim()==='Control Automation').length })"
            )
            fname = (r.strip("/").replace("/", "_") or "home") + ".png"
            await pg.screenshot(path=str(SHOTS / fname))
            results.append({"route": r, **counts})
        await b.close()
    return results

def main() -> int:
    results = asyncio.run(run())
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    failures = [r for r in results if r["shell"] != 1 or r["wordmark"] != 1]
    status = "Passed" if not failures else "Failed"
    REPORT.write_text(json.dumps({"Suite": "single-header", "Status": status, "Results": results, "Failures": failures}, indent=2) + "\n")
    print(json.dumps({"status": status, "results": results, "failures": failures}, indent=2))
    return 0 if not failures else 1

if __name__ == "__main__":
    sys.exit(main())
