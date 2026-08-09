# UI V4 JSON Seed Facade Completion

Slug: ui-v4-json-seed-facade-completion
Steps: 50
Status: completed
Created: 2026-07-19
Completed: 2026-07-19 (v3.844.0)

## Context

The V4 UI has repeated seed gaps: screens cannot all be tested because fixture values are scattered, incomplete, or not consistently accessed through facade APIs. This plan reads the V4 spec and existing Plans 79, 80, and 82 first, then creates a single JSON seedable config plus facade-backed seed orchestration so every UI surface can be tested now and migrated to real API endpoints later.

Captured command: `.lovable/spec/commands/37-json-seedable-config-facade-ui.md`.
Captured issue: `.lovable/issues/35-ui-seeding-values-not-complete.md`.

## Steps

1. Read `.lovable/plans/pending/79-ui-improvements-v4.md`, `.lovable/plans/pending/80-ui-improvements-v4-polish.md`, `.lovable/plans/pending/82-plan100-ui-v4-100steps.md`, and `spec/21-app/53-ui-improvements-v4.md` end to end, then write a seed-surface matrix. See ./subtasks/86-ui-v4-json-seed-facade-completion/SS-01-read-synthesis.md.
2. Read `.lovable/memory/features/facade-and-seed.md`, `.lovable/spec/commands/35-seed-fixtures-per-screen.md`, `.lovable/spec/commands/37-json-seedable-config-facade-ui.md`, and `.lovable/issues/35-ui-seeding-values-not-complete.md`, then append their constraints to the matrix.
3. Audit current source seed entry points, bundle files, and facade modules, then list every data surface that already has facade coverage versus every gap.
4. Audit every V4 UI route and component that renders domain data, then map it to the facade it must use.
5. Audit existing tests and visual fixtures for hardcoded or ad-hoc seed values that must move behind JSON profiles.
6. Define the canonical JSON seed bundle shape and relationship model for all V4 UI slices. See ./subtasks/86-ui-v4-json-seed-facade-completion/SS-02-json-schema-and-bundle.md.
7. Define the seed profile names and intended coverage: default sample PCB, SOIC inspection, connector bank, blister pack QA, empty-state preview, and error-state preview.
8. Define stable id conventions for seeded projects, rule sets, rules, categories, cameras, mic settings, samples, swatches, settings, commands, and scenarios.
9. Define facade contract additions needed for JSON seed fan-out and future endpoint migration. See ./subtasks/86-ui-v4-json-seed-facade-completion/SS-03-facade-contracts.md.
10. Write a Plan 86 implementation checklist subtask note that freezes the seed-surface matrix before code changes begin.
11. Create the canonical JSON seed bundle file under the existing seed area, with top-level `version`, `profiles`, and typed slices for every domain.
12. Add JSON schema or runtime validation for the seed bundle, including duplicate-id detection and required relationship fields.
13. Populate category seed data, including the V4 biscuit categories and inspection categories needed by rule-list and category-tab tests.
14. Populate rule seed data covering ROI, rectangle, circle, polygon, freehand, text, OCR, barcode, color, presence, absence, ignore, and math-style validation cases.
15. Populate rule-set seed data, including Pill Presence Grid, Blister Pocket Count, IC Solder Joint Inspection, Carrier Tape Pocket, Solder Joints, Reference Designators, Missing Components, and Barcode Read.
16. Populate camera seed data with at least three realistic camera setups and include the existing V4 `c1` and `c2` aliases for backward compatibility.
17. Populate mic settings seed data with at least three facaded presets, including the required default stub.
18. Populate project seed data for My Proj 1, Blister Pack QA, SOIC-8 Line, Carrier Tape Line 3, Sample PCB inspection, SOIC pin inspection, and Connector bank presence/absence.
19. Populate image sample metadata and thumbnails so each seeded project has sample rows without depending on a live camera.
20. Populate swatch seed data and property preset data for Properties, History, Swatches, Adjust, Grid, Brush, Type, Paragraph, CSS, and Image panes.
21. Populate settings, command-palette, empty-state, saved-badge, and error-scenario seeds so non-domain UI can be tested with meaningful data.
22. Add or extend facade APIs with idempotent bulk upsert, count, profile reset, and subscribe methods where missing.
23. Add memory facade variants for every seeded domain so unit tests and UI fixtures can run without storage implementation coupling.
24. Create or update facade TODO files for any fake or IndexedDB-backed facade that will later be swapped to a real endpoint.
25. Implement the seed orchestrator that validates the JSON bundle, resolves relationships, and writes slices to facades in dependency order. See ./subtasks/86-ui-v4-json-seed-facade-completion/SS-04-orchestrator-and-first-run.md.
26. Wire first-run seeding to the app bootstrap behind a client-only guard, using project count as the default-profile gate.
27. Add a developer-only seed reset command that can reseed one named profile through facades without touching unrelated user data.
28. Add a Command Palette entry for applying each seed profile, with success and failure results routed through the existing error funnel.
29. Replace any route-level or component-level hardcoded fixture arrays with facade reads backed by the JSON seed profile.
30. Wire Projects list and Project editor sections to seeded projects, rule sets, rules, cameras, mic settings, samples, run results, and chain badges.
31. Wire Rules list, Categories tab, Rule Set editor, and Rule editor to seeded categories, rules, rule sets, ROI shapes, thumbnails, and editor metadata.
32. Wire Properties, Layers, Tools, History, Swatches, Adjust, Grid, Brush, Type, Paragraph, CSS, and Image panes to seeded presets and selected-shape data.
33. Wire Camera and Mic settings screens to seeded facade data and make their create/edit modals testable from the same seed profiles.
34. Wire Home, navigation, address bar labels, command palette, saved badges, empty states, and error examples to seeded data where they display domain context.
35. Add per-screen seed CTA behavior only for genuinely empty user data, ensuring CTAs call the orchestrator rather than local component seed code.
36. Add route or component tests proving every JSON slice can render through its facade without direct storage access. See ./subtasks/86-ui-v4-json-seed-facade-completion/SS-05-ui-surface-coverage.md.
37. Add seed-bundle schema tests for duplicate ids, missing required fields, invalid profile references, and unsupported slice names.
38. Add relationship integrity tests proving every project, rule set, rule, camera, mic setting, sample, swatch, preset, and command reference resolves.
39. Add idempotency tests proving two seed runs produce the same facade state and do not clobber user-edited records outside the target profile.
40. Add facade-only ratchet tests that fail when UI code imports storage primitives or bypasses seed facades for V4 entities.
41. Add Playwright setup utilities that select a seed profile through the orchestrator before visiting seeded UI routes.
42. Add Playwright coverage for Projects, Project editor, Rules list, Categories tab, Rule Set editor, Rule editor, Properties panes, Settings, Command Palette, empty state, and error state using seeded profiles.
43. Add accessibility and visual checks for the populated seeded screens so regressions are caught when seed values or facade contracts change.
44. Replace stale Plan 79, Plan 80, Plan 82, Plan 83, and Plan 85 seed references with links to the new JSON seed facade contract where those plans remain pending.
45. Update `spec/21-app/53-ui-improvements-v4.md` with the finalized JSON seedable config and facade API contract.
46. Update `.lovable/memory/features/facade-and-seed.md` and `.lovable/memory/index.md` with the new canonical seed rule if the implementation changes the durable project rule.
47. Close `.lovable/issues/35-ui-seeding-values-not-complete.md` only after every target UI surface has a populated seeded test path.
48. Run the verification ratchets, type checks, unit tests, Playwright seeded UI coverage, and accessibility checks. See ./subtasks/86-ui-v4-json-seed-facade-completion/SS-06-verification-ratchets.md.
49. Bump the minor version, update `CHANGELOG.md`, update `RELEASE_NOTES.md`, and pin the version in the root `README.md`.
50. Move `.lovable/plans/pending/86-ui-v4-json-seed-facade-completion.md` to `.lovable/plans/completed/86-ui-v4-json-seed-facade-completion.md` and flip `Status: pending` to `Status: completed`.

