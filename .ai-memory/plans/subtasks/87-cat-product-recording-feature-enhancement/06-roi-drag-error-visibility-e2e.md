# Subtask 06: ROI Drag Tracking, Error Model Visibility & E2E Push Execution Plan

- **Task**: `cat-product-recording-feature-enhancement - Task 06`
- **Owner**: Worker 3 & Lead Orchestrator
- **Status**: READY_FOR_EXECUTION
- **Priority**: P0 (Non-Negotiable Architecture Invariant)
- **Specification Reference**: `02-spec/21-app/87-cat-product-recording-feature-enhancement/06-roi-drag-tracking-and-error-visibility-spec.md`
- **Target Files**:
  - `src/lib/recorder/types.ts`
  - `src/lib/recorder/event-interceptor.ts`
  - `src/components/vision/standard/RegionOverlay.tsx`
  - `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
  - `src/components/hmi/GlobalNav.tsx`
  - `src/components/nav/TopMenuBar.tsx`
  - `src/components/errors/GlobalErrorModal.tsx`
  - `src/components/recorder/RecorderExportModal.tsx`

---

## 1. Context & Objectives

Operators configuring inspection regions in CAT iVISION frequently encounter UX and diagnostic challenges:
1. **Opaque ROI Drag/Resize Actions**: Adjusting inspection bounds produces no telemetry regarding start/end pixels, delta shifts, or before/after visual grounding, rendering AI-assisted troubleshooting ineffective.
2. **Hidden Error State**: Runtime errors and Split-DB failures remain concealed in background logs unless the operator actively navigates to deep diagnostic views.
3. **Missing Error Bundling in Prompts**: Exported V6 and V7 prompts omit active system errors and full correlation traces.

This execution plan delivers:
- **Comprehensive ROI Drag & Resize Telemetry**: Captures start/end coordinates, natural image pixels, deltas $(\Delta x, \Delta y, \Delta w, \Delta h)$, element XPaths, and paired before/after screenshots.
- **Top Navigation Error Button with Live Counter**: Persistent title bar trigger with pulsing warning indicator for $>0$ active errors, directly launching `GlobalErrorModal`.
- **Runtime Error Ingestion**: Subscribes recorder to `useErrorStore` commits to automatically capture runtime exceptions into the activity ledger and prompt templates.
- **Strict Anti-Asset Storage Invariant**: Enforces that all captured diagnostic images are stored exclusively in `.logs/recorded-bugs/<session_id>/screenshots/` and never written to `src/assets`.

---

## 2. Step-by-Step Implementation Milestones

### Milestone 6.1: Recorder Event Schema & Coordinate Data Models
- **Target File**: `src/lib/recorder/types.ts`
- **Action**: Add specialized ROI drag and error event definitions:
  - Extend `RecorderEventType`:
    - Add `RoiDrag = "roi_drag"`
    - Add `RoiResize = "roi_resize"`
    - Add `Error = "error"`
  - Define `DragCoordinates` interface:
    ```typescript
    export interface DragCoordinates {
      startScreenX: number;
      startScreenY: number;
      endScreenX: number;
      endScreenY: number;
      startNaturalX: number;
      startNaturalY: number;
      endNaturalX: number;
      endNaturalY: number;
      deltaX: number;
      deltaY: number;
      startGeometry?: { x: number; y: number; width: number; height: number };
      endGeometry?: { x: number; y: number; width: number; height: number };
      deltaWidth?: number;
      deltaHeight?: number;
      handleId?: string;
      xpath: string;
      startScreenshotId?: string;
      endScreenshotId?: string;
    }
    ```
  - Define parameter structs for event emissions (`RoiDragEventParams`, `ErrorCaptureParams`).

### Milestone 6.2: ROI Drag and Resize Tracking in Region Overlays
- **Target Files**:
  - `src/components/vision/standard/RegionOverlay.tsx`
  - `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Action**: Instrument pointer interaction lifecycle:
  - In `RegionOverlay.tsx`:
    - On `handleHeaderPointerDown`:
      - If active recording is detected, record initial screen $(x_1, y_1)$ and natural image coordinates via `screenToImage`.
      - Trigger snapshot for start state: `roi-start-<label>-<timestamp>.png`.
    - In `onUp` (pointer release):
      - Record final screen $(x_2, y_2)$ and natural image coordinates.
      - Compute vector $\Delta x = x_2 - x_1$, $\Delta y = y_2 - y_1$.
      - Trigger snapshot for end state: `roi-end-<label>-<timestamp>.png`.
      - Emit `RecorderEventType.RoiDrag` with complete `DragCoordinates` and element XPath.
    - On `handleResizeDown` / `onResizeMove` / `onResizeUp`:
      - Track initial and final bounding dimensions $(w, h) \to (w', h')$.
      - Compute dimension deltas $\Delta w = w' - w$, $\Delta h = h' - h$.
      - Emit `RecorderEventType.RoiResize` with handle identifier (e.g. `handle-se`, `handle-nw`).

