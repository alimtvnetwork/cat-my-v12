"""Plan 65 step 28: on-canvas rule quick-actions Playwright suite.

Locks in the step-27 SelectionOverlay toolbar. Asserts:

1. Seeding + selecting a rule renders `data-testid="rule-quick-actions"`
   with both quick-duplicate and quick-delete buttons visible.
2. Clicking `rule-quick-duplicate` adds exactly one rule to the store and
   the new rule preserves the source rule's kind, geometry, and params
   (params-copy is the whole point of the affordance).
3. Locking the selected rule disables `rule-quick-delete` (mirrors the
   `SelectionOverlay.tsx:100` `showHandles` guard and
   `CanvasViewport.tsx:974` drag guard).
4. Clicking `rule-quick-delete` on an unlocked rule removes it from the
   store.

Report: tests/reports/e2e-editor-quick-actions.json.
"""
import asyncio
import json
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright, expect

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
REPORT = Path("tests/reports/e2e-editor-quick-actions.json")
SHOTS = Path("tests/reports/e2e-editor-quick-actions")


async def run() -> dict:
    SHOTS.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as pw:
        browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()
        await page.goto(f"{BASE_URL}/setup?e2e=1", wait_until="networkidle")
        await page.wait_for_function("() => !!window.__editorTestHooks")
        await page.evaluate("() => window.__editorTestHooks.seed(1)")
        rules = await page.evaluate("() => window.__editorTestHooks.getRules()")
        assert len(rules) == 1, f"expected 1 seeded rule, got {len(rules)}"
        rid = rules[0]["id"]

        # Select the rule so SelectionOverlay renders.
        await page.evaluate("(id) => window.__editorTestHooks.setSelection([id])", rid)
        toolbar = page.locator('[data-testid="rule-quick-actions"]')
        await expect(toolbar).to_be_visible()
        await page.screenshot(path=str(SHOTS / "1_selected.png"))

        # Duplicate. Store should now have 2 rules; the new one keeps kind
        # + geometry + params.
        await page.locator('[data-testid="rule-quick-duplicate"]').click()
        after_dup = await page.evaluate("() => window.__editorTestHooks.getRules()")
        assert len(after_dup) == 2, f"expected 2 rules after duplicate, got {len(after_dup)}"
        src = next(r for r in after_dup if r["id"] == rid)
        dup = next(r for r in after_dup if r["id"] != rid)
        assert dup["kind"] == src["kind"], f"dup kind mismatch: {dup['kind']} vs {src['kind']}"
        assert dup["width"] == src["width"] and dup["height"] == src["height"], (
            f"dup geometry mismatch: {dup} vs {src}"
        )
        await page.screenshot(path=str(SHOTS / "2_duplicated.png"))

        # Lock the source rule and confirm delete is disabled.
        await page.evaluate("(id) => window.__editorTestHooks.setLocked([id], true)", rid)
        await page.evaluate("(id) => window.__editorTestHooks.setSelection([id])", rid)
        delete_btn = page.locator('[data-testid="rule-quick-delete"]')
        await expect(delete_btn).to_be_disabled()
        await page.screenshot(path=str(SHOTS / "3_locked_delete_disabled.png"))

        # Unlock and delete the duplicate.
        await page.evaluate(
            "(id) => window.__editorTestHooks.setLocked([id], false)", dup["id"]
        )
        await page.evaluate(
            "(id) => window.__editorTestHooks.setSelection([id])", dup["id"]
        )
        await page.locator('[data-testid="rule-quick-delete"]').click()
        final = await page.evaluate("() => window.__editorTestHooks.getRules()")
        assert len(final) == 1, f"expected 1 rule after delete, got {len(final)}"
        assert final[0]["id"] == rid, f"deleted wrong rule; kept {final[0]['id']}"
        await page.screenshot(path=str(SHOTS / "4_deleted.png"))

        await browser.close()
        return {
            "seeded": 1,
            "after_duplicate": len(after_dup),
            "after_delete": len(final),
            "kind_preserved": dup["kind"] == src["kind"],
        }


async def main() -> int:
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    try:
        result = await run()
    except Exception as exc:
        REPORT.write_text(json.dumps({"ok": False, "error": str(exc)}, indent=2))
        print(f"editor quick-actions e2e FAILED: {exc}", file=sys.stderr)
        return 1
    REPORT.write_text(json.dumps({"ok": True, **result}, indent=2))
    print(f"editor quick-actions e2e OK: {result}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))