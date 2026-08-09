---
title: TODO / TBD sweep (plan 30 step 33)
slug: todo-tbd-sweep
plan: 30
step: 33
status: locked
---

# TODO / TBD sweep

## Method

Ran `rg -n "TODO|TBD|FIXME|XXX" spec/24-app-ui-design-system/` against the
locked spec tree. Every hit was classified as one of:

1. **Resolved-in-place**: rewrite the sentence to a concrete decision, remove
   the placeholder marker.
2. **Deferred-with-owner**: the item legitimately belongs to a later plan
   step; keep the marker, but rewrite as `Deferred to step NN: <reason>` so
   the marker is no longer ambiguous.
3. **Meta-marker**: the marker is describing this very sweep (self-reference
   in `98-changelog.md`). Not a real placeholder; leave until step 35 closes
   the checklist.

## Findings

Total hits in `spec/24-app-ui-design-system/`: **1**.

| #   | File              | Line | Kind | Classification | Action                                                         |
| --- | ----------------- | ---- | ---- | -------------- | -------------------------------------------------------------- |
| 1   | `98-changelog.md` | 73   | TODO | Meta-marker    | Leave until step 35 renames the "Upcoming" list to "Released". |

No `TBD`, `FIXME`, or `XXX` markers remain in the spec tree.

## Adjacent trees checked (out of scope, informational only)

- `.lovable/plans/subtasks/30-app-ui-rule-editor-revamp/`: contains `TODO`
  markers inside plan step bodies. These are the plan's own working notes,
  not spec debt, and are removed as each step closes.
- `.lovable/memory/**`: excluded from spec sweep; memory files are living
  notes.
- `src/**`: excluded; implementation gate is step 51+.

## Regression guard

Step 35 (spec done checklist refresh) MUST run:

```bash
rg -n "TODO|TBD|FIXME|XXX" spec/24-app-ui-design-system/ \
  | grep -v '98-changelog.md:.*Upcoming'
```

and the result MUST be empty. If a non-empty result appears at any later
step, that step is blocked until the marker is reclassified via this file.

## Decision

Spec tree is clean. No rewrites required in this pass. Step 33 closes with
zero content changes to `00-overview.md` .. `99-consistency-report.md`.
