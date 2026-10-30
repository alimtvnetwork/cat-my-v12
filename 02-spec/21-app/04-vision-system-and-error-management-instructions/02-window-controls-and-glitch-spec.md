# Window Controls & UI Glitch Elimination Specification
# Directory: 02-spec/21-app/04-vision-system-and-error-management-instructions/02-window-controls-and-glitch-spec.md
# Status: approved

## 1. Top-Level Window Controls Specification

### 1.1 Root Cause Analysis (RCA)

In `src/components/layout/WindowControlButtons.tsx`, window actions rely on `window.desktopApi`:
- When executed in standard browser preview, headless test suites, or Chromium `--app` mode (via `packaging/desktop/start.ps1`), `desktopApi` is undefined.
- As a fallback, `handleConfirmExit` executes:
  ```typescript
  try {
    window.close();
  } catch {
    // Ignored
  }
  window.location.href = "/";
  ```
- In modern Chromium and web engines, calling `window.close()` on a window not opened via script throws:
  `DOMException: Scripts may not close windows that were not opened by script.`
- Then it forcefully navigates to `window.location.href = "/"`, resetting React runtime state mid-flight, leaking active WebRTC camera streams, unmounting background workers uncleanly, and producing unhandled promise rejections.
- For maximizing, `handleToggleMaximize` executes `document.documentElement.requestFullscreen()`, which rejects without user activation or when operating within framed views.
- In `src/components/layout/StandardAppShell.tsx`, the "Exit Application" dropdown menu action duplicates this fragile behavior without runtime detection or error isolation.
- Evidence reference: `assets/screenshots/Os3MgbBIMHmT_20261031_014810.png` highlights the titlebar window controls (`—`, `▢`, `✕`) failing during desktop application execution.

### 1.2 Remediated Multi-Runtime Architecture

A centralized `WindowManager` abstraction (`src/lib/window/window-manager.ts`) isolates the UI from runtime platform differences:

```typescript
export type WindowRuntimeMode = "tauri" | "shell" | "web";

export interface WindowControlParams {
  readonly isMaximized: boolean;
  readonly isFullscreen: boolean;
  readonly hasNativeBridge: boolean;
}

export interface WindowActionResult {
  readonly isSuccessful: boolean;
  readonly runtimeMode: WindowRuntimeMode;
  readonly errorMessage?: string;
}

export interface WindowManagerApi {
  readonly getRuntimeMode: () => WindowRuntimeMode;
  readonly minimizeWindow: () => Promise<WindowActionResult>;
  readonly toggleMaximizeWindow: () => Promise<WindowActionResult>;
  readonly closeWindow: () => Promise<WindowActionResult>;
  readonly requestGracefulShutdown: () => Promise<WindowActionResult>;
}
```

#### Runtime Resolution Strategy:
1. **Tauri Runtime (`isTauriRuntime`)**:
   - Detects `window.__TAURI_INTERNALS__` or `@tauri-apps/api/window`.
   - Dispatches native window commands: `appWindow.minimize()`, `appWindow.toggleMaximize()`, and `appWindow.close()`.
2. **Desktop Shell Runtime (`isDesktopShellRuntime`)**:
   - Detects `window.desktopApi`.
   - When closing, sends an authenticated request to `POST /api/v1/system/shutdown` to terminate background inspection workers, close SQLite database connections cleanly, and exit the parent process.
3. **Web Browser Preview (`isWebPreviewRuntime`)**:
   - Never calls `window.close()` directly.
   - Gracefully releases open media tracks (`stream.getTracks().forEach(t => t.stop())`), flushes pending SplitDB error buffers, and renders an in-app "Session Concluded" state.

### 1.3 Clean Exit Modal Specification

Accidental window closures during active inspection runs risk hardware damage or uncommitted inspection recipes.
1. Clicking the close button (`✕`) opens a high-priority modal dialog:
   - Portal-mounted into `document.body` with `z-[10080]` to ensure it never renders behind sticky headers or canvas layers (resolving `assets/screenshots/_lKsg1rvFRnI_20261031_014810.png`).
   - Backdrop: `bg-black/80 backdrop-blur-md`.
   - Dialog card: `rounded-xl border border-white/15 bg-[#0f172a] p-5 shadow-2xl`.
