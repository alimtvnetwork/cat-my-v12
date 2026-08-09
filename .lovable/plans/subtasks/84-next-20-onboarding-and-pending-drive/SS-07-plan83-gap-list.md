# SS-07 — Plan 83 Acceptance Criteria Snapshot + Refreshed Gap List

Version: v3.774.0
Date: 2026-07-19
Parent: `.lovable/plans/pending/84-next-20-onboarding-and-pending-drive.md`
Step: 7 of 20
Source: `docs/plan-83/pending-audit.md` at v3.773.0

## Purpose

Refresh the Plan 83 gap list against live source so Steps 8-16 execute
against a current backlog, not a stale snapshot.

## Acceptance criteria (verbatim from Plan 83 "Verification")

- `docs/plan-83/pending-audit.md` exists, lists every step of 79/80/81/82 with status + evidence.
- Wiped IDB boot renders seeded rules, categories, rulesets, cameras, mic-settings, projects, image samples on every hub.
- Rule row click navigates to `/projects/$/rulesets/$/rules/$ruleId` and mounts the ROI editor.
- Shape selection updates docked palette AND HUD; HUD follows drag when pref is on.
- `tsgo --noEmit`, Vitest, Playwright visual gate, e2e specs, axe all pass.
- README pin matches the CHANGELOG's Plan 83 entry.
- 79/80/81/82 in `completed/` with `Status: completed` OR carry an "unabsorbed" note.

## Delta table (vs prior audit)

| #     | Backlog item                                                 | Prior   | Now         | Evidence                                                                        |
| ----- | ------------------------------------------------------------ | ------- | ----------- | ------------------------------------------------------------------------------- |
| 1     | Route `rules.$ruleId.tsx`                                    | MISSING | DONE (stub) | 24-line file; `beforeLoad` redirects to parent w/ `search: { rule: id }`        |
| 2     | Rule row click/Enter/Edit → route (1)                        | OPEN    | OPEN        | no `navigate({to:".../rules/$ruleId"})` call sites in `src/components/rules/*`  |
| 3     | Filter ruleset panel `isCategory === false` + Categories tab | OPEN    | OPEN        | only doc/type refs to that predicate, no filter site                            |
| 4     | Rebuild `PropertiesPalette` on `useSelectedRuleShape()`      | OPEN    | OPEN        | palette does not import the hook                                                |
| 5     | Remove `EditorDockHint` strip                                | OPEN    | DONE        | zero refs in `src/`                                                             |
| 6     | Create `AddressBar.tsx` + mount + `Ctrl+L`                   | MISSING | PARTIAL     | `src/components/shell/AddressBar.tsx` exists; mount + shortcut unverified       |
| 7     | Kill in-page breadcrumb duplicated w/ AddressBar             | PARTIAL | OPEN        | issue 31 still open                                                             |
| 8     | Ruleset toolbar padding (issue 34)                           | OPEN    | OPEN        | still no container padding class at audit-cited lines                           |
| 9     | HUD-follows-shape                                            | OPEN    | PARTIAL     | `hudFollowsShape` pref in `ui-prefs-store.ts:159..347`; overlay hook unverified |
| 10    | Seed orchestrator gaps                                       | OPEN    | OPEN        | `docs/plan-83/seed-gap-check.md`                                                |
| 11-28 | Reworks / tests / a11y / closeout                            | OPEN    | OPEN        | no progress evidence                                                            |

## Root-cause narratives (one sentence each) for the next execution slices

- Item 2 (issue 29): route stub redirects correctly, but no rule-row UI call
  site targets it and the parent ruleset editor is not verified to consume the
  `?rule=<id>` search param for preselect.
- Item 3 (issue 28): rules list renders the raw store output; add a
  `isCategory === false` filter at the render site and split categories into a
  sibling tab reusing the same row primitive.
- Item 4 (issue 30): docked panel and HUD both need `useSelectedRuleShape()`;
  the HUD wires it, the palette does not.
- Item 6/7 (issue 31): file exists but the duplicate in-page breadcrumb has
  not been removed, so both render together.
- Item 9 (issue 33): pref boolean exists; `SelectionOverlay.tsx` does not yet
  re-compute HUD anchor from the live selection rect during drag.

## Execution order for Plan 84 Steps 8-16

Mapping onto Plan 84 remaining steps:

- Step 8 → backlog item 2 (issue 29 wire-up + preselect).
- Step 9 → backlog item 4 (issue 30).
- Step 10 → backlog item 9 (issue 33 overlay re-anchor).
- Step 11 → backlog item 7 (issue 31).
- Step 12 → backlog item 5 status confirmation + tooltip on Tools rail (issue 32 already zero-ref, only tooltip work left).
- Step 13 → backlog item 8 (issue 34).
- Step 14 → backlog item 3 (issue 28).
- Step 15 → project create flow (issue 16) — not tracked in Plan 83 backlog directly; comes from Plan 81 absorption.
- Step 16 → backlog items 4 + palette polish (issue 27).

## Result

Backlog is current. Step 8 has a concrete first target: wire the rule row
click to the new route and make the parent ruleset editor honour
`?rule=<id>`.
