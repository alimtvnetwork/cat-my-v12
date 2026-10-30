# Subtask 01: Window Controls Desktop Detection, Teardown & Menu Hover Glitch Remediation

**Subtask ID:** `SS-01-window-controls-and-hover-fixes`  
**File:** `.ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/SS-01-window-controls-and-hover-fixes.md`  
**Parent Plan:** `04-vision-system-and-error-management-instructions`  
**Spec References:**  
- `02-spec/21-app/04-vision-system-and-error-management-instructions/01-architecture-and-window-controls-spec.md`  
- `02-spec/21-app/04-vision-system-and-error-management-instructions/02-ui-hover-and-simulation-timing-spec.md`  
**Status:** Ready for Execution  
**Ownership:** Subagent 1 (Shell Controls and Simulation Spec Author)  

---

## 1. Executive Summary & Targeted Objectives

This subtask executes the foundational window management, desktop runtime detection, hardware-safe stream teardown, and header layout stabilization across the application shell.

### Targeted Deliverables
1. **Desktop Window Controls Modernization** (`src/components/layout/WindowControlButtons.tsx`):
   - Add multi-target desktop runtime detection supporting Tauri (`window.__TAURI__`), Electron (`window.electronAPI`), and Desktop API bridges (`window.desktopApi`).
   - Implement reactive `isFullscreen` tracking with document `"fullscreenchange"` listeners to dynamically toggle between `Square` (Maximize) and `Copy` (Restore Down) icons.
   - Replace destructive `window.location.href = "/"` exit crashes with a graceful hardware teardown pipeline that stops all active `MediaStreamTrack` instances before closing or navigating.
   - Mount the Exit Confirmation modal via `createPortal(..., document.body)` with `z-[10080]` to escape titlebar clipping, filters, and overflow boundaries.
2. **App Shell Minimize Integration & Hover Glitch Fixes** (`src/components/layout/StandardAppShell.tsx`):
   - Wire event listener for `"cat-vision:window-minimize"`, rendering a docked mini-status pill when minimized in web browser mode.
   - Eliminate `group-hover:scale-110` icon sizing jitter from the persistent Menu button.
   - Inject mandatory `border border-transparent` base styling on all idle navigation rows to prevent 1px box-model layout shifts when hover/active states apply `border border-cyan-400/40`.

---

## 2. Implementation Slices

### Slice 1: Native Desktop Detection & Window Controls Bridge
**Target File:** `src/components/layout/WindowControlButtons.tsx`

1. Define or import `DesktopWindowBridge` and detection logic:
   - Check `window.__TAURI__?.window?.appWindow` for Tauri.
   - Check `window.electronAPI` or `window.desktopApi` for Electron.
   - Provide safe fallback dispatching `cat-vision:window-minimize` for web environments.
2. Replace hard-coded window method calls with the unified bridge helper.

### Slice 2: Fullscreen State Synchronization & Maximize/Restore Toggle
**Target File:** `src/components/layout/WindowControlButtons.tsx`

1. Add state and effect:
   ```typescript
   const [isFullscreen, setIsFullscreen] = useState(() =>
     typeof document !== "undefined" ? Boolean(document.fullscreenElement) : false,
   );

   useEffect(() => {
     const handleFullscreenChange = () => {
       setIsFullscreen(Boolean(document.fullscreenElement));
     };

     document.addEventListener("fullscreenchange", handleFullscreenChange);
     return () => {
       document.removeEventListener("fullscreenchange", handleFullscreenChange);
     };
   }, []);
   ```
2. Render conditional icon:
   - When `isFullscreen` is `true`:
     - Icon: `<Copy className="h-3 w-3" />` (or `<Minimize2 className="h-3.5 w-3.5" />`).
     - Accessibility: `aria-label="Restore Window"`, `title="Restore down"`.
   - When `isFullscreen` is `false`:
     - Icon: `<Square className="h-3 w-3" />`.
     - Accessibility: `aria-label="Maximize Window"`, `title="Window layer / Maximize"`.

### Slice 3: Hardware-Safe Graceful Exit Teardown
**Target File:** `src/components/layout/WindowControlButtons.tsx`

1. Implement camera stream release utility:
   ```typescript
   export function stopAllActiveMediaTracks(): void {
     if (typeof document === "undefined") {
       return;
     }
     const videoElements = document.querySelectorAll("video");
     videoElements.forEach((video) => {
       const stream = video.srcObject as MediaStream | null;
       if (stream && typeof stream.getTracks === "function") {
         stream.getTracks().forEach((track) => {
           track.stop();
         });
         video.srcObject = null;
       }
     });
   }
   ```
