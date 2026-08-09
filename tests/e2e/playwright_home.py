"""
Home page Playwright suite.

Asserts:
  1. Primary CTA falls back to "Create your first project" and routes to
     `/projects?new=1` when the recent-projects store is empty.
  2. With a seeded recent project the CTA becomes "Continue <name>" and
     opens the project landing page, and the "Create project" button
     stays visible and routes to `/projects?new=1`.
  3. The "Control Automation" status pill and the "Recent" status chip
     render on both states (chip reflects the seeded count).

Run: `python3 tests/e2e/playwright_home.py`
Reports to `tests/reports/e2e-home.json` and screenshots to
`tests/reports/screenshots/home/`.
"""

import asyncio
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright, expect

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
REPORT_PATH = Path("tests/reports/e2e-home.json")
SHOT_DIR = Path("tests/reports/screenshots/home")

RECENT_KEY = "ca.recent-projects.v1"
SEED_PROJECT_ID = "proj-home-e2e"
SEED_PROJECT_NAME = "Home E2E Project"

events: list[dict[str, str]] = []


def record(name: str, status: str, detail: str) -> None:
    events.append({"Name": name, "Status": status, "Detail": detail})


async def clear_recent(page) -> None:
    await page.evaluate(f"window.localStorage.removeItem({json.dumps(RECENT_KEY)})")


async def seed_recent(page) -> None:
    payload = {
        "state": {
            "entries": [
                {
                    "projectId": SEED_PROJECT_ID,
                    "name": SEED_PROJECT_NAME,
                    "openedAt": 1_700_000_000_000,
                }
            ]
        },
        "version": 0,
    }
    await page.evaluate(
        "([k, v]) => window.localStorage.setItem(k, v)",
        [RECENT_KEY, json.dumps(payload)],
    )


async def assert_status_pill(page) -> None:
    # Scope to <main> to skip the Titlebar's app-name label.
    pill = page.get_by_role("main").get_by_text("Control Automation", exact=True)
    await expect(pill).to_be_visible()


async def assert_recent_chip(page, expected_count: int) -> None:
    chip = page.get_by_role("button", name="Recent projects")
    await expect(chip).to_be_visible()
    await expect(chip).to_contain_text(f"({expected_count})")


async def empty_state(page) -> None:
    await page.goto(BASE_URL, wait_until="domcontentloaded")
    await clear_recent(page)
    await page.reload(wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle")

    await assert_status_pill(page)
    await assert_recent_chip(page, expected_count=0)

    cta = page.get_by_test_id("home-primary-cta")
    await expect(cta).to_be_visible()
    await expect(cta).to_have_text("Create your first project")
    # Create button is hidden when there is no recent project (see PrimaryCta).
    await expect(page.get_by_test_id("home-create-project")).to_have_count(0)

    SHOT_DIR.mkdir(parents=True, exist_ok=True)
    await page.screenshot(path=str(SHOT_DIR / "1_empty.png"))

    await cta.click()
    await page.wait_for_url("**/projects?new=1")
    record("empty-cta-route", "Passed", page.url)


async def seeded_state(page) -> None:
    await page.goto(BASE_URL, wait_until="domcontentloaded")
    await seed_recent(page)
    await page.reload(wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle")

    await assert_status_pill(page)
    await assert_recent_chip(page, expected_count=1)

    cta = page.get_by_test_id("home-primary-cta")
    await expect(cta).to_be_visible()
    await expect(cta).to_have_text(f"Continue {SEED_PROJECT_NAME}")

    create_btn = page.get_by_test_id("home-create-project")
    await expect(create_btn).to_be_visible()

    await page.screenshot(path=str(SHOT_DIR / "2_seeded.png"))

    # Create button routes to /projects?new=1 regardless of recent state.
    await create_btn.click()
    await page.wait_for_url("**/projects?new=1")
    record("seeded-create-route", "Passed", page.url)

    # Back to Home to exercise the Continue CTA.
    await page.goto(BASE_URL, wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle")
    await page.get_by_test_id("home-primary-cta").click()
    await page.wait_for_url(f"**/projects/{SEED_PROJECT_ID}")
    record("seeded-continue-route", "Passed", page.url)


def write_report(status: str) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {"Suite": "home", "Status": status, "Events": events}
    REPORT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


async def run() -> None:
    async with async_playwright() as playwright:
        browser = await getattr(playwright, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        console_errors: list[str] = []
        page.on(
            "console",
            lambda msg: console_errors.append(msg.text) if msg.type == "error" else None,
        )
        try:
            await empty_state(page)
            await seeded_state(page)
            if console_errors:
                record("console", "Warning", " | ".join(console_errors[:5]))
        finally:
            await browser.close()


async def main() -> None:
    try:
        await run()
        write_report("Passed")
    except Exception as exc:
        record("error", "Failed", str(exc))
        write_report("Failed")
        raise


if __name__ == "__main__":
    asyncio.run(main())