"""Plan 83 backlog 16 (e2e): /setup/rules status deep-link.

Asserts the `validateSearch` seam on `/setup/rules` seeds the Status
filter select (`data-testid=setup-rules-status`) from the URL search
param, matching the project-editor deep-link contract documented in
`docs/ui/rules-status.md`.

Screenshots under tests/reports/.
"""

import asyncio
from pathlib import Path
from playwright.async_api import async_playwright, expect

REPORTS = Path("tests/reports")
REPORTS.mkdir(parents=True, exist_ok=True)


async def assert_status(page, expected: str, note: str) -> None:
    select = page.get_by_test_id("setup-rules-status")
    await expect(select).to_be_visible(timeout=5000)
    value = await select.input_value()
    assert value == expected, f"{note}: expected status={expected!r}, got {value!r}"
    print(f"{note}: status select = {value}")


async def main() -> None:
    async with async_playwright() as playwright:
        browser = await getattr(playwright, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()

        errors: list[str] = []

        def on_console(m) -> None:
            if m.type != "error":
                return
            text = m.text
            # Benign in the dev sandbox: Supabase is not configured,
            # so the client logs a startup warning. Not related to
            # the deep-link contract under test.
            if "Supabase" in text and "Missing Supabase environment" in text:
                return
            errors.append(f"{m.type}:{text}")

        page.on("console", on_console)

        # 1. Deep-link with ?status=disabled preselects "disabled".
        await page.goto(
            "http://localhost:8080/setup/rules?status=disabled",
            wait_until="domcontentloaded",
        )
        await page.screenshot(path=str(REPORTS / "setup_rules_status_disabled.png"))
        await assert_status(page, "disabled", "deep-link ?status=disabled")

        # 2. ?status=enabled preselects "enabled".
        await page.goto(
            "http://localhost:8080/setup/rules?status=enabled",
            wait_until="domcontentloaded",
        )
        await assert_status(page, "enabled", "deep-link ?status=enabled")

        # 3. Bare /setup/rules defaults to "any" (validateSearch drops
        # the key so `initialStatus` is undefined and the useState
        # fallback wins).
        await page.goto(
            "http://localhost:8080/setup/rules",
            wait_until="domcontentloaded",
        )
        await assert_status(page, "any", "no search param")

        # 4. Invalid values are rejected by `validateSearch` (returns
        # `{}` when status is not one of the allowed literals), so the
        # UI falls back to "any" rather than crashing.
        await page.goto(
            "http://localhost:8080/setup/rules?status=bogus",
            wait_until="domcontentloaded",
        )
        await assert_status(page, "any", "invalid status rejected")

        assert not errors, f"console errors: {errors}"
        print("OK: /setup/rules status deep-link contract verified")

        await browser.close()


asyncio.run(main())