2. Dialog controls:
   - **Cancel Button**: Closes the dialog, restores keyboard focus to previous trigger (`isExitDialogOpen: false`).
   - **Exit Now Button**: Executes `WindowManager.requestGracefulShutdown()`. While exiting, sets `isExiting: true` and displays an animated spinner indicator.

---

## 2. Menu Navigation Hover Glitch Specification

### 2.1 Root Cause Analysis (RCA)

In `src/components/layout/StandardAppShell.tsx`:
- The navigation items conditionally assign CSS classes:
  ```tsx
  isCurrentActive
    ? "bg-cyan-500/20 text-cyan-200 font-semibold border border-cyan-400/40 shadow-[...]"
    : "text-slate-300 hover:bg-white/10 hover:text-white"
  ```
- **Asymmetric Borders**: Active items have a `1px` border (`border border-cyan-400/40`), while inactive items specify no border (`border-0` or unset).
- In standard CSS box models (`box-sizing: border-box`), injecting a `1px` border onto an element or between hover states changes internal content padding or expands bounding rectangles by 2 pixels in width and height.
- This causes sibling elements to shift horizontally and vertically during mouse traversal, manifesting as visible UI vibration.
- Furthermore, the `<Menu>` trigger button in `StandardAppShell.tsx` line 287 uses:
  ```tsx
  <Menu className="h-3.5 w-3.5 text-cyan-400 transition-transform group-hover:scale-110" />
  ```
  `scale-110` without hardware layer promotion (`transform: translateZ(0)`) alters the vector bounding box during hover, triggering continuous subpixel anti-aliasing recalculations across adjacent text spans.
- Evidence reference: `assets/screenshots/RJPTx3RB8gDf_20261031_014810.png` shows the dropdown menu state susceptible to hover displacement.

### 2.2 Remediated Menu Styling & Hover Invariants

1. **Symmetric 1px Border Invariant**:
   - Every menu item, whether active, hovered, or idle, must have an identical `1px` solid border:
   ```tsx
   const baseItemClass = "flex items-center justify-between w-full px-2.5 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors outline-none border";

   const stateItemClass = isCurrentActive
     ? "bg-cyan-500/20 text-cyan-200 font-semibold border-cyan-400/40 shadow-[0_0_8px_rgba(34,211,238,0.2)]"
     : "text-slate-300 border-transparent hover:border-white/10 hover:bg-white/10 hover:text-white";
   ```
2. **Radix `asChild` Padding Resolution**:
   - `DropdownMenuItem` with `asChild` wraps a `<Link>` component. The outer `DropdownMenuItem` must not inject conflicting padding or margins. All padding (`px-2.5 py-1.5`) and flex layouts reside strictly on the inner child.
3. **GPU-Accelerated Menu Icon**:
   - The `<Menu>` icon applies hardware acceleration to prevent bounding box layout reflow:
   ```css
   .menu-icon-gpu {
     transform: translateZ(0);
     backface-visibility: hidden;
     will-change: transform;
   }
   ```
   - Replaces scale jumping with an opacity and color transition, or preserves container dimensions with a fixed `w-4 h-4` flex anchor so scaling the SVG icon never alters outer layout flow.

---

## 3. Simulation Transition Latency & Timer Jitter Specification

### 3.1 Root Cause Analysis (RCA)

In `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx`:
1. **Artificial Transition Delays**:
   - Lines 1620–1624 hardcode a `700ms` exit delay:
     ```typescript
     advanceTimerRef.current = window.setTimeout(() => {
       advanceTimerRef.current = null;
       setIsTransitioning(false);
       setStepIndex(stepIndex + 1);
     }, 700);
     ```
   - Lines 937–1068 configure step delays with `autoMs: 7000` and `autoMs: 8000`.
   - When advancing, lines 1646–1654 poll the DOM for target elements every `150ms` for up to `2000ms`.
