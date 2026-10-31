# 06 - ROI Drag & Resize Telemetry and Error Model Visibility Specification

- **Specification ID**: `SPEC-87-06-ROI-DRAG-ERROR-VISIBILITY`
- **Module**: `AppRuntime / InspectionCanvas / ErrorManagement`
- **Status**: Target Architecture Specification
- **Date**: 2026-10-31
- **Related Specs**:
  - `02-spec/21-app/87-cat-product-recording-feature-enhancement/01-runner-optimization-and-terminal-spec.md`
  - `02-spec/21-app/87-cat-product-recording-feature-enhancement/02-v6-v7-letterly-prompts-spec.md`
  - `02-spec/21-app/87-cat-product-recording-feature-enhancement/03-multi-action-export-and-email-spec.md`
  - `02-spec/21-app/87-cat-product-recording-feature-enhancement/05-supabase-quota-and-pruning-spec.md`
  - `02-spec/03-error-manage/02-error-architecture/04-error-modal/03-error-modal-reference.md`

---

## 1. Executive Summary & Strategic Objectives

During visual inspection setup and defect analysis in CAT (Computer Aided Testing / Vision HMI), two critical observability gaps historically impeded automated diagnosis and AI pair-programming:
1. **Opaque ROI Manipulations**: Region of Interest (ROI) drag, pan, and resize operations were previously recorded merely as generic canvas clicks or completely ignored in the activity ledger. An AI model analyzing a recording had no visibility into start/end drag coordinates, pixel displacements, bounding box adjustments, or handle mutations.
2. **Invisible Error State**: Diagnostic errors captured by backend Split-DB databases (`tasks.db`, `gitmap.db`, `installation.db`) or frontend envelopes remained buried in hidden stores. Operators lacked a persistent, prominent top-level indicator of active system errors, and recorded bug prompt exports frequently omitted the exact runtime failure traces required for root-cause diagnosis.

This specification establishes two foundational enhancements:
- **CAD-Grade ROI Drag & Resize Telemetry**: Captures precise start/end points, natural image coordinates, drag vector deltas $(\Delta x, \Delta y)$, bounding box adjustments $(\Delta w, \Delta h)$, DOM XPaths, and **paired before/after screenshots** for visual grounding.
- **Top Navigation Error Model Visibility & Diagnostic Ingestion**: Introduces a prominent top navigation error button with live badge counter and pulse animation, fully integrated with `GlobalErrorModal`, `ErrorHistoryDrawer`, and automatic markdown serialization for V6/V7 AI prompts.

---

## 2. ROI Drag & Resize Telemetry Architecture

When an operator modifies an inspection zone or workpiece region in `RegionOverlay.tsx`, `VisualToolWorkpieceCanvas.tsx`, or `StandardRoiSetup.tsx`, the telemetry engine monitors pointer lifecycle events (`pointerdown`, `pointermove`, `pointerup`).

```
  [POINTER DOWN] (x1, y1)
       │
       ├─► 1. Capture Natural Image Start Coords (x1_img, y1_img)
       ├─► 2. Resolve Element XPath (/HTML/BODY/.../DIV[@data-roi-handle])
       ├─► 3. Capture "roi-start" Baseline Screenshot
       │
  [DRAG / RESIZE INTERACTION]
       │
  [POINTER UP] (x2, y2)
       │
       ├─► 4. Capture Natural Image End Coords (x2_img, y2_img)
       ├─► 5. Compute Deltas: (dx, dy), (dw, dh)
       ├─► 6. Capture "roi-end" Mutated Screenshot
       ├─► 7. Commit Structured Event to `useRecorderStore`
       └─► 8. Format Paired Markdown Step with IDE File References
```

### 2.1 Coordinate Space Transformations: Screen vs. Natural Pixels

Inspection canvases operate under dynamic zoom and pan transformations:
- **Screen Pixels**: Viewport client coordinates $(x_{\text{screen}}, y_{\text{screen}})$ measured in CSS pixels from the browser window origin.
- **Natural Image Pixels**: True workpiece coordinates $(x_{\text{img}}, y_{\text{img}})$ corresponding to the underlying camera sensor resolution (e.g. $1920 \times 1080$).

Coordinate conversions are computed via established transforms in `src/lib/editor/coords.ts`:
$$x_{\text{img}} = \frac{x_{\text{screen}} - \text{viewport.offsetX}}{\text{viewport.zoom}}$$
$$y_{\text{img}} = \frac{y_{\text{screen}} - \text{viewport.offsetY}}{\text{viewport.zoom}}$$

Deltas are computed across both coordinate spaces:
$$\Delta x = x_2 - x_1, \quad \Delta y = y_2 - y_1$$
$$\Delta w = w_2 - w_1, \quad \Delta h = h_2 - h_1$$

### 2.2 Telemetry Event Data Contracts (`src/lib/recorder/types.ts`)

