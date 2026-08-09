"""Plan 66 SH-06: global Command Palette.

Asserts the palette opens on non-HmiShell routes (`/projects`) via both
Cmd/Ctrl+K and Cmd/Ctrl+Shift+P, filters by fuzzy match, and Enter
navigates to the selected entry.
"""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path(__file__).parent.parent / "reports"
SHOTS = OUT / "screenshots" / "plan66" / "07-command-palette"
SHOTS.mkdir(parents=True, exist_ok=True)


async def main() -> int:
    async with async_playwright() as pw:
        browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))

        # Route without HmiShell.
        await page.goto("http://localhost:8080/projects", wait_until="domcontentloaded")
        await page.wait_for_load_state("networkidle", timeout=5000)

        # 1. Ctrl+K opens.
        await page.keyboard.press("Control+k")
        await page.wait_for_selector('[role="dialog"][aria-label="Command palette"]', timeout=3000)
        await page.screenshot(path=str(SHOTS / "1_open_ctrl_k.png"))
        await page.keyboard.press("Escape")
        await page.wait_for_selector('[role="dialog"][aria-label="Command palette"]', state="detached", timeout=2000)

        # 2. Ctrl+Shift+P opens.
        await page.keyboard.press("Control+Shift+KeyP")
        await page.wait_for_selector('[role="dialog"][aria-label="Command palette"]', timeout=3000)
        await page.screenshot(path=str(SHOTS / "2_open_ctrl_shift_p.png"))

        # 3. Type "setup", Enter -> navigates to /setup.
        await page.keyboard.type("setup", delay=20)
        await page.wait_for_timeout(150)
        await page.keyboard.press("Enter")
        for _ in range(50):
            if "/setup" in page.url:
                break
            await page.wait_for_timeout(100)
        nav_ok = "/setup" in page.url
        await page.screenshot(path=str(SHOTS / "3_after_enter.png"))

        result = {
            "opened_via_ctrl_k": True,
            "opened_via_ctrl_shift_p": True,
            "final_url": page.url,
            "nav_ok": nav_ok,
            "pageerrors": errs,
        }
        (OUT / "e2e-command-palette.json").write_text(json.dumps(result, indent=2))
        print(json.dumps(result, indent=2))
        await browser.close()
        return 0 if nav_ok and not errs else 1

sys.exit(asyncio.run(main()))
