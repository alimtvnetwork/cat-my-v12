"""Plan 66 SH-07: editor-scoped Window menu + Cmd+Shift+P collision fix.

Asserts:
  1. Window menu is hidden on `/projects` (non-editor route).
  2. Window menu appears on `/setup` editor and lists panel commands.
  3. Cmd/Ctrl+Shift+P opens exactly one dialog (the global CommandPalette),
     not two (previously PanelSearchPalette also grabbed it).
"""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path(__file__).parent.parent / "reports"
SHOTS = OUT / "screenshots" / "plan66" / "08-window-menu"
SHOTS.mkdir(parents=True, exist_ok=True)


async def main() -> int:
    async with async_playwright() as pw:
        browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))

        await page.goto("http://localhost:8080/projects", wait_until="domcontentloaded")
        await page.wait_for_load_state("networkidle", timeout=6000)

        window_btn = page.locator('button[aria-label="Window menu"]')
        window_hidden_on_projects = await window_btn.count() == 0
        await page.screenshot(path=str(SHOTS / "1_projects_without_window_menu.png"))

        await page.goto("http://localhost:8080/setup?e2e=1", wait_until="domcontentloaded")
        await page.wait_for_load_state("networkidle", timeout=6000)
        await window_btn.first.wait_for(state="visible", timeout=4000)
        await page.screenshot(path=str(SHOTS / "2_setup_with_window_menu.png"))

        await window_btn.first.click()
        await page.wait_for_selector('text=Reset Workspace Layout', timeout=3000)
        panels_visible = await page.locator('[role="menuitem"]').count()
        await page.screenshot(path=str(SHOTS / "3_menu_open.png"))
        await page.keyboard.press("Escape")

        # 3. Cmd+Shift+P opens exactly one palette (not two).
        await page.keyboard.press("Control+Shift+KeyP")
        await page.wait_for_timeout(400)
        dialogs = await page.locator('[role="dialog"]').count()
        cmd_palette = await page.locator('[role="dialog"][aria-label="Command palette"]').count()
        await page.screenshot(path=str(SHOTS / "4_ctrl_shift_p.png"))

        result = {
            "window_hidden_on_projects": window_hidden_on_projects,
            "window_menu_items_count": panels_visible,
            "dialogs_open_on_ctrl_shift_p": dialogs,
            "command_palette_open": cmd_palette,
            "pageerrors": errs,
        }
        (OUT / "e2e-window-menu.json").write_text(json.dumps(result, indent=2))
        print(json.dumps(result, indent=2))
        await browser.close()
        ok = window_hidden_on_projects and panels_visible >= 3 and dialogs == 1 and cmd_palette == 1 and not errs
        return 0 if ok else 1

sys.exit(asyncio.run(main()))