```typescript
export enum RecorderEventType {
  Click = "click",
  Input = "input",
  Navigation = "navigation",
  Inspection = "inspection",
  SystemLog = "system_log",
  StateChange = "state_change",
  Screenshot = "screenshot",
  UserNote = "user_note",
  Hover = "hover",
  RoiDrag = "roi_drag",
  RoiResize = "roi_resize",
  Error = "error",
}

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
  handleId?: string; // e.g. "header-drag", "handle-nw", "handle-se"
  xpath: string;
  startScreenshotId?: string;
  endScreenshotId?: string;
}
```

### 2.3 Paired Before/After Screenshot Acquisition

1. **Trigger on Pointer Down**:
   - Telemetry interceptor captures visual DOM slice or canvas raster: `roi-start-<ruleId>-<stepSeq>.png`.
   - Stores image binary in `.logs/recorded-bugs/<session_id>/screenshots/`.
2. **Trigger on Pointer Up**:
   - Canvas settles updated geometry.
   - Telemetry interceptor captures visual DOM slice or canvas raster: `roi-end-<ruleId>-<stepSeq>.png`.
3. **Strict Non-Asset Storage Invariant**:
   > [!IMPORTANT]
   > Screenshots captured during ROI drag operations MUST NEVER be written into `src/assets` or git-tracked directories. They are written strictly to `.logs/recorded-bugs/<session_id>/screenshots/` adjacent to local runtime execution.

---

## 3. Formatting ROI Steps for AI Visual Grounding

When synthesizing V6 or V7 prompt templates, ROI telemetry events are serialized into clear, grounded markdown steps:

### 3.1 Markdown Step Template

```markdown
### Step 04: ROI Region Resize (Zone #1 - Center Pocket)
- **Action**: Operator resized ROI boundary via corner handle `handle-se`
- **XPath**: `/HTML/BODY/DIV[1]/MAIN/DIV[2]/CANVAS[@data-canvas-id="workpiece-canvas"]`
- **Initial Coordinates (Natural)**: `X: 240px, Y: 180px, W: 320px, H: 240px`
- **Final Coordinates (Natural)**: `X: 240px, Y: 180px, W: 400px, H: 310px`
- **Deltas**: `ΔX: +0px, ΔY: +0px, ΔW: +80px, ΔH: +70px (Total Drag Distance: 106.3px)`
- **Visual Grounding References**:
  - Before: [step-04-roi-resize-start](file;.logs/recorded-bugs/REC-20261031-01/screenshots/step-04-roi-start.png)
  - After:  [step-04-roi-resize-end](file;.logs/recorded-bugs/REC-20261031-01/screenshots/step-04-roi-end.png)

> [!NOTE]
> AI Pair Programmer: The operator enlarged Zone #1 to encompass surface glare defects. Verify that threshold calculations in `BE/vision/thresholds.py` accommodate the expanded 400x310 bounding box.
```

---

## 4. Error Model Visibility & Top Bar Inspection

### 4.1 Industrial Top Navigation Error Trigger (`src/components/hmi/GlobalNav.tsx` & `TopMenuBar.tsx`)

A prominent, high-contrast error trigger button is integrated directly into the application's persistent title bar:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [CAT iVISION]  Home  Setup  ROI  Camera  Run  Results  │ [● 3 Errors] │ [Window]│
└─────────────────────────────────────────────────────────────┬───────────────────┘
                                                              │
                                                              ▼
                                            ┌───────────────────────────────────┐
                                            │      GlobalErrorModal.tsx         │
                                            │ - Overview: Code, CID, Timestamp  │
                                            │ - Stack Trace & Request Envelopes │
                                            │ - [Copy Diagnostics for AI / AGY] │
                                            └───────────────────────────────────┘
