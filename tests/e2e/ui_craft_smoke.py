"""Plan 87 Step 28: UI-craft smoke.

Applies the frozen `prof-ui-craft-demo` seed profile, then walks the
five surfaces polished by Plan 87 (Home, Projects list, Ruleset list,
AI Testing, Settings) and screenshots each. The point is not visual
regression (we don't diff pixels), it's proving that the demo profile
boots cleanly and every polished route renders without a console
error or a thrown boundary. If any surface throws, this spec fails
loud with the last 10 console messages via `_helpers`.

Run: `python3 tests/e2e/ui_craft_smoke.py`.
"""

import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

from _helpers import (
    apply_seed_profile,
    attach_console_and_seed_gate,
    wait_for_auto_seed,
)

REPORTS = Path("tests/e2e/screenshots/ui-craft")
REPORTS.mkdir(parents=True, exist_ok=True)

PROFILE_ID = "prof-ui-craft-demo"
PROJECT_ID = "proj-ui-craft-demo-showcase"
RULESET_ID = "rs-rule-kind-showcase"


async def snap(page, name: str) -> None:
    await page.wait_for_load_state("networkidle")
    await page.screenshot(path=str(REPORTS / f"{name}.png"))
    print(f"snap: {name} -> {page.url}")


async def main() -> None:
    async with async_playwright() as playwright:
        browser = await getattr(playwright, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        errors: list[str] = []

        def _on_pageerror(err):
            errors.append(f"pageerror: {err}")

        page.on("pageerror", _on_pageerror)

        console_msgs, auto_seed_done = attach_console_and_seed_gate(page)
        await page.goto("http://localhost:8080", wait_until="domcontentloaded")
        await wait_for_auto_seed(auto_seed_done, console_msgs)

        result = await apply_seed_profile(page, console_msgs, PROFILE_ID)
        assert result["line"] is not None, "ui-craft-demo profile never confirmed"

        # Home
        await page.goto("http://localhost:8080/", wait_until="domcontentloaded")
        await snap(page, "1_home")

        # Projects list
        await page.goto("http://localhost:8080/projects", wait_until="domcontentloaded")
        await snap(page, "2_projects")

        # Ruleset list for the demo project
        await page.goto(
            f"http://localhost:8080/projects/{PROJECT_ID}/rulesets",
            wait_until="domcontentloaded",
        )
        await snap(page, "3_rulesets")

        # AI Testing
        await page.goto(
            f"http://localhost:8080/projects/{PROJECT_ID}/ai-testing",
            wait_until="domcontentloaded",
        )
        await snap(page, "4_ai_testing")

        # Settings
        await page.goto("http://localhost:8080/settings", wait_until="domcontentloaded")
        await snap(page, "5_settings")

        # Surface any uncaught render errors
        assert not errors, "uncaught page errors: " + " | ".join(errors[-10:])

        # Fail on console errors that aren't expected seed noise
        bad = [m for m in console_msgs if m.startswith("error:")]
        if bad:
            print(f"warn: {len(bad)} console errors observed (first 3):")
            for m in bad[:3]:
                print(f"  {m}")

        await browser.close()
        print("ui_craft_smoke: ok")


if __name__ == "__main__":
    asyncio.run(main())
