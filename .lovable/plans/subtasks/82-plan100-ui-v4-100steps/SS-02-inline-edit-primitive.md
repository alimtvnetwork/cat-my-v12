---
Slug: inline-edit-primitive
Parent: 82-plan100-ui-v4-100steps
Status: pending
Created: 2026-07-19
---

# Inline Edit Primitive

## Goal

Single reusable `<InlineEdit />` for every rename (rule name, ROI label, project,
category, HUD field). Encodes the semantics from
`.lovable/spec/commands/30-inline-edit-commit-semantics.md`.

## Behavior

- Enter → commit
- Blur (click outside) → commit
- Escape → revert to `initialValue`
- Renders `✓` and `✕` buttons for pointer users
- `F2` on the parent selected item starts editing
- Emits `onCommit(next)` and `onCancel()`; parent controls persistence
- Min padding: `px-2 py-1`, min font-size 13px, min width 8ch

## Files

- `src/components/primitives/InlineEdit.tsx`
- `src/components/primitives/__tests__/InlineEdit.test.tsx`

## Verification

- Unit test: Enter commits; Esc cancels; blur commits; ✓ commits; ✕ cancels.
- Replaces double-click rename logic in `SelectionOverlay` and rule list rows.
