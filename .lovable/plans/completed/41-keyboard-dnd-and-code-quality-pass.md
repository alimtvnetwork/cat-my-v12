# Keyboard-accessible rule DnD + src code-quality sweep

Slug: keyboard-dnd-and-code-quality-pass
Steps: 30
Status: pending

> Plan 67 overlap (v3.415.0): Drag affordance UI/UX and color-token lint gate landed in Plan 67 (v3.390.0, v3.412.0). Remaining: full keyboard-accessible DnD for rules, wider code-quality sweep, a11y beyond Step 47.
> Created: 2026-07-16

## Context

Two coupled asks from the user, planned together so the DnD feature
lands under the new code-quality rules from day one:

1. Keyboard-accessible drag-and-drop for rules with arrow-key
   repositioning and clear focus/ARIA feedback (rule list + canvas
   overlay).
2. A src/** quality sweep: no magic strings/numbers in comparisons,
   enums per concept in `src/types/**`, shared constants in
`src/lib/<domain>/constants.ts`, no single-line if/else or nested
   ternary used to shrink LOC. No logic changes.

Related capture:

- Command: `.lovable/spec/commands/16-keyboard-a11y-dnd-rules.md`
- Command: `.lovable/spec/commands/17-code-quality-enums-constants.md`

Applicable guideline sources (all present, all in scope):

- `.lovable/coding-guidelines/coding-guidelines.md`
- `spec/02-coding-guidelines/**` (esp. `02-typescript/`, `11-security/`)
- `spec/03-error-manage/**` (mandatory for coding tasks)

Primary files touched: `src/types/**`, `src/lib/editor/dnd/**`,
`src/components/editor/layers/LayersPanel.tsx`,
`src/components/editor/canvas/SelectionOverlay.tsx`,
`src/components/editor/canvas/CanvasViewport.tsx`,
`src/components/home/HomeBoundaries.tsx`,
`src/lib/diagnostics/home-error-log.ts`,
`src/routes/diagnostics.tsx`, `src/routes/run.tsx`,
`src/lib/errors/**` (new).

## Steps

1. Read every file in `spec/02-coding-guidelines/02-typescript/` and
   `spec/03-error-manage/` end-to-end; note rules that constrain this
   plan.
2. Read `.lovable/coding-guidelines/coding-guidelines.md` and align its
   vocabulary with the new command-17 rules.
3. Run the magic-string / magic-number inventory across `src/**`. See
   `./subtasks/41-keyboard-dnd-and-code-quality-pass/SS-01-inventory.md`.
4. Create `src/types/rules/RuleKind.ts` as the single enum for rule
   kinds (Circle, Rectangle, Keypoint, Slot, Edge), plus a label map.
5. Create `src/types/rules/DndMode.ts` enum: Idle, KeyboardGrabbed,
   PointerDragging.
6. Create `src/types/rules/DndAxis.ts` enum: X, Y.
7. Create `src/lib/editor/dnd/constants.ts` with `DND_STEP.FINE = 1` and
   `DND_STEP.COARSE = 10`, keyed by enum.
8. Move the existing `COLOR_SWATCHES` in `SelectionOverlay.tsx` to
   `src/types/rules/RuleColor.ts` (enum + label map + hex map).
9. Create `src/types/run/RunStatus.ts` enum (Idle, Running, Paused,
   Stopped) and replace string comparisons in the run store and route.
10. Create `src/types/errors/ErrorCode.ts` enum: HomeLoad,
    RuleValidate, DndOutOfBounds, DiagnosticsRead, Unknown.
11. Create `src/lib/errors/AppError.ts` typed error class carrying
    `{ code: ErrorCode; message: string; cause?: unknown }` per
    `spec/03-error-manage/02-error-architecture`.
12. Refactor `src/lib/diagnostics/home-error-log.ts` to accept
    `AppError | Error` and persist the `code` field in the record.
13. Refactor `src/components/home/HomeBoundaries.tsx` to construct an
    `AppError(ErrorCode.HomeLoad, ...)` before calling `recordHomeError`.
14. Update `src/routes/diagnostics.tsx` HomeErrorSection to render the
    ErrorCode label alongside message/stack/failedPlanIds.
15. Create `src/lib/editor/dnd/keyboard-controller.ts` implementing
    grab / move / cancel / drop against `IMAGE_BOUNDS`, using the enums
    and constants from steps 5-7.
16. Wire the keyboard controller into `LayersPanel.tsx`: `role=listbox`
    on the list, `role=option` on each row, `aria-activedescendant`
    tracking, roving `tabIndex`.
17. Add per-row `aria-grabbed`, `aria-selected`, and an `aria-label`
    composed from `RuleKind` label + user label + `(x,y)`.
18. Bind Space/Enter to grab, Escape to cancel-and-restore, arrow keys
    to move by `DND_STEP.FINE`, Shift+arrow to move by
    `DND_STEP.COARSE`.
19. Bind Home/End to jump to axis edges (via `DndAxis`), clamped to
    `IMAGE_BOUNDS`; PageUp/PageDown to reorder to top/bottom of the
    layer stack when not grabbed.
20. Add an `aria-live=polite` status region emitting Grabbed / Moved
    x,y / Dropped / Cancelled announcements, sourced from the
    controller.
21. Mirror controller state into the existing pointer live-coordinates
    overlay in `CanvasViewport.tsx` so both input modes surface the
    same `(x,y)` HUD.
22. Apply the `--ca-focus` outline treatment (2px solid, 2px offset) to
    grabbed rows and the active canvas rule; no new colors, tokens only.
23. Sweep `src/components/editor/**` for `"C"|"R"|"K"|"S"|"E"` string
    checks and replace with `RuleKind` enum imports.
24. Sweep `src/routes/run.tsx` and the run store for `"running"` /
    `"idle"` string checks and replace with `RunStatus` enum.
25. Sweep `src/components/editor/panels/BlobPanel.tsx` and any related
    modules for `0.02` / `0.05` literals; import
    `BLOB_GROWTH_TOLERANCES` from the schema module in every site.
26. Extract any single-line if/else or nested ternaries collapsing UI
    logic in `src/components/editor/**` into named helper components or
    functions in the same folder. No logic changes.
27. Add Vitest suite for the keyboard controller. See
    `./subtasks/41-keyboard-dnd-and-code-quality-pass/SS-02-tests.md`.
28. Add a Playwright case to `tests/e2e/` that focuses the rule list,
    presses Space, arrows, then Enter, and asserts the canvas HUD
    shows the updated `(x,y)`.
29. Update guideline docs to codify the new rules. See
    `./subtasks/41-keyboard-dnd-and-code-quality-pass/SS-03-guideline-update.md`.
30. Once steps 1-29 pass tsgo + vitest + the new e2e, flip Status to
    `completed` and `mv` this file to
    `.lovable/plans/done/41-keyboard-dnd-and-code-quality-pass.md`.

## Verification

- tsgo clean: `bunx tsgo --noEmit`.
- Unit: `bunx vitest run` (includes new keyboard-controller suite +
  existing home boundary suites).
- E2E: `python3 tests/e2e/home_route_smoke.py` and the new keyboard
  DnD e2e both write Passed reports under `tests/reports/`.
- Manual: preview shows `aria-live` announcements in the a11y tree and
  the HUD updates while arrow-keying a grabbed rule.
- Docs: the three guideline files listed in SS-03 exist and are
  referenced from `.lovable/coding-guidelines/coding-guidelines.md`.

## Appended from prior pending tasks

Scanned `.lovable/plans/pending/`. The following plans remain open and
are not folded in here because they target different surfaces; this
plan will not regress them:

- 29-denial-burst-threshold-tuning
- 32-sg-31-01-pattern-edge
- 33-plan-29-denial-burst-tuning-read-phase
- 35-ui-ux-photoshop-layers-overhaul
- 36-ui-app-shell-and-src-v3-port
- 37-home-dexter-ui-repair
- 38-read-memory-onboarding-and-audit
- 39-read-spec-code-and-memorize
- 40-tools-images-spec-docs

Step 23 (RuleKind sweep) and step 26 (inline-collapse sweep) overlap
with plan 35's layers overhaul; coordinate by landing enum + constants
first (steps 4-11) so plan 35 can consume them.
