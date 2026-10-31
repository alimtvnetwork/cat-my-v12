# Subtask 02: Menu Position and Hover Stability Fix

- **Slug**: `menu-glitch-and-button-functionality-fix - Task 02`
- **Parent Plan**: `.ai-memory/plans/pending/82-menu-glitch-and-button-functionality-fix.md`
- **Status**: In Progress

## Objectives
- In `src/components/layout/StandardAppShell.tsx`:
  - Set `<DropdownMenuContent side="bottom" align="start" sideOffset={4} avoidCollisions={false}>`.
  - Add hover listener on trigger and content with grace period timeout so hovering smoothly opens and maintains the dropdown menu.
  - Remove destructive transition classes that induce resize recomputation.
