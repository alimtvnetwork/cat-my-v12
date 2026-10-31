---
Slug: window-controls
Status: pending
Created: 2026-10-31
Parent: 04-vision-system-and-error-management-instructions
MicroBatchFiles: 7
---

# Subtask 01: Top-Level Window Controls & Exit Modal Micro-Batch Plan
# File: .ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/01-window-controls.md

## 1. Executive Summary & Objective

Implement a crash-proof, multi-runtime window control architecture for the desktop application shell. Eliminate fatal DOM exceptions caused by raw `window.close()` invocations in Chromium `--app` mode and web previews, encapsulate window lifecycle operations within a unified `WindowManager` bridge, integrate window controls into persistent headers, and provide a portal-mounted clean exit confirmation modal.

---

## 2. Target File Manifest (Bounded 5–8 Micro-Batch)

| Index | Relative File Path | Component / Layer | Primary Responsibility |
| :---: | :--- | :--- | :--- |
| 1 | `src/lib/window/window-manager.ts` | Platform Bridge | Abstract multi-runtime window operations (Tauri, Shell, Web) with typed results. |
| 2 | `src/components/layout/ExitConfirmationModal.tsx` | UI Component | Portal-mounted modal (`z-[10080]`) with cancel and confirmed shutdown actions. |
| 3 | `src/components/layout/WindowControlButtons.tsx` | UI Component | Titlebar action strip (`—`, `▢`, `✕`) with positive boolean runtime guards. |
| 4 | `src/components/layout/StandardAppShell.tsx` | Shell Layout | Embed `WindowControlButtons` in industrial header; connect system menu exit item. |
| 5 | `src/components/hmi/Titlebar.tsx` | HMI Layout | Embed `WindowControlButtons` in dedicated HMI screen header actions. |
| 6 | `src/components/layout/__tests__/WindowControlButtons.test.tsx` | Test Suite | Unit tests verifying click handlers, event dispatching, and fallback safety. |
| 7 | `src/components/layout/__tests__/StandardAppShell.test.tsx` | Test Suite | Regression tests ensuring titlebar layout integrity and modal trigger parity. |

---

## 3. Detailed Step-by-Step Execution Plan

### Step 1: Create Multi-Runtime Window Manager Abstraction
- Author `src/lib/window/window-manager.ts`.
- Implement positive boolean runtime flags:
  - `isTauriRuntime: boolean`: evaluates presence of `window.__TAURI_INTERNALS__` or `@tauri-apps/api/window`.
  - `isDesktopShellRuntime: boolean`: evaluates presence of `window.desktopApi`.
  - `isWebPreviewRuntime: boolean`: true when neither Tauri nor Desktop Shell is active.
- Expose methods returning `Promise<WindowActionResult>`:
  - `minimizeWindow()`: invokes Tauri `appWindow.minimize()` or dispatches `cat-vision:window-minimize`.
  - `toggleMaximizeWindow()`: safely handles fullscreen toggling with `.catch()` boundary.
  - `requestGracefulShutdown()`: dispatches backend `POST /api/v1/system/shutdown` or cleanly tears down active media streams without calling destructive `window.close()`.

### Step 2: Implement Dedicated Portal-Mounted Exit Confirmation Modal
- Author `src/components/layout/ExitConfirmationModal.tsx`.
- Props contract:
  ```typescript
  export interface ExitConfirmationModalProps {
    readonly isOpen: boolean;
    readonly isExiting: boolean;
    readonly onCancel: () => void;
    readonly onConfirmExit: () => void;
  }
  ```
- Mount via React `Portal` to `document.body` with `z-[10080]` to prevent clipping behind headers.
- Display warning icon, title "Exit Application?", and descriptive subtext.
- Wire "Cancel" button to `onCancel`.
- Wire "Exit Now" button to `onConfirmExit`, showing loading spinner when `isExiting === true`.

### Step 3: Refactor Window Control Buttons
- Update `src/components/layout/WindowControlButtons.tsx`.
- Replace inline fragile handlers with calls to `src/lib/window/window-manager.ts`.
- Manage modal state with positive booleans: `isExitDialogOpen` and `isExiting`.
- Add deterministic automation attributes:
  - `data-automation-id="window-control-minimize-btn"`
  - `data-automation-id="window-control-maximize-btn"`
  - `data-automation-id="window-control-close-btn"`

### Step 4: Integrate into StandardAppShell & Menu Dropdown
- Update `src/components/layout/StandardAppShell.tsx`.
- Ensure `WindowControlButtons` renders in the top-right header strip across all screen densities.
- Wire the "Exit Application" item in the top-left system menu to open the same `ExitConfirmationModal`.

### Step 5: Integrate into HMI Titlebar
- Update `src/components/hmi/Titlebar.tsx`.
- Mount `WindowControlButtons` inside `HeaderActions` so operators on HMI inspection views have consistent window controls.

### Step 6: Construct Automated Test Suites
- Update `src/components/layout/__tests__/WindowControlButtons.test.tsx`:
  - Verify clicking Minimize dispatches custom event in web preview mode.
  - Verify clicking Maximize does not throw when fullscreen API rejects.
  - Verify clicking Close renders the exit confirmation modal.
  - Verify clicking Exit Now executes shutdown sequence.
- Update `src/components/layout/__tests__/StandardAppShell.test.tsx`:
  - Assert presence of `data-testid="window-controls-bar"` in header.
  - Assert system menu exit action opens confirmation dialog.

---

## 4. Coding Guidelines & Invariant Checklist

- [ ] **Strict Positive Booleans**: Uses `isOpen`, `isExiting`, `isTauriRuntime`, `isDesktopShellRuntime`, `isWebPreviewRuntime`, `hasNativeBridge`. Zero negative prefixes (`isNot*`, `disabled`).
- [ ] **Bounded Micro-Batch**: Exactly 7 files touched.
- [ ] **Vertical Blank Line Spacing**: Blank lines before `if`, after `}`, and before `return`/`throw`.
- [ ] **No Raw Exceptions**: All window operations return structured `WindowActionResult` with try/catch containment.
