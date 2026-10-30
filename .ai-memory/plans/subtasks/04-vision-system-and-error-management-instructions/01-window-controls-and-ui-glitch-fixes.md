# Subtask 01: Window Controls, Modal Portaling, Menu Navigation, Simulation Transitions & Camera Dropdown Fixes

**Subtask ID:** `ss-01-window-controls-and-ui-glitch-fixes`  
**File:** `.ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/01-window-controls-and-ui-glitch-fixes.md`  
**Parent Plan:** `04-vision-system-and-error-management-instructions`  
**Spec Reference:** `02-spec/21-app/04-vision-system-and-error-management-instructions/01-window-controls-and-ui-glitch-spec.md`  
**Status:** Ready for Execution  
**Ownership:** Authoring Worker 01  

---

## 1. Overview & Execution Objectives

This executable subtask plan details the concrete implementation steps to resolve visual glitches, layout clipping, high-frequency render thrashing, and timing delays identified in Screenshots 07, 08, and 12.

Execution is structured into four atomic implementation slices:
- **Slice A:** Window Controls Fullscreen Reactivity, Exit Modal Body Portaling, and Graceful Teardown.
- **Slice B:** Simulation Timer Decoupling (10Hz Joyride Re-render Elimination) and Header Metrics ResizeObserver Stabilization.
- **Slice C:** Simulation Transition Acceleration (1s Dwell, Microtask Next Advance, Clamping Removal).
- **Slice D:** Live Camera Portaled Radix Dropdown (`z-[9999]`) and Synthetic Camera Test Pattern Generator.

---

## 2. Implementation Slices

### Slice A: Window Controls & Exit Modal Portaling
**Files Targeted:**
- `src/components/layout/WindowControlButtons.tsx`
- `src/components/layout/StandardAppShell.tsx`

**Implementation Actions:**
1. **Fullscreen Reactivity (`isFullscreen`):**
   - Import `Copy` and `Minimize2` from `lucide-react`.
   - Add state: `const [isFullscreen, setIsFullscreen] = useState(() => typeof document !== "undefined" && Boolean(document.fullscreenElement));`
   - Add `useEffect` listening to `"fullscreenchange"` on `document`.
   - Render conditional icon:
     - If `isFullscreen`: `<Copy className="h-3 w-3" />` with `title="Restore down"` and `aria-label="Restore Window"`.
     - Else: `<Square className="h-3 w-3" />` with `title="Maximize"` and `aria-label="Maximize Window"`.
2. **Body Portaling of Exit Modal (Fix Screenshot 07 Clipping):**
   - Import `createPortal` from `react-dom`.
   - Wrap the exit dialog markup in `createPortal(..., document.body)` so it mounts outside the `<header>` element and escapes `backdrop-blur-xl`, `overflow-hidden`, and CSS stacking transforms.
   - Add explicit accessibility attributes: `id="exit-dialog-title"`, `aria-labelledby="exit-dialog-title"`, `aria-describedby="exit-dialog-desc"`.
3. **Graceful Exit Teardown:**
   - In `handleConfirmExit`:
     - If `window.desktopApi?.close` is available, invoke it.
     - Else, dispatch a custom event `window.dispatchEvent(new CustomEvent("cat-vision:app-exit"))` and display an in-app session closed splash overlay without hard `window.location.href = "/"` reloads.

---

### Slice B: Menu Navigation & Joyride Re-Render Isolation
**Files Targeted:**
- `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx`
- `src/components/guided-simulation/SimulationPlayerBar.tsx`
- `src/components/hmi/Titlebar.tsx`
- `src/hooks/useHeaderMetrics.ts`

**Implementation Actions:**
1. **100ms High-Frequency Timer Decoupling (Fix Screenshot 08 Jitter):**
   - In `ProjectCreationAnalysisTour.tsx`, remove the top-level 100ms `setInterval` that calls `setElapsedSec`.
   - Move the progress ticker into `SimulationPlayerBar.tsx` (or a dedicated leaf timer component).
   - `SimulationPlayerBar` receives `isPaused`, `dwellTimeSec`, and `stepIndex`. It maintains an internal `requestAnimationFrame` or 100ms ticker that smoothly increments the local progress bar and countdown indicator without triggering re-renders in `ProjectCreationAnalysisTour`.
   - When the step duration elapses, `SimulationPlayerBar` invokes `onNext()` directly.
2. **Popper / Joyride Tooltip Stability:**
   - Because `ProjectCreationAnalysisTour` no longer re-renders 10 times per second, the floating tooltip coordinates stay fixed. Hovering over the Topbar `Menu` dropdown items does not cause tooltip repositioning or hopping.
3. **Header Metrics Stabilization & CSS Transition Removal:**
   - In `src/components/hmi/Titlebar.tsx`:
     - Remove `transition-[height]` from `className` of `<header>` (line 55).
     - Remove `transition-[height]` from `className` of `div[data-app-shell-row="top"]` (line 60).
   - In `src/hooks/useHeaderMetrics.ts`:
     - Cache previous measurements (`lastH`, `lastRowH`, `lastCrumbH`, `lastW`).
     - Compare rounded measurements before calling `root.style.setProperty(...)` to eliminate feedback loops between `ResizeObserver` and style invalidation.

---

