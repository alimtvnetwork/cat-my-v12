# SS-05 Hardcoded Fixture Audit

Plan: 86-ui-v4-json-seed-facade-completion, Step 5
Date: 2026-07-19

## Purpose

Enumerate every place in the repo that carries domain fixture data outside the JSON seed bundle. These are the exact call sites Steps 11-21 must absorb and Step 40's ratchet must forbid.

## Two-source-of-truth problem

The JSON bundle at `src/lib/seed/data/bundle.json` is not the only seed source today. Each domain also ships a `seed.ts` module with hardcoded arrays that the orchestrator/facade reads directly. This is the primary "hardcoded fixture" surface, more consequential than any test literal.

## Tier 1: Per-domain `seed.ts` modules (must be replaced by JSON bundle slices)

| File                            | Payload                                                                                                                                   | Slice it becomes      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `src/lib/camera/seed.ts`        | 3 cameras (Basler acA1920, FLIR Blackfly S, Reference USB Cam)                                                                            | `cameras`             |
| `src/lib/mic-settings/seed.ts`  | Mic settings presets                                                                                                                      | `mic-settings`        |
| `src/lib/rules/seed.ts`         | 12 categories + ~15 rules across Label / Cap / Fill / Components / Text-OCR / Solder / Presence / Absence / Color / OCR / Geometry / Math | `categories`, `rules` |
| `src/lib/projects/seed.ts`      | Project fixtures + `createProject` helper                                                                                                 | `projects`            |
| `src/lib/image-samples/seed.ts` | Sample metadata seeds                                                                                                                     | `samples`             |

Action for Steps 11-21: move every literal above into `bundle.json` under the correct top-level slice, drop the `seed.ts` file, and have the orchestrator read only from the bundle.

## Tier 2: Test factories that fabricate domain data (must switch to seed profiles via facades)

Files calling `createProject(...)` or making project-shaped literals in-place:

- `src/lib/projects/__tests__/store.test.ts`
- `src/lib/projects/__tests__/useCategoryOptions.test.tsx`
- `src/components/projects/__tests__/ImageSamplesSection.reorder.test.tsx` (5 hits)
- `src/routes/projects.index.tsx` (1 hit; production caller for empty-state new-project — needs review, may be legitimate user action)

Tier-2 tests will be updated in Step 36 (route/component tests through facades) and Step 39 (idempotency tests).

## Tier 3: Playwright e2e specs that hardcode domain strings (should key off seed profile ids/names)

Files touching project/ruleset/rule/category strings in navigation or assertions:

- `tests/e2e/setup_rules_status_deeplink.py`
- `tests/e2e/editor_keyboard.py`, `editor_quick_actions.py`, `editor_a11y.py`
- `tests/e2e/image_samples_live_capture.py`, `image_samples_no_devices.py`
- `tests/e2e/playwright_breadcrumb.py`, `playwright_home.py`, `playwright_window_menu.py`
- `tests/e2e/plan64_flows.py`

Tier-3 specs will migrate in Step 41 (Playwright setup util loads seed profile) and Step 42 (Playwright coverage per surface).

## Tier 4: Non-domain modules with `create*`/`mock*` factories (out of scope, but note)

`run-store`, `preview-mode-store`, `snap-store`, `history-facade`, editor persistence, ui-prefs-store, etc. carry factories for non-seedable state (runtime, UI prefs, error history). These are not seed data and must remain out of the JSON bundle.

## Deltas from Step 4's route/facade map

Only two new surfaces show up here that weren't in the SS-04 table:

1. `projects.index.tsx` uses `createProject` for the empty-state CTA. Confirm in Step 35 whether the CTA remains a live user action or is replaced by the seed orchestrator profile CTA.
2. `src/lib/image-samples/seed.ts` mentions "SOIC" — one of the six required profile names — indicating a partial existing implementation to fold into the JSON bundle, not rewrite.

## Frozen scope for Steps 11-21

- Every Tier-1 file's payload must move into `bundle.json` under the slice named above.
- Every Tier-1 file must be deleted after migration.
- Step 40's grep ratchet must forbid new `src/lib/**/seed.ts` files and forbid inline `createProject(`/`createRule(` inside `src/` outside `src/lib/seed/` and legitimate user-action call sites.

## No src edits in this step

Audit-only. All migrations happen in Steps 11-21 and 29-35.
