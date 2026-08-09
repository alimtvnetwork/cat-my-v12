# SS-03 Plan 36 rescope

Slug: plan36-rescope
Status: pending
Created: 2026-07-18
Parent: 76-open-issues-modernization-slice-2

## Rationale

Plan 36 originally proposed porting large chunks of `src_v3/` into the current app shell. Plan 67 shipped the Titlebar / dock / breadcrumb chrome, Plan 75 removed `src_v3/` entirely (issue 14 closed), and Plan 43/71/72 covered app-mode + error dialog + seed facade. What remains of Plan 36 is: nav sidebar port (Plan 63), theme tokens migration (Plan 62), and slice-1 shell execution (Plan 61) — all downstream files.

## Action

Edit `.lovable/plans/pending/36-ui-app-shell-and-src-v3-port.md` frontmatter Context to:

- Note `src_v3/` removed under Plan 75.
- Note Titlebar / dock / breadcrumb landed under Plan 67.
- Note app-mode + ErrorDialogProvider landed under Plan 43 / 71.
- Reduce residual scope to: theme tokens migration (delegated to Plan 62), nav sidebar port (delegated to Plan 63).

Do NOT delete or move Plan 36; it remains as the umbrella pointer for 61/62/63.
