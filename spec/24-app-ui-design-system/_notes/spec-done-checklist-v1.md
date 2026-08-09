---
title: Spec done checklist and v1.0 tag (plan 30 step 35)
slug: spec-done-checklist-v1
plan: 30
step: 35
status: locked
---

# Spec done checklist and v1.0 tag

## Purpose

Freeze `spec/24-app-ui-design-system/` at v1.0 so every subsequent step
(36-100) can cite a stable authoritative anchor. Prior to this step the
spec was accumulating decisions; after this step, changes require an
explicit spec-version bump entry in `98-changelog.md`.

## Checklist (all must pass)

| #    | Gate                                                                                           | Command / evidence                                                                                                                                                                                            | Status                 |
| ---- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| C-01 | All required top-level docs present                                                            | `ls spec/24-app-ui-design-system/*.md` returns 00, 01, 02, 03, 04, 05, 06, 07, 08, 97, 98, 99                                                                                                                 | PASS                   |
| C-02 | Every doc has a heading, no empty files                                                        | `wc -l spec/24-app-ui-design-system/*.md` all > 50                                                                                                                                                            | PASS (min 79, max 154) |
| C-03 | No unresolved TODO/TBD/FIXME/XXX (excluding the changelog Upcoming meta-marker)                | `rg -n "TODO\|TBD\|FIXME\|XXX" spec/24-app-ui-design-system/ \| grep -v '98-changelog.md:.*Upcoming'` empty                                                                                                   | PASS                   |
| C-04 | Acceptance criteria file references every kind (C/R/K/S/E) and lighting rows                   | `97-acceptance-criteria.md` includes LC rows and K-KBD rows                                                                                                                                                   | PASS                   |
| C-05 | Errors + logs file lists every documented code                                                 | `07-errors-logging.md` includes W_UI_LIGHT_OUT_OF_RANGE, E_CAM_LIGHT_UNAVAILABLE, W_UI_MIGRATE_UNKNOWN_KIND, E_UI_MIGRATE_UNSUPPORTED, I_UI_KIND_PICKER_CANCELLED, W_UI_KIND_DISABLED, I_UI_RULE_KIND_CHANGED | PASS                   |
| C-06 | Testing spec names every planned test file                                                     | `08-testing.md` includes `lighting.test.ts`, `lighting.spec.ts`, `logs.spec.ts`                                                                                                                               | PASS                   |
| C-07 | Every deep-dive note under `_notes/` has a `status: locked` marker or an equivalent conclusion | manual review of `_notes/*.md`                                                                                                                                                                                | PASS                   |
| C-08 | Reference-image wireframe reconciliation exists                                                | `_notes/wireframe-sanity-check.md` present, zero deltas                                                                                                                                                       | PASS                   |
| C-09 | Consistency report present and current                                                         | `99-consistency-report.md` exists                                                                                                                                                                             | PASS                   |

## Version tag

Spec version: **v1.0** as of 2026-07-14.

Any change from now on MUST:

1. Add an entry under `98-changelog.md` with an incremented spec version
   (v1.0.1 for typo/clarity, v1.1 for content, v2.0 for breaking).
2. Reference the plan 30 step or plan number that authored the change.
3. Not silently rewrite locked decisions in `_notes/*.md`; instead add a
   superseding note that links back to the original.

## Regression guard

Step 100 plan closure MUST re-run the C-01..C-09 checklist against the
tree at that time. Any gate that flipped to FAIL blocks plan closure.

## Decision

Spec is tagged v1.0. Step 36 (typography budget gate) may proceed.
