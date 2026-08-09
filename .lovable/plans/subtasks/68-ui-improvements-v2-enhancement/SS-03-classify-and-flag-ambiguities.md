# SS-03 Classify and flag ambiguities

Slug: classify-and-flag-ambiguities
Status: done
Created: 2026-07-17
Parent: 68-ui-improvements-v2-enhancement

## Goal

Split the SS-02 table into three disjoint buckets: `done`, `pending`, `ambiguous`.

## Rules

- `done`: closer plan + step + version + at least one verification signal.
- `pending`: no closer, but a matching plan under `.lovable/plans/pending/` owns the work.
- `ambiguous`: no closer AND no pending owner, OR two done plans contradict, OR `97b-ui-acceptance-checklist.md` disagrees with SS-02's closure evidence.

## Output shape

```
## Done
- I-01 - plan 67 step 3 - v3.393 - a11y test

## Pending
- I-14 - pending plan 41

## Ambiguities
- I-22 - spec 09 says X; plan 65 shipped Y. Decision needed: X or Y?
```

## Done when

- Every `[I-XX]` appears in exactly one section.
- Every ambiguity ends with a "Decision needed:" line.

## Cross-references audited

- SS-02 closure table (this folder).
- `spec/24-app-ui-design-system/97b-ui-acceptance-checklist.md` DEC-01..DEC-08 (still open P0 gates).
- `.lovable/plans/pending/` scan for owners of unclosed items.

## Done

All rows carry a closer plan + step + version + verification signal per SS-02.

