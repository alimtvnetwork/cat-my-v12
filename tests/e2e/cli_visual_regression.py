"""Plan 90 Step 140: Visual regression baselines for the `cli.*` namespace.

Captures deterministic screenshots for every CLI surface in both the
`dark` (default) and `light` theme variants, storing them under
`tests/e2e/__screenshots__/cli/` as the plan's canonical baseline
directory. A subsequent CI diff step (Step 148) compares fresh runs
against these PNGs; this file only produces baselines.

Theme override strategy: `ThemeController` (src/components/theme/
ThemeController.tsx L42-50) only re-applies the `<html>` class list
when its `theme` selector changes. So after the initial paint we can
flip `<html>` classes directly and the controller will not stomp them
until the store mutates, which never happens during a headless run.
This avoids racing the IndexedDB-backed zustand persist rehydrate.

BE is not required to be up: when queries fail the scoped
`CliRouteError` (Step 136) renders, which IS a valid visual baseline
for the error path. Baselines are regenerated intentionally, never
auto-updated on drift.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

REPO = Path("/dev-server")
OUT = REPO / "tests" / "e2e" / "__screenshots__" / "cli"
OUT.mkdir(parents=True, exist_ok=True)

BASE = "http://localhost:8080"

ROUTES: list[tuple[str, str]] = [
    ("/cli", "shell"),
    ("/cli/sessions", "sessions"),
    ("/cli/ipc?acked=false", "ipc"),
    ("/cli/rules", "rules"),
    ("/cli/samples", "samples"),
    ("/cli/settings", "settings"),
]

VIEWPORT = {"width": 1280, "height": 1800}


async def _force_theme(page, variant: str) -> None:
    # Direct DOM flip; ThemeController's effect only re-runs on store
    # change (see file header), so this sticks for the screenshot.
    await page.evaluate(
        """(v) => {
          const r = document.documentElement;
          r.classList.toggle('dark', v === 'dark');
          r.classList.toggle('light', v === 'light');
          r.setAttribute('data-theme', v);
          r.style.colorScheme = v;
        }""",
        variant,
    )
    # Give layout one frame to settle after the class flip.
    await page.wait_for_timeout(150)


async def _capture(page, path: str, slug: str, variant: str) -> None:
    await page.goto(f"{BASE}{path}", wait_until="domcontentloaded", timeout=15000)
    await page.wait_for_selector("h1, h2", timeout=10000)
    # First flip sets the palette so paint work during the settle wait
    # happens against the target tokens.
    await _force_theme(page, variant)
    # Bounded settle for tanstack-query loaders / skeletons. `networkidle`
    # never fires here because Vite's HMR + dev SSE keep sockets open.
    await page.wait_for_timeout(800)
    # Re-apply immediately before capture. `ThemeController` (src/
    # components/theme/ThemeController.tsx) re-fires its `useEffect` when
    # the persisted zustand store rehydrates from IndexedDB (Plan 80
    # Step 31) and reverts <html> to the stored `theme` ("dark" default).
    # That rehydrate can land AFTER our initial flip on a cold context,
    # so we clobber a second time right before `page.screenshot`.
    await _force_theme(page, variant)
    out = OUT / f"{slug}.{variant}.png"
    await page.screenshot(path=str(out))
    print(f"ok: {variant:5s} {path} -> {out.relative_to(REPO)}")


async def main() -> None:
    async with async_playwright() as p:
        b = await getattr(p, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        try:
            for variant in ("dark", "light"):
                ctx = await b.new_context(
                    viewport=VIEWPORT,
                    color_scheme=variant,  # matches media query for `system`
                )
                page = await ctx.new_page()
                for path, slug in ROUTES:
                    await _capture(page, path, slug, variant)
                await ctx.close()
        finally:
            await b.close()

    pngs = sorted(OUT.glob("*.png"))
    print(f"\nwrote {len(pngs)} baseline(s) under {OUT.relative_to(REPO)}")


if __name__ == "__main__":
    asyncio.run(main())
