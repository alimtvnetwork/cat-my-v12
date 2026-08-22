# Subtask 06: TypeScript Swallowed Errors & Catch Handlers Remediation

**Slug:** `06-ts-swallowed-catches-and-error-handling`
**Parent Plan:** `.lovable/plans/pending/01-coding-guideline-fixes.md`
**Target Area:** `src/`
**Rules Violated:** `spec/03-error-manage/00-overview.md`, `.lovable/coding-guidelines.md` § Error Management (Hard Rule 4: No Swallowed Errors)

## 1. Context & Root Cause
Empty `catch {}` blocks or catch blocks that silently swallow exceptions without structured logging or rethrowing.
**Root Cause:** Defensive error suppression in UI components and localStorage helpers.
**Fallout Analysis:**
- Adding logging reveals hidden runtime failures; ensure log level matches severity (`console.warn` for fallback paths).

## 2. Granular Execution Steps (Steps 96-120)

### Step 96: Fix catch handler in `src/server.ts`
- **File:** [`src/server.ts`](file:///D:/wp-work/riseup-asia/cat-my/src/server.ts)
- **Type:** `silent_catch_no_log`
- **Snippet:** `return false;`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 97: Fix catch handler in `src/components/BugErrorModal.tsx`
- **File:** [`src/components/BugErrorModal.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/BugErrorModal.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `// Explicit surface - no silent swallow (spec 40 §3).
      ClientLogger.error("`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 98: Fix catch handler in `src/components/app-shell/RunningPill.tsx`
- **File:** [`src/components/app-shell/RunningPill.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/RunningPill.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `/* ignore */`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 99: Fix catch handler in `src/components/app-shell/panels/DockSlot.tsx`
- **File:** [`src/components/app-shell/panels/DockSlot.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/panels/DockSlot.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `// ignore, pointer already released`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 100: Fix catch handler in `src/components/camera/CaptureRequestDebugPanel.tsx`
- **File:** [`src/components/camera/CaptureRequestDebugPanel.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/camera/CaptureRequestDebugPanel.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `return false;`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 101: Fix catch handler in `src/components/camera/CaptureRequestDebugPanel.tsx`
- **File:** [`src/components/camera/CaptureRequestDebugPanel.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/camera/CaptureRequestDebugPanel.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `/* ignore */`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 102: Fix catch handler in `src/components/cli/copy-envelope-button.tsx`
- **File:** [`src/components/cli/copy-envelope-button.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/copy-envelope-button.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `ClientLogger.error("[CopyEnvelopeButton] JSON.stringify failed", serErr);
      `
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 103: Fix catch handler in `src/components/cli/copy-envelope-button.tsx`
- **File:** [`src/components/cli/copy-envelope-button.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/copy-envelope-button.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `ClientLogger.error("[CopyEnvelopeButton] clipboard write failed", clipErr);
    `
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 104: Fix catch handler in `src/components/cli/CorrelationIdChip.tsx`
- **File:** [`src/components/cli/CorrelationIdChip.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/CorrelationIdChip.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `// fall through`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 105: Fix catch handler in `src/components/cli/CorrelationIdChip.tsx`
- **File:** [`src/components/cli/CorrelationIdChip.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/CorrelationIdChip.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `return false;`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 106: Fix catch handler in `src/components/cli/envelope-viewer.tsx`
- **File:** [`src/components/cli/envelope-viewer.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/envelope-viewer.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `return false;`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 107: Fix catch handler in `src/components/cli/envelope-viewer.tsx`
- **File:** [`src/components/cli/envelope-viewer.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/envelope-viewer.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `return String(value);`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 108: Fix catch handler in `src/components/cli/ExitEnvelopeDrawer.tsx`
- **File:** [`src/components/cli/ExitEnvelopeDrawer.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/ExitEnvelopeDrawer.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `return String(sec);`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 109: Fix catch handler in `src/components/data-source/DataSourceToggle.tsx`
- **File:** [`src/components/data-source/DataSourceToggle.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/data-source/DataSourceToggle.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `const msg = err instanceof Error ? err.message : String(err);
      ClientLogger`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 110: Fix catch handler in `src/components/editor/CollapsibleSection.tsx`
- **File:** [`src/components/editor/CollapsibleSection.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/CollapsibleSection.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `// ignore storage errors`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 111: Fix catch handler in `src/components/editor/CollapsibleSection.tsx`
- **File:** [`src/components/editor/CollapsibleSection.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/CollapsibleSection.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `// storage may be unavailable (private mode); ignore`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 112: Fix catch handler in `src/components/editor/PropertiesPanel.tsx`
- **File:** [`src/components/editor/PropertiesPanel.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/PropertiesPanel.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `return null;`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 113: Fix catch handler in `src/components/editor/PropertiesPanel.tsx`
- **File:** [`src/components/editor/PropertiesPanel.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/PropertiesPanel.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `/* ignore */`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 114: Fix catch handler in `src/components/editor/canvas/CanvasViewport.tsx`
- **File:** [`src/components/editor/canvas/CanvasViewport.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/canvas/CanvasViewport.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `return SPOTLIGHT_DEFAULTS;`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 115: Fix catch handler in `src/components/editor/canvas/CanvasViewport.tsx`
- **File:** [`src/components/editor/canvas/CanvasViewport.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/canvas/CanvasViewport.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `/* ignore quota / private mode */`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 116: Fix catch handler in `src/components/editor/canvas/CanvasViewport.tsx`
- **File:** [`src/components/editor/canvas/CanvasViewport.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/canvas/CanvasViewport.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `/* ignore */`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 117: Fix catch handler in `src/components/editor/canvas/CanvasViewport.tsx`
- **File:** [`src/components/editor/canvas/CanvasViewport.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/canvas/CanvasViewport.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `/* ignore */`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 118: Fix catch handler in `src/components/editor/canvas/CanvasViewport.tsx`
- **File:** [`src/components/editor/canvas/CanvasViewport.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/canvas/CanvasViewport.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `ClientLogger.error("[canvas-sample] captureFrameFromStream threw", err);`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 119: Fix catch handler in `src/components/editor/canvas/SelectionOverlayQuickProps.tsx`
- **File:** [`src/components/editor/canvas/SelectionOverlayQuickProps.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/canvas/SelectionOverlayQuickProps.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `/* ignore */`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.

### Step 120: Fix catch handler in `src/components/editor/design-mode/DesignModeOverlay.tsx`
- **File:** [`src/components/editor/design-mode/DesignModeOverlay.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/design-mode/DesignModeOverlay.tsx)
- **Type:** `silent_catch_no_log`
- **Snippet:** `const message = err instanceof Error ? err.message : String(err);
      ClientLo`
- **Action:** Add structured error logging with operation name and context (`console.warn('[Operation]', { error: err })`) or propagate typed AppError.
- **Fallout Check:** Verify no silent breaks in user flow.
