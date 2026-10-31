# Subtask 02: Simulation Dwell Timing Calibration, Floating Tooltip Stability & Portaled Camera Dropdown

**Subtask ID:** `SS-02-simulation-dwell-and-dropdown-css`  
**File:** `.ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/SS-02-simulation-dwell-and-dropdown-css.md`  
**Parent Plan:** `04-vision-system-and-error-management-instructions`  
**Spec References:**  
- `02-spec/21-app/04-vision-system-and-error-management-instructions/01-architecture-and-window-controls-spec.md`  
- `02-spec/21-app/04-vision-system-and-error-management-instructions/02-ui-hover-and-simulation-timing-spec.md`  
**Status:** Ready for Execution  
**Ownership:** Subagent 1 (Shell Controls and Simulation Spec Author)  

---

## 1. Executive Summary & Targeted Objectives

This subtask resolves simulation playback delays, floating tooltip position flips, next button jumps, and parent container clipping on the workpiece toolbar's camera source dropdown menu.

### Targeted Deliverables
1. **Simulation Engine Timing Modernization** (`src/components/guided-simulation/ProjectCreationAnalysisTour.tsx`):
   - Calibrate `TOUR_MIN_STEP_MS` from `6500ms` down to `1000ms` to permit agile 1-second simulation cycles.
   - Reduce exit transition delay in `advanceTimerRef` from `700ms` to `100ms`, eliminating dead-time when switching views or completing guided steps.
   - Disable `@floating-ui` `flipOptions` and enforce stable placement contracts, preventing tooltip cards and their `Next >` buttons from jumping between viewport coordinates.
2. **Simulation Player HUD Dwell Slider Expansion** (`src/components/guided-simulation/SimulationPlayerBar.tsx`):
   - Update dwell input range to `min={1}`, allowing operators to configure rapid 1-second auto-advancement.
3. **Live Camera Dropdown Portaling** (`src/components/vision/workpiece/AnalyzeImageToolbar.tsx`):
   - Replace inline `absolute` container with Radix UI `DropdownMenu` + `<DropdownMenuPortal>` mounting directly to `document.body` at `z-[9999]`.
   - Prevent dropdown truncation caused by parent `overflow-hidden` or container stacking boundaries.

---

## 2. Implementation Slices

### Slice 1: Simulation Dwell & Transition Latency Calibration
**Target File:** `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx`

1. **Calibrate Minimum Step Duration**:
   - Location: `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx` (~line 48).
   - Change:
     ```typescript
     // Before:
     const TOUR_MIN_STEP_MS = 6500;

     // After:
     const TOUR_MIN_STEP_MS = 1000;
     ```
2. **Accelerate Exit Phase Transition Delay**:
   - Location: `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx` (~line 1620).
   - Change:
     ```typescript
     // Before:
     if (step.actionPhase === "exit") {
       setIsTransitioning(true);
       advanceTimerRef.current = window.setTimeout(() => {
         advanceTimerRef.current = null;
         setIsTransitioning(false);
         setStepIndex(stepIndex + 1);
       }, 700);
     } else {
       setStepIndex(stepIndex + 1);
     }

     // After:
     if (step.actionPhase === "exit") {
       setIsTransitioning(true);
       advanceTimerRef.current = window.setTimeout(() => {
         advanceTimerRef.current = null;
         setIsTransitioning(false);
         setStepIndex(stepIndex + 1);
       }, 100);
     } else {
       setStepIndex(stepIndex + 1);
     }
     ```

### Slice 2: Joyride Floating Placement Stabilization
**Target File:** `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx`

1. **Disable Tooltip Flipping**:
   - Location: `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx` (~line 1915).
   - Change:
     ```tsx
     // Before:
     floatingOptions={{
       flipOptions: {
         padding: { top: 60, bottom: 120, left: 24, right: 24 },
       },
       shiftOptions: {
         padding: { top: 60, bottom: 120, left: 24, right: 24 },
       },
     }}

     // After:
     floatingOptions={{
       flip: false,
       shift: {
         padding: { top: 60, bottom: 120, left: 24, right: 24 },
       },
     }}
     ```
2. **Lock Tooltip Card Dimensions**:
   - Ensure the custom tooltip renderer or styles enforce a stable min-height (`min-h-[140px]`) and stable bottom action bar alignment, preventing the `Next >` button from jumping vertically across different text length steps.

### Slice 3: Simulation Player HUD Dwell Slider Range
**Target File:** `src/components/guided-simulation/SimulationPlayerBar.tsx`

1. **Expand Slider Bounds**:
   - Location: `src/components/guided-simulation/SimulationPlayerBar.tsx` (~line 158).
   - Change:
     ```tsx
     // Before:
     <input
       type="range"
       min={2}
       max={10}
       step={1}
       value={dwellTimeSec}
       onChange={(e) => onChangeDwellTime(Number(e.target.value))}
       aria-label="Screen dwell duration in seconds"
       className="h-1.5 w-20 sm:w-24 cursor-pointer rounded-lg bg-slate-700 accent-cyan-400"
     />

     // After:
     <input
       type="range"
       min={1}
       max={10}
       step={1}
       value={dwellTimeSec}
       onChange={(e) => onChangeDwellTime(Number(e.target.value))}
       aria-label="Screen dwell duration in seconds"
       className="h-1.5 w-20 sm:w-24 cursor-pointer rounded-lg bg-slate-700 accent-cyan-400"
     />
     ```