```

#### UI States & Ergonomics
1. **Clean State (Zero Active Errors)**:
   - Button renders as a compact, subtle pill: `border border-white/10 bg-white/5 text-slate-400`.
   - Counter shows `0 Errors` or simple green dot with text `Healthy`.
2. **Active Errors State ($N > 0$)**:
   - Button highlights in vibrant warning/critical tones:
     `border-rose-500/40 bg-rose-500/15 text-rose-400 hover:bg-rose-500/25`
   - Includes a live pulsing ping indicator:
     ```tsx
     <span className="relative flex h-2 w-2">
       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
       <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
     </span>
     <span className="font-mono text-xs font-bold">{errorCount} {errorCount === 1 ? "Error" : "Errors"}</span>
     ```
3. **One-Click Action**:
   - Clicking the trigger immediately invokes `useErrorStore.getState().openErrorModal()`.
   - Secondary trigger via keyboard shortcut (`Ctrl+Shift+E` / `Cmd+Shift+E`).

### 4.2 Integration with Antigravity Error Models & `GlobalErrorModal`

The application already features an enterprise-grade `GlobalErrorModal.tsx` and `ErrorHistoryDrawer.tsx` governed by `useErrorStore`. This specification wires full accessibility:
1. **Direct Diagnostics Copying**:
   - Operators can click `"Copy for AI / IDE"` within the error modal.
   - Generates formatted Markdown including:
     - Correlation ID (`cid`)
     - Error Code (e.g. `E_BE_CAMERA_TIMEOUT`, `E_RECIPE_VALIDATION_FAILED`)
     - Component Trigger (`triggerComponent`)
     - Full bounded stack trace
     - Request / Response envelope JSON
2. **Persistence across Sessions**:
   - Backed by `src/lib/errors/history-facade.ts` with local cache synchronization (`cat_vision_error_history`).

---

## 5. Runtime Error Interception & Prompt Bundling

When a user initiates bug recording, any error logged during the active recording window must automatically become part of the generated bug report prompt.

### 5.1 Error Interceptor Subscription (`src/lib/recorder/event-interceptor.ts`)

```typescript
export function initializeErrorRecordingSubscription(): () => void {
  return useErrorStore.subscribe((state, prevState) => {
    const isRecording = useRecorderStore.getState().isRecording;
    if (!isRecording) return;

    // Detect newly committed errors
    if (state.history.length > prevState.history.length) {
      const latestError = state.history[0];
      if (!latestError) return;

      useRecorderStore.getState().addEvent({
        actor: RecorderActorType.System,
        eventType: RecorderEventType.Error,
        description: `Runtime Exception: [${latestError.code}] ${latestError.message}`,
        targetComponent: latestError.triggerComponent || "SystemRuntime",
        selector: `error://${latestError.code}`,
        route: window.location.pathname,
        hasScreenshot: false,
        details: {
          correlationId: latestError.correlationId,
          code: latestError.code,
          message: latestError.message,
          stackTrace: latestError.stackTrace,
          level: latestError.level,
        },
      });
    }
  });
}
```

### 5.2 Split-DB Diagnostics Ingestion into V6 & V7 Prompts

When generating prompts via `generateV6Prompt` or `generateV7Prompt`, active errors are formatted into a dedicated section:

```markdown
## Active Runtime & Split-DB Diagnostics
| Code | Correlation ID | Component | Error Message |
| :--- | :--- | :--- | :--- |
| `E_BE_STORAGE_QUOTA` | `cid-9812-fa81` | `SupabaseClient` | Storage capacity exceeded 450MB limit |
| `E_ROI_OUT_OF_BOUNDS` | `cid-9812-fa82` | `RegionOverlay` | Bounding box (400, 310) exceeds workpiece image bounds |

### Diagnostic Stack Trace (`E_BE_STORAGE_QUOTA`)
```text
AppError: Supabase storage quota exceeded
  at verify_quota_and_prune (BE/bug_reports/supabase_client.py:142)
  at handle_bug_report_upload (BE/routes/bug_reports.py:215)
  at process_request (uvicorn/protocols/http/h11_impl.py:408)
```
```

---

## 6. Component Interaction Contracts & Types

### 6.1 `RegionOverlay` Telemetry Props (`src/components/vision/standard/RegionOverlay.tsx`)

```typescript
export interface RegionOverlayTelemetryProps {
  color: string;
  geometry: Geometry;
  onChange: (g: Geometry) => void;
  viewport: Viewport;
  active?: boolean;
  isLocked?: boolean;
  label?: string;
  onSelect?: () => void;
  /** Telemetry callback invoked on pointer drag completion */
  onDragTelemetry?: (telemetry: DragCoordinates) => void;
}
```

### 6.2 Top Bar Error Button Contract (`src/components/nav/TopBarErrorTrigger.tsx`)

```typescript
export interface TopBarErrorTriggerProps {
  className?: string;
  compact?: boolean;
  onOpenModal?: () => void;
}
```

---

## 7. Verification Matrix & Edge Cases

| Test ID | Scenario | Precondition | Expected Result |
| :--- | :--- | :--- | :--- |
| `TC-ROI-01` | ROI Drag Telemetry | Active recording; user drags ROI zone #1 header | Event `RecorderEventType.RoiDrag` logged with start/end natural coordinates, delta vector $(\Delta x, \Delta y)$, and XPath. |
| `TC-ROI-02` | ROI Corner Resize | User drags `handle-se` resize grip | Event `RecorderEventType.RoiResize` logged with delta dimensions $(\Delta w, \Delta h)$ and paired before/after screenshots. |
| `TC-ROI-03` | Zoom & Pan Compensation | Canvas zoomed at $2.5\times$ with offset $(120, 80)$ | Screen pixels correctly inverted to natural workpiece coordinates without drift. |
| `TC-ERR-01` | Top Bar Error Button | Zero errors in `useErrorStore` | Button shows "Healthy" with green indicator; clicking opens modal with empty state. |
| `TC-ERR-02` | Live Error Badge & Pulse | 2 runtime errors committed | Badge shows "2 Errors" with glowing crimson border and pulse animation; click immediately opens `GlobalErrorModal`. |
| `TC-ERR-03` | Prompt Error Bundling | Errors occurred during recording session | V6 and V7 prompts include markdown error table with correlation IDs and stack traces. |
| `TC-ERR-04` | Anti-Asset Invariant | ROI screenshots captured | Files saved strictly to `.logs/recorded-bugs/<id>/screenshots/`; zero writes to `src/assets`. |
