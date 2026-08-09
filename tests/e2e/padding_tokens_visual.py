"""Playwright screenshot + computed-style check for the shared item-row
padding scale (v3.909+).

Guards two invariants against silent regressions:

1. Consistency at a viewport: every element opting into a padding tier
   utility (`item-pad-chip`, `item-pad-btn`, `item-pad-cta`) has
   identical `padding-inline` / `padding-block` within that viewport.
   Adding an ad-hoc `px-hmi-*` / `py-hmi-*` chain on top of an item
   row will drift one element's padding away from the tier and this
   assertion will catch it.

2. Responsiveness across viewports: the padding tokens actually grow
   between mobile (390), tablet (834), and desktop (1280). If a future
   refactor deletes the `:root` `@media` overrides in `src/styles.css`,
   the tier will collapse to a single flat value and this assertion
   will catch it.

Also captures a screenshot of the home hero utility strip + CTA row at
each viewport under `tests/reports/padding-tokens/` for manual review.

Run: `python3 tests/e2e/padding_tokens_visual.py`
"""
from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Any

from playwright.async_api import async_playwright, expect

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
ENGINE = os.environ.get("E2E_BROWSER", "chromium")
_SUFFIX = "" if ENGINE == "chromium" else f"-{ENGINE}"
REPORT_DIR = Path(f"tests/reports/padding-tokens{_SUFFIX}")
REPORT_JSON = Path(f"tests/reports/e2e-padding-tokens{_SUFFIX}.json")

VIEWPORTS = [
    ("mobile", 390, 900),
    ("tablet", 834, 1180),
    ("desktop", 1280, 900),
]

# Selectors that opt into the shared padding scale on the home route.
TIER_SELECTORS = {
    "item-pad-cta": '[data-testid="home-primary-cta"], [data-testid="home-create-project"]',
    "item-pad-chip": '[data-testid="home-utility-strip"] > a',
}

events: list[dict[str, Any]] = []


def record(name: str, status: str, detail: str) -> None:
    events.append({"Name": name, "Status": status, "Detail": detail})


async def read_padding(page, selector: str) -> list[tuple[float, float]]:
    """Return [(padding-inline-px, padding-block-px)] for every match."""
    return await page.evaluate(
        """(sel) => {
          const nodes = Array.from(document.querySelectorAll(sel));
          return nodes.map((n) => {
            const cs = getComputedStyle(n);
            // parseFloat drops the 'px' suffix; use inline/block so
            // logical-property overrides are honoured.
            const pi = parseFloat(cs.paddingInlineStart) + parseFloat(cs.paddingInlineEnd);
            const pb = parseFloat(cs.paddingBlockStart) + parseFloat(cs.paddingBlockEnd);
            return [pi, pb];
          });
        }""",
        selector,
    )

# Rows whose direct children (icons + labels) must be vertically centered
# on a shared axis. Values are (parent selector, tolerance in px). SVG
# icons anti-alias to sub-pixel bounding boxes so ~1.5px absorbs that
# without letting real drift through.
ALIGNMENT_ROWS = [
    ('[data-testid="home-primary-cta"]', 1.5),
    ('[data-testid="home-create-project"]', 1.5),
    ('[data-testid="home-utility-strip"] > a', 1.5),
]


async def read_alignment(page, selector: str) -> list[dict[str, Any]]:
    """For every element matching `selector`, return each visible child's
    bounding-box vertical center + its computed line-height / font-size,
    plus the parent's flex config, so a failure can point at the offender."""
    return await page.evaluate(
        """(sel) => {
          const parents = Array.from(document.querySelectorAll(sel));
          return parents.map((p, pi) => {
            const pr = p.getBoundingClientRect();
            const pcs = getComputedStyle(p);
            const kids = Array.from(p.children)
              .filter((c) => {
                const cs = getComputedStyle(c);
                if (cs.display === 'none' || cs.visibility === 'hidden') return false;
                const r = c.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
              })
              .map((c, ci) => {
                const r = c.getBoundingClientRect();
                const cs = getComputedStyle(c);
                const fs = parseFloat(cs.fontSize);
                const lhRaw = cs.lineHeight;
                const lh = lhRaw === 'normal' ? fs * 1.2 : parseFloat(lhRaw);
                return {
                  index: ci,
                  tag: c.tagName.toLowerCase(),
                  centerY: r.top + r.height / 2,
                  height: r.height,
                  fontSize: fs,
                  lineHeight: lh,
                };
              });
            return {
              parentIndex: pi,
              parentCenterY: pr.top + pr.height / 2,
              parentAlignItems: pcs.alignItems,
              parentDisplay: pcs.display,
              children: kids,
            };
          });
        }""",
        selector,
    )


