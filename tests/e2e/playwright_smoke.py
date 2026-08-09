import asyncio
import json
import os
import re
from pathlib import Path

from playwright.async_api import async_playwright, expect


BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
REPORT_PATH = Path("tests/reports/e2e-smoke.json")
LOCKED_LABELS = ["Setup", "ROI", "Reference", "Camera", "Trigger", "Lighting"]
events: list[dict[str, str]] = []


def record(name: str, status: str, detail: str) -> None:
    events.append({"Name": name, "Status": status, "Detail": detail})


async def open_home(page) -> None:
    await page.goto(BASE_URL, wait_until="domcontentloaded")
    await expect(page.get_by_role("heading", name="Pick a workflow")).to_be_visible()
    record("boot", "Passed", page.url)


async def open_setup(page) -> None:
    nav = page.get_by_role("navigation", name="Primary")
    await nav.get_by_role("link", name="Setup").click()
    await page.wait_for_load_state("networkidle")
    await expect(page.get_by_role("heading", name="Setup")).to_be_visible()
    record("setup", "Passed", page.url)


async def start_run(page) -> None:
    nav = page.get_by_role("navigation", name="Primary")
    await nav.get_by_role("link", name="Run").click()
    await page.wait_for_load_state("networkidle")
    await expect(page.get_by_role("heading", name="Run")).to_be_visible()
    await page.get_by_role("button", name="Start").click()
    await expect(page.get_by_role("button", name="Stop")).to_be_visible()
    await expect(page.get_by_text("Live frames…")).to_be_visible()
    record("run-start", "Passed", page.url)


async def assert_nav_lock(page) -> None:
    nav = page.get_by_role("navigation", name="Primary")
    for label in LOCKED_LABELS:
        await expect(nav.get_by_text(label, exact=True)).to_have_attribute("aria-disabled", "true")
    record("run-lock", "Passed", ",".join(LOCKED_LABELS))


def parse_counts(text: str) -> tuple[int, int]:
    total_match = re.search(r"TOTAL\s+(\d+)", text)
    ng_match = re.search(r"FAIL\s+(\d+)", text)
    total = int(total_match.group(1)) if total_match else 0
    ng = int(ng_match.group(1)) if ng_match else 0
    return total, ng


async def wait_for_results(page) -> tuple[int, int]:
    for _ in range(30):
        await page.wait_for_timeout(200)
        total, ng = parse_counts(await page.locator("main").inner_text())
        if total > 0 and ng > 0:
            return total, ng
    text = await page.locator("main").inner_text()
    total, ng = parse_counts(text)
    raise AssertionError(f"run produced no NG result row before results navigation: total={total}, ng={ng}")


async def open_results(page, total: int, ng: int) -> None:
    nav = page.get_by_role("navigation", name="Primary")
    await nav.get_by_role("link", name="Results").click()
    await page.wait_for_load_state("networkidle")
    await expect(page.get_by_role("heading", name="Results")).to_be_visible()
    await expect(page.get_by_text(re.compile(r"\d+ total · \d+ OK · \d+ NG"))).to_be_visible()
    await expect(page.get_by_role("cell", name="NG").first).to_be_visible()
    record("results", "Passed", f"total>={total}; ng>={ng}")


def write_report(status: str) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {"Suite": "boot-setup-run-results", "Status": status, "Events": events}
    REPORT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


async def run() -> None:
    async with async_playwright() as playwright:
        browser = await getattr(playwright, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        await open_home(page)
        await open_setup(page)
        await start_run(page)
        await assert_nav_lock(page)
        total, ng = await wait_for_results(page)
        await open_results(page, total, ng)
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