### Slice C: Simulation Transition Pacing & Latency Removal
**Files Targeted:**
- `src/components/guided-simulation/SimulationPlayerBar.tsx`
- `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx`

**Implementation Actions:**
1. **Dwell Time Range Expansion:**
   - In `SimulationPlayerBar.tsx`, update range input slider:
     - Change `min={2}` to `min={1}`.
     - Update display label and test coverage for 1-second step transitions.
2. **Remove Hardcoded 6.5s Delay Clamp:**
   - In `ProjectCreationAnalysisTour.tsx`:
     - Remove `const TOUR_MIN_STEP_MS = 6500;`.
     - In step delay calculations, respect user dwell duration or step default without enforcing the 6.5s floor:
       ```typescript
       const defaultDelayMs = isCustomDwellSetRef.current
         ? dwellTimeSecRef.current * 1000
         : Math.max(step.autoMs ?? 1000, 1000);
       ```
3. **Replace Sluggish 700ms Exit Delay with Microtask Advance:**
   - In `ProjectCreationAnalysisTour.tsx`:
     - In `advance()`, replace `advanceTimerRef.current = window.setTimeout(..., 700)` with immediate or RAF-scheduled step advancement.
     - When user clicks "Next", cancel any pending timers and transition `stepIndex + 1` in ≤ 50ms.
     - Reduce mock analysis artificial timeout (line 1582) from `2800ms` to an instant microtask or ≤ 200ms when advancing.

---

### Slice D: Live Camera Dropdown Portaling & Synthetic Test Pattern
**Files Targeted:**
- `src/components/vision/workpiece/AnalyzeImageToolbar.tsx`
- `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`
- `src/lib/camera/test-pattern.ts` (new helper)

**Implementation Actions:**
1. **Radix UI Portaled Dropdown (Fix Screenshot 12 Clipping):**
   - In `AnalyzeImageToolbar.tsx`:
     - Add `relative z-40` to root container `<div>`.
     - Replace custom inline `isDropdownOpen` absolute `<div>` with Radix UI `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, and `DropdownMenuItem`.
     - Set `DropdownMenuContent` with `className="z-[9999] w-80 ..."` using `<DropdownMenuPortal>` to float outside canvas clipping contexts.
2. **Synthetic Camera Test Pattern Fallback:**
   - Create `src/lib/camera/test-pattern.ts` exporting `createSyntheticCameraStream(width, height, fps)`.
   - Draws dynamic SMPTE bars, moving green crosshair reticle, animated timestamp, and IC package silhouette.
   - Returns a `MediaStream` via `canvas.captureStream(30)`.
3. **Workspace Integration:**
   - In `AnalyzeImageToolbar.tsx`, add "Simulated Test Pattern (60 FPS)" option to the dropdown.
   - When selected, or when physical camera initialisation fails, `WorkpieceAnalyzeWorkspace` attaches the synthetic stream to the video element. Users can author rules, test pattern matching, and inspect edge detection without physical camera hardware.

---

## 3. Step-by-Step Verification Protocol

| Step | Action | Verification Check | Pass Criteria |
| :--- | :--- | :--- | :--- |
| **V1** | Run unit test suite for layout & window controls | `pnpm vitest run src/components/layout/__tests__` | 100% tests pass. |
| **V2** | Verify Exit modal DOM hierarchy | Inspect DOM when exit modal is triggered in browser | Modal container is a direct child of `document.body`. No clipping by `<header>`. |
| **V3** | Verify Fullscreen icon toggling | Toggle fullscreen via F11 or Maximize button | Icon switches between `Square` and `Copy`/`Minimize2`. |
| **V4** | Verify Simulation Timer isolation | Run tour and open topbar Menu | No tooltip hopping; Popper positions remain stable during 100ms ticker. |
| **V5** | Verify Simulation dwell slider and speed | Set dwell time to 1s and click Next | Slider accepts `1s`; step advances in ≤ 50ms without 700ms delay. |
| **V6** | Verify Live Camera dropdown floating | Open camera dropdown in Analyze workspace | Dropdown renders at `z-[9999]` above canvas and sidebars without clipping. |
| **V7** | Verify Synthetic Camera Stream | Select "Simulated Test Pattern" in dropdown | Video element displays animated color bars and live reticle. |

---

## 4. Acceptance Checklist

- [ ] `WindowControlButtons.tsx` reacts to `"fullscreenchange"` events and toggles between `Square` and `Copy`/`Minimize2`.
- [ ] Exit confirmation dialog is portaled to `document.body` and completely visible across full screen.
- [ ] Hard page navigation (`window.location.href = "/"`) on exit confirmation is replaced with a graceful exit flow.
- [ ] 100ms ticker is decoupled from `ProjectCreationAnalysisTour.tsx` host component.
- [ ] `<header>` in `Titlebar.tsx` has no `transition-[height]`. `useHeaderMetrics` does not trigger redundant style writes.
- [ ] `SimulationPlayerBar.tsx` dwell slider supports `min={1}` second.
- [ ] `TOUR_MIN_STEP_MS = 6500` clamp is eliminated.
- [ ] Next button transitions occur within ≤ 50ms without 700ms exit delays.
- [ ] `AnalyzeImageToolbar.tsx` uses Radix UI `DropdownMenu` portaled at `z-[9999]` and container has `relative z-40`.
- [ ] Synthetic camera test pattern stream generator is implemented and selectable.
