# Plan 42: Keyboard Events Quality Sweep

## Overview

This plan focuses on eradicating the remaining technical debt related to keyboard event handling. Specifically, it targets the use of raw string literals (e.g., `e.key === "ArrowUp"`) and deeply nested/chained `if-else` blocks in keyboard handlers across the entire codebase.

## Steps

1. [ ] Sweep `src/components/app-shell/**` for `e.key === "..."` and replace with `KeyboardKey` enum and `switch` statements. (e.g., `HistoryNav.tsx`, `WindowMenu.tsx`).
2. [ ] Sweep `src/components/editor/**` (excluding `LayersPanel`, `SelectionOverlay`, and `CanvasViewport` which were done in Plan 41). Target `CollapsibleSection.tsx`, `PreviewSettingsPanel.tsx`, `PropertiesPanel.tsx`, and `LayerRow.tsx`.
3. [ ] Sweep any other remaining `e.key === "..."` usages across `src/**`.
4. [ ] Ensure `KeyboardKey` enum in `src/types/ui/KeyboardKey.ts` is exhaustive for all UI event keys used in the app. Add any missing keys as needed.
5. [ ] Run `bunx tsgo --noEmit` and `vitest run` to ensure all type checks and keyboard-related logic remains fully intact and functional.
6. [ ] Add a section to `coding-guidelines.md` explicitly forbidding raw string literals in `e.key` checks, enforcing the use of the `KeyboardKey` enum and `switch` statements over multiple `if-else` blocks.
7. [ ] Close out this plan by moving it to `.lovable/plans/completed/`.
