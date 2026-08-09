# Properties Selection Bridge

Scope: the ROI editor and every surface that reflects "the currently selected
shape". Fixes issue I-30 in
`spec/21-app/53-ui-improvements-v4-assets/plan82/upload-74.png` where the
docked Properties panel reads "No content wired for properties" while an ROI is
visibly selected on the canvas.

## Root cause statement (single sentence)

The canvas selection lives on `useEditorSelection` (canvas-local) while the
docked Properties panel reads a separate `usePropertiesTarget` store that is
never written to by the canvas, so selecting a shape on the canvas never
propagates to the docked panel.

## The one bridge

Introduce a single source of truth: `useSelectionStore` in
`src/lib/editor/selection-store.ts`.

```ts
type SelectionTarget =
  | { kind: "shape"; ruleId: string; shapeId: string }
  | { kind: "rule"; ruleId: string }
  | { kind: "ruleset"; rulesetId: string }
  | { kind: "project"; projectId: string }
  | { kind: "none" };

interface SelectionState {
  target: SelectionTarget;
  select(target: SelectionTarget): void;
  clear(): void;
}
```

All three surfaces read and write the same store:

1. Canvas `SelectionOverlay`: on shape pick, calls `select({ kind: "shape", ruleId, shapeId })`. On empty-canvas click, `clear()`.
2. Docked Properties panel: `const target = useSelectionStore(s => s.target)`. Renders the pane for `target.kind`; falls back to `EmptyState` only when `target.kind === "none"`.
3. Floating HUD: reads the same store, positions itself relative to the shape (`target.kind === "shape"`).

## Kind-aware pane routing

`PropertiesPalette` uses a switch on `target.kind`:

- `shape`: mount the per-kind pane (Rect / Circle / OCR / Text / Color / Math / Barcode) determined by the shape's `kind` field on the rule. Never render the generic empty state while a shape is selected.
- `rule`: mount `RulePropertiesPane` (name, kind, `appliesBefore`).
- `ruleset`: mount `RulesetPropertiesPane` (name, description, tags).
- `project`: mount `ProjectPropertiesPane` (name, cameras, image samples count).
- `none`: mount `<EmptyState>` with a hint that a selection is required and a `Ctrl+K` shortcut chip.

## Dirty-state ownership

Dirty state stays on the domain store (`useRulesStore`, `useProjectsStore`,
etc.), never on the selection store. The selection store carries only the
pointer. Rationale: switching selection must never wipe unsaved edits on the
previous target.

## Route ownership

`useSelectionStore` is per-route-instance (created via
`createSelectionStore()` in the route loader, provided through a
`SelectionContext`). Rationale: the setup ROI editor and the per-ruleset
editor must not share a selection cursor, but every surface WITHIN one route
must.

## Ratchet test

`src/components/rules/__tests__/properties-bridge.test.tsx` mounts the ROI
editor with a seeded rule, calls the canvas `select` action, and asserts:

1. `PropertiesPalette` renders the kind-specific pane, not the empty state.
2. Editing a param in the pane mutates the rule via `useRulesStore.updateParams`.
3. Editing a param in the floating HUD mutates the same rule, and the docked pane reflects the new value on the next render (both read the same rule id).
4. Calling `clear()` re-renders the empty state.

## Non-goals

- No multi-select in v1. `SelectionTarget` is a single target.
- No cross-route selection persistence. Selecting a shape in `/setup/rules/:id` does not carry over to `/projects/:id/rulesets/:rid`.
- No optimistic UI on param edits. Writes go through the existing coalesced facade path; the pane simply reads.

## When it applies

Phase E of Plan 100 (steps 41-45). No property pane may ship after Phase E
that reads selection from anywhere other than `useSelectionStore`. A lint
ratchet (`tests/lint/no-parallel-selection.spec.ts`) greps for
`usePropertiesTarget`, `useCanvasSelection`, and any other legacy selection
hooks outside the store's own module and fails the build.