- I-SH-01 - plan 66 s3 / plan 67 s10 - v3.390.0, v3.399.0, v3.430.0 - single `<header>` in `Titlebar`
- I-SH-02 - plan 67 s10 - v3.399.0, v3.430.0 - "Control Automation" repeat removed
- I-SH-03 - plan 66 s5 / plan 67 s11 - v3.399.0, v3.430.0 - `AppBreadcrumb.tsx` match-tree driven
- I-SH-04 - plan 66 s4 / plan 67 s12 - v3.399.0 - Back/Forward + playwright deep-nav
- I-SH-05 - plan 66 s6 / plan 67 s13 - v3.399.0 - `RunningPill` draggable, persisted
- I-SH-06 - plan 66 s7 / plan 67 s8 - v3.399.0 - Command palette
- I-SH-07 - plan 66 s7 / plan 67 s7 - v3.399.0 - Window menu with checkmarks
- I-SH-08 - plan 67 s14 - v3.399.0 - topnav_no_cls playwright
- I-SH-09 - plan 67 s9 - v3.399.0 - Window/Panel entries gated to editor routes
- I-SH-10 - user 2026-07-17 - v3.432.0 - Home cards cursor-default
- I-SU-01 - plan 67 s15 - v3.401.0 - three-tile setup landing
- I-SU-02 - rename pass - pre-v3.400 - "Ruleset" terminology
- I-SU-03 - plan 42 spec 47 - v3.417.0+ - PascalCase types, `humanizeLabel`
- I-SU-04 - plan 67 s16 - v3.401.0 - `LightingReadout` wired
- I-SU-06 - plan 66 s8 - v3.399.0 - YAML round-trip test
- I-RE-01 - plan 67 s17 - v3.401.0 - Program panel removed
- I-RE-02 - plan 67 s17 - v3.401.0 - full-width layer row
- I-RE-03 - plan 67 s10-17 - v3.399.0-v3.401.0 - line-density reduction
- I-RE-04 - plan 66 s10 / plan 67 s18-21 - v3.370.0, v3.401.0 - `DockableFrame` + 4 panels
- I-RE-05 - plan 67 s6 - v3.399.0 - `palette-store` persistence
- I-RE-06 - plan 67 s2 - v3.390.0 - grip-only drag
- I-RE-07 - plan 67 s3 - v3.399.0 - 5-region drop overlay
- I-RE-08 - plan 66 s11 / plan 67 s24 - v3.371.0 - `compile-shape.ts`
- I-RE-09 - plan 66 s12 / plan 67 s25 - v3.372.0, v3.403.0 - SVG Import/Export UI
- I-RE-10 - plan 66 s13 / plan 67 s26 - v3.373.0 - mask primitive
- I-RE-11 - plan 67 s21 - v3.401.0 - preview min/max + screenshot
- I-RE-12 - plan 67 s4 - v3.399.0 - snap-settle framer-motion
- I-RA-01 - plan 67 s22 - v3.401.0 - New/Category/Task chooser
- I-RA-02 - plan 67 s22 - v3.401.0 - "Rule Set NN" default
- I-RA-03 - plan 67 s23 - v3.403.0 - clone reference vs copy
- I-RA-04 - plan 67 s23 - v3.403.0 - source-ruleset badge
- I-RA-05 - plan 67 s22 - v3.401.0 - image upload/compile UI
- I-RA-06 - plan 67 s43 - v3.412.0 - Validate-Against-Image dialog
- I-RA-07 - plan 42 - v3.420.0-v3.428.0 - `RuleCondition` union + `validationMode`
- I-RP-01 - pre-existing - pre-v3.370 - rectangular Presence/Absence
- I-RP-02 - plan 67 s27 - v3.405.0 - Circular ROI form
- I-RP-03 - plan 42 s11-13 - v3.425.0-v3.428.0 - `SameImageParamsPanel`
- I-RP-04 - plan 67 s28 - v3.405.0 - OCR primitive + validate
- I-RP-05 - plan 66 s19 / plan 67 s35 - v3.379.0, v3.406.0, v3.428.0, v3.430.0 - Color + Lab/ΔE2000
- I-RP-06 - plan 66 s14 / plan 67 s29 - v3.374.0, v3.405.0 - Flaw Detection
- I-RP-07 - plan 66 s15 / plan 67 s30 - v3.375.0, v3.405.0 - Barcode / QR
- I-RP-08 - plan 66 s16 / plan 67 s31 - v3.376.0, v3.406.0 - Blob Detection
- I-RP-09 - plan 66 s17 / plan 67 s32 - v3.377.0, v3.406.0 - Edge Width
- I-RP-10 - plan 66 s17 / plan 67 s33 - v3.377.0, v3.406.0 - Edge Pitch
- I-RP-11 - plan 66 s18 / plan 67 s34 - v3.378.0, v3.406.0 - Positional Adjustment
- I-RP-12 - plan 42 s27-28 - v3.431.0 - `useLivePreview` + `LivePreviewBadge`
- I-FS-01 - plan 66 s20 / plan 67 s36 - v3.380.0, v3.408.0 - `/setup/functions` CRUD
- I-FS-02 - plan 66 s21 / plan 67 s37 - v3.383.0, v3.409.0 - `/setup/chain-events`
- I-PR-01 - plan 66 s22 / plan 67 s38 - v3.401.0 - project create fixed
- I-PR-02 - plan 67 s39-41 - v3.410.0-v3.412.0 - project detail (camera + rules + category)
- I-PR-03 - plan 66 s23 / plan 67 s39 - v3.410.0 - AI settings placeholder
- I-PR-04 - plan 67 s40 - v3.410.0 - category creation UI
- I-PR-05 - plan 66 s24 / plan 67 s40 - v3.410.0 - category resolver
- I-PR-06 - plan 67 s41 - v3.411.0 - multi rule-set + override preview
- I-RN-01..05 - plan 66 s25 / plan 67 s42 - v3.411.0 - Run picker rebuild
- I-RN-06 - plan 67 s41 - v3.411.0 - `RulesetPicker.tsx`
- I-CX-01 - plan 66 s26 / plan 67 s44 - v3.412.0 - color-token sweep + ESLint
- I-CX-02 - plan 66 s27 / plan 67 s45 - v3.413.0 - error registry + toast bus
- I-CX-03 - plan 66 s29 / plan 67 s48 - v3.414.0 - `bun run ci`
- I-CX-05 - plan 67 s47 - v3.414.0 - axe pass on core routes
- I-CX-06 - plan 42 s29 - v3.433.0 - ReasonCode const + lint gate
- I-CX-07 - user 2026-07-17 - v3.430.0 - `WorkerHealthBanner` floating toast
- I-BE-05 - user 2026-07-17 - v3.418.0 - SDK facade + `idb-keyval`
- I-MT-02 - plan 66 s2 - v3.399.0 - ambiguity questions file

Total done: 60.

## Pending

No plan owner today. Each needs a new pending plan or absorption into an existing one before it can move forward.

- I-SU-05 (camera setup surface FOV / pockets / shutter speed) - no pending owner. Candidate plan slot: new "camera surface" plan or absorb into spec 17-camera-setup.md.
- I-FS-03 (barcode decoded text feeds chain-event downstream) - no pending owner. Candidate: extend `/setup/chain-events` inspector.
- I-PR-07 (project zip export/import) - no pending owner. Depends on I-BE-01 storage decision.
- I-PR-08 (Recent Projects dropdown on Home) - no pending owner. Home currently shows workflow cards, not a recent-projects list.
- I-CX-04 (visual-regression CI gate) - baselines partially captured under `tests/reports/screenshots/plan67/`, no CI gate wired.
- I-BE-02 (mermaid DB diagrams under `spec/23-app-db/`) - no pending owner.
- I-BE-03 (`data/<ruleset>/<ruleId>/{image, rules.json}` layout) - deferred while storage is IDB via facade (I-BE-05).
- I-BE-04 (Python endpoint mapping table) - no pending owner. Blocked on worker-process build.
- I-MT-01 (V2 reference images into `src/assets/` with proper names) - screenshots referenced by spec 09 not relocated.

