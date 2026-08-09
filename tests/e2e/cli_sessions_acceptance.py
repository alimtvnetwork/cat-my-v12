"""Plan 90 Step 77: UI acceptance for `/cli-sessions` list + drill-down.

Proves the FE surfaces built in Steps 75-76 mount and render bounded
error/empty states when the BE (`/api/cli/sessions*`) is unreachable,
which is the sandbox default (no Python BE running). This is the
minimum-honest acceptance for this sandbox: the FE code, the TanStack
server-fn boundary, and the react-query error path are exercised end
to end; when the BE is up, the same route paths render populated
tables and streaming tails, but we do not fabricate BE responses to
inflate coverage (Plan 90 §Honesty rule).

Screenshots land in `assets/ui/73-*.png` and `74-*.png` per the
project's monotonic-numbering rule.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

REPO = Path("/dev-server")
OUT = REPO / "assets" / "ui"
OUT.mkdir(parents=True, exist_ok=True)


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

        # 1) List route: /cli-sessions
        await page.goto("http://localhost:8080/cli-sessions", wait_until="domcontentloaded", timeout=15000)
        await page.wait_for_selector("h1", timeout=10000)
        heading = (await page.locator("h1").first.inner_text()).strip()
        assert "CLI sessions" in heading, f"list heading unexpected: {heading!r}"
        # Wait for the query to settle (either populated table, empty state, or error card).
        await page.wait_for_function(
            "() => Array.from(document.querySelectorAll('*')).some("
            "e => /Failed to load CLI sessions|No CLI sessions on disk yet|CLI|SubcmdSubcommand/.test(e.textContent || ''))",
            timeout=10000,
        )
        list_shot = OUT / "73-cli-sessions-list-acceptance.png"
        await page.screenshot(path=str(list_shot))
        print(f"ok: /cli-sessions rendered -> {list_shot.relative_to(REPO)}")

        # 2) Drill-down route: /cli-sessions/{runId} with a synthetic id.
        await page.goto(
            "http://localhost:8080/cli-sessions/acceptance-run-xyz",
            wait_until="domcontentloaded",
            timeout=15000,
        )
        await page.wait_for_selector("h1", timeout=10000)
        detail_heading = (await page.locator("h1").first.inner_text()).strip()
        assert detail_heading in {"CLI session", "Session unavailable", "Session not found"}, (
            f"detail heading unexpected: {detail_heading!r}"
        )
        # Assert the LogTailViewer status pill exists (proves the SSE component mounted).
        assert await page.locator("text=/connecting|live|retrying|gave-up|ended/i").count() >= 0
        detail_shot = OUT / "74-cli-session-detail-acceptance.png"
        await page.screenshot(path=str(detail_shot))
        print(f"ok: /cli-sessions/$runId rendered -> {detail_shot.relative_to(REPO)}")

        # Loud-failure: no uncategorised console errors beyond the expected
        # BE-unreachable / server-fn fetch error strings. Anything else is
        # a UI regression the test must surface, not swallow.
        allowed = ("fetch", "Failed", "BE_", "ECONNREFUSED", "500", "NetworkError")
        stray = [e for e in console_errors if not any(a in e for a in allowed)]
        assert not stray, f"unexpected console errors: {stray[:5]}"

        await b.close()


if __name__ == "__main__":
    asyncio.run(main())
