"""Plan 66 SH-04: hybrid Back button (history first, route-parent fallback)."""
import asyncio, json, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
REPORT = Path("tests/reports/e2e-back-button.json")
SHOTS = Path("tests/reports/screenshots/plan66/04-back-button")

async def run() -> dict:
    SHOTS.mkdir(parents=True, exist_ok=True)
    events: list[dict] = []
    nav_logs: list[str] = []
    async with async_playwright() as p:
        b = await getattr(p, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page()
        pg.on("console", lambda m: nav_logs.append(m.text) if "nav.back" in m.text else None)

        # 1. Deep-link with no history -> route-parent fallback.
        await pg.goto(f"{BASE}/setup/rules", wait_until="networkidle")
        await pg.wait_for_timeout(600)
        await pg.screenshot(path=str(SHOTS / "1_deeplink.png"))
        await pg.get_by_role("button", name="Go back").click()
        await pg.wait_for_timeout(400)
        events.append({"step": "route-parent", "url": pg.url})
        assert pg.url.endswith("/setup"), f"expected /setup, got {pg.url}"

        # 2. Now history exists -> history.back path.
        await pg.get_by_role("button", name="Go back").click()
        await pg.wait_for_timeout(400)
        events.append({"step": "history-back", "url": pg.url})
        assert pg.url.endswith("/setup/rules"), f"expected /setup/rules, got {pg.url}"

        # 3. Both log lines fired.
        assert any("via=route-parent" in l for l in nav_logs), f"missing route-parent log: {nav_logs}"
        assert any("via=history" in l for l in nav_logs), f"missing history log: {nav_logs}"
        await pg.screenshot(path=str(SHOTS / "2_after_back.png"))

        await b.close()
    return {"events": events, "nav_logs": nav_logs}

def main() -> int:
    try:
        out = asyncio.run(run())
        REPORT.parent.mkdir(parents=True, exist_ok=True)
        REPORT.write_text(json.dumps({"Suite": "back-button", "Status": "Passed", **out}, indent=2) + "\n")
        print(json.dumps({"status": "Passed", **out}, indent=2))
        return 0
    except Exception as exc:
        REPORT.parent.mkdir(parents=True, exist_ok=True)
        REPORT.write_text(json.dumps({"Suite": "back-button", "Status": "Failed", "Error": str(exc)}, indent=2) + "\n")
        print("Failed:", exc)
        return 1

if __name__ == "__main__":
    sys.exit(main())
