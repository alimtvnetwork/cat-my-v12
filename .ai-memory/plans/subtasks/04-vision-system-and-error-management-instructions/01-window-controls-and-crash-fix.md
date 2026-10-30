# Subtask 01: Window Controls Multi-Runtime Bridge & Crash Fix

**Slug:** `01-window-controls-and-crash-fix`  
**Status:** pending  
**Parent Spec:** `02-spec/21-app/04-vision-system-and-error-management-instructions/01-ui-window-controls-and-automation-spec.md`  
**Target Area:** `src/components/layout/`, `src/lib/desktop/`, `src/components/hmi/`  
**Bounded Batch:** 5 files  

---

## 1. Context & Root Cause Analysis (RCA)

In `src/components/layout/WindowControlButtons.tsx`, the top-level window minimize, maximize, and exit controls assume the existence of `window.desktopApi`. However:
1. When launched under Chromium `--app` mode (`packaging/desktop/start.ps1`) or web preview, `desktopApi` is undefined.
2. In `handleConfirmExit`, the fallback logic executes:
   ```typescript
   try {
     window.close();
   } catch {}
   window.location.href = "/";
   ```
   Calling `window.close()` on a non-script-opened window triggers a DOM exception, and immediately navigating to `"/"` destroys active SPA state, causing an unexpected reload instead of a controlled shutdown.
3. In `handleToggleMaximize`, `document.documentElement.requestFullscreen()` triggers an unhandled promise rejection if user gesture timing constraints are not satisfied or if already operating within fullscreen kiosk mode.
4. In `src/components/layout/StandardAppShell.tsx`, the "Exit Application" dropdown action duplicates the same fragile `window.location.href = "/"` call.
5. In `src/components/hmi/Titlebar.tsx`, titlebar controls lack unified error handling and do not communicate with the backend lifecycle API.

---

## 2. Target File Batch (5 Files)

| File Index | Relative File Path | Role in Subtask |
| :--- | :--- | :--- |
| 1 | `src/lib/desktop/window-manager.ts` | Central multi-runtime window management bridge with safe fallback handling. |
| 2 | `src/components/layout/WindowControlButtons.tsx` | UI buttons consuming the window manager bridge with clean exit modal. |
| 3 | `src/components/layout/StandardAppShell.tsx` | Menu exit button refactor to use window manager exit workflow. |
| 4 | `src/components/hmi/Titlebar.tsx` | HMI titlebar control consolidation to match desktop window manager standards. |
| 5 | `src/components/layout/__tests__/WindowControlButtons.test.tsx` | Unit test suite verifying crash-proof window actions across mocked runtimes. |

---

## 3. Step-by-Step Implementation Plan

### Step 1: Create Multi-Runtime Window Manager Bridge
- **Target File:** `src/lib/desktop/window-manager.ts`
- Implement runtime detection helpers:
  - `isTauriRuntime(): boolean` (checks `typeof window !== "undefined" && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__))`
  - `isDesktopShellAvailable(): boolean` (checks for `window.desktopApi`)
  - `isWebPreviewRuntime(): boolean` (fallback when native runtimes are false)
- Implement `executeWindowMinimize(params?: WindowActionOptions): Promise<void>`:
  - If Tauri: call `appWindow.minimize()`.
  - If `window.desktopApi?.minimize`: invoke it safely.
  - If web: dispatch `cat-vision:window-minimize` CustomEvent.
- Implement `executeWindowToggleMaximize(): Promise<void>`:
  - If Tauri: call `appWindow.toggleMaximize()`.
  - If web: check `document.fullscreenElement`, toggle fullscreen wrapped in catch blocks.
- Implement `executeApplicationExit(): Promise<void>`:
  - Send POST request to `/api/v1/system/shutdown` with a 1500ms timeout.
  - If `desktopApi?.close`: call it.
  - If Tauri: call `appWindow.close()`.
  - Never invoke `window.location.href = "/"`.
  - If web preview: dispatch `cat-vision:session-concluded` event to show a clean modal.

### Step 2: Refactor WindowControlButtons Component
- **Target File:** `src/components/layout/WindowControlButtons.tsx`
- Replace direct `desktopApi` and `window.location.href` invocations with imported `executeWindowMinimize`, `executeWindowToggleMaximize`, and `executeApplicationExit`.
- Ensure all callback functions adhere to the positive boolean rule (`isExitDialogOpen`, `isProcessingExit`).
- Enhance the exit confirmation modal dialog:
  - Display title: "Confirm Exit Application".
  - Display message: "Are you sure you want to exit CAT Vision? Active inspection data and unsaved ruleset drafts will be safely preserved."
  - Provide "Cancel" and "Exit Application" buttons with explicit automation attributes (`btn-cancel-exit`, `btn-confirm-exit`).

### Step 3: Refactor StandardAppShell Menu Exit Action
- **Target File:** `src/components/layout/StandardAppShell.tsx`
- Replace inline exit handling in the "Exit Application" dropdown item (around line 431) with `executeApplicationExit()`.
- Prevent default navigation and eliminate `window.location.href = "/"`.

### Step 4: Refactor HMI Titlebar Window Controls
- **Target File:** `src/components/hmi/Titlebar.tsx`
- Synchronize window control buttons with `window-manager.ts`.
- Ensure identical visual tokens and tooltip labels: "Minimize to taskbar", "Window layer / Maximize", "Close application".

### Step 5: Author Unit Tests for Window Control Suite
- **Target File:** `src/components/layout/__tests__/WindowControlButtons.test.tsx`
- Verify component renders without crashing.
- Test minimize button triggers `executeWindowMinimize` without errors.
- Test maximize button toggles state safely when fullscreen is supported or rejected.
- Test close button opens confirmation dialog before triggering exit.
- Test canceling dialog keeps window open.
- Test confirming exit invokes `executeApplicationExit` without modifying `window.location.href`.

---

## 4. Strict Coding Guidelines Verification

1. **Strict Positive Booleans**:
   - `isExitDialogOpen` (not `showExitDialog` or `canExit`).
   - `isProcessingExit` (not `isExitingInProgress` or `wasClosed`).
   - `isTauriAvailable`, `isDesktopShellAvailable`, `isWebPreviewRuntime`.
2. **Parameter Structs**:
   - Window actions receive read-only parameter objects (e.g. `WindowActionOptions`).
3. **Vertical Line Gaps**:
   - Blank line before every `if` statement.
   - Blank line after closing `}`.
   - Blank line before every `return` statement.
4. **Disjoint Boundary**:
   - Strictly confined to the 5 specified files.

---

## 5. Acceptance Criteria

- [ ] **AC-01**: `src/lib/desktop/window-manager.ts` created with exhaustive runtime detection and zero uncaught exceptions.
- [ ] **AC-02**: `WindowControlButtons.tsx` minimize button works safely in both desktop and web preview modes.
- [ ] **AC-03**: `WindowControlButtons.tsx` maximize button toggles fullscreen state without unhandled promise rejections.
- [ ] **AC-04**: `WindowControlButtons.tsx` close button opens a confirmation dialog, eliminating `window.location.href = "/"`.
- [ ] **AC-05**: `StandardAppShell.tsx` Exit Application dropdown action uses the safe exit pipeline.
- [ ] **AC-06**: All unit tests in `WindowControlButtons.test.tsx` execute to green pass.