2. **Pre-Dwell Accounting Deficit**:
   - The countdown dwell timer (`elapsedMsRef.current`) only begins ticking AFTER both the `700ms` exit delay and the DOM target wait finish.
   - When an operator sets dwell time to `2s`, the perceived wait is **700ms + 500ms DOM wait + 2000ms countdown = 3.2s to 4.7s**, violating user expectations.
3. **Root Component Render Churn**:
   - Lines 1676–1686 run a `setInterval` firing every `100ms`:
     ```typescript
     elapsedMsRef.current += 100;
     setElapsedSec(elapsedMsRef.current / 1000);
     ```
   - Invoking `setElapsedSec` at 10 Hz directly on the top-level `ProjectCreationAnalysisTour` component forces its entire 2000-line DOM tree to re-render, recalculating tooltips, re-running memo hooks, and creating UI hitching.
4. **Player Bar Layout Shifting**:
   - In `SimulationPlayerBar.tsx`, `{remainingSec.toFixed(1)}s` uses standard proportional font glyphs. Because `1` is narrower than `0`, `8`, or `9`, the text element changes width on every tick, causing the player bar to oscillate horizontally.
   - The progress bar animation uses `transition-all duration-100`, which lags behind the interval ticks and causes stutter.

### 3.2 Remediated Simulation Architecture

1. **Elimination of Artificial Transition Delays**:
   - Reduce exit transition timeout from `700ms` to `<= 50ms` (or `0ms` when target is already present in the DOM).
   - Cap DOM target search to a maximum of `200ms` with immediate fallback continuation.
2. **Pre-Dwell Accounting**:
   - Transition and DOM discovery times are accounted against the step's total budget. If DOM target acquisition takes `200ms`, the remaining dwell timer accounts for this so the operator's total duration strictly equals `configuredDwellSec`.
3. **Decoupled HUD Timer State**:
   - Extract the high-frequency `100ms` timer state from `ProjectCreationAnalysisTour.tsx` into a lightweight leaf component or dedicated Zustand store (`useSimulationProgressStore`).
   - The root tour component renders only on step changes (`setStepIndex`). The `SimulationPlayerBar` subscribes independently to the progress tick, completely eliminating root-level re-render churn.
4. **Tabular Typography & Fluid Progress Bar**:
   - Apply CSS class `font-mono tabular-nums` and a fixed minimum width (`w-[48px] inline-block text-right`) to `{remainingSec.toFixed(1)}s`.
   - Configure the progress bar width with CSS linear interpolation (`transition-[width] duration-100 ease-linear`) so progress fills smoothly.
   - Allow dwell duration slider to reach `min={1}` with step size `1`, enabling rapid step navigation.

---

## 4. Camera Dropdown & Live Source Display Specification

### 4.1 Root Cause Analysis (RCA)

In `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx` and `AnalyzeImageToolbar.tsx`:
1. **Container Clipping**:
   - `WorkpieceAnalyzeWorkspace.tsx` wraps the workspace in:
     ```tsx
     <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden ...">
       <AnalyzeImageToolbar ... />
       <div className="flex min-h-0 flex-1 gap-2.5 p-2 overflow-hidden">
     ```
   - In `AnalyzeImageToolbar.tsx`, clicking the image/camera source button toggles a dropdown positioned via:
     ```tsx
     <div className="absolute left-0 top-full z-[60] mt-1 w-80 ...">
     ```
   - Because parent containers enforce `overflow-hidden`, any dropdown extending beyond the toolbar height is clipped and hidden.
   - Evidence reference: `assets/screenshots/bg2jMNWxHjkn_20261031_014810.png` captures the camera dropdown sliced off at the container edge.
2. **Aspect Ratio Jump & 0x0 Video Frame Handling**:
   - `VisualToolWorkpieceCanvas` operates on a calibrated `960x540` coordinate space (`calibratedWidth: 960`, `calibratedHeight: 540`).
   - When switching to Live Camera mode:
     ```tsx
     <video
       ref={liveCameraVideoRef}
       playsInline
       autoPlay
       muted
       className="relative z-10 max-h-full max-w-full object-contain"
     />
     ```
   - Prior to camera negotiation, `video.videoWidth` and `video.videoHeight` report `0x0`. This causes the `<video>` element to collapse to 0 height or stretch unexpectedly.
   - Furthermore, camera streams delivering non-16:9 aspect ratios distort the coordinate mapping of overlay inspection rules.