### Milestone 6.3: Top Navigation Error Button & Live Badge Counter
- **Target Files**:
  - `src/components/hmi/GlobalNav.tsx`
  - `src/components/nav/TopMenuBar.tsx`
- **Action**: Implement persistent, accessible error trigger:
  - Read active error history from `useErrorStore((s) => s.history)`.
  - Compute active count: `const errorCount = history.length`.
  - Render high-visibility trigger in title bar right slot:
    - Zero Errors: Compact slate pill displaying `0 Errors` or green dot `Healthy`.
    - $> 0$ Errors: Vibrant crimson/rose button with glowing border and pulsing ping animation:
      ```tsx
      <button
        type="button"
        onClick={() => useErrorStore.getState().openErrorModal()}
        className="flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/25 transition-all shadow-[0_0_12px_rgba(244,63,94,0.3)]"
        aria-label={`View ${errorCount} active diagnostic errors`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
        </span>
        <span className="font-mono text-xs">{errorCount} {errorCount === 1 ? "Error" : "Errors"}</span>
      </button>
      ```
  - Keyboard shortcut: Register `Ctrl+Shift+E` / `Cmd+Shift+E` to toggle modal.

### Milestone 6.4: SplitDB & Runtime Error Ingestion into Bug Recorder
- **Target Files**:
  - `src/lib/recorder/event-interceptor.ts`
  - `src/lib/recorder/recorder-store.ts`
- **Action**: Auto-subscribe recorder to error events during active sessions:
  - Add `initializeErrorRecordingSubscription`:
    - Listens to `useErrorStore` state mutations.
    - When `state.history.length > prevState.history.length` during active recording:
      - Appends `RecorderEventType.Error` event to recorder session.
      - Details include: `correlationId`, `code`, `message`, `stackTrace`, `level`, `triggerComponent`.

### Milestone 6.5: Prompt Builder Serialization & IDE Link Formatting
- **Target Files**:
  - `src/components/recorder/RecorderExportModal.tsx`
  - `src/lib/recorder/prompt-builders.ts`
- **Action**: Update V6 and V7 prompt templates:
  - Format paired ROI screenshots into visual evidence section:
    - `- **ROI Drag Start**: [step-03-roi-start](file;.logs/recorded-bugs/<session_id>/screenshots/step-03-start.png)`
    - `- **ROI Drag End**:   [step-03-roi-end](file;.logs/recorded-bugs/<session_id>/screenshots/step-03-end.png)`
    - Include tabular deltas and natural coordinates.
  - Format Split-DB and runtime errors into diagnostic section with full stack traces.
  - Insert Non-Asset Storage Invariant banner:
    ```markdown
    > [!IMPORTANT]
    > Never save these diagnostic screenshots inside the codebase or assets/ directory.
    > These artifacts exist strictly in .logs/ for AI diagnosis and ephemeral learning.
    ```

### Milestone 6.6: End-to-End Verification Test Suite
- **Target Files**:
  - `src/components/recorder/__tests__/roi-drag-error-visibility.test.tsx`
- **Action**: Author comprehensive tests verifying:
  - Dragging ROI triggers `RecorderEventType.RoiDrag` with accurate coordinates.
  - Resizing ROI triggers `RecorderEventType.RoiResize` with accurate delta dimensions.
  - Top navigation error button reflects live count and opens `GlobalErrorModal`.
  - Prompt generation includes paired file links and error tables.

---

## 3. Strict Coding Constraints & Rules

1. **Boolean Standards**:
   - Only `is` and `has` prefixes are permitted (`isRecording`, `hasScreenshot`, `isErrorModalOpen`, `isDragging`).
   - Non-nullable positive booleans only.
2. **Parameter Structs**:
   - Multi-parameter methods must accept single parameter structs (e.g. `RoiDragParams`, `ErrorCaptureParams`).
3. **Vertical Line Gaps**:
   - Mandatory blank lines before `if`, after `}`, and before `return`.
4. **Anti-Asset Invariant**:
   - Prohibit writing any images to `src/assets`. All files must go to `.logs/recorded-bugs/<id>/screenshots/`.

---

## 4. Acceptance Criteria & Quality Gates

- [ ] Pointer drag on `RegionOverlay` captures start/end natural pixels and commits `RoiDrag` event.
- [ ] Corner resize on `RegionOverlay` captures bounding dimension changes and commits `RoiResize` event.
- [ ] Paired before/after screenshots are generated and stored in `.logs/recorded-bugs/<session_id>/screenshots/`.
- [ ] Top navigation bar renders error button with dynamic error count and pulse animation for $>0$ errors.
- [ ] Clicking the error button opens `GlobalErrorModal` displaying full stack traces and correlation IDs.
- [ ] V6 and V7 prompt generators include formatted ROI interaction tables and Split-DB error logs.
- [ ] All unit and component tests pass 100% green.
