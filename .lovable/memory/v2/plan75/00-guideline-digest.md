# Plan 75 - Guideline digest (Step 1)

Date: 2026-07-18
Version: v3.511.0

Sources re-read before executing Plan 75:

- `.lovable/coding-guidelines/coding-guidelines.md`: hard function/file size caps, no nested ifs beyond depth 2, no `any`, enums live in dedicated files, error handling must surface (never swallow), naming: PascalCase components, camelCase functions, kebab-case files where noted.
- `.lovable/memory/03-error-manage.md` + `spec/03-error-manage/**`: every error path must log with correlation id, surface via `errorStore` and `GlobalErrorModal`, no silent `try/catch`. Toasts for transient worker health only.
- `.lovable/memory/04-design-system.md` (Plan 73 closeout additions):
  - Token `--ca-on-primary` is the ONLY legal foreground on `--ca-primary` tinted surfaces. No hardcoded `text-white`, `text-black`, `#fff`, or Tailwind color utilities.
  - Active-pill pattern: `border-ca-primary/60 bg-ca-primary/25 text-ca-ink` (nav pills, tabs, chip toggles).
  - Spacing tokens: `--spacing-hmi-{xs,sm,md,lg}` (no ad-hoc `px-3 py-2` in chrome).
  - Header density: `comfortable` vs `compact` toggled via `useUiPrefsStore`; every chrome component must respect `--header-density-*` metrics.
- Plan 73 closeout (`.lovable/memory/v2/plan73/90-closeout.md`): 10 issues closed; deferred set is exactly {09, 11, 12, 13, 14, 15}. No scope creep in Plan 75.

Applied rules for Plan 75:

1. All new panels and chrome edits go through design tokens; zero hardcoded colors.
2. No new `try/catch` without a log line routed through `errorStore.report(...)` with correlation id.
3. Any new component follows the 200 LOC file cap and 40 LOC function cap.
4. Frontend-only scope. No backend, no worker changes, no schema changes.
5. Playwright verification at `viewport 1280x1800` and cross-check at `1280x800` for density (issue 12).
6. Never bypass the SDK facade (`src/lib/projects/facade.ts`) for any persistence read/write introduced by this plan.
