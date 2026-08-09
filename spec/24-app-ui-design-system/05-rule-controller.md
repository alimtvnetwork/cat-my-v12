# 05 — Rule Controller

**Version:** 1.0 (draft)  
**Owner:** Plan 30  
**Depends on:** `01-foundations.md`, `04-rule-layers.md`  
**Deep dive:** `../../.lovable/plans/subtasks/30-app-ui-rule-editor-revamp/ss-01-rule-controller-schema.md` (normative schema)

---

## Purpose

The controller is the right-rail bottom pane. It edits **one** rule at a time and dispatches every mutation through the Zustand store (`06-state-persistence.md`). All fields render live-preview into the canvas overlay.

---

## Mount contract

- Mounts iff `selection.length === 1` (see `04-rule-layers.md` selection contract).
- On multi-select: unmount, show "Select a single rule to edit" empty state.
- On zero selection: show "Draw a shape or pick a rule" empty state.
- Layout: `<Header/>` (kind picker + name field), `<Body/>` (kind-specific panel), `<Footer/>` (Duplicate, Delete, Reset).

Component: `src/components/editor/RuleController.tsx` (impl step 74). Kind panels: `src/components/editor/panels/*.tsx` (impl steps 75–81).

## Header (shared across kinds)

| Field     | Control                      | Notes                                                                                      |
| --------- | ---------------------------- | ------------------------------------------------------------------------------------------ |
| Name      | text input                   | Same underlying value as list rename; mirror both ways.                                    |
| Kind      | `<Select>` with the 10 kinds | Switching kind preserves shape + name + threshold; drops kind-specific params (undo-able). |
| Enabled   | switch                       | Rule participates in Run evaluation.                                                       |
| Threshold | slider 0–100 + numeric input | Common pass/fail cutoff for all kinds.                                                     |

## Kind × visible-fields matrix (normative for impl steps 75–81)

SS-01 owns the full schema. This table is what the panel shows and edits:

| Kind        | Icon                | Panel fields (one-line summary)                                                                                                                                                                                                                                                                                                                            |
| ----------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Presence    | `Eye`               | `threshold` (shared), `minBlobPx`                                                                                                                                                                                                                                                                                                                          |
| Absence     | `EyeOff`            | `threshold`, `minBlobPx` (inverse pass)                                                                                                                                                                                                                                                                                                                    |
| OCR         | `Type`              | `expectedText`, `caseInsensitive`, `stripWhitespace`, live crop preview                                                                                                                                                                                                                                                                                    |
| TextMatch   | `Regex`             | `pattern`, `flags` (`i`, `m`, `s`), inline tester with sample input + match highlight                                                                                                                                                                                                                                                                      |
| Number      | `Hash`              | `min`, `max`, `unit` (short string)                                                                                                                                                                                                                                                                                                                        |
| Math        | `Sigma`             | `expression` (single-line, monospace), sibling-name autocomplete on `.value`, evaluator badge (`ok` / `error` with token)                                                                                                                                                                                                                                  |
| Color       | `Palette`           | `expectedColor` (native picker), `deltaE` (0–50), sampled swatch + reference swatch side by side                                                                                                                                                                                                                                                           |
| Pattern     | `Image`             | `referenceAsset` (upload → `programs/<id>/assets/`), `matchThreshold`                                                                                                                                                                                                                                                                                      |
| Edge        | `Waypoints`         | `cannyLow`, `cannyHigh`, `minEdgeDensity`                                                                                                                                                                                                                                                                                                                  |
| PatternEdge | `GitCommitVertical` | `edgeKernel` (`sobel` / `scharr` / `prewitt`), `threshold` (0-1), `polarity` (`rising` / `falling` / `either`), `minLength` (px). DOM selector `data-panel-controller="pattern-edge"`. Schema landed v3.202.0, panel + `setPatternEdge` hook landed v3.204.0, spec/code selector reconciled v3.443.0. SG-31-01 closed (Plan 32 in `.lovable/plans/done/`). |
| Blob        | `Circle`            | `minArea`, `maxArea`, `expectedCount`                                                                                                                                                                                                                                                                                                                      |

Every field commits through `updateRule(id, partial)` on `blur` / slider release. No auto-commit while typing to keep undo stack legible; slider drags coalesce.

## Worked examples

### OCR

```
Expected text: "LOT-0421"
[x] Case-insensitive
[x] Strip whitespace
Live crop preview: [ image thumbnail ]
```

Normalizer: `s.replace(/\s+/g, "")` when `stripWhitespace`, then `.toLowerCase()` when `caseInsensitive`; compare with `===`. Pass if normalized OCR output equals normalized `expectedText`.

### TextMatch

```
Pattern:  ^BATCH-\d{6}$
Flags:    [x] i  [ ] m  [ ] s
Test input: BATCH-123456  →  ✓ match  (highlights "BATCH-123456")
```

Compiled once per keystroke with try/catch; invalid regex renders `--rule-error` on the field and blocks commit. Log line on invalid: `W_UI_RULE_INVALID kind=text_match reason=regex_syntax`.

### Math

