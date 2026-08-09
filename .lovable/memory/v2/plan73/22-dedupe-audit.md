---
name: Plan 73 step 21-22 ModeHeader dedupe audit and issue 22 closure
description: Confirms single ModeHeader / single app-shell header invariant post Plan 66 SH-01
type: feature
---

## Step 21: ModeHeader dedupe audit

Ripgrep across `src/` for `ModeHeader`:

- Definition: `src/components/hmi/ModeHeader.tsx`
- Barrel: `src/components/hmi/index.ts`
- Single JSX site: `src/components/hmi/HmiShell.tsx:103` gated by `hideHeader`

No route or component renders `<ModeHeader />` twice, and no legacy header component still carries `data-app-shell="true"` (the orphan `AppHeader.tsx` was deleted at Plan 66). No fix required.

## Step 22: Issue 22 closure doc pass

`.lovable/issues/22-duplicate-header-still-present.md` already reads `Status: closed` (Plan 66 SH-01, 2026-07-17). Invariant guard `tests/e2e/playwright_single_header.py` (44 lines) asserts exactly one `header[data-app-shell="true"]` across `/`, `/setup`, `/setup/rules`, `/projects`, `/run`, `/trial-run`. No further code change.

Root cause (one sentence, historical): before Plan 66 SH-01, `AppBreadcrumb` rendered as a second full-width bordered strip with `data-app-shell="true"` next to `Titlebar`, so two headers stacked; SH-01 deleted the orphan and locked the DOM to a single `header[data-app-shell="true"]`.

## Regression signals

- `rg "data-app-shell" src` must return exactly one match: `Titlebar.tsx`.
- `rg "<ModeHeader" src` must remain a single hit at `HmiShell.tsx:103`.
