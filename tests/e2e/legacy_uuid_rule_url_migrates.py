"""Legacy UUID rule URLs should migrate to the integer-alias route and land
on the ROI editor with the original rule id preserved in search params.

Flow: fetch a real projectId/rulesetId by scraping the seeded UI, hit the
legacy URL, and assert the browser lands on `/setup/roi` after two redirect
hops (uuid -> integer alias -> setup/roi).
"""
import asyncio
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.async_api import async_playwright

SCREENSHOTS = Path(__file__).parent / "screenshots" / "legacy_uuid_rule_url"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

LEGACY_UUID = "0f8c1e5a-4b6d-4e7a-9a2c-1234567890ab"


async def main() -> None:
    async with async_playwright() as pw:
        browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # 1) Warm the app and grab a real projectId from the projects list.
        await page.goto("http://localhost:8080/projects", wait_until="networkidle")
        html = await page.content()
        proj_ids = re.findall(r'href="/projects/([0-9a-f-]{36})"', html)
        assert proj_ids, "no project links found on /projects"
        project_id = proj_ids[0]

        # 2) Open that project and grab one of its ruleset ids.
        await page.goto(
            f"http://localhost:8080/projects/{project_id}",
            wait_until="networkidle",
        )
        html = await page.content()
        rs_ids = re.findall(
            rf'href="/projects/{project_id}/rulesets/([0-9a-f-]{{36}})"',
            html,
        )
        assert rs_ids, f"no ruleset links under project {project_id}"
        ruleset_id = rs_ids[0]

        legacy_url = (
            f"http://localhost:8080/projects/{project_id}/rulesets/{ruleset_id}"
            f"/rules/{LEGACY_UUID}"
        )
        print("legacy url:", legacy_url)

        nav_trail: list[str] = []
        page.on(
            "framenavigated",
            lambda f: nav_trail.append(f.url) if f == page.main_frame else None,
        )

        # 3) Hit the legacy URL and wait for the two-hop redirect chain.
        await page.goto(legacy_url, wait_until="domcontentloaded")
        await page.wait_for_url("**/setup/roi**", timeout=10000)
        await page.screenshot(path=str(SCREENSHOTS / "final.png"))

        final = page.url
        print("final url:", final)
        print("nav trail:", nav_trail)

        parsed = urlparse(final)
        qs = parse_qs(parsed.query)
        assert parsed.path.endswith("/setup/roi"), f"expected /setup/roi, got {parsed.path}"
        assert qs.get("project") == [project_id], f"lost project param: {qs}"
        assert qs.get("ruleset") == [ruleset_id], f"lost ruleset param: {qs}"
        assert qs.get("rule") == [LEGACY_UUID], f"legacy uuid not preserved: {qs}"

        int_hop = [
            u for u in nav_trail
            if "/rules/" in u
            and u.rsplit("/rules/", 1)[1].split("?")[0].isdigit()
        ]
        assert int_hop, f"no integer-alias hop observed in {nav_trail}"

        print("OK: legacy uuid migrated through integer alias to ROI editor")
        await browser.close()


asyncio.run(main())
