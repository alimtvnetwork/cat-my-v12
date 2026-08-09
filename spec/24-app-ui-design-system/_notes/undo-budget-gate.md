---
title: Undo budget gate (plan 30 step 46)
slug: undo-budget-gate
plan: 30
step: 46
status: locked
---

# Undo budget gate

## Purpose

Turn `_notes/undo-coalescing-fixtures.md` into the implementation budget
for history storage, coalescing, redo invalidation, logging, and status
strip counters. This keeps later boundary, performance, and persistence
steps from inventing new history semantics.

## History entry contract

History uses complete before/after snapshots, not partial patches:

```ts
type HistoryEntry = {
  id: string;
  kind: HistoryKind;
  at: number;
  before: Snapshot;
  after: Snapshot;
};
```

Allowed `HistoryKind` values are exactly:

- `rule.create`
- `rule.delete`
- `rule.reorder`
- `rule.kind-switch`
- `shape.transform`
- `shape.commit`
- `params.edit`
- `layout.toggle`

Any new history kind requires a spec 1.1 bump, a migration note, and a new
fixture row.

## Ring and redo rules

- Undo ring capacity: 50 entries.
- Push entry 51 evicts entry 1 by FIFO.
- Any new non-undo/redo push clears the redo stack.
- `undo()` with an empty past stack is a no-op and logs nothing.
- `redo()` with an empty future stack is a no-op and logs nothing.
- Successful undo emits `I_UI_UNDO`; successful redo emits `I_UI_REDO`.

The status strip reads the counts as `Un/50` and `Rn/50` from derived
selectors only. Components do not count history arrays themselves.

## Coalescing matrix

| Fixture   | Intents                                | Entry count | Result kind            |
| --------- | -------------------------------------- | ----------- | ---------------------- |
| F-UNDO-01 | same-rule drag window                  | 1           | `shape.transform`      |
| F-UNDO-02 | drag window then commit                | 1           | `shape.commit`         |
| F-UNDO-03 | drag window then ESC                   | 0           | none                   |
| F-UNDO-04 | kind switch with derived resets        | 1           | `rule.kind-switch`     |
| F-UNDO-05 | same `(ruleId,paramKey)` within 400 ms | 1           | `params.edit`          |
| F-UNDO-06 | 51 pushes                              | 50          | oldest evicted         |
| F-UNDO-07 | cross-rule drag                        | 2           | `shape.transform` each |

Only F-UNDO-02 may coalesce across differing history kinds. All other
coalescing requires the same rule id, same field family, and either the
same gesture bracket or the 400 ms params window.

## Snapshot completeness

Each history entry stores enough state to restore the whole affected rule,
including `kind`, `shape`, `params`, thresholds, `visible`, `locked`, name,
and ordering when relevant. ESC cancel restores the `before` snapshot and
does not push a history entry.

## Observability

- Coalesced gesture commit logs once at release or blur, not once per frame.
- Undo and redo logs include `kind`, `remaining`, and `correlation_id`.
- Failed persistence during undo/redo maps to `E_UI_RULE_SAVE_FAILED` and
  leaves the in-memory state intact for retry.
- No try/catch may hide a history apply failure; fatal apply errors surface
  through the editor route boundary.

## Budget

- History kinds: 8.
- Undo capacity: 50.
- Params coalescing window: 400 ms.
- Cross-kind coalescing exceptions: 1 (`shape.transform` -> `shape.commit`).
- Empty-stack undo/redo log lines: 0.

## Regression guards

```bash
# G-UNDO-01: history kind tuple remains the locked 8-kind set
rg -n "HISTORY_KINDS\s*=\s*\[" src/lib/editor tests/unit/editor

# G-UNDO-02: ring capacity is centralized at 50
rg -n "UNDO_CAPACITY" src/lib/editor tests/unit/editor

# G-UNDO-03: no direct status-strip history counting in components
rg -nE "history\.(past|future)\.length" src/components/editor

# G-UNDO-04: fixtures assert F-UNDO-01 through F-UNDO-07
rg -n "F-UNDO-0[1-7]" tests fixtures spec/24-app-ui-design-system/_notes
```

Expected: G-UNDO-01 exactly one tuple when step 71 lands; G-UNDO-02 reads
from one constant; G-UNDO-03 empty; G-UNDO-04 covers all seven fixture ids.

## Decision

Undo is frozen around eight history kinds, full snapshots, a 50-entry ring,
fixture-driven coalescing, and explicit undo/redo logs. Step 47 (boundaries
budget gate) may proceed.
