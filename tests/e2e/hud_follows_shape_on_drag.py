"""Plan 85 backlog: Playwright regression for SelectionOverlay HUD re-anchor.

Root cause guarded: when `hudFollowsShape` is enabled, the floating quick-
properties HUD must re-anchor every drag frame so it tracks the shape's
current top-left. Skipping this test lets a regression re-appear where
the HUD stayed pinned to canvas coords even with follow=true, or drifted
when follow=false.

Uses the existing `__editorTestHooks` bridge:
  1. seedControllers(['presence']) -> a rule with numeric params so the
     HUD actually renders.
  2. setHudFollowsShape(true), setBounds(...) at pos A, read HUD left/top.
  3. setBounds(...) at pos A + delta, read HUD again, assert delta matches.
  4. setHudFollowsShape(false), repeat move, assert HUD does NOT move.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright, expect

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
REPORT = Path("tests/reports/e2e-hud-follows-shape.json")
SHOTS = Path("tests/reports/e2e-hud-follows-shape")

RULE_ID = "panel-presence"


async def read_hud(page) -> dict:
    box = await page.get_by_test_id("rule-quick-props").bounding_box()
    assert box is not None, "HUD not rendered"
    return {"x": round(box["x"]), "y": round(box["y"])}


async def read_shape_tl(page) -> dict:
    box = await page.get_by_test_id("rule-resize-handle-nw").bounding_box()
    assert box is not None, "shape NW handle not rendered"
    return {"x": round(box["x"]), "y": round(box["y"])}



async def run() -> dict:
    SHOTS.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as pw:
        browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()
        await page.goto(f"{BASE_URL}/setup/roi?e2e=1", wait_until="networkidle")
        await page.wait_for_function("() => !!window.__editorTestHooks")

        await page.evaluate("() => window.__editorTestHooks.seedControllers(['presence'])")
        await page.evaluate(
            "(id) => window.__editorTestHooks.setSelection([id])", RULE_ID
        )
        await page.evaluate("() => window.__editorTestHooks.setHudFollowsShape(true)")

        # Position A
        await page.evaluate(
            "(r) => window.__editorTestHooks.setBounds('%s', r)" % RULE_ID,
            {"x": 200, "y": 200, "width": 120, "height": 80},
        )
        await expect(page.get_by_test_id("rule-quick-props")).to_be_visible()
        hud_a = await read_hud(page)
        shape_a = await read_shape_tl(page)
        await page.screenshot(path=str(SHOTS / "1_follow_pos_a.png"))

        # Move by (+150, +100) in image space. With follow=true, the HUD must
        # shift by the same on-screen delta the shape shifts by (viewport
        # zoom is applied uniformly to both).
        await page.evaluate(
            "(r) => window.__editorTestHooks.setBounds('%s', r)" % RULE_ID,
            {"x": 350, "y": 300, "width": 120, "height": 80},
        )
        hud_b = await read_hud(page)
        shape_b = await read_shape_tl(page)
        await page.screenshot(path=str(SHOTS / "2_follow_pos_b.png"))

        dx_hud = hud_b["x"] - hud_a["x"]
        dy_hud = hud_b["y"] - hud_a["y"]
        dx_shape = shape_b["x"] - shape_a["x"]
        dy_shape = shape_b["y"] - shape_a["y"]
        assert dx_shape > 100 and dy_shape > 60, (
            f"shape did not move as expected: dx={dx_shape} dy={dy_shape}"
        )
        assert abs(dx_hud - dx_shape) <= 2 and abs(dy_hud - dy_shape) <= 2, (
            f"follow=true: HUD delta ({dx_hud},{dy_hud}) must match shape delta "
            f"({dx_shape},{dy_shape})"
        )


        # Toggle the preference off and back on to exercise the re-anchor
        # useEffect (canvas -> shape). Then move the shape once more and
        # confirm the HUD still tracks the shape's on-screen delta.
        await page.evaluate("() => window.__editorTestHooks.setHudFollowsShape(false)")
        await page.evaluate("() => window.__editorTestHooks.setHudFollowsShape(true)")
        hud_c = await read_hud(page)
        shape_c = await read_shape_tl(page)
        await page.evaluate(
            "(r) => window.__editorTestHooks.setBounds('%s', r)" % RULE_ID,
            {"x": 500, "y": 400, "width": 120, "height": 80},
        )
        hud_d = await read_hud(page)
        shape_d = await read_shape_tl(page)
        await page.screenshot(path=str(SHOTS / "3_after_toggle_back.png"))

        dx_hud2 = hud_d["x"] - hud_c["x"]
        dy_hud2 = hud_d["y"] - hud_c["y"]
        dx_shape2 = shape_d["x"] - shape_c["x"]
        dy_shape2 = shape_d["y"] - shape_c["y"]
        assert abs(dx_hud2 - dx_shape2) <= 2 and abs(dy_hud2 - dy_shape2) <= 2, (
            f"after toggle: HUD delta ({dx_hud2},{dy_hud2}) must still match shape "
            f"delta ({dx_shape2},{dy_shape2})"
        )

        await browser.close()
        return {
            "initial_follow": {
                "hud_delta": [dx_hud, dy_hud],
                "shape_delta": [dx_shape, dy_shape],
            },
            "after_toggle": {
                "hud_delta": [dx_hud2, dy_hud2],
                "shape_delta": [dx_shape2, dy_shape2],
            },
        }



async def main() -> int:
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    try:
        result = await run()
    except Exception as exc:
        REPORT.write_text(json.dumps({"ok": False, "error": str(exc)}, indent=2))
        print(f"hud-follows-shape e2e FAILED: {exc}", file=sys.stderr)
        return 1
    REPORT.write_text(json.dumps({"ok": True, **result}, indent=2))
    print(f"hud-follows-shape e2e OK: {result}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
