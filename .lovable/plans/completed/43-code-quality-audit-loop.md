# Plan 43: Code Quality Audit & Loop Remediation

## Overview

Based on a codebase-wide audit against `.lovable/coding-guidelines/coding-guidelines.md`, there are widespread violations that must be fixed via the looping agent. Attempting to fix them all in one go is unfeasible. This plan chunks the remediation into smaller slices so the agent can loop through them.

## Audit Findings

- **Rule 6 (File Size Caps):**
  - **TSX > 100 lines:** 206 files. (Top offenders include `CanvasViewport.tsx` at ~1592 lines, `ProjectEditorSections.tsx` at 1139 lines, `settings.index.tsx` at 946 lines).
  - **TS > 300 lines:** 15 files. (Top offenders include `render/frame.ts` at 1109 lines, `projects/store.ts` at 703 lines).
- **Rule 7 (No Magic Strings):**
  - **Magic string comparisons:** Approximately 762 raw string comparisons (e.g. `=== "string"`) exist throughout the `.ts` and `.tsx` files.
- **Rule 2 (No nested ifs):** Widespread nested conditions, particularly inside React components and event handlers.

## Remediation Strategy (Looping Slices)

### Slice 1: Magic Strings Purge

- [x] Sweep `src/components/editor/` and extract raw strings (excluding routing/class names) into typed Enums or Constants.
- [ ] Sweep `src/routes/` and extract magic strings.
- [ ] Sweep `src/lib/` and extract magic strings.
      _(Note: Create specific sub-plans per folder if the agent hits token limits)._

### Slice 2: Deeply Nested IFs & Guard Clauses

- [ ] Refactor `src/components/editor/` to use early returns, flattening nested `if-else` cascades.
- [ ] Refactor `src/routes/` to flatten conditions.

### Slice 3: Component File Size Reduction (> 100 lines)

- [ ] **CanvasViewport.tsx (~1592 lines):** Break down into `CanvasPanHandler`, `CanvasZoomControls`, `CanvasRenderLayer`, etc.
- [ ] **ProjectEditorSections.tsx (~1139 lines):** Extract individual section components into `src/components/projects/sections/`.
- [ ] **settings.index.tsx (~946 lines):** Break out setting tabs into smaller separate components.
- [ ] Continue down the list of 206 bloated TSX files, refactoring them to respect the 100-line hard cap.

### Slice 4: Unit Testing & Verification

- [ ] For every file touched in Slices 1-3, write accompanying unit tests in `__tests__` directories to lock in the behavior and verify against regressions. (Currently, unit tests are largely missing for UI handler refactors).

## Loop Execution Directives

- **Agent Instruction:** Do not execute this entire plan at once. Instead, pick one unchecked task (e.g., "Extract magic strings in `src/components/editor/`"), execute it, verify it passes type checking and linting, and then mark it as complete before looping to the next task.
