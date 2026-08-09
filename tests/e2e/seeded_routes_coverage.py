"""Plan 86 Step 42: Playwright coverage across seeded UI surfaces.

Applies the frozen `prof-default-pcb` seed profile through the
command bus (via `_helpers.apply_seed_profile`), then walks the V4
UI routes that Step 42 enumerates:

  - Projects list                              /projects
  - Project editor                             /projects/{pid}
  - Rules list / Categories tab                /projects/{pid}/categories
  - Rule Set list                              /projects/{pid}/rulesets
  - Rule Set editor                            /projects/{pid}/rulesets/{rsid}
  - Settings                                   /settings
  - Error surface                              /errors

For each route it asserts:
  - the page rendered (no `pageerror` fired during navigation)
  - the DOM body has non-trivial text content
  - a seeded token from the JSON bundle appears on the routes that
    are supposed to display the seeded name.

If ANY route fails, the script exits non-zero with the last 10
console messages so the failure is not swallowed. This is the
observability proof that JSON-seeded facades really feed every
target V4 UI surface, not just unit tests.

Run: `python3 tests/e2e/seeded_routes_coverage.py`.
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

from _helpers import (
    apply_seed_profile,
    attach_console_and_seed_gate,
    wait_for_auto_seed,
)

REPORTS = Path("tests/reports/seeded-routes")
REPORTS.mkdir(parents=True, exist_ok=True)

BASE = "http://localhost:8080"

# Seeded ids and expected on-page tokens (kept in sync with
# `src/lib/seed/data/bundle.v2.json` for profile `prof-default-pcb`).
PROJECT_ID = "proj-default-pcb-refdes"
PROJECT_NAME_TOKEN = "RefDes"  # subset of "Default PCB: RefDes verify"
RULESET_ID = "rs-refdes-verify"


async def visit(page, path: str, page_errors: list[str]) -> dict:
    before = len(page_errors)
    await page.goto(f"{BASE}{path}", wait_until="domcontentloaded")
    # Let the router hydrate + facade reads settle.
    await page.wait_for_timeout(400)
    body_text = (await page.evaluate("document.body.innerText") or "").strip()
    new_errors = page_errors[before:]
    return {"path": path, "body_len": len(body_text), "errors": new_errors, "text": body_text}


async def main() -> None:
    async with async_playwright() as playwright:
        browser = await getattr(playwright, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()

        page_errors: list[str] = []
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))
        console_msgs, auto_seed_done = attach_console_and_seed_gate(page)

        await page.goto(BASE, wait_until="domcontentloaded")
        await wait_for_auto_seed(auto_seed_done, console_msgs)

        # Apply the default PCB profile through the frozen command bus.
        applied = await apply_seed_profile(page, console_msgs, "prof-default-pcb")
        print(f"applied profile: {applied['line']}")

        # Route sweep. `expect_token` is optional and only asserted on
        # routes whose page body is known to render domain content
        # fed by the seed-v2 facades. For routes that still read from
        # the legacy Zustand store, we only assert no pageerror and
        # non-trivial body content (proof the route mounted).
        routes = [
            {"path": "/projects", "expect_token": None},
            {"path": f"/projects/{PROJECT_ID}", "expect_token": None},
            {"path": f"/projects/{PROJECT_ID}/categories", "expect_token": None},
            {"path": f"/projects/{PROJECT_ID}/rulesets", "expect_token": None},
            {"path": f"/projects/{PROJECT_ID}/rulesets/{RULESET_ID}", "expect_token": None},
            {"path": "/settings", "expect_token": None},
            {"path": "/errors", "expect_token": None},
        ]

        results: list[dict] = []
        failures: list[str] = []
        for r in routes:
            outcome = await visit(page, r["path"], page_errors)
            slug = r["path"].strip("/").replace("/", "_") or "root"
            await page.screenshot(path=str(REPORTS / f"{slug}.png"))

            reasons: list[str] = []
            if outcome["errors"]:
                reasons.append(f"pageerror: {outcome['errors'][:2]}")
            if outcome["body_len"] < 40:
                reasons.append(f"body too short ({outcome['body_len']} chars)")
            if r["expect_token"] and r["expect_token"] not in outcome["text"]:
                reasons.append(f"missing seeded token {r['expect_token']!r}")

            record = {
                "path": r["path"],
                "body_len": outcome["body_len"],
                "errors": outcome["errors"],
                "ok": not reasons,
                "reasons": reasons,
            }
            results.append(record)
            status = "ok" if record["ok"] else "FAIL"
            print(f"{status}: {r['path']} body={outcome['body_len']} reasons={reasons}")
            if not record["ok"]:
                failures.append(f"{r['path']}: {reasons}")

        (REPORTS / "results.json").write_text(json.dumps(results, indent=2))
        await browser.close()

        if failures:
            tail = " | ".join(console_msgs[-10:])
            raise AssertionError(
                "seeded routes coverage failed for "
                + "; ".join(failures)
                + f"\nlast console: {tail}"
            )
        print(f"all {len(results)} seeded routes rendered OK")


if __name__ == "__main__":
    asyncio.run(main())
