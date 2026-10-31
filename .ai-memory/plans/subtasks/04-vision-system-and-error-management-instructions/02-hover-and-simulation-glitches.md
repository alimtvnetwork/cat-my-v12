---
Slug: hover-and-simulation-glitches
Status: pending
Created: 2026-10-31
Parent: 04-vision-system-and-error-management-instructions
MicroBatchFiles: 7
---

# Subtask 02: Menu Hover, Simulation Latency & Camera Aspect Ratio Micro-Batch Plan
# File: .ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/02-hover-and-simulation-glitches.md

## 1. Executive Summary & Objective

Eliminate visual jitter and operational latency across the UI shell and guided simulation workflows:
1. Fix navigation menu hover jitter by enforcing a symmetric 1px border box model and GPU-accelerating the `<Menu>` icon.
2. Optimize simulation transitions by eliminating artificial 700ms/800ms exit delays, accounting for pre-dwell DOM discovery duration, decoupling the 100ms interval timer from the root component, and stabilizing the countdown display with tabular numerals.
3. Resolve camera source dropdown clipping by mounting the menu via a Radix UI `Portal` outside parent `overflow-hidden` containers, and lock live camera streams to an aspect-ratio container with `0x0` frame dimension protection.

---

## 2. Target File Manifest (Bounded 5–8 Micro-Batch)

| Index | Relative File Path | Component / Layer | Primary Responsibility |
| :---: | :--- | :--- | :--- |
| 1 | `src/components/layout/StandardAppShell.tsx` | Shell Navigation | Apply symmetric `1px` borders (`border-transparent` -> `border-cyan-400/40`) and GPU-accelerated menu trigger. |
| 2 | `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx` | Guided Tour Engine | Remove 700ms exit delay, apply pre-dwell budget accounting, decouple 100ms timer. |
| 3 | `src/components/guided-simulation/SimulationPlayerBar.tsx` | HUD Player Bar | Apply `font-mono tabular-nums`, support 1s dwell slider, smooth CSS progress bar transition. |
| 4 | `src/components/vision/workpiece/AnalyzeImageToolbar.tsx` | Vision Toolbar | Mount camera source dropdown via Radix `Portal` to bypass `overflow-hidden` clipping. |
| 5 | `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx` | Canvas Workspace | Lock live camera video to `aspect-video` container and guard against `0x0` video dimensions. |
| 6 | `src/components/guided-simulation/__tests__/SimulationPlayerBar.test.tsx` | Test Suite | Unit tests verifying 1s slider range, dwell event firing, and tabular typography classes. |
| 7 | `src/components/vision/workpiece/__tests__/AnalyzeImageToolbar.test.tsx` | Test Suite | Unit tests verifying unclipped portal dropdown rendering and camera mode selection. |

---

## 3. Detailed Step-by-Step Execution Plan

### Step 1: Enforce Symmetric Borders on Menu Items & Accelerate Trigger Icon
- In `src/components/layout/StandardAppShell.tsx`:
  - Locate `CORE_NAV_ITEMS.map` and `AUX_NAV_ITEMS.map` dropdown items.
  - Enforce a constant `1px` border on all items:
    - Base: `border border-transparent`
    - Active: `bg-cyan-500/20 text-cyan-200 font-semibold border-cyan-400/40 shadow-[0_0_8px_rgba(34,211,238,0.2)]`
    - Inactive Hover: `text-slate-300 hover:border-white/10 hover:bg-white/10 hover:text-white`
  - In the Menu trigger button (line 287):
    - Replace `group-hover:scale-110` with hardware-accelerated icon container (`transform-gpu`, `translate-z-0`).
    - Fix the icon container bounding box to `w-3.5 h-3.5` so scaling never alters adjacent text flow.

### Step 2: Streamline Simulation Step Transitions & Pre-Dwell Accounting
- In `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx`:
  - In `advance()` (lines 1616–1626):
    - Reduce the hardcoded `700ms` exit delay down to `<= 50ms` (or `0ms` when target already exists in DOM).
  - In `beginStep()` (lines 1646–1654):
    - Track DOM wait duration: `const domWaitMs = Date.now() - waitStartedAt;`.
    - Apply pre-dwell accounting: deduct `domWaitMs` from total step dwell budget:
      `const remainingDwellMs = Math.max(totalStepMs - domWaitMs, 500);`
    - Ensure countdown accurately reflects total operator-configured stay time.

### Step 3: Decouple 100ms Progress Timer from Root Component
- In `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx`:
  - Remove `const [elapsedSec, setElapsedSec] = useState(0);` from the root component.
  - Maintain elapsed time in a lightweight ref or dedicated subscriber (`SimulationPlayerBar`).
  - Pass progress directly into `SimulationPlayerBar` without triggering root-level re-renders on every 100ms tick.

### Step 4: Stabilize Simulation Player Bar Layout & Typography
- In `src/components/guided-simulation/SimulationPlayerBar.tsx`:
  - Update remaining time container:
    ```tsx
    <span className="w-[48px] inline-block text-right font-mono tabular-nums font-semibold text-cyan-300">
      {remainingSec.toFixed(1)}s
    </span>
    ```
  - Update dwell time slider:
    - Change `min={2}` to `min={1}` with `step={1}`.
  - Update progress bar:
    - Apply `transition-[width] duration-100 ease-linear` to prevent animation stuttering between 100ms ticks.

### Step 5: Mount Camera Source Dropdown via Radix Portal
- In `src/components/vision/workpiece/AnalyzeImageToolbar.tsx`:
  - Replace the `absolute left-0 top-full` dropdown container with a Radix UI `Popover` using `Popover.Portal`.
  - Position overlay with `side="bottom" align="start" sideOffset={4}` and `z-[10080]`.
  - Confirm dropdown renders cleanly outside the parent container's `overflow-hidden` bounding box, resolving screenshot `bg2jMNWxHjkn`.

### Step 6: Lock Live Camera Video Aspect Ratio & Guard 0x0 Dimensions
- In `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`:
  - In the live camera render branch (lines 1693–1728):
    - Wrap the `<video>` element inside an `aspect-video` container matching the `960x540` coordinate space.
    - Check video dimensions: `const hasValidVideoDimensions = videoWidth > 0 && videoHeight > 0;`.
    - When `hasValidVideoDimensions === false`, render an industrial loading skeleton without changing the container size.
    - Guarantee smooth transitions between static workpiece images and live video streams without layout shifts.

### Step 7: Automated Test Suite Updates
- In `src/components/guided-simulation/__tests__/SimulationPlayerBar.test.tsx`:
  - Add test verifying dwell slider supports `min=1`.
  - Add test verifying `tabular-nums` CSS class is applied to remaining seconds element.
- In `src/components/vision/workpiece/__tests__/AnalyzeImageToolbar.test.tsx`:
  - Add test asserting camera source dropdown renders in portal layer without clipping.
  - Add test verifying clicking "Live Camera Feed" updates parent state.

---

## 4. Coding Guidelines & Invariant Checklist

- [ ] **Strict Positive Booleans**: Uses `hasValidVideoDimensions`, `isDropdownOpen`, `isCurrentActive`, `isTransitioning`, `isLiveCameraReady`.
- [ ] **Bounded Micro-Batch**: Exactly 7 files touched.
- [ ] **Zero Layout Shift**: Fixed bounding boxes on all dropdown and player bar elements.
- [ ] **Fluid Latency**: Transition delays capped to `<= 50ms`.
