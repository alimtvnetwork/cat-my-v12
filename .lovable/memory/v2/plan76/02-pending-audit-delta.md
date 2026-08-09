---
name: Plan 76 pending-plan audit delta
description: Delta on top of AUDIT-2026-07-17-pending-inventory.md reflecting Plan 71/72/75 closures.
type: reference
---

# Plan 76 - Pending audit delta (Step 2)

Date: 2026-07-18
Baseline: `.lovable/plans/AUDIT-2026-07-17-pending-inventory.md`

## Snapshot

`.lovable/plans/pending/` = 18 files including Plan 76 itself. Excluding 76 = 17 candidates.

## Bucket updates vs 2026-07-17 audit

### Retire (add to prior 38/39)

| #   | file                                               | reason                                                                                              |
| --- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 71  | 71-error-manage-visualization-and-worker-notice.md | Shipped v3.459.0 (GlobalErrorModal, worker notice float, correlationId, export). No residual scope. |
| 72  | 72-ui-seed-facade.md                               | Shipped v3.483.0 (30 steps, JSON/Memory/Remote facade + bundle.json seed). No residual scope.       |
| 38  | (already in completed?)                            | Confirm still under pending or done; retire if pending.                                             |
| 39  | (already in completed?)                            | Same.                                                                                               |

Action for step 15: move 71, 72, 38, 39 to `.lovable/plans/completed/` with `Status:` flipped to `completed` (71, 72) or `retired` (38, 39). Add closer note referencing shipping version or absorb-audit.

### Actionable (unchanged)

- 32 (already completed under Plan 75 hygiene? confirm), 35, 40, 41, 44, 46, 57 (per prior audit).
- Correction: 57 was completed under Plan 75; verify and move if still under pending. (`ls` above shows 57 already absent from pending, so already handled.)

### Downstream (unchanged)

58, 59 wait on 57. 51, 52 wait on 29 field data. 61, 62, 63 wait on 36 rescope.

### Parked (unchanged)

29, 49, 50 - field data blocker. 36 - needs rescope (step 16 of Plan 76 handles this in place).

## Net after Plan 76 hygiene (projected)

Pending count post-step-15: 17 - 4 (71, 72, 38 if pending, 39 if pending) = ~13. Minus Plan 76 itself once step 29 moves it = ~12 real pending plans, mostly downstream slices waiting on their parents.

## Recommendation for step-list order after this delta

Given that 4-12 collapse (per issue-map memo), the effective Plan 76 execution reduces to:

- Steps 1-3: memos + baselines (this turn covers 1-2).
- Steps 13-14: issue 16/01 triage (16 stays open, 01 confirmed closed).
- Step 15: hygiene move of 71, 72, 38, 39 (main deliverable).
- Step 16: Plan 36 rescope (in place).
- Step 17: Plan 44 entry check.
- Steps 18-24: gates (tsgo, vitest, axe, visual, single-header, borders).
- Steps 25-30: closeout + version + move.

Do not renumber the plan file; use these memos as the map. Next planning turn (Plan 77) starts from a much smaller open-issue surface (1 blocked issue).
