# 50 - Rule Controller UI

**Status:** Draft (Plan 42 Step 5). Anchors: 47 (rule condition model), 48 (color condition), 49 (validation order), 31 (rule setup screen), 34 (tolerance model). Keyboard DnD contract: Plan 41.

## 1. Purpose

Fix the editor surface that authors interact with when composing rules and rulesets. Specs 47/48/49 defer their UI contract here. This file is the single source of truth for component names, controls, keyboard behavior, and accessibility invariants; the React implementation (Plan 42 steps 19-25) must match.

Slot 50 is free in `spec/21-app/` (50-52 previously reserved for capture / security / SDK-facade; 50 is the intended UI slot per Plan 42's re-map).

## 2. Non-Goals

- No new canvas / ROI drawing behavior. That surface is fixed in 31 and 32.
- No new dark-mode tokens. Uses the design tokens from `spec/24-app-ui-design-system/`.
- No inline runner (no live evaluation on every keystroke). Live preview is opt-in and debounced (s6).

## 3. Component Tree

```text
RuleSetupScreen (31)
  RulesetHeader
    RulesetTitleField
    ValidationModeToggle          <- new, spec 49
  RulesList
    RuleRow (draggable, keyboard-reorderable)
      RuleRowHandle               <- drag + arrow-key move
      RuleKindBadge               <- read-only, driven by 33
      RuleConditionsSummary       <- one-line summary of the conditions AND-chain
      RuleRowActions              <- open editor, duplicate, delete
  RuleEditorDrawer (opens on row click)
    RuleHeader                    <- name, kind, mask link (62)
    RuleConditionsEditor          <- new, spec 47
      ConditionListToolbar        <- "Add condition" button
      ConditionCard[]             <- one per condition, reorderable
        ConditionTypeSelect       <- ConditionType enum, disabled on the last locked SameImage
        ConditionParamsPanel      <- switches on type: SameImage / Presence / Color
        ConditionCardActions      <- delete (disabled when list length = 1)
    LivePreviewBadge              <- opt-in, debounced 400ms
```

Every component in this tree is a React file under `src/features/rules/editor/`. File names match the component names 1:1 (PascalCase.tsx). No inline anonymous components.

## 4. RulesetHeader / ValidationModeToggle

- Segmented control with two options driven by `ALL_VALIDATION_MODES` from `src/types/rules/ValidationMode.ts`. Labels come from `VALIDATION_MODE_LABEL`; the tooltip uses `VALIDATION_MODE_DESCRIPTION`. No free-text strings in JSX.
- Keyboard: `ArrowLeft` / `ArrowRight` moves selection; `Space` / `Enter` commits; focus ring uses the design-system token.
- Persistence: writes back to `ruleset.validationMode` on commit. `parallel` is the default (49 s3).
- A11y: `role="radiogroup"` with `aria-label="Validation mode"`; each option is `role="radio"` with `aria-checked`.

## 5. RulesList Reorder

- Each `RuleRow` exposes a drag handle (`aria-label="Reorder rule {name}"`, `tabIndex=0`).
- Pointer DnD uses the shared DnD primitive; keyboard DnD is `Space` to pick up, `ArrowUp` / `ArrowDown` to move, `Space` to drop, `Escape` to cancel (Plan 41).
- Reorder writes the new order back to `ruleset.rules` array order (49 s5). No `order` field on Rule.
- Announces "Rule {name} moved to position {n} of {total}" via `aria-live="polite"`.

## 6. RuleEditorDrawer / RuleConditionsEditor

- Drawer opens on `RuleRow` click and on `Enter` when the row is focused.
- The condition list is always non-empty (47 s3). Deleting the last condition is disabled with a tooltip explaining the invariant.
- "Add condition" appends a `SameImage` entry with a fresh `crypto.randomUUID` id. Users then change the type via `ConditionTypeSelect`.
- Reorder within the list uses the same keyboard DnD contract as `RulesList`.
- Live preview is opt-in behind a toggle labeled "Live preview". When on, param changes are debounced 400ms before invoking the runner; while pending, the badge shows a spinner. Errors from the runner render `ErrorCode.RuleConditionEval` (40) inline; no swallow.

## 7. ConditionParamsPanel per Type

### 7.1 SameImage

- No fields. Renders a short explainer: "Uses this rule's controller settings (33) as-is. Baseline v2 behavior."
- Present when Mode = SameImage. No hidden params.

### 7.2 Presence (47 s5.2)

- Segmented control for `Mode` from `PresenceMode` enum (`Present` / `Absent`).
- Slider + numeric input for `Threshold` (0..1, step 0.01, default 0.5).
- Numeric input for `MinBlobPx` (integer >= 1, default 10).
- All labels from `src/types/rules/PresenceMode.ts` labels map. Same DnD keyboard rules for the segmented control as `ValidationModeToggle`.

### 7.3 Color (48)

- Segmented control for `Mode` from `ColorMode` (`Current` / `Dense2` / `Dense3` / `Picked`).
- Hex input for `ExpectedColor` with color swatch preview. Regex `/^#[0-9a-fA-F]{6}$/`; invalid input surfaces inline validation error, does NOT commit.
- Eyedropper button visible only when `Mode = Picked`. Clicking arms a canvas-side picker that writes back on click.
- Numeric input for `DeltaE` (>= 0, cap 50, default 3.0). A Delta-E preview strip shows an example gradient using the design-system tokens (34).
- Live preview badge shows `deltaE = {value}` computed against the current ROI mean-Lab (48 s6).

## 8. RuleConditionsSummary (row-level)

- Read-only one-line summary of the conditions AND-chain, e.g. `"Presence: Present @ 0.5 AND Color: Current #FFAA00 dE 3.0"`.
- Empty state is impossible (invariant). If encountered, render `"! condition list empty"` in the error token color and log an `AppError` with `ErrorCode.RuleConditionEval`.
- Never truncates silently; uses CSS `text-overflow: ellipsis` with the full text in `title=`.

## 9. Accessibility Invariants

- Every interactive element has an accessible name (`aria-label` or visible text).
- All icon-only buttons carry `aria-label`; decorative icons carry `aria-hidden`.
- Focus order matches DOM order; no `tabIndex > 0`.
- Color contrast uses design-system tokens; no hardcoded hex in JSX.
- Keyboard-only smoke test: create a rule, add a Color condition, reorder to top, save, delete original, all without a mouse.

## 10. Observability

- Every commit (save rule, save ruleset, reorder, delete) emits a structured log at `info` with `{ ruleId, rulesetId, action, mode }`. Log lines fire from the store, not from JSX (`src/lib/projects/store.ts` sink).
- Runner errors surfaced inline are also logged at `error` with the full `AppError` chain (40). Never swallowed by a try/catch that just returns.

## 11. Acceptance Checklist

- [ ] Component file names in `src/features/rules/editor/` match section 3 1:1.
- [ ] No JSX literal matches `ConditionType`, `ColorMode`, `PresenceMode`, or `ValidationMode` values; all come from enum modules (magic-string lint gate).
- [ ] `ValidationModeToggle` renders every entry of `ALL_VALIDATION_MODES` and passes an axe scan.
- [ ] Deleting the last condition is impossible via UI (button disabled) and via keyboard (Delete key ignored).
- [ ] Reorder round-trip: keyboard-move rule 3 to position 1, save, reload; array order matches on disk.
- [ ] Live preview toggle off = zero runner invocations on keystroke (Vitest interaction test).
- [ ] Every commit emits the observability log line named in section 10; test asserts the line fires.
