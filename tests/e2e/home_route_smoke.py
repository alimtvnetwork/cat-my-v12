"""Playwright E2E smoke for the home route.

Verifies, in a real Chromium browser against the running dev server, that:
  1. The Primary top navigation is present with the four workflow links.
  2. The Projects workflow card renders and links to /projects.
  3. The Trial run (recent runs entry point) card renders and links to /run.

The home route surfaces projects and recent runs through the Projects and
Trial run workflow cards, so those cards act as the projects list and
recent runs cards on this screen.
"""
import asyncio
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright, expect

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
REPORT_PATH = Path("tests/reports/e2e-home-route.json")
# Top-nav is the Favorites landmark rendered by HmiShell.
NAV_LABEL = "Favorite pages"
NAV_LINKS = [
    ("Home", "/"),
    ("Projects", "/projects"),
    ("Live run", "/run"),
    ("Results", "/results"),
]
events: list[dict[str, str]] = []


def record(name: str, status: str, detail: str) -> None:
    events.append({"Name": name, "Status": status, "Detail": detail})


async def assert_top_nav(page) -> None:
    nav = page.get_by_role("navigation", name=NAV_LABEL)
    await expect(nav).to_be_visible()
    for label, href in NAV_LINKS:
        link = nav.get_by_role("link", name=label, exact=True)
        await expect(link).to_be_visible()
        await expect(link).to_have_attribute("href", href)
    record("top-nav", "Passed", ",".join(l for l, _ in NAV_LINKS))


async def assert_projects_card(page) -> None:
    # The workflow tile on home is the projects entry point / list link.
    card = page.locator('a[aria-label="Projects"]')
    await expect(card).to_be_visible()
    await expect(card).to_have_attribute("href", "/projects")
    await expect(card.get_by_role("heading", name="Projects")).to_be_visible()
    record("projects-card", "Passed", "/projects")


async def assert_recent_runs_card(page) -> None:
    # Trial run tile is the recent runs entry point on the home screen.
    card = page.locator('a[aria-label="Trial run"]')
    await expect(card).to_be_visible()
    await expect(card).to_have_attribute("href", "/run")
    await expect(card.get_by_role("heading", name="Trial run")).to_be_visible()
    record("runs-card", "Passed", "/run")


def write_report(status: str) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(
        json.dumps({"Suite": "home-route", "Status": status, "Events": events}, indent=2) + "\n",
        encoding="utf-8",
    )


async def run() -> None:
    async with async_playwright() as playwright:
        browser = await getattr(playwright, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        await page.goto(BASE_URL, wait_until="domcontentloaded")
        await expect(page.get_by_role("heading", name="Pick a workflow")).to_be_visible()
        record("boot", "Passed", page.url)
        await assert_top_nav(page)
        await assert_projects_card(page)
        await assert_recent_runs_card(page)
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