# 22 - Override Modes: Reference vs Snapshot

**Version:** 1.0 (draft, BLOCKED by Q6, Q7)
**Owner:** Plan 64 step 24
**Depends on:** `16-project-lifecycle.md`, `spec/23-app-db/03-projects.mmd`

---

## Purpose

A Project wires zero or more RuleSets. Each wiring picks one of two `override_mode` values that determine how the Project sees future edits to the source RuleSet. This spec locks the semantics before UI code is written; open ambiguities (Q6, Q7) are called out inline.

## The two modes

### Reference

- The Project points at the live RuleSet by `rule_set_id`.
- Any edit to a Rule in the source RuleSet is immediately visible to every Reference-mode Project on next run.
- Deleting or renaming the source RuleSet is blocked when at least one Reference-mode Project exists (`deleteRuleSet` returns `{ blocked_by }`).
- Storage: `ProjectRuleSet.override_mode = 'Reference'`, `snapshot_id = NULL`.

### Snapshot

- At wiring time (`addProjectRuleSet` or `setProjectRuleSetOverride` when flipping Reference -> Snapshot), the backend clones the source RuleSet + Rules + referenced Shapes + JsFunctions into a new frozen RuleSet with `parent_snapshot_id` pointing at the original.
- The clone is read-only through the standard Rules editor; editing a snapshot creates a new sibling snapshot (copy-on-write) rather than mutating in place.
- Deleting the source RuleSet is allowed even when Snapshot Projects exist; the snapshot survives.
- Storage: `override_mode = 'Snapshot'`, `snapshot_id = <clone id>`.

## Worked examples

Example A: linear update in Reference mode.

1. RuleSet `Bottle-Neck` v1 contains rule `PresenceOfCap`.
2. Project `LineA` wires it with `override_mode = Reference`.
3. Engineer bumps `presenceThreshold` from 0.6 to 0.75 on `PresenceOfCap`.
4. Next run of `LineA` uses 0.75 with no explicit action.

Example B: frozen snapshot.

1. Same starting state.
2. Project `LineB` wires `Bottle-Neck` with `override_mode = Snapshot`, producing clone `Bottle-Neck (snapshot for LineB, 2026-07-16)`.
3. Engineer changes the threshold on the live `Bottle-Neck`.
4. `LineB` still runs at 0.6 because it points at the snapshot. Live `Bottle-Neck` and `LineA` see 0.75.

Example C: promote a snapshot back to live.

1. `LineB` on its snapshot passes qualification.
2. Engineer clicks Promote-to-Live: backend replaces the live `Bottle-Neck` content with the snapshot content (transactional), updates every Reference-mode Project accordingly, marks the previous live state as an auto-snapshot for audit.
3. `LineB`'s wiring stays Snapshot but its `snapshot_id` is updated to point at the newly created auto-snapshot of the pre-promotion state. Every other Reference Project moves atomically. (Blocked by Q7: whether Promote is a first-class action or a Reference re-wire followed by a delete. Working assumption above.)

## Resolution algorithm (reader side)

```
resolve_project_rule_sets(project_id):
  rows = ProjectRuleSet.filter(project_id).order_by(sequence)
  for row in rows:
    active_rule_set_id = row.snapshot_id if row.override_mode == 'Snapshot' else row.rule_set_id
    yield RuleSet.get(active_rule_set_id)
```

The resolver is the single source of truth. Every server function that reads Project rules (`startProjectRun`, `getRuleSet` when scoped to a project, validation preview) MUST route through it. Anti-pattern to reject in code review: reading `rule_set_id` directly and ignoring `override_mode`.

## Override chain visualisation (UI)

When a Project wires multiple RuleSets, the order matters: later entries override earlier entries at the rule-name level (last-writer-wins keyed by `(rule.name, rule.kind)`). The Project editor shows an "Override chain" table:

| #   | RuleSet        | Mode      | Contributes rules      | Overridden by later |
| --- | -------------- | --------- | ---------------------- | ------------------- |
| 1   | Bottle-Neck    | Reference | PresenceOfCap          | -                   |
| 2   | Bottle-Neck-QA | Snapshot  | PresenceOfCap, Barcode | rule 1 loses        |

Blocked by Q6: whether the override key is `(name, kind)` or a stable per-rule `override_key` explicitly set by the author. This spec uses `(name, kind)` as the working assumption; a switch to `override_key` only changes the resolver's dedup key, not the storage layout.

## UI contract

- Toggling Reference -> Snapshot: confirmation modal "Freezes rules at this moment. Future edits to the source will NOT flow into this project until you re-toggle."
- Toggling Snapshot -> Reference: confirmation modal "Discards the frozen copy. This project will follow the live source. Continue?" plus a Download-frozen-copy button that offloads the snapshot as an export bundle before deletion.
- Snapshot RuleSets are hidden from the RuleSets browser by default; a "Show snapshots" filter reveals them and marks each with a lock icon.

## Verification

- Contract test: create RuleSet, wire both modes to two Projects, mutate source, assert Reference sees the change and Snapshot does not.
- Playwright: toggle Reference -> Snapshot in the Project editor, assert modal, refresh, assert badge changed and rule text is now editable-through-copy-on-write only.
