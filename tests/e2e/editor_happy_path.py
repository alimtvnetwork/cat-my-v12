"""Plan 35 step 21: happy-path e2e across the editor (seed, multi-select,
group, hide/lock, round-trip).

Root cause: unit tests cover panels and hit-test in isolation, but nothing
asserts that the store + LayersPanel + PropertiesPanel wiring survives a
realistic session. This spec drives the store via the existing e2e hooks
and screenshots the editor after each meaningful state change.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright, expect

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
REPORT = Path("tests/reports/e2e-editor-happy-path.json")
SHOTS = Path("tests/reports/e2e-editor-happy-path")


async def run() -> dict:
    SHOTS.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as pw:
        browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()
        await page.goto(f"{BASE_URL}/setup?e2e=1", wait_until="networkidle")
        await expect(page.get_by_role("heading", name="Program 01")).to_be_visible()
        await page.wait_for_function("() => !!window.__editorTestHooks")

        # Seed 3 rules.
        await page.evaluate("() => window.__editorTestHooks.seed(3)")
        rules = await page.evaluate("() => window.__editorTestHooks.getRules()")
        assert len(rules) == 3, f"expected 3 seeded rules, got {len(rules)}"
        ids = [r["id"] for r in rules]
        await page.screenshot(path=str(SHOTS / "1_seeded.png"))

        # Multi-select all three, then group them.
        await page.evaluate("(ids) => window.__editorTestHooks.setSelection(ids)", ids)
        await page.evaluate(
            "() => window.__editorTestHooks.groupSelected('grp-1', 'Group A')"
        )
        groups = await page.evaluate("() => window.__editorTestHooks.getGroups()")
        assert len(groups) == 1 and groups[0]["id"] == "grp-1", f"group missing: {groups}"
        assert set(groups[0]["ruleIds"]) == set(ids), f"group members mismatch: {groups[0]}"
        await expect(page.get_by_text("Group A")).to_be_visible()
        await page.screenshot(path=str(SHOTS / "2_grouped.png"))

        # Hide + lock the whole selection, then confirm store state.
        await page.evaluate("(ids) => window.__editorTestHooks.setHidden(ids, true)", ids)
        await page.evaluate("(ids) => window.__editorTestHooks.setLocked(ids, true)", ids)
        after = await page.evaluate("() => window.__editorTestHooks.getRules()")
        assert all(r["isHidden"] for r in after), "expected all rules hidden"
        assert all(r["isLocked"] for r in after), "expected all rules locked"
        await page.screenshot(path=str(SHOTS / "3_hidden_locked.png"))

        # Reveal + unlock so round-trip persists visible state.
        await page.evaluate("(ids) => window.__editorTestHooks.setHidden(ids, false)", ids)
        await page.evaluate("(ids) => window.__editorTestHooks.setLocked(ids, false)", ids)

        # Serialize / parse round-trip preserves rule count.
        parsed = await page.evaluate("() => window.__editorTestHooks.roundTrip()")
        assert len(parsed) == 3, f"round-trip lost rules: {len(parsed)}"
        await page.screenshot(path=str(SHOTS / "4_round_trip.png"))

        await browser.close()
        return {
            "seeded": len(rules),
            "grouped": len(groups[0]["ruleIds"]),
            "round_trip": len(parsed),
        }


async def main() -> int:
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    try:
        result = await run()
    except Exception as exc:  # surface the failure with context
        REPORT.write_text(json.dumps({"ok": False, "error": str(exc)}, indent=2))
        print(f"editor happy-path e2e FAILED: {exc}", file=sys.stderr)
        return 1
    REPORT.write_text(json.dumps({"ok": True, **result}, indent=2))
    print(f"editor happy-path e2e OK: {result}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))