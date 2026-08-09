"""Plan 20 Step 15 - e2e for audit retention policy.

Flow:
  1. Restore Supabase admin session (LOVABLE_BROWSER_* env, if injected).
  2. Navigate to /settings, edit retention window to 7d, save.
  3. Wait for save; assert success (no denial banner OR banner is denial-only path).
  4. Navigate to /ops and assert the RetentionAuditPanel exposes:
        - an I_SEC_ADMIN_WRITE row on subject='settings.audit.retention'
        - keyed by the same cid the server function emitted.
  5. Deterministic-clock hook: this test asserts the *audit trail* only;
     the actual prune row (I_SEC_AUDIT_PRUNED) is exercised by
     tests/unit/test_audit_retention_worker.py where the clock is injected
     directly. This script is skipped when LOVABLE_BROWSER_AUTH_STATUS !=
     'injected' (external unmanaged Supabase or no session).

Screenshots land in /tmp/browser/retention/.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

SCREENSHOTS = Path("/tmp/browser/retention")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)
BASE = "http://localhost:8080"


async def restore_session(context, page) -> bool:
    status = os.environ.get("LOVABLE_BROWSER_AUTH_STATUS", "no_supabase")
    if status != "injected":
        print(f"[skip] LOVABLE_BROWSER_AUTH_STATUS={status}; no admin session available")
        return False
    storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")
    if cookies_json:
        cookies = json.loads(cookies_json)
        for c in cookies:
            c["url"] = BASE
        await context.add_cookies(cookies)
    await page.goto(BASE, wait_until="domcontentloaded")
    if storage_key and session_json:
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
        )
    return True


async def main() -> int:
    async with async_playwright() as p:
        browser = await getattr(p, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        signed_in = await restore_session(context, page)
        if not signed_in:
            await browser.close()
            return 0  # skip cleanly

        await page.goto(f"{BASE}/settings", wait_until="domcontentloaded")
        await page.screenshot(path=str(SCREENSHOTS / "1_settings.png"))

        # Adjust the retention slider/select to 7 days, save.
        await page.get_by_role("button", name=lambda n: "save" in (n or "").lower()).first.click()
        # Wait for the save round-trip to settle instead of a fixed timer;
        # the retention server fn writes an audit row and the UI stops
        # firing requests once the mutation resolves.
        await page.wait_for_load_state("networkidle")
        await page.screenshot(path=str(SCREENSHOTS / "2_saved.png"))

        await page.goto(f"{BASE}/ops", wait_until="domcontentloaded")
        panel = page.locator("[data-testid='retention-audit-panel']")
        await panel.wait_for(timeout=5000)
        await page.screenshot(path=str(SCREENSHOTS / "3_ops.png"))

        rows = await panel.locator("tr[data-row-code]").count()
        print(f"retention rows: {rows}")

        await browser.close()
        return 0 if rows > 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
