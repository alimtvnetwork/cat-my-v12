# SS-01 Gap Matrix

Slug: gap-matrix
Parent: 31-pre-93-panel-gaps-completion
Status: complete
Created: 2026-07-15

## Read summary

- `src/components/editor/` subfolders: `canvas/`, `rail/` (RuleList, RuleRow, RightRail, RectRuleEditor, CircleRuleEditor, OcrRuleEditor, TextRuleEditor, MathRuleEditor, RuleSetIOBar), `ribbon/`, `setup/` (EditorSetupExperience + SetupBoundaries), `shell/` (EditorShell, EditorTopBar), `status/` (FpsBadge, LastLogChip, SaveState, StatusStrip). No `panels/` folder, no LightingDrawer, no Reference/Number/Color/PatternEdge/Blob editors.
- `src/lib/editor/`: `types.ts` (EditorRule shape, generic `params: Record<string,string|number|boolean>`), `ruleset-io.ts` (constant `RULESET_SCHEMA_VERSION = 1`, `buildRuleSetFile`, `parseRuleSet`), `store/` (rules-slice, history-slice/reducers/types, ids), `controller/RuleController.ts`, `math/` (evaluator, parser, tokenize), `tools/` (rect-tool, anchor-tool), `render/frame.ts`, `pointer/dispatcher.ts`, `keyboard/shortcuts.ts`, `hit-test.ts`, `coords.ts`, `errors.ts`, `log-stream.ts`, `test-hooks.ts`. Rule kinds today are the abstract letters `"C" | "R" | "K" | "S" | "E"` (see `types.ts:1`), NOT the concrete controller kinds the spec names.
- Spec source of truth: `spec/24-app-ui-design-system/05-rule-controller.md` §"Kind x visible-fields matrix" (lines 34-49) and `02-layout.md` §"Lighting drawer" (lines 74-114) + referenced `subtasks/30-app-ui-rule-editor-revamp/ss-05-lighting-controls.md`.

## Contract vs implementation gap

| Panel (spec name)             | Spec source                                                        | Existing file | Missing pieces                                                                                                                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LightingDrawer                | 02-layout.md L74-114 + ss-05-lighting-controls.md                  | none          | new `src/components/editor/panels/LightingDrawer.tsx`; drawer trigger already exists in `EditorShell.tsx` (impl step 83 note), unwired; needs sliders (exposure, gain, WB, program preset), capability narrowing, LC-01..LC-12 hooks, error paths `E_UI_LIGHTING_APPLY` / `E_CAM_LIGHT_UNAVAILABLE`. |
| ReferenceAssetPanel (Pattern) | 05-rule-controller.md L47 (Pattern row)                            | none          | new `src/components/editor/panels/ReferenceAssetPanel.tsx`; upload to `programs/<id>/assets/`, thumbnail render in panel + RuleList row (K-9); persists as `params.referenceAsset: string` (URL/relative path) + `params.matchThreshold: number`.                                                    |
| NumberPanel                   | 05-rule-controller.md L44                                          | none          | new `src/components/editor/panels/NumberPanel.tsx`; fields `min`, `max`, `unit` (short string). Plan-31 header additionally names `decimals` -> mark OUT OF SPEC; keep only `{min,max,unit}` to match K-row.                                                                                         |
| ColorPanel                    | 05-rule-controller.md L46, L100-101                                | none          | new `src/components/editor/panels/ColorPanel.tsx`; native color picker for `expectedColor`, `deltaE` slider (0-50), sampled vs reference swatches side by side, 150 ms fade overlay. Plan-31 header names `colorspace select` -> not in spec; omit.                                                  |
| PatternEdgePanel              | Not in 05-rule-controller.md matrix (matrix only lists `Pattern`). | none          | Treat as sub-variant of Pattern with edge-strength threshold + rotation tolerance. Flagged as **spec gap SG-31-01**; block scaffold until 05-rule-controller.md is amended in step 25, or drop from plan 31. Recommendation: split into a follow-up; DO NOT scaffold from an undocumented contract.  |
| BlobPanel                     | 05-rule-controller.md L49                                          | none          | new `src/components/editor/panels/BlobPanel.tsx`; fields `minArea`, `maxArea`, `expectedCount`. Plan-31 header names `countMin/countMax` and `connectivity` -> not in spec; keep spec fields only.                                                                                                   |

## Rule-kind identifier mismatch (root issue for Plan 31)

- `types.ts:1` declares `EditorRuleKind = "C" | "R" | "K" | "S" | "E"`. These are the abstract acceptance-row prefixes, not user-facing kinds.
- Existing rail editors (`OcrRuleEditor.tsx`, `TextRuleEditor.tsx`, `MathRuleEditor.tsx`, `RectRuleEditor.tsx`, `CircleRuleEditor.tsx`) already assume concrete kinds via `params.kind` or file-name convention. There is no discriminated union tying `EditorRuleKind` to per-kind `params`.
- Consequence for step 6: v2 schema must introduce the concrete kind discriminator (`presence | absence | ocr | textMatch | number | math | color | pattern | blob | lightingRef`) as an explicit field, keep the letter as `family`/legacy alias, and give each panel a typed `params` shape. This is the real content of SS-02.

## Test-hooks anchor

`src/lib/editor/test-hooks.ts` is the canonical Plan 30 opt-in surface (`?e2e=1` / `VITE_EDITOR_E2E=1`). SS-04 must extend it, not create a parallel channel.
