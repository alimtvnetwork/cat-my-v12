"""Plan 64 step 58: assert top-nav items do not shift on hover (CLS-safe).

Reads bounding boxes for each primary nav link, hovers each in turn, and
verifies x/y/width/height are unchanged. No CSS transitions on layout
properties are allowed on the top nav.
"""
import asyncio
import os
from playwright.async_api import async_playwright, expect

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
NAV_LABELS = ["Home", "Project", "Setup", "Rules", "Test", "Run", "Settings", "Help"]


async def main() -> None:
    async with async_playwright() as pw:
        browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await ctx.new_page()
        await page.goto(BASE_URL, wait_until="domcontentloaded")
        nav = page.get_by_role("navigation", name="Primary")
        await expect(nav).to_be_visible()
        boxes_before: dict[str, dict] = {}
        for label in NAV_LABELS:
            link = nav.get_by_role("link", name=label)
            if await link.count() == 0:
                continue
            boxes_before[label] = await link.bounding_box() or {}
        for label, before in boxes_before.items():
            link = nav.get_by_role("link", name=label)
            await link.hover()
            await page.wait_for_timeout(120)
            after = await link.bounding_box() or {}
            for k in ("x", "y", "width", "height"):
                assert abs((before.get(k, 0)) - (after.get(k, 0))) < 0.5, (
                    f"nav '{label}' shifted on hover: {k} {before[k]} -> {after[k]}"
                )
        print("topnav_hover_no_shift: OK", list(boxes_before))
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