### Slice 4: Radix Portaled Camera Dropdown Conversion
**Target File:** `src/components/vision/workpiece/AnalyzeImageToolbar.tsx`

1. **Import Radix Primitives**:
   ```typescript
   import {
     DropdownMenu,
     DropdownMenuTrigger,
     DropdownMenuPortal,
     DropdownMenuContent,
     DropdownMenuItem,
     DropdownMenuLabel,
     DropdownMenuSeparator,
   } from "@/components/ui/dropdown-menu";
   ```
2. **Refactor Dropdown Structure**:
   - Replace the legacy manual toggle button and inline `absolute` container:
     ```tsx
     <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
       <DropdownMenuTrigger asChild>
         <button
           type="button"
           data-tour="project-image-selector-dropdown"
           className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 font-sans text-xs font-semibold text-white shadow-sm transition hover:border-cyan-400/40 hover:bg-white/10 active:scale-95"
         >
           {isLiveCameraMode ? (
             <span className="flex items-center gap-1.5 text-emerald-400">
               <span
                 className={`h-2 w-2 rounded-full ${
                   isLiveCameraReady
                     ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                     : "bg-amber-400 animate-pulse"
                 }`}
               />
               <Camera size={13} />
               <span>Live Camera</span>
             </span>
           ) : (
             <span className="flex items-center gap-1.5 text-cyan-200">
               <FileImage size={13} className="text-cyan-400" />
               <span className="max-w-[200px] truncate">{activeLabel}</span>
             </span>
           )}
           <ChevronDown
             size={13}
             className={`text-white/50 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
           />
         </button>
       </DropdownMenuTrigger>

       <DropdownMenuPortal>
         <DropdownMenuContent
           align="start"
           sideOffset={6}
           className="z-[9999] w-80 rounded-xl border border-white/15 bg-[#0b0e14]/95 p-1.5 shadow-2xl backdrop-blur-2xl text-slate-100"
         >
           {/* Live Camera Option */}
           <DropdownMenuItem
             onClick={() => {
               onSelectLiveCamera();
               setIsDropdownOpen(false);
             }}
             className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 font-sans text-xs font-semibold cursor-pointer transition border border-transparent ${
               isLiveCameraMode
                 ? "bg-emerald-500/20 text-emerald-300"
                 : "text-white/80 hover:bg-white/5 hover:text-white"
             }`}
           >
             <div className="flex items-center gap-2">
               <Camera size={14} className="text-emerald-400" />
               <span>Live Camera Feed</span>
             </div>
             {isLiveCameraMode ? <CheckCircle2 size={13} className="text-emerald-400" /> : null}
           </DropdownMenuItem>

           <DropdownMenuSeparator className="my-1 bg-white/[0.08]" />
           <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
             Standard Presets
           </DropdownMenuLabel>

           {/* Presets mapping */}
           {/* Recents mapping */}
         </DropdownMenuContent>
       </DropdownMenuPortal>
     </DropdownMenu>
     ```

---

## 3. Verification & Quality Gates

### Automated Testing Plan
1. `src/components/guided-simulation/__tests__/SimulationPlayerBar.test.tsx`:
   - Test 1: Accepts `dwellTimeSec = 1` and fires `onChangeDwellTime(1)`.
   - Test 2: Renders slider with `min="1"` and `max="10"`.
2. `src/components/vision/workpiece/__tests__/AnalyzeImageToolbar.test.tsx`:
   - Test 1: Renders source selector dropdown trigger button.
   - Test 2: Opening dropdown mounts portal content at root document level (`document.body`).
   - Test 3: Selects Live Camera feed and verifies `onSelectLiveCamera` is triggered.
   - Test 4: Verifies dropdown menu has `z-[9999]` and does not clip when toolbar has overflow restrictions.
3. Joyride Manual E2E Validation:
   - Run simulation at 1s dwell; verify steady progression without tooltip flipping.
   - Confirm Next button retains fixed position.

### Acceptance Criteria Checklist
- [ ] `TOUR_MIN_STEP_MS` set to `1000` in `ProjectCreationAnalysisTour.tsx`.
- [ ] Exit delay reduced from `700ms` to `100ms` in `advanceTimerRef`.
- [ ] Floating flip disabled (`flip: false`) in Joyride configuration.
- [ ] `SimulationPlayerBar.tsx` allows `min={1}` dwell.
- [ ] `AnalyzeImageToolbar.tsx` uses Radix UI `DropdownMenuPortal` at `z-[9999]`.
- [ ] All booleans adhere strictly to positive `is...` / `has...` convention.
