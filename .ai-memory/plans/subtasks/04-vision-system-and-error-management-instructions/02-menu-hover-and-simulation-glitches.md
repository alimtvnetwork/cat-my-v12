# Subtask 02: Menu Hover Jitter Elimination, Camera Dropdown Portal & Simulation Timer Stability

**Slug:** `02-menu-hover-and-simulation-glitches`  
**Status:** pending  
**Parent Spec:** `02-spec/21-app/04-vision-system-and-error-management-instructions/01-ui-window-controls-and-automation-spec.md`  
**Target Area:** `src/components/layout/`, `src/components/home/`, `src/components/guided-simulation/`, `src/components/vision/workpiece/`  
**Bounded Batch:** 6 files  

---

## 1. Context & Root Cause Analysis (RCA)

1. **Menu Trigger SVG Scale Jitter**:
   - In `src/components/layout/StandardAppShell.tsx:287`, the Menu button icon uses `group-hover:scale-110`.
   - On cursor entry/exit, expanding the SVG bounding box recalculates inline flex spacing and triggers subpixel jitter of adjacent text and dropdown alignment.

2. **Asymmetric Menu Item Border Box Reflow**:
   - In `StandardAppShell.tsx`, navigation items conditionally apply:
     - Active item: `border border-cyan-400/40`
     - Inactive item: no border class (default `border-0`)
   - The absence of a default 1px border on inactive items introduces a 1–2px box-model dimension change on state switch and hover, creating visible layout vibration.

3. **Home View Card Translation Jitter**:
   - In `src/components/home/StandardHomeView.tsx:251` and `line 278`, arrow icons apply `group-hover/enter:translate-x-1` and `group-hover/qa:translate-x-0.5`.
   - Translating inline elements causes parent flex items to trigger paint and reflow events, producing visual tremor during rapid scrolling.

4. **Simulation Player HUD Timer Jitter & Interrupted Clicks**:
   - In `src/components/guided-simulation/SimulationPlayerBar.tsx`, the countdown readout `{remainingSec.toFixed(1)}s` renders in proportional font metrics without tabular numbers.
   - Digits of different widths cause the countdown container and adjacent controls to oscillate horizontally every 100ms.
   - The "Next" button lacks an isolated width and `data-no-lift` attribute, causing it to bounce when step titles expand or shrink.

5. **Camera Live Source Dropdown Clipping**:
   - In `src/components/vision/workpiece/AnalyzeImageToolbar.tsx`, the image source selection menu uses inline `absolute left-0 top-full` within a container rendered inside `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`.
   - The workspace enforces `overflow-hidden`, clipping the dropdown menu and preventing users from selecting preset images or live camera feeds.

---

## 2. Target File Batch (6 Files)

| File Index | Relative File Path | Role in Subtask |
| :--- | :--- | :--- |
| 1 | `src/components/layout/StandardAppShell.tsx` | Eliminate SVG scale-110 and provide symmetric transparent borders on all menu items. |
| 2 | `src/components/home/StandardHomeView.tsx` | Eliminate hover translation shifts on navigation cards. |
| 3 | `src/components/guided-simulation/SimulationPlayerBar.tsx` | Apply tabular monospace typography, fix title width, isolate Next button with `data-no-lift`. |
| 4 | `src/components/vision/workpiece/AnalyzeImageToolbar.tsx` | Refactor camera source selector to Radix UI `<DropdownMenu>` with `<DropdownMenuPortal>`. |
| 5 | `src/components/vision/workpiece/__tests__/AnalyzeImageToolbar.test.tsx` | Unit test verifying portal rendering and non-clipped dropdown behavior. |
| 6 | `src/components/guided-simulation/__tests__/SimulationPlayerBar.test.tsx` | Unit test verifying layout stability across timer ticks. |

---

## 3. Step-by-Step Implementation Plan

### Step 1: Remove SVG Scale Transform on Menu Trigger
- **Target File:** `src/components/layout/StandardAppShell.tsx`
- Locate line 287:
  ```tsx
  <Menu className="h-3.5 w-3.5 text-cyan-400 transition-transform group-hover:scale-110" />
  ```
- Replace `transition-transform group-hover:scale-110` with hardware-accelerated color/glow transitions:
  ```tsx
  <Menu className="h-3.5 w-3.5 text-cyan-400 transition-colors group-hover:text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]" />
  ```

### Step 2: Establish Symmetric Transparent Borders on Menu Items
- **Target File:** `src/components/layout/StandardAppShell.tsx`
- For both `CORE_NAV_ITEMS` and `AUX_NAV_ITEMS` mapping loops, update item styling:
  - Base class: Include `border border-transparent` permanently.
  - Active state: `border-cyan-400/40 bg-cyan-500/20 text-cyan-200 font-semibold shadow-[0_0_8px_rgba(34,211,238,0.2)]`
  - Inactive state: `text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/15`