```
Expression: (ROI_1.value + ROI_2.value) / 2 < 100
Autocomplete after "R": ROI_1.value, ROI_2.value, …
Badge: ✓ compiles                                      (green)
```

Grammar frozen in `../../.lovable/plans/subtasks/30-app-ui-rule-editor-revamp/ss-03-math-expression-grammar.md`. Allowed: `+ - * / % ()`, comparison ops, `min/max/abs`. Forbidden: assignment, function definitions, I/O, `import`, `eval`. Any parse failure renders `--rule-error` and blocks commit.

## Kind-switch behavior

When user changes `kind` from A → B:

1. Snapshot pre-switch rule (undo entry).
2. Preserve: `id`, `name`, `shape`, `threshold`, `enabled`, `visible`, `locked`, `zIndex`.
3. Reset kind-specific params to schema defaults (SS-01).
4. Emit `I_UI_RULE_KIND_CHANGED from=<A> to=<B> rule_id=<id> correlation_id=<gesture>`.

## Live preview

Every field change repaints the shape overlay in the same frame:

- Numeric/threshold changes → recompute pass/fail badge in `04-rule-layers.md` row.
- `Pattern` reference upload → thumbnail in the panel and the RuleList row.
- `Color` picker → sampled swatch on the canvas near the shape (150 ms fade).

## Footer

- **Duplicate**: `Ctrl/Cmd+D` mirror of RuleList action.
- **Delete**: `Del` mirror; confirms only if rule is referenced by a `Math` expression (`"Rule X is referenced by 2 Math rules. Continue?"`).
- **Reset**: reverts kind-specific params to defaults; keeps shape/name.

## Errors + observability

Emits, all with `correlation_id` from `07-errors-logging.md`:

- `I_UI_RULE_UPDATED rule_id kind field` — every committed field change.
- `W_UI_RULE_INVALID rule_id kind reason` — validation failure (invalid regex, math parse error, out-of-range number).
- `E_UI_RULE_SAVE_FAILED rule_id error` — persistence write failure; toast + revert to pre-change value; NOT swallowed.

## Acceptance

| #    | Action                           | Expected                                                           |
| ---- | -------------------------------- | ------------------------------------------------------------------ |
| K-1  | Single-select rule               | Controller mounts with correct kind panel                          |
| K-2  | Change kind Presence → OCR       | Threshold + name preserved; new params at defaults; one undo entry |
| K-3  | Invalid regex in TextMatch       | Field `--rule-error`, log line, no commit                          |
| K-4  | Math referencing missing sibling | Evaluator badge red with token, no commit                          |
| K-5  | Color picker change              | Swatch + canvas overlay update same frame                          |
| K-6  | Slider drag then release         | One undo entry, not one per frame                                  |
| K-7  | Delete rule referenced by Math   | Confirm dialog listing dependents                                  |
| K-8  | Multi-select via Shift+click     | Controller unmounts, empty state                                   |
| K-9  | Pattern upload                   | File saved under `programs/<id>/assets/`, thumbnail rendered       |
| K-10 | Reset button                     | Kind-specific params → defaults; shape untouched                   |

---

## Plan 31 update (2026-07-15): panels finalized

Resolver: `src/components/editor/panels/resolver.tsx` dispatches on
`ControllerKind` and mounts one of the four scaffolded panels below. Each
resolver branch wraps its panel in a `<div data-panel-controller="<kind>">`
so Playwright specs can locate the mounted section without ARIA guessing.

| Kind    | Panel file                       | Prop shape (typed)                                                           | Notes                                                                          |
| ------- | -------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| number  | `panels/NumberPanel.tsx`         | `{ value: ParamsNumber; onChange(patch): void; disabled? }`                  | `min`, `max`, `unit`; inline `role=alert` when `min > max`                     |
| color   | `panels/ColorPanel.tsx`          | `{ value: ParamsColor; onChange(patch): void; disabled? }`                   | `expectedColor` (native picker), `deltaE` 0-50, side-by-side swatch pair (K-5) |
| blob    | `panels/BlobPanel.tsx`           | `{ value: ParamsBlob; onChange(patch): void; disabled? }`                    | `minArea`, `maxArea`, `expectedCount`                                          |
| pattern | `panels/ReferenceAssetPanel.tsx` | `{ value: ParamsPattern; onChange(patch); onUpload(file): Promise<string> }` | Wires K-9 pattern upload; thumbnail rendered from `referenceAsset`             |

Legacy kinds (`presence`, `absence`, `ocr`, `textMatch`, `math`) render a
placeholder section from the same resolver branch until their panels migrate
into `panels/` under a future plan. `pattern-edge` landed v3.204.0 (SG-31-01 closed v3.443.0).

Token bindings for every panel above are enumerated in
`../../.lovable/plans/subtasks/31-pre-93-panel-gaps-completion/SS-03-panel-tokens.md`.

E2E gates covering these panels: keyboard (step 18), Axe (step 19), visual
per-panel snapshots (step 20), persistence round-trip (step 21), and the
p95 perf mix (step 22). Test-hook contract lives in
`../../.lovable/plans/subtasks/31-pre-93-panel-gaps-completion/SS-04-e2e-matrix.md`.