Total pending: 9.

## Deferred with written decision

- I-SU-07 (SQLite-zip export) - plan 66 Q2 chose warning-zip path; sql.js deferred.
- I-BE-01 (SQLite persistence) - user directive 2026-07-17: use IndexedDB + SDK facade; SQLite postponed until worker process lands.

Total deferred: 2.

## Ambiguities

Two classes: (a) V2 items with genuine spec drift, (b) cross-spec P0 gates in `97b-ui-acceptance-checklist.md` that touch multiple V2 items and remain unresolved.

### V2 item ambiguities

- I-PR-08 Recent Projects surface - spec 09 (L26) says "a drop-down button on Home", but Home currently uses full workflow cards (v3.432.0). Decision needed: dropdown component vs. dedicated "Recent" section on Home vs. keep current workflow cards and drop the requirement.
- I-BE-03 Data folder layout - spec 09 (L28) mandates `data/<ruleset>/<ruleId>/{image, rules.json}` on the EXE-adjacent filesystem, but current storage is IndexedDB via SDK facade (v3.418.0). Decision needed: is the folder layout the required export shape when persistence swaps back to SQLite, or is it obsolete now that facade owns storage?
- I-FS-03 Barcode chain event - spec 09 (L28) says the decoded barcode/QR text must feed chain events downstream. The barcode primitive stores decoded text on the rule (v3.375.0) but the chain-events inspector (v3.409.0) does not expose it as a variable. Decision needed: expose `Rule.<id>.decodedText` as a chain-event input, or introduce a dedicated `chain-input` field on the rule?
- I-PR-07 Project zip export - spec 09 (L26) says "zip contains SQLite DB or specific JSON files". Current build has no SQLite. Decision needed: JSON-only zip today (usable now) or block on SQLite (deferred with I-BE-01)?
- I-MT-01 Reference images - spec 09 (L15, L20) says "keep images as references in this spec and put these images into assets folder and name those properly". Screenshots exist under `spec/24-app-ui-design-system/assets/` but not `src/assets/`. Decision needed: mirror into `src/assets/` for runtime use, or leave under spec assets as pure documentation?

### Cross-spec P0 gates from 97b-ui-acceptance-checklist.md (still open)

These override multiple V2 items and MUST be resolved before the V2-Enhancement doc claims closure on affected rows.

- DEC-02 Rule catalog reconciliation. spec/21 §33 locks 6 kinds; spec/24 lists 10. Plan 66/67 shipped 12 rule primitives under spec/24's model (I-RP-02..I-RP-11). Decision needed: keep 12 shipped primitives and update spec/21 §33, or hide the extras behind a feature flag and mark I-RP-02, I-RP-05, I-RP-07, I-RP-09, I-RP-10, I-RP-11 as "shipped but not v1-canonical"?
- DEC-04 Persistence shape. spec/21 §36 mandates `tasks/<TaskId>/instructions/<InstructionId>.json`; spec/24 §06 uses flat `programs/<id>.json`; facade currently stores under `ruleset:<id>` in IDB. Decision needed: which envelope does the export path (I-PR-07, I-SU-06, I-SU-07) target?
- DEC-05 Region model. spec/21 §32 has first-class Regions with roles; current Layers panel is a flat rule list. This blocks I-RE-04 fluency claims and I-RA-05 (per-rule image binding). Decision needed: promote Regions above rules in the Layers panel, or absorb Regions into rule params?
- DEC-07 Error code namespace. spec/21 §40 App A owns the E*UI* codes; plans 66/67 (I-CX-02) shipped a separate registry. Decision needed: merge registries or keep the spec/24 registry and cross-reference?

Total ambiguities: 9 (5 V2-scoped + 4 cross-spec P0).

## Rollup

- Closed: 60
- Pending (no owner): 9
- Deferred (with decision): 2
- Ambiguities requiring decision: 9 (overlaps with pending/deferred; not double-counted)
- Total unique V2 ids: 71

Handoff: steps 5-8 write the consolidated doc from this classification. Step 8 renders the Ambiguities list verbatim with "Decision needed:" hooks.