### 4.2 Remediated Camera & Live Source Architecture

1. **Portal-Mounted Dropdown (Radix UI Popover / Portal)**:
   - Refactor `AnalyzeImageToolbar.tsx` to render the source selection dropdown inside a Radix UI `Portal` layer:
   ```tsx
   <Popover.Root open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
     <Popover.Trigger asChild>
       {/* Button trigger */}
     </Popover.Trigger>
     <Popover.Portal>
       <Popover.Content
         side="bottom"
         align="start"
         sideOffset={4}
         className="z-[10080] w-80 rounded-xl border border-white/15 bg-[#0b0e14]/98 p-1.5 shadow-2xl backdrop-blur-2xl"
       >
         {/* Live Camera Option and Presets */}
       </Popover.Content>
     </Popover.Portal>
   </Popover.Root>
   ```
   - This bypasses all `overflow-hidden` constraints across parent DOM hierarchies, ensuring the dropdown menu floats cleanly above all canvas elements.
2. **Workpiece Aspect Ratio Lock & 0x0 Video Protection**:
   - Wrap the live `<video>` feed inside an aspect-ratio-locked viewport matching `VisualToolWorkpieceCanvas`:
   ```tsx
   <div className="relative aspect-video w-full max-w-full max-h-full overflow-hidden rounded-lg bg-black flex items-center justify-center">
     {hasValidVideoDimensions ? (
       <video
         ref={liveCameraVideoRef}
         playsInline
         autoPlay
         muted
         className="h-full w-full object-contain"
       />
     ) : (
       <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
         <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
         <span className="text-xs font-mono uppercase tracking-wider">Syncing Video Stream (960×540)...</span>
       </div>
     )}
   </div>
   ```
   - Enforces positive boolean `hasValidVideoDimensions = videoWidth > 0 && videoHeight > 0`.
   - Inspection rule overlay coordinates projected onto the live camera stream maintain 1:1 mapping with the `960x540` workpiece coordinate grid.

---

## 5. Verification & Acceptance Criteria Matrix

| Verification Target | Acceptance Criteria | Automated Test Specification |
| :--- | :--- | :--- |
| **Window Minimize** | Minimizing in web preview dispatches `cat-vision:window-minimize`; in Tauri dispatches native call. No unhandled exceptions thrown. | `src/components/layout/__tests__/WindowControlButtons.test.tsx`: simulate click, verify event dispatch and zero console errors. |
| **Window Maximize** | Toggling maximize safely checks fullscreen state and catches promise rejections without crashing. | `src/components/layout/__tests__/WindowControlButtons.test.tsx`: test toggle with mock fullscreen rejection. |
| **Window Close Modal** | Clicking close opens exit confirmation modal at `z-[10080]`. Confirming invokes `requestGracefulShutdown()`. | `src/components/layout/__tests__/WindowControlButtons.test.tsx`: assert modal visibility, click confirm, verify API call. |
| **Menu Hover Jitter** | Inactive menu items retain `border-transparent` (1px width). Hovering modifies only border color, zero layout shift (0px delta in rect). | `src/components/layout/__tests__/StandardAppShell.test.tsx`: measure bounding box rect before and during hover. |
| **Simulation Timing** | Dwell timer configurable to 1s. Transition latency between steps <= 100ms. Root component does not re-render on 100ms tick. | `src/components/guided-simulation/__tests__/SimulationPlayerBar.test.tsx`: slider permits 1s, timer displays `tabular-nums`. |
| **Camera Dropdown** | Dropdown opens via Portal outside canvas `overflow-hidden` container. Video feed maintains 16:9 aspect ratio during 0x0 handshake. | `src/components/vision/workpiece/__tests__/AnalyzeImageToolbar.test.tsx`: verify portal rendering and dimension protection. |
