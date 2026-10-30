# Subtask 01: Top-Level Window Controls & Layout Shift Elimination
# File: .ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/ss-01-window-controls-and-glitch-fixes.md
# Status: PENDING

## Objectives
1. Fix top-level window controls (`Minimize`, `Maximize/Restore`, `Close`) in `src/components/layout/WindowControlButtons.tsx` and `src/components/layout/StandardAppShell.tsx`:
   - Prevent crashes when `window.close()` is called in Chromium or browser environments.
   - Wire window actions to support Tauri, Chromium backend shutdown, and in-app session exit.
   - Include confirmation modal for app close with graceful error handling.
2. Fix Menu hover glitch in `src/components/layout/StandardAppShell.tsx`:
   - Standardize border widths across active/inactive states (`border border-transparent` vs `border-cyan-400/40`) to eliminate 1px layout reflow shifts.
   - Remove disruptive scale transforms on navigation items.
3. Fix Simulation Next button jitter and dwell timer delay in `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx` and `SimulationPlayerBar.tsx`:
   - Allow 1-second minimum dwell time (`min={1}`).
   - Reduce artificial transition timeouts (700ms down to <=100ms) to ensure exact dwell pacing.
   - Apply `tabular-nums` and fixed width to the countdown timer to prevent horizontal player bar oscillation.

## Deliverables
- `src/components/layout/WindowControlButtons.tsx`
- `src/components/layout/StandardAppShell.tsx`
- `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx`
- `src/components/guided-simulation/SimulationPlayerBar.tsx`
