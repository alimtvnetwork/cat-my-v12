# Window Controls & UI Jitter Elimination Specification
# Directory: 02-spec/21-app/04-vision-system-and-error-management-instructions/02-window-controls-and-ui-glitches-spec.md
# Status: draft

## 1. Top-Level Window Controls Fix (Minimize, Maximize, Close)

### 1.1 Root Cause Analysis (RCA)
- In `src/components/layout/WindowControlButtons.tsx`, window actions assume a global `window.desktopApi` object.
- When launched as a desktop app via Chromium `--app` mode (per `packaging/desktop/start.ps1`) or web preview, `desktopApi` is undefined.
- As a fallback, `handleConfirmExit` calls `window.close()`, which in Chromium throws:
  `DOMException: Scripts may not close windows that were not opened by script.`
- Then it executes `window.location.href = "/"`, leaving the browser window active, corrupting app state, and triggering unhandled errors.
- Similarly, `handleToggleMaximize` calls `document.documentElement.requestFullscreen()`, which can reject if not invoked strictly within a direct transient user activation gesture or if already in kiosk/app mode.
- In `src/components/layout/StandardAppShell.tsx`, the "Exit Application" dropdown menu action duplicates this fragile behavior without error catching or backend process signaling.

### 1.2 Remediated Control Architecture
1. **Multi-Runtime Window Manager Bridge**:
   - Provide an abstracted `WindowManager` helper supporting:
     - **Tauri Runtime**: `window.__TAURI_INTERNALS__` or `@tauri-apps/api/window` -> invokes `appWindow.minimize()`, `appWindow.toggleMaximize()`, `appWindow.close()`.
     - **Chromium Shell / Desktop Runtime**: Communicates with the backend server lifecycle API (`POST /api/v1/system/shutdown` or `POST /api/v1/system/window-state`) to safely terminate background server tasks and gracefully exit the host application process.
     - **Web Browser Runtime**: Gracefully resets active session state, releases open camera streams, and renders an in-app "Session Closed / Exit Complete" screen rather than throwing fatal script errors.
2. **Crash-Proof Event Handlers**:
   - Every window control handler (`handleMinimize`, `handleToggleMaximize`, `handleClose`) must wrap calls in try/catch and return monadic results.
   - Display a clean confirmation dialog before closing the app to prevent accidental loss of unsaved inspection rulesets.

---

## 2. Menu Navigation Hover Glitch Remediation

### 2.1 Root Cause Analysis (RCA)
- In `src/components/layout/StandardAppShell.tsx`, the menu dropdown items conditionally apply:
  ```tsx
  isCurrentActive
    ? "bg-cyan-500/20 text-cyan-200 font-semibold border border-cyan-400/40 shadow-[...]"
    : "text-slate-300 hover:bg-white/10 hover:text-white"
  ```
- **Asymmetric Borders**: Active items have a 1px border (`border border-cyan-400/40`), while inactive hover items have NO border (`border-0` or none).
- On hover/focus transitions or state changes, adding or changing borders modifies the layout box dimensions (box-sizing model reflow), causing the item and its sibling elements to shift by 1–2 pixels horizontally and vertically.
- In addition, the trigger button uses `group-hover:scale-110` on icons and `active:scale-95`, which modifies layout bounding boxes during rapid cursor traversal.

### 2.2 Fix Implementation
- Enforce strict border stability: All menu items must have an invisible static border (`border border-transparent`) when inactive, and transition only the border color (`border-cyan-400/40`) when active or hovered.
- Replace scale transforms on container elements with hardware-accelerated opacity/color transitions to guarantee zero pixel shifts during mouse movement.

---

## 3. Simulation Timing & Next Button Glitch Remediation

### 3.1 Root Cause Analysis (RCA)
- In `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx`:
  - `advance()` injects a hardcoded 700ms timeout delay (`window.setTimeout(..., 700)`) on exit actions.
  - `beginStep()` checks `hasTourTarget(step)` and polls every 150ms for up to 2000ms before starting the dwell timer.
  - The countdown timer only starts AFTER this initial wait. Therefore, when the dwell slider is configured to 2 seconds, the actual step transition takes **700ms + target wait (up to 2000ms) + 2000ms = 3.5s to 4.7s**, violating user expectations.
  - The dwell time slider in `SimulationPlayerBar.tsx` hardcodes `min={2}` instead of allowing fluid 1-second steps.
- In `src/components/guided-simulation/SimulationPlayerBar.tsx`:
  - The time remaining label `{remainingSec.toFixed(1)}s` renders in standard proportional typography, changing width between character shifts (e.g., `10.0s` vs `9.9s` vs `1.2s`), causing continuous horizontal vibration of the player bar.
  - The step title width is unbounded, causing the control buttons (`Prev`, `Pause`, `Next`) to shift positions as titles change length between steps.

### 3.2 Fix Implementation
1. **Fluid Timer & Dwell Slider**:
   - Set dwell slider range to `min={1}` to `max={10}` with step 1.
   - Streamline `advance()` to transition immediately when targets are loaded, capping transition delays to <= 100ms.
   - Pre-mount simulation targets or bypass redundant exit delays when running in automated step mode.
2. **Fixed Layout & Tabular Typography**:
   - Apply `tabular-nums` and a fixed-width container to `{remainingSec.toFixed(1)}s` so the counter never causes layout jitter.
   - Constrain the step title with a fixed max-width and truncate with ellipsis, anchoring the control buttons (`Prev`, `Pause`, `Next`) in a fixed-position flex container.