## Verification

- The plan has exactly 50 numbered steps.
- First 10 steps are read, audit, and freeze steps before implementation.
- JSON seed bundle validation passes and rejects duplicate ids or broken relationships.
- All V4 UI data surfaces render through facades, not direct storage or hardcoded component fixtures.
- First-run default profile populates every target UI screen on a fresh install.
- Seed orchestrator is idempotent and profile-scoped.
- Unit tests, facade ratchets, Playwright seeded route coverage, and accessibility checks pass.
- Issue 35 remains open until seeded UI coverage is proven for every target screen.

## Appended from prior pending tasks

- 29-denial-burst-threshold-tuning: parked on field data, not folded into this UI seed plan.
- 35-ui-ux-photoshop-layers-overhaul: overlapping UI quality context, seed-specific pieces folded into this plan where panes need data.
- 36-ui-app-shell-and-src-v3-port: shell context only, not folded.
- 40-tools-images-spec-docs: not folded.
- 41-keyboard-dnd-and-code-quality-pass: not folded except seeded keyboard and command entries needed for UI testability.
- 44-plan43-execution-slice-1: error-management context applies to seed failures, but the plan remains separate.
- 49-plan29-threshold-derivation and 50-plan29-rollout-and-observability: not folded.
- 51-plan50-dashboard-and-alert-scaffold and 52-plan50-shadow-compare-and-closeout: not folded.
- 58-plan35-layers-execution-slice-2 and 59-plan35-layers-slice-3-and-closeout: layers seed data folded only where needed for V4 UI testability.
- 61-plan36-app-shell-execution-slice-1, 62-plan36-theme-tokens-migration, and 63-plan36-nav-sidebar-port: not folded.
- 79-ui-improvements-v4: seed requirements and facade contract folded directly into this plan.
- 80-ui-improvements-v4-polish: project, swatch, properties-pane, camera, mic, and samples seed gaps folded directly into this plan.
- 81-settings-rules-and-misc-polish: settings seed coverage folded where needed for testable settings UI.
- 82-plan100-ui-v4-100steps: Phase G seed fixtures per screen folded directly into this plan.
- 83-plan50-ui-completion-and-seed-hardening: seed bundle and UI testability residuals folded directly into this plan.
- 85-plan83-residual-shepherd: seed-related steps 2-5 and 11 folded directly into this plan; non-seed residuals remain in Plan 85.
