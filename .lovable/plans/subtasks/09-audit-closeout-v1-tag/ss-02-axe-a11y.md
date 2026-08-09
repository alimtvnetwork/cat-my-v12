---
Slug: axe-a11y
Parent: 09-audit-closeout-v1-tag
Status: pending
Created: 2026-07-12
---

# SS-02 — axe-core a11y sweep on core routes

## Goal

Zero WCAG 2.1 AA violations on `/`, `/setup`, `/run`, `/results`. This is a v1.0.0 ship declaration requirement (Accessibility area currently un-measured).

## Setup

- `bun add -d @axe-core/playwright`.
- Reuse Playwright config from SS-01.
- New spec: `tests/e2e/a11y.spec.ts`.

## Test shape

```ts
import AxeBuilder from "@axe-core/playwright";
for (const path of ["/", "/setup", "/run", "/results"]) {
  test(`a11y ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}
```

## Expected fix categories (from HMI density)

- Low-contrast hairline borders → verify against `--hmi-*` tokens; bump only where axe flags, never hardcode.
- Missing `aria-label` on icon-only chrome buttons (top bar, tool ribbon).
- Focus-visible outline on dark bg (contrast ≥ 3:1).
- Form controls in `/setup` need explicit `<label htmlFor>` pairing.

## Pass criteria

- `violations.length === 0` on all four routes.
- Report artifact saved to `.lovable/memory/audit/evidence/v0.105.0/axe/`.

## Explicit non-goals

- No visual redesign. If axe demands a token change, update the token in `src/styles.css` `@theme`, never inline hex in components (memory: Core rule).
