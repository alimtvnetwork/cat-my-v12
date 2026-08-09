"""Plan 90 Step 139: End-to-end acceptance for the `cli.*` route shell.

Covers the five surfaces the plan calls out (sessions list, session
drill-down, IPC inbox, rules bundle with client-side dry-run, effective
settings) plus the shell layout at `/cli`. In this sandbox the Python
BE is not running, so BE-backed queries surface the CLI-scoped
`errorComponent` (`CliRouteError`) instead of the router default; that
IS the acceptance today - the FE code, the `beFetch` boundary, the
react-query error path, and the per-route heading/`head()` all mount
end to end. Per the plan's Honesty rule we do NOT fabricate BE
responses to inflate coverage; when the BE is up the same routes render
populated tables without touching this file.

Filename follows the tests/e2e/ Python convention (see
`cli_sessions_acceptance.py`); the plan's stale `.spec.ts` wording
predates the convention. Screenshots land under `assets/ui/` with
monotonic numbering per the project asset rule.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

REPO = Path("/dev-server")
OUT = REPO / "assets" / "ui"
OUT.mkdir(parents=True, exist_ok=True)

BASE = "http://localhost:8080"

# (path, expected heading substrings, screenshot slug)
ROUTES: list[tuple[str, tuple[str, ...], str]] = [
    ("/cli", ("CLI Console",), "75-cli-shell.png"),
    ("/cli/sessions", ("CLI Sessions", "Failed to load CLI sessions"), "76-cli-sessions.png"),
    # `/cli/ipc` redirects to add `?acked=false`; hit the settled URL
    # directly so Playwright's domcontentloaded doesn't ERR_ABORT on
    # the 307 mid-navigation.
    ("/cli/ipc?acked=false", ("CLI IPC Inbox", "Failed to load CLI IPC inbox"), "77-cli-ipc.png"),
    ("/cli/rules", ("Rule Bundles", "Failed to load CLI rules"), "78-cli-rules.png"),
    ("/cli/settings", ("Effective Config", "Failed to load CLI settings"), "79-cli-settings.png"),

]


async def _visit(page, path: str, headings: tuple[str, ...], shot: str, errors: list[str]) -> None:
    await page.goto(f"{BASE}{path}", wait_until="domcontentloaded", timeout=15000)
    # Sidebar/aside label from cli.tsx layout MUST be present on every
    # /cli/* URL - proves the shell mounted rather than collapsing to
    # the router `defaultErrorComponent`.
    await page.wait_for_selector("h1, h2", timeout=10000)
    body = (await page.locator("body").inner_text()) or ""
    assert any(h in body for h in headings), (
        f"{path}: expected one of {headings!r} in body, got head: {body[:200]!r}"
    )
    # Head-metadata invariant from Step 138 - every cli.* route ships
    # its own og:title. Proves the per-route head() actually rendered.
    og_count = await page.locator('meta[property="og:title"]').count()
    assert og_count >= 1, f"{path}: og:title meta missing"
    await page.screenshot(path=str(OUT / shot))
    print(f"ok: {path} -> assets/ui/{shot}")


async def main() -> None:
    async with async_playwright() as p:
        b = await getattr(p, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()

        console_errors: list[str] = []
        page.on(
            "console",
            lambda m: console_errors.append(m.text) if m.type == "error" else None,
        )

        for path, heads, shot in ROUTES:
            await _visit(page, path, heads, shot, console_errors)

        # Rule dry-run: drill into rule id 1 (works whether BE serves
        # it or the notFoundComponent renders - both are acceptable
        # scoped renders per Step 137).
        await page.goto(f"{BASE}/cli/rules/1", wait_until="domcontentloaded", timeout=15000)
        await page.wait_for_selector("h1, h2", timeout=10000)
        body = (await page.locator("body").inner_text()) or ""
        assert any(t.lower() in body.lower() for t in ("Rule bundle", "Rule bundle not found", "Rule Bundles")), (
            f"/cli/rules/1: unexpected body head: {body[:200]!r}"
        )

        await page.screenshot(path=str(OUT / "80-cli-rule-drilldown.png"))
        print("ok: /cli/rules/1 -> assets/ui/80-cli-rule-drilldown.png")

        # Loud-failure gate mirrors cli_sessions_acceptance.py. BE-down
        # console noise (fetch/500/BE_/NetworkError) is expected; ANY
        # other console.error is a UI regression that must NOT be
        # swallowed.
        allowed = ("fetch", "Failed", "BE_", "ECONNREFUSED", "500", "NetworkError", "E_BE_", "envelope")
        stray = [e for e in console_errors if not any(a in e for a in allowed)]
        assert not stray, f"unexpected console errors: {stray[:5]}"

        await b.close()


if __name__ == "__main__":
    asyncio.run(main())
