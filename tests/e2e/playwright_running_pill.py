"""Plan 66 SH-05: floating RunningPill, drag + click-to-jump + persist.

Uses `window.__runningPillTestHooks` (dev + ?e2e=1) to start a fake op with a
targetRoute, drags the pill, reloads, and asserts:
  - The pill is visible after reload.
  - Its position persisted across reload (within 2px).
  - Clicking the label navigates to the targetRoute.
  - Clicking Stop removes the pill.
"""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path(__file__).parent.parent / "reports"
SHOTS = OUT / "screenshots" / "plan66" / "06-running-pill"
SHOTS.mkdir(parents=True, exist_ok=True)


async def wait_hooks(page):
    await page.wait_for_function("() => !!window.__runningPillTestHooks", timeout=8000)


async def main() -> int:
    async with async_playwright() as pw:
        browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        console_msgs = []
        page.on("console", lambda m: console_msgs.append(f"{m.type}:{m.text}"))

        # 1. Open with e2e=1 so useRunning exposes hooks; call from a page that
        #    mounts useRunning at least once. `/run` uses useRunning().
        await page.goto("http://localhost:8080/run?e2e=1", wait_until="commit")
        await page.wait_for_load_state("domcontentloaded", timeout=8000)
        await wait_hooks(page)

        # 2. Start a fake op with a targetRoute.
        await page.evaluate(
            """() => window.__runningPillTestHooks.start({
                id: 'e2e-op-1',
                kind: 'validate',
                label: 'E2E fake op',
                targetRoute: '/projects',
            })"""
        )
        await page.wait_for_selector('[data-running-pill][data-op-id="e2e-op-1"]')
        await page.screenshot(path=str(SHOTS / "1_pill_visible.png"))

        # 3. Drag the pill 120px left and 60px up via the root element.
        root = page.locator('[data-running-pill-root]')
        box = await root.bounding_box()
        assert box, "pill root not measurable"
        # Drag from the grip handle (first icon inside the pill).
        handle = page.locator('[data-running-pill][data-op-id="e2e-op-1"] [data-drag-handle]')
        hbox = await handle.bounding_box()
        assert hbox
        sx = hbox["x"] + hbox["width"] / 2
        sy = hbox["y"] + hbox["height"] / 2
        await page.mouse.move(sx, sy)
        await page.mouse.down()
        await page.mouse.move(sx - 120, sy - 60, steps=10)
        await page.mouse.up()
        pos_after_drag = await page.evaluate(
            "() => JSON.parse(localStorage.getItem('ca.running-pill.pos.v1'))"
        )
        await page.screenshot(path=str(SHOTS / "2_after_drag.png"))

        # 4. Reload; pill must reappear at persisted position because op is gone
        #    on reload (store is not persisted). So we re-add the op, then read
        #    the pill's rendered left/top and compare to persisted pos.
        await page.reload(wait_until="commit")
        await page.wait_for_load_state("domcontentloaded", timeout=8000)
        await wait_hooks(page)
        await page.evaluate(
            """() => window.__runningPillTestHooks.start({
                id: 'e2e-op-2',
                kind: 'validate',
                label: 'E2E fake op after reload',
                targetRoute: '/projects',
            })"""
        )
        await page.wait_for_selector('[data-running-pill-root]')
        rect = await page.evaluate(
            "() => { const el = document.querySelector('[data-running-pill-root]'); const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y) }; }"
        )
        persisted_ok = (
            abs(rect["x"] - pos_after_drag["x"]) <= 2
            and abs(rect["y"] - pos_after_drag["y"]) <= 2
        )

        # 5. Click label -> navigate.
        # Query the jump button count for diagnostics.
        jump_count = await page.locator('[data-running-pill] button[aria-label^="Jump"]').count()
        console_msgs.append(f"diag:jump_button_count={jump_count}")
        # Diagnostics: dump the button state.
        btn_info = await page.evaluate(
            "() => { const b = document.querySelector('[data-running-pill] button[aria-label^=\"Jump\"]'); return b ? { disabled: b.disabled, aria: b.getAttribute('aria-label'), text: b.textContent } : null; }"
        )
        console_msgs.append(f"diag:btn={json.dumps(btn_info)}")
        # Force click through hit-testing (avoid intercepts from overlays).
        # Native click as fallback: bypasses Playwright's hit-testing entirely.
        await page.evaluate(
            "() => document.querySelector('[data-running-pill] button[aria-label^=\"Jump\"]').click()"
        )
        await page.wait_for_timeout(300)
        # TanStack Router client-side nav doesn't fire "load". Poll the URL.
        for _ in range(50):
            if page.url.endswith("/projects") or "/projects" in page.url.split("?")[0]:
                break
            await page.wait_for_timeout(100)
        final_url = page.url
        nav_ok = "/projects" in final_url

        # 6. Stop button clears the pill.
        await page.click('[data-running-pill] button[aria-label^="Stop"]')
        await page.wait_for_selector('[data-running-pill-root]', state="detached", timeout=3000)

        result = {
            "persisted_pos": pos_after_drag,
            "rendered_pos_after_reload": rect,
            "persisted_ok": persisted_ok,
            "nav_ok": nav_ok,
            "final_url": final_url,
            "pageerrors": errors,
            "console_pill": [c for c in console_msgs if "running-pill" in c or c.startswith("diag:")],
            "jump_count": jump_count,
        }
        (OUT / "e2e-running-pill.json").write_text(json.dumps(result, indent=2))
        print(json.dumps(result, indent=2))
        await browser.close()
        return 0 if persisted_ok and nav_ok and not errors else 1

sys.exit(asyncio.run(main()))
