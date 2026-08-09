# SS-05 — Issue → Plan Ownership Map

Version: v3.772.0
Date: 2026-07-19
Parent: `.lovable/plans/pending/84-next-20-onboarding-and-pending-drive.md`
Step: 5 of 20

## Purpose

Map every issue file in `.lovable/issues/` to the pending plan that owns its
resolution so Steps 8-16 can execute without re-diagnosing.

## Inventory

27 issue files, statuses:

- closed: 01, 09, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26
- open: 16, 27, 28, 29, 30, 31, 32, 33, 34

## Ownership map (open issues only)

| Issue | Slug                                      | Owner plan | Notes                                                                    |
| ----- | ----------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| 16    | project-section-create-flow-broken        | 81         | Settings/rules/misc polish already scopes create flow gaps.              |
| 27    | properties-panel-and-badges-crappy        | 79 + 82    | v4 polish (79) covers badges; plan 82 UI-v4-100 covers properties panel. |
| 28    | rules-list-mixes-categories               | 81         | Rules list filter belongs in settings/rules polish.                      |
| 29    | rule-edit-does-not-open-editor            | 83         | Editor bridge is a Plan 83 UI-completion deliverable.                    |
| 30    | properties-panel-not-reflecting-selection | 82         | Selection store binding is inside UI-v4-100 scope.                       |
| 31    | duplicate-breadcrumb                      | 80         | v4-polish + memory rule (single Titlebar breadcrumb).                    |
| 32    | tools-strip-between-header-and-canvas     | 80         | v4-polish (remove hint strip, move to tooltip).                          |
| 33    | hud-does-not-follow-shape                 | 82         | Canvas HUD anchoring is inside UI-v4-100.                                |
| 34    | rule-set-fill-section-padding-broken      | 80         | v4-polish spacing pass.                                                  |

## Orphans

None. Every open issue has an owner plan.

## Plan load after mapping

- Plan 79 (v4 improvements): +issue 27 (partial)
- Plan 80 (v4 polish): +issues 31, 32, 34
- Plan 81 (settings/rules/misc): +issues 16, 28
- Plan 82 (UI-v4-100): +issues 27 (partial), 30, 33
- Plan 83 (UI completion + seed hardening): +issue 29

## Consequence for Plan 84 execution phase

Step 8 (Plan 83 kickoff) starts with issue 29 as the concrete first slice
(rule-edit does not open editor). Steps 9-16 pull from plans 79/80/81/82 in
that priority order because Plan 83 is smallest scope and most self-contained.
