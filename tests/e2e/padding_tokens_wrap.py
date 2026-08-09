"""Playwright alignment guard for LONG-LABEL / WRAPPING item rows.

Complements `padding_tokens_visual.py` (fixed short labels) by injecting
synthetic rows that reuse the shared item-row utilities
(`item-pad-cta`, `item-pad-chip`, `item-row-gap`, `leading-none`) but
force two stress scenarios that real content will eventually hit:

  1) TRUNCATE: a CTA / chip whose label is 40+ chars and constrained by
     `max-w-[220px] truncate`. Text stays on one visual line; icon and
     label must still share a vertical center within 1.5px, and
     line-height must still be `<= font-size` (leading-none in effect).

  2) WRAP: eight chips inside a `flex-wrap item-row-gap` container that
     is narrower than their combined width. Each chip stays single-line
     internally (icon+label aligned within 1.5px), AND every chip that
     ends up on the same visual row must share the same centerY within
     1.5px, so no chip on a wrapped row drifts up or down relative to
     its neighbours.

Runs at mobile / tablet / desktop viewports so any CSS regression that
only manifests at a specific breakpoint (e.g. dropping `items-center`
or reintroducing default `line-height`) is caught.

Run: `python3 tests/e2e/padding_tokens_wrap.py`
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
REPORT_DIR = Path(f"tests/reports/padding-tokens-wrap{_SUFFIX}")
REPORT_JSON = Path(f"tests/reports/e2e-padding-tokens-wrap{_SUFFIX}.json")

VIEWPORTS = [
    ("mobile", 390, 900),
    ("tablet", 834, 1180),
    ("desktop", 1280, 900),
]

# Tolerance in px. SVG anti-aliasing + fractional layout make sub-pixel
# spread inevitable; 1.5px catches real drift without false positives.
TOL = 1.5

# Injected fixture. Reuses the exact utilities used on the home hero so
# a regression in `src/styles.css` (item-pad-*, leading-none, gap tokens)
# fails here first. Kept as a single string to minimise per-test noise.
FIXTURE_HTML = """
<div id="e2e-wrap-fixture" style="padding:24px; background:var(--ca-bg,#0b0b0d);">
  <!-- 1) TRUNCATE: long label constrained to force ellipsis on ONE line. -->
  <div class="mt-hmi-5 flex flex-wrap items-center item-row-gap"
       data-fixture="truncate-row" style="max-width:320px;">
    <button type="button"
      data-fixture-item="cta-truncate"
      class="hmi-focus-ring inline-flex items-center gap-hmi-2 rounded-lg bg-ca-primary item-pad-cta text-hmi-body font-semibold leading-none text-ca-on-primary shadow-hmi-panel">
      <svg data-fixture-icon width="16" height="16" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2" class="shrink-0">
        <path d="M5 12h14M13 6l6 6-6 6"/>
      </svg>
      <span class="leading-none truncate" style="max-width:120px;">
        Extremely long primary action label that must ellipsize
      </span>
    </button>
    <a data-fixture-item="chip-truncate"
       class="hmi-focus-ring group inline-flex items-center gap-hmi-2 rounded-lg border border-ca-border bg-ca-panel item-pad-chip text-hmi-caption leading-none text-ca-ink">
      <svg data-fixture-icon width="14" height="14" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="1.75" class="shrink-0">
        <circle cx="12" cy="12" r="9"/>
      </svg>
      <span class="font-medium leading-none truncate" style="max-width:100px;">
        This chip label is far too long to fit in the chip
      </span>

    </a>
  </div>

  <!-- 2) WRAP: many chips inside a narrow flex-wrap container. -->
  <div class="mt-hmi-5 flex flex-wrap items-center item-row-gap"
       data-fixture="wrap-row" style="max-width:480px;">
""" + "".join(
    f"""
    <a data-fixture-item="chip-wrap-{i}"
       class="hmi-focus-ring inline-flex items-center gap-hmi-2 rounded-lg border border-ca-border bg-ca-panel item-pad-chip text-hmi-caption leading-none text-ca-ink">
      <svg data-fixture-icon width="14" height="14" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="1.75" class="shrink-0">
        <rect x="4" y="4" width="16" height="16" rx="2"/>
      </svg>
      <span class="font-medium leading-none">Chip label number {i}</span>
    </a>"""
    for i in range(8)
) + """
  </div>
</div>
"""

events: list[dict[str, Any]] = []


def record(name: str, status: str, detail: str) -> None:
    events.append({"Name": name, "Status": status, "Detail": detail})


async def inject_fixture(page) -> None:
    # Remove any prior fixture (viewport changes re-run this).
    for attempt in range(5):
        try:
            await page.evaluate(
                """(html) => {
                  const prev = document.getElementById('e2e-wrap-fixture');
                  if (prev) prev.remove();
                  document.body.insertAdjacentHTML('beforeend', html);
                }""",
                FIXTURE_HTML,
            )
            await page.evaluate("() => new Promise(r => requestAnimationFrame(() => r(null)))")
            return
        except Exception as e:
            if "Execution context was destroyed" in str(e) and attempt < 4:
                await asyncio.sleep(0.5)
                continue
            raise


async def read_item_alignment(page, selector: str) -> list[dict[str, Any]]:
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
                  index: ci, tag: c.tagName.toLowerCase(),
                  top: r.top, bottom: r.bottom, height: r.height,
                  centerY: r.top + r.height / 2,
                  scrollWidth: c.scrollWidth, clientWidth: c.clientWidth,
                  fontSize: fs, lineHeight: lh,
                };
              });
            return {
              parentIndex: pi,
              parentTop: pr.top, parentHeight: pr.height,
              parentCenterY: pr.top + pr.height / 2,
              parentAlignItems: pcs.alignItems,
              parentDisplay: pcs.display,
              children: kids,
            };
          });
        }""",
        selector,
    )