async def assert_alignment(page, label: str) -> None:
    for sel, tol in ALIGNMENT_ROWS:
        rows = await read_alignment(page, sel)
        if not rows:
            # Optional row (e.g. "Create project" only renders when a
            # last-opened project exists). Record and continue rather
            # than fail: seed state can legitimately hide it.
            record(f"{label}/align {sel}", "Skipped", "no matches")
            continue

        for row in rows:
            assert row["parentDisplay"] in ("flex", "inline-flex"), (
                f"[{label}] {sel}#{row['parentIndex']} is not a flex row "
                f"(display={row['parentDisplay']})"
            )
            assert row["parentAlignItems"] == "center", (
                f"[{label}] {sel}#{row['parentIndex']} align-items="
                f"{row['parentAlignItems']!r}, expected 'center'"
            )
            assert len(row["children"]) >= 2, (
                f"[{label}] {sel}#{row['parentIndex']} has <2 visible children; "
                f"nothing to co-align"
            )
            centers = [c["centerY"] for c in row["children"]]
            spread = max(centers) - min(centers)
            assert spread <= tol, (
                f"[{label}] {sel}#{row['parentIndex']} vertical-center spread "
                f"{spread:.2f}px exceeds {tol}px tolerance; children="
                + ", ".join(
                    f"{c['tag']}[{c['index']}]@{c['centerY']:.2f}" for c in row["children"]
                )
            )
            for c in row["children"]:
                if c["tag"] == "svg":
                    continue
                ratio = c["lineHeight"] / c["fontSize"] if c["fontSize"] else 0
                assert ratio <= 1.05, (
                    f"[{label}] {sel}#{row['parentIndex']} child {c['tag']}[{c['index']}] "
                    f"line-height {c['lineHeight']:.2f}px / font-size {c['fontSize']:.2f}px "
                    f"= {ratio:.2f} > 1.05; add `leading-none`."
                )
        record(f"{label}/align {sel}", "Passed", f"rows={len(rows)} tol={tol}px")




async def measure_viewport(page, label: str, w: int, h: int) -> dict[str, tuple[float, float]]:
    await page.set_viewport_size({"width": w, "height": h})
    # Force a reflow / re-eval of :root @media overrides before reading.
    for attempt in range(5):
        try:
            await page.evaluate("() => new Promise(r => requestAnimationFrame(() => r(null)))")
            break
        except Exception as e:
            if "Execution context was destroyed" in str(e) and attempt < 4:
                await asyncio.sleep(0.5)
                continue
            raise
    await expect(page.get_by_role("heading", name="Pick a workflow")).to_be_visible()

    tier_values: dict[str, tuple[float, float]] = {}
    for tier, sel in TIER_SELECTORS.items():
        readings = await read_padding(page, sel)
        assert readings, f"[{label}] no elements matched selector for {tier}: {sel}"
        first = readings[0]
        for i, r in enumerate(readings[1:], start=1):
            assert r == first, (
                f"[{label}] {tier} consistency drift: element[0]={first} vs element[{i}]={r}. "
                f"Some element on this row is using ad-hoc padding instead of the {tier} tier."
            )
        tier_values[tier] = first
        record(
            f"{label}/{tier}",
            "Passed",
            f"pad_inline={first[0]}px pad_block={first[1]}px count={len(readings)}",
        )
    await assert_alignment(page, label)


    strip = page.locator('[data-testid="home-utility-strip"]')
    await expect(strip).to_be_visible()
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    await page.screenshot(path=str(REPORT_DIR / f"home_{label}_{w}x{h}.png"))

    return tier_values


async def run() -> None:
    async with async_playwright() as playwright:
        browser = await getattr(playwright, ENGINE).launch(headless=True)
        context = await browser.new_context(viewport={"width": 390, "height": 900})
        page = await context.new_page()
        await page.goto(BASE_URL, wait_until="networkidle")

        per_viewport: dict[str, dict[str, tuple[float, float]]] = {}
        for label, w, h in VIEWPORTS:
            per_viewport[label] = await measure_viewport(page, label, w, h)

        # Responsiveness assertion: each tier must GROW (or at least
        # not shrink) mobile -> tablet -> desktop, and must actually
        # change across at least one hop. A flat tier means the
        # responsive @media overrides on :root have been lost.
        for tier in TIER_SELECTORS:
            m = per_viewport["mobile"][tier]
            t = per_viewport["tablet"][tier]
            d = per_viewport["desktop"][tier]
            assert t[0] >= m[0] and t[1] >= m[1], f"{tier} tablet padding shrank vs mobile: {m} -> {t}"
            assert d[0] >= t[0] and d[1] >= t[1], f"{tier} desktop padding shrank vs tablet: {t} -> {d}"
            assert (m != t) or (t != d), (
                f"{tier} padding is flat across viewports ({m}/{t}/{d}). "
                "The :root @media overrides in src/styles.css may have been removed."
            )
            record(f"responsive/{tier}", "Passed", f"m={m} t={t} d={d}")

        await browser.close()


def write_report(status: str) -> None:
    REPORT_JSON.parent.mkdir(parents=True, exist_ok=True)
    REPORT_JSON.write_text(
        json.dumps(
            {"Suite": "padding-tokens", "Status": status, "Events": events},
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


async def main() -> None:
    try:
        await run()
        write_report("Passed")
        print(f"padding-tokens: PASSED ({len(events)} checks). Screens in {REPORT_DIR}/")
    except Exception as exc:
        record("error", "Failed", str(exc))
        write_report("Failed")
        raise


if __name__ == "__main__":
    asyncio.run(main())