- This ensures every item always occupies the exact same bounding box (1px border accounted for at all times), eliminating layout reflows.

### Step 3: Remove Card Translation Shifts in Home View
- **Target File:** `src/components/home/StandardHomeView.tsx`
- Locate line 251 (`group-hover/enter:translate-x-1`) and line 278 (`group-hover/qa:translate-x-0.5`).
- Remove `translate-x-*` classes.
- Use color and opacity transitions on the arrow icon instead of geometric translations.

### Step 4: Stabilize Simulation Player Typography & Next Button
- **Target File:** `src/components/guided-simulation/SimulationPlayerBar.tsx`
- Wrap the remaining time text in a fixed-width container:
  ```tsx
  <span className="text-[11px] text-slate-400 flex items-center gap-1">
    <span className="inline-block w-12 text-right font-mono font-semibold text-cyan-300 tabular-nums">
      {remainingSec.toFixed(1)}s
    </span>
    <span>remaining</span>
  </span>
  ```
- Constrain the step title with `max-w-[260px] truncate` to prevent title expansion from repositioning controls.
- Isolate the "Next" button with explicit width and the `data-no-lift` attribute:
  ```tsx
  <button
    type="button"
    onClick={onNext}
    disabled={!hasNextStep}
    title="Next Step"
    aria-label="Next Step"
    data-no-lift="true"
    className="flex w-20 sm:w-24 items-center justify-center gap-1 rounded-md border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-slate-200 transition-colors hover:border-white/[0.2] hover:bg-white/[0.08] hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
  >
    <span className="hidden sm:inline">Next</span>
    <SkipForward className="h-3.5 w-3.5" />
  </button>
  ```

### Step 5: Refactor Camera Source Dropdown to Radix Portal
- **Target File:** `src/components/vision/workpiece/AnalyzeImageToolbar.tsx`
- Import Radix UI DropdownMenu primitives:
  ```typescript
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
  ```
- Replace the inline absolute dropdown container with `<DropdownMenu>`:
  - `<DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>`
  - Wrap trigger button in `<DropdownMenuTrigger asChild>`.
  - Wrap dropdown body in `<DropdownMenuContent align="start" sideOffset={6} className="z-[100] w-80 rounded-xl border border-white/15 bg-[#0b0e14]/95 p-1.5 shadow-2xl backdrop-blur-2xl">`.
- This ensures the dropdown renders through Radix Portal at `document.body` and is never clipped by `WorkpieceAnalyzeWorkspace.tsx`'s `overflow-hidden`.

### Step 6: Verify and Author Tests
- **Target Files:**
  - `src/components/vision/workpiece/__tests__/AnalyzeImageToolbar.test.tsx`: Test that clicking the source selector opens dropdown content rendered via Portal, and selecting options triggers `onSelectLiveCamera` or `onSelectImage`.
  - `src/components/guided-simulation/__tests__/SimulationPlayerBar.test.tsx`: Test that timer updates render formatted monospace text with `tabular-nums` without layout distortion.

---

## 4. Strict Coding Guidelines Verification

1. **Strict Positive Booleans**:
   - `isDropdownOpen`, `isLiveCameraMode`, `isLiveCameraReady`, `hasNextStep`, `hasPreviousStep`, `isPaused`.
   - Never use `hasNoNextStep` or `notPaused`.
2. **Parameter Structs**:
   - Props interfaces are read-only and explicitly typed.
3. **Vertical Line Gaps**:
   - Mandatory blank lines before `if`, after `}`, before `return`.
4. **Disjoint Boundary**:
   - Strictly confined to the 6 specified files.

---

## 5. Acceptance Criteria

- [ ] **AC-01**: Menu trigger icon in `StandardAppShell.tsx` maintains constant dimensions on cursor hover without scale enlargement.
- [ ] **AC-02**: All menu items in `StandardAppShell.tsx` have permanent transparent borders, exhibiting zero pixel shift on hover or selection.
- [ ] **AC-03**: Navigation cards in `StandardHomeView.tsx` do not apply `translate-x-*` layout shifts on hover.
- [ ] **AC-04**: Simulation countdown timer displays in monospace tabular numbers without horizontal vibration.
- [ ] **AC-05**: Simulation "Next" button possesses fixed width and `data-no-lift` attribute, with no position displacement across step title transitions.
- [ ] **AC-06**: Camera source dropdown in `AnalyzeImageToolbar.tsx` renders via Radix Portal, escaping parent `overflow-hidden` constraints.
- [ ] **AC-07**: All unit tests in `AnalyzeImageToolbar.test.tsx` and `SimulationPlayerBar.test.tsx` pass cleanly.