2. In `handleConfirmExit`:
   - Invoke `stopAllActiveMediaTracks()`.
   - Check desktop bridge `close()` method.
   - Fallback to safe window close (`window.close()`) or dispatch `"cat-vision:app-exit"` event without hard page reload.
3. Portal the Exit Dialog:
   - Use `createPortal(dialogContent, document.body)` to guarantee clean rendering above all UI layers.

### Slice 4: Shell Minimize Event Handler
**Target File:** `src/components/layout/StandardAppShell.tsx`

1. Add state: `const [isShellMinimized, setIsShellMinimized] = useState(false)`.
2. Add `useEffect`:
   ```typescript
   useEffect(() => {
     const onMinimize = () => {
       setIsShellMinimized(true);
     };

     window.addEventListener("cat-vision:window-minimize", onMinimize);
     return () => {
       window.removeEventListener("cat-vision:window-minimize", onMinimize);
     };
   }, []);
   ```
3. When `isShellMinimized` is `true`, render a floating bottom restoration pill:
   ```tsx
   {isShellMinimized ? (
     <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10050] flex items-center gap-2 rounded-full border border-cyan-500/40 bg-[#0b0e14]/95 px-4 py-2 shadow-2xl backdrop-blur-xl">
       <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
       <span className="text-xs font-semibold text-slate-200">Cat Vision Minimized</span>
       <button
         type="button"
         onClick={() => setIsShellMinimized(false)}
         className="ml-2 rounded-md bg-cyan-500/20 px-2 py-0.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30"
       >
         Restore
       </button>
     </div>
   ) : null}
   ```

### Slice 5: Elimination of Hover Glitches & Box-Model Jitter
**Target File:** `src/components/layout/StandardAppShell.tsx`

1. Remove icon scaling on Menu trigger:
   - Change:
     ```tsx
     <Menu className="h-3.5 w-3.5 text-cyan-400 transition-transform group-hover:scale-110" />
     ```
   - To:
     ```tsx
     <Menu className="h-3.5 w-3.5 text-cyan-400 transition-colors group-hover:text-cyan-300" />
     ```
2. Apply `border border-transparent` to idle menu rows:
   - Ensure the `Link` component inside `CORE_NAV_ITEMS.map` carries `border border-transparent` in its inactive class string:
     ```tsx
     className={cn(
       "flex items-center justify-between w-full px-2.5 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors outline-none",
       isCurrentActive
         ? "bg-cyan-500/20 text-cyan-200 font-semibold border border-cyan-400/40 shadow-[0_0_8px_rgba(34,211,238,0.2)]"
         : "text-slate-300 hover:bg-white/10 hover:text-white border border-transparent",
       isSimulationProjectTarget &&
         "border border-amber-300 bg-amber-400/20 text-amber-100 ring-2 ring-amber-300/80 shadow-[0_0_20px_rgba(251,191,36,0.45)] animate-pulse",
     )}
     ```

---

## 3. Verification & Quality Gates

### Automated Testing Plan
1. `src/components/layout/__tests__/WindowControlButtons.test.tsx`:
   - Test 1: Renders Minimize, Maximize, and Close buttons with correct aria labels.
   - Test 2: Clicking Maximize triggers `requestFullscreen` when not in fullscreen.
   - Test 3: Toggling fullscreen updates icon from `Square` to `Copy`.
   - Test 4: Clicking Close opens confirmation modal rendered in portal.
   - Test 5: Confirming exit invokes `stopAllActiveMediaTracks` and dispatches clean exit without throwing uncaught exceptions.
2. `src/components/layout/__tests__/StandardAppShell.test.tsx`:
   - Test 1: Dispatches and receives `cat-vision:window-minimize`, toggling the minimized restore dock pill.
   - Test 2: Verifies Menu button trigger does not contain `group-hover:scale-110`.
   - Test 3: Verifies all inactive menu navigation rows contain `border-transparent`.

### Acceptance Criteria Checklist
- [ ] No `group-hover:scale-110` present in `src/components/layout/StandardAppShell.tsx`.
- [ ] Inactive menu items have explicit `border border-transparent`.
- [ ] Window controls reflect real fullscreen status dynamically.
- [ ] Close confirmation modal is portaled directly into `document.body`.
- [ ] No hard `window.location.href = "/"` crash in exit logic.
- [ ] All boolean flags adhere strictly to affirmative `is...` / `has...` naming.