def assert_item(row: dict[str, Any], sel: str, label: str) -> None:
    assert row["parentDisplay"] in ("flex", "inline-flex"), (
        f"[{label}] {sel}#{row['parentIndex']} display={row['parentDisplay']}"
    )
    assert row["parentAlignItems"] == "center", (
        f"[{label}] {sel}#{row['parentIndex']} align-items="
        f"{row['parentAlignItems']!r}"
    )
    kids = row["children"]
    assert len(kids) >= 2, (
        f"[{label}] {sel}#{row['parentIndex']} has <2 visible children"
    )
    centers = [c["centerY"] for c in kids]
    spread = max(centers) - min(centers)
    assert spread <= TOL, (
        f"[{label}] {sel}#{row['parentIndex']} vertical-center spread "
        f"{spread:.2f}px > {TOL}px; children="
        + ", ".join(f"{c['tag']}[{c['index']}]@{c['centerY']:.2f}" for c in kids)
    )
    for c in kids:
        if c["tag"] == "svg":
            continue
        ratio = c["lineHeight"] / c["fontSize"] if c["fontSize"] else 0
        assert ratio <= 1.05, (
            f"[{label}] {sel}#{row['parentIndex']} {c['tag']}[{c['index']}] "
            f"line-height/font-size = {ratio:.2f} > 1.05 (leading-none missing)"
        )


async def run_viewport(page, label: str, w: int, h: int) -> None:
    await page.set_viewport_size({"width": w, "height": h})
    await inject_fixture(page)

    # --- TRUNCATE scenario ---
    truncate_items = await read_item_alignment(
        page, '[data-fixture="truncate-row"] > [data-fixture-item]'
    )
    assert truncate_items, f"[{label}] truncate fixture missing"
    truncated_seen = False
    for row in truncate_items:
        assert_item(row, "truncate-row-item", label)
        text_child = next((c for c in row["children"] if c["tag"] == "span"), None)
        assert text_child, f"[{label}] truncate item has no span child"
        # Row height ~= single line height (allow ~2x for padding).
        assert text_child["height"] <= text_child["fontSize"] * 2, (
            f"[{label}] truncate label wrapped instead of ellipsizing: "
            f"height={text_child['height']:.2f}px fs={text_child['fontSize']:.2f}px"
        )
        if text_child["scrollWidth"] > text_child["clientWidth"] + 1:
            truncated_seen = True
    assert truncated_seen, (
        f"[{label}] no truncation observed; fixture max-widths may be too generous"
    )
    record(f"{label}/truncate", "Passed", f"items={len(truncate_items)}")

    # --- WRAP scenario ---
    wrap_items = await read_item_alignment(
        page, '[data-fixture="wrap-row"] > [data-fixture-item]'
    )
    assert wrap_items, f"[{label}] wrap fixture missing"
    for row in wrap_items:
        assert_item(row, "wrap-row-item", label)

    # Bucket chips into visual rows by parent-top rounded to nearest px,
    # then assert every chip in a bucket shares the same centerY.
    buckets: dict[int, list[dict[str, Any]]] = {}
    for row in wrap_items:
        key = round(row["parentTop"])
        buckets.setdefault(key, []).append(row)
    assert len(buckets) >= 2, (
        f"[{label}] wrap fixture stayed on one row (buckets={list(buckets)}); "
        "widen fixture or narrow container to actually exercise wrapping"
    )
    for key, group in buckets.items():
        if len(group) < 2:
            continue
        ys = [r["parentCenterY"] for r in group]
        spread = max(ys) - min(ys)
        assert spread <= TOL, (
            f"[{label}] wrap row at top~{key} has centerY spread "
            f"{spread:.2f}px > {TOL}px across {len(group)} chips"
        )
    record(
        f"{label}/wrap",
        "Passed",
        f"chips={len(wrap_items)} visual_rows={len(buckets)}",
    )

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    fixture = page.locator("#e2e-wrap-fixture")
    await expect(fixture).to_be_visible()
    await fixture.screenshot(path=str(REPORT_DIR / f"fixture_{label}_{w}x{h}.png"))


async def run() -> None:
    async with async_playwright() as playwright:
        browser = await getattr(playwright, ENGINE).launch(headless=True)
        context = await browser.new_context(viewport={"width": 390, "height": 900})
        page = await context.new_page()
        await page.goto(BASE_URL, wait_until="networkidle")
        # Wait for stylesheet + tokens to apply before we inject.
        await expect(page.get_by_role("heading", name="Pick a workflow")).to_be_visible()
        for label, w, h in VIEWPORTS:
            await run_viewport(page, label, w, h)
        await browser.close()


def write_report(status: str) -> None:
    REPORT_JSON.parent.mkdir(parents=True, exist_ok=True)
    REPORT_JSON.write_text(
        json.dumps(
            {"Suite": "padding-tokens-wrap", "Status": status, "Events": events},
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


async def main() -> None:
    try:
        await run()
        write_report("Passed")
        print(f"padding-tokens-wrap: PASSED ({len(events)} checks). Screens in {REPORT_DIR}/")
    except Exception as exc:
        record("error", "Failed", str(exc))
        write_report("Failed")
        raise


if __name__ == "__main__":
    asyncio.run(main())
