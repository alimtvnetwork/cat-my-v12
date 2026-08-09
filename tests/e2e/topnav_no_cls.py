"""Plan 64 step 58: top-nav hover CLS smoke.

Root cause: prior `btn-lift` utility applied `translateY(-1px)` on hover,
which nudged adjacent flex siblings and produced a measurable layout shift
even though the moving element used `transform`. Without this gate a future
revert reintroduces the jitter silently.

This spec hovers each top-menu trigger in turn and asserts the cumulative
layout shift score stays under 0.01 for the hover-only interaction window.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
REPORT = Path("tests/reports/e2e-topnav-cls.json")
CLS_BUDGET = 0.01


async def run() -> dict:
    async with async_playwright() as pw:
        browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()
        await page.goto(f"{BASE_URL}/", wait_until="networkidle")
        # Install a PerformanceObserver for layout-shift entries and reset the buffer.
        await page.evaluate(
            """
            () => {
              window.__clsEntries = [];
              const obs = new PerformanceObserver((list) => {
                for (const e of list.getEntries()) {
                  if (!e.hadRecentInput) window.__clsEntries.push(e.value);
                }
              });
              obs.observe({ type: 'layout-shift', buffered: true });
              window.__clsObserver = obs;
            }
            """
        )
        triggers = page.locator('[role="menubar"] [role="menuitem"], header nav a')
        count = await triggers.count()
        for i in range(min(count, 8)):
            await triggers.nth(i).hover()
            await page.wait_for_timeout(120)
        total = await page.evaluate(
            "() => (window.__clsEntries || []).reduce((a,b) => a + b, 0)"
        )
        result = {"cls_total": total, "budget": CLS_BUDGET, "pass": total < CLS_BUDGET}
        await browser.close()
        REPORT.parent.mkdir(parents=True, exist_ok=True)
        REPORT.write_text(json.dumps(result, indent=2))
        return result


if __name__ == "__main__":
    r = asyncio.run(run())
    print(json.dumps(r, indent=2))
    sys.exit(0 if r["pass"] else 1)
