# SS-01: Single header consolidation

Slug: single-header
Parent: 66-ui-v3-missing-completion
Status: pending
Created: 2026-07-17

## Goal

One and only one header row across every route. Kill the second "Control Automation" bar that reappears on nested Setup and Projects routes.

## Files

- `src/components/app-shell/AppHeader.tsx`
- `src/components/hmi/HmiShell.tsx`
- `src/components/nav/SectionTopBar.tsx`
- `src/routes/__root.tsx`

## Steps

1. Reproduce: open `/`, `/setup/rules`, `/projects/<id>` in Playwright; screenshot; count `<header>` elements per route. Store baseline under `tests/reports/screenshots/plan66/03-single-header/before/`.
2. Decide the single owner: `AppHeader` in `__root.tsx`. Every other surface (SectionTopBar, HmiShell) becomes a subordinate slot that renders inline title + breadcrumb, never a full-width bar.
3. Delete or downgrade the duplicate. Update `HmiShell` `hideHeader` default to `true`; add explicit `showHeader` opt-in only where legitimately needed.
4. Re-screenshot the three routes; diff-count `<header>` = 1 everywhere.
5. Close `.lovable/issues/22-duplicate-header-still-present.md` and `.lovable/issues/18-header-duplicated-control-automation.md` with the screenshot pair.

## Verification

- Playwright asserts `page.locator('header').count() === 1` on `/`, `/setup`, `/setup/rules`, `/projects`, `/projects/<id>`, `/run`.
- Typecheck + lint + unit + e2e green.
