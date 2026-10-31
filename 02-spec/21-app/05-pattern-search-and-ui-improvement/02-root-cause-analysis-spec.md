# Root Cause Analysis: Pattern Search, Carrier Tape Simulation & UI Stabilization Overhaul
# Document Path: 02-spec/21-app/05-pattern-search-and-ui-improvement/02-root-cause-analysis-spec.md
# Status: Approved Root Cause Analysis (4-Part RCA Framework)

## 1. Overview & Forensic Methodology

Following regression reports regarding the SMT pattern search engine, carrier tape simulation, window management, and UI responsiveness, a comprehensive root cause analysis was conducted across frontend components, algorithmic libraries, and runner scripts. 

Ten distinct root causes were isolated, documented, and cross-referenced with production screenshots and codebase traces using the standardized 4-Part RCA framework:
1. **Symptom & Trigger Condition**
2. **Underlying Technical Root Cause**
3. **Architectural & Blast Radius Impact**
4. **Targeted Remediation & Invariant Gate**

---

## 2. Root Cause Analyses

### 2.1 Root Cause 1: Missing Saved Pattern Boxes Failure

#### 1. Symptom & Trigger Condition
When configuring or running inspection rules using white-box marking or pattern search (e.g. tools `T102`, `T116`, or `greyscale_pattern_match`), the analyzer throws `Rule Execution Error: No pattern boxes defined` or falls back to an uncalibrated default 24-box constellation. Authoring new pattern boxes in `RuleToolConfigPanel.tsx` fails to persist them to the project database, causing the UI to display blank or displaced boxes upon reopening.

#### 2. Underlying Technical Root Cause
A property name asymmetry exists between `src/components/vision/workpiece/RuleToolConfigPanel.tsx` and `src/lib/vision/workpiece-rule-analyzer.ts`:
- In `RuleToolConfigPanel.tsx` (`handleApplyPattern`), pattern geometry was serialized and saved into `referenceBoxes`, `referenceBoxesJson`, `constellation`, and `constellationJson`. It omitted saving `patternBoxes` and `patternBoxesJson`.
- Conversely, downstream reducers and legacy analyzers in `workpiece-rule-analyzer.ts` and `pinned-pattern-geometry.ts` inspect `params.patternBoxes` as the primary key. When `params.patternBoxes` is undefined or empty, `parseBoxesFromParams` defaults to `DEFAULT_24_PATTERN_BOXES` or drops the marks completely.

#### 3. Architectural & Blast Radius Impact
Inspection recipes authored by operators lost their custom box layouts across page reloads. In carrier tape simulation mode, the analyzer could not retrieve pocket-relative offsets, resulting in false-negative inspection failures across 100% of tested components.

#### 4. Targeted Remediation & Invariant Gate
- **Remediation**: Update `handleApplyPattern` in `RuleToolConfigPanel.tsx` to write `patternBoxes: pattern.referenceBoxes` and `patternBoxesJson: JSON.stringify(pattern.referenceBoxes)` synchronously alongside `referenceBoxes`.
- **Invariant Gate**: `parseBoxesFromParams` must symmetrically hydrate from `patternBoxes`, `referenceBoxes`, or `constellation`, guaranteeing zero data loss regardless of storage key variant.

---

### 2.2 Root Cause 2: Wide Rectangular ROI (930x174) in Guided Simulation

#### 1. Symptom & Trigger Condition
During project onboarding and the guided simulation tour (`ProjectCreationAnalysisTour.tsx`), simulation-created patterns land in incorrect pixel locations. The search region spans across the entire viewport width (`930x174` px), covering multiple carrier tape pockets rather than isolating a single component.

#### 2. Underlying Technical Root Cause
In `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx` (lines 384, 547, 552), the mock rule generator explicitly hardcodes:
```typescript
searchRegion: { x: 49, y: 158, width: 930, height: 174 },
region: { x: 49, y: 158, width: 930, height: 174 }
```
This hardcoded region violates the fundamental Vision Architecture invariant that pattern search regions must be square (1:1 aspect ratio). Furthermore, `VisualToolWorkpieceCanvas.tsx` lacked an enforced square clamp during tour initialization, accepting the distorted rectangular bounding box.

#### 3. Architectural & Blast Radius Impact
Because Normalized Cross-Correlation (NCC) and constellation matching scale normalized offsets relative to the search ROI, the `930` px width stretched the template constellation horizontally by a factor of $5.34\times$ ($930 / 174$), scattering the 24 Atmel pattern boxes across the canvas and misaligning with the physical IC package.

#### 4. Targeted Remediation & Invariant Gate
- **Remediation**: Refactor `ProjectCreationAnalysisTour.tsx` to initialize `searchRegion` with square dimensions centered over the target device (e.g. `x: 393, y: 183, width: 174, height: 174`).
- **Invariant Gate**: Enforce `squareSearchRegion()` in `pinned-pattern-geometry.ts` on all inbound rule updates, guaranteeing `width === height` across all execution modes.

---

### 2.3 Root Cause 3: Pattern Boxes Drawn Over Empty Carrier Tape Pockets

#### 1. Symptom & Trigger Condition
In partial carrier tape strips containing unoccupied cavities (missing components), green or red pattern boxes are rendered inside empty pockets. Operators observe ghost template markings hovering over blank tape cavities.

#### 2. Underlying Technical Root Cause
In `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx` (lines 2250–2295) and `src/lib/vision/workpiece-rule-analyzer.ts`, carrier tape simulation partitioned the tape into pockets, but the canvas rendering pipeline mapped pattern boxes unconditionally over all pocket regions:
- While `workpiece-rule-analyzer.ts` correctly flagged `Pocket #N is EMPTY (skipped)`, the return envelope was not gated in `VisualToolWorkpieceCanvas.tsx`.
- The canvas canvas drawing loop iterated through all pockets and invoked `parseBoxesFromParams` without checking `pocket.status === "EMPTY"` or `pocket.isEmpty`.

#### 3. Architectural & Blast Radius Impact
Visual feedback contradicted the analytical engine. Operators saw pattern boxes rendered over empty pockets, misleading them into believing the vision system was attempting to match non-existent devices.

#### 4. Targeted Remediation & Invariant Gate
- **Remediation**: In `VisualToolWorkpieceCanvas.tsx`, inject an explicit occupancy guard prior to box rendering:
  ```typescript
  if (pocket.isEmpty || pocket.status === "EMPTY") {
    // Render empty pocket boundary with dimmed styling, suppress pattern box overlays
    return;
  }
  ```
- **Invariant Gate**: Empty pockets must strictly bypass pattern constellation rendering and yield evaluations.

---

### 2.4 Root Cause 4: Grayscale Color Distortion & Luminance Failure

#### 1. Symptom & Trigger Condition
When selecting grayscale filtering or testing threshold tolerance sliders in the rule editor, image colors exhibit extreme banding, unnatural contrast blowouts, and incorrect luminance conversions. Pin 1 orientation features fail detection on low-contrast IC packages.

#### 2. Underlying Technical Root Cause
In `src/lib/vision/luminance-quantizer.ts`:
- Stage 2 dynamic contrast stretching unconditionally rescaled the image dynamic range between the 2nd and 98th percentiles (`computeLuminancePercentiles`) even when standard linear grayscale was requested (`filterType === "none"` or unquantized grayscale).
- Furthermore, standard linear grayscale conversion was absent; the engine only supported aggressive 1-bit binary thresholding (`filterType === "binary"`) or 2-bit 4-level quantization (`filterType === "quantize2bit"`), stripping the 256-level gradient required for subpixel template edge matching.
- Weighting discrepancy: Inconsistent use of ITU-R BT.601 (`0.299R + 0.587G + 0.114B`) vs ITU-R BT.709 (`0.2126R + 0.7152G + 0.0722B`) across different modules created luminance shifts between preview and backend analysis.

#### 3. Architectural & Blast Radius Impact
Aggressive percentile stretching amplified sensor noise and blown out highlights on metallic IC lead surfaces, causing normalized cross-correlation scores to drop below the pass threshold (94.2%).

#### 4. Targeted Remediation & Invariant Gate
- **Remediation**: Implement a non-destructive 8-bit linear grayscale mode (`filterType === "grayscale"` or passthrough) utilizing unified ITU-R BT.601 luminance coefficients without compulsory percentile stretching. Reserve contrast stretching for explicit operator activation.
- **Invariant Gate**: Luminance extraction must preserve the full 0–255 monotonic range unless thresholding is explicitly enabled.

---

### 2.5 Root Cause 5: Pattern Search Rotation Instability & Unconstrained Centroids

#### 1. Symptom & Trigger Condition
Pattern matching intermittently drifts in opposite directions or locks onto incorrect rotated angles ($\pm 45^\circ$ or $180^\circ$ flips) when inspecting symmetrical IC components.

#### 2. Underlying Technical Root Cause
In `src/lib/vision/pattern-matcher.ts` (lines 258–290):
- Bounded rotation search evaluated candidate angles in 5-degree increments. However, the objective scoring function prioritized match count alone. On symmetrical grid constellations (such as the $8 \times 8$ or $6 \times 4$ Atmel IC arrays), a 90-degree or 180-degree rotation yields an identical number of matched boxes.
- The candidate pairing logic did not enforce a translation distance penalty or tie-breaker against the initial unrotated reference ($\theta = 0^\circ$), allowing noisy peripheral blobs to swing the winning rotation angle.

#### 3. Architectural & Blast Radius Impact
Rotation hopping caused inspection results to oscillate wildly between frames during live camera feeds, triggering sporadic false rejection alarms.

#### 4. Targeted Remediation & Invariant Gate
- **Remediation**: Update `pattern-matcher.ts` objective function to enforce strict rotation regularization:
  $$\mathrm{Score}(\theta) = M(\theta) - \lambda_{\mathrm{dist}} \sum d_i - \lambda_{\theta} |\theta|$$
  Where $M(\theta)$ is matched count, $\sum d_i$ is cumulative Euclidean distance, and $\lambda_{\theta}$ guarantees $\theta = 0^\circ$ wins all ties.
- **Invariant Gate**: A rotated solution must strictly outperform the unrotated candidate by at least 2 distinct matched points before overturning $\theta = 0^\circ$.

---

### 2.6 Root Cause 6: Menu Dropdown Glitch Snapping to (0,0) and Open Delay

#### 1. Symptom & Trigger Condition
Clicking the "Menu" button in `StandardAppShell.tsx` exhibits a visible glitch where the dropdown popup snaps momentarily to the top-left of the screen `(0,0)` before jumping to the trigger position. In addition, opening the menu experiences a 200–400ms perceptible lag.

#### 2. Underlying Technical Root Cause
- **Positioning Clash**: In `src/components/ui/dropdown-menu.tsx`, `DropdownMenuContent` includes Tailwind animation utility classes: `data-[side=bottom]:slide-in-from-top-2 data-[state=open]:animate-in`. These classes apply CSS `transform: translateY(...)`, which directly overwrites Radix UI / Popper's inline `style="transform: translate3d(x, y, 0)"`. During initial DOM mounting, the CSS transform takes precedence before Popper computes viewport coordinates, causing the element to render at `(0,0)`.
- **Event Delay**: `StandardAppShell.tsx` mounted `<DropdownMenu modal={true}>` in earlier builds. `modal={true}` forces Radix to inject a pointer-events blocker over `document.body`, synthesize backdrop locks, and suppress scrolling, introducing main-thread overhead.

#### 3. Architectural & Blast Radius Impact
Degraded operator experience, visual flicker, and failure of automated UI tests that assert immediate menu bounding box visibility.

#### 4. Targeted Remediation & Invariant Gate
- **Remediation**: Remove conflicting CSS transform animation classes from `DropdownMenuContent` in `dropdown-menu.tsx`. Set `modal={false}` in `StandardAppShell.tsx` and ensure content is rendered inside `DropdownMenuPrimitive.Portal`.
- **Invariant Gate**: Popper inline `translate3d` coordinates must maintain sovereign positioning control without CSS transform collisions.

---

### 2.7 Root Cause 7: Window Controls Failing in Browser Sandbox

#### 1. Symptom & Trigger Condition
Clicking Minimize (`—`), Maximize (`▢`), or Close (`✕`) buttons on the desktop titlebar in browser preview or Chromium `--app` mode fails to control the window or throws unhandled `DOMException` errors in console logs.

#### 2. Underlying Technical Root Cause
- In `src/components/layout/WindowControlButtons.tsx`, calling `window.close()` triggers:
  `DOMException: Scripts may not close windows that were not opened by script.`
- Standard web browsers running in non-Electron/non-Tauri environments sandbox script access to native OS window managers. Calling `window.minimize()` does not exist in standard DOM Window specifications.
- Earlier fallbacks attempted `window.location.href = "/"`, which navigates away from active inspection without stopping backend services.

#### 3. Architectural & Blast Radius Impact
Operators could not terminate the application cleanly from the HMI. Background Python/Uvicorn processes remained running as orphaned zombie tasks consuming CPU and memory.

#### 4. Targeted Remediation & Invariant Gate
- **Remediation**:
  * **Close**: Invoke loopback `POST /shutdown` on the local backend server, which replies with `200 OK` and initiates graceful process shutdown. The desktop supervisor script (`start.ps1`) observes process termination and closes the window.
  * **Maximize**: Dispatch HTML5 Fullscreen API (`document.documentElement.requestFullscreen()` / `document.exitFullscreen()`).
  * **Minimize**: Exit fullscreen mode if active; render an informational toast instructing the operator on OS shortcut usage (`Win + Down` / `Alt + Space + N`).
- **Invariant Gate**: Window control actions must never throw unhandled DOMExceptions or corrupt route navigation.

---

### 2.8 Root Cause 8: Run Scripts Opening Browser Unnecessarily & Slow Cold Start

#### 1. Symptom & Trigger Condition
Executing `run.ps1` or `run.sh` opens multiple browser tabs or spawns a new Chromium window when the desktop app is already open. Cold-starting the application on `/setup` takes upwards of 4–6 seconds.

#### 2. Underlying Technical Root Cause
- In `run.ps1` (line 155), `Start-Process` unconditionally launches Chromium in `--app` mode without checking if an existing instance is already listening on the designated port or if `start.ps1` was concurrently invoked.
- In `src/routes/setup.tsx`, heavy vision dependencies, schema validators, and canvas components were loaded synchronously in the initial bundle rather than leveraging route-level chunking and module pre-warming.

#### 3. Architectural & Blast Radius Impact
Dual browser windows caused port contention, doubled memory overhead, and confused operators with out-of-sync state.

#### 4. Targeted Remediation & Invariant Gate
- **Remediation**: In `run.ps1` and `run.sh`, query `Get-Process` / `pgrep` for active browser sessions bound to the CAT Vision port before executing `Start-Process`. Optimize Vite build chunks and pre-warm `/setup` route assets.
- **Invariant Gate**: Run scripts must enforce single-instance browser execution.

---

### 2.9 Root Cause 9: Version Badge Missing from /run and HMI Titlebar

#### 1. Symptom & Trigger Condition
In production inspection view (`/run`) and the top-level HMI TitleBar, operators and field engineers cannot determine which software build or release version is active.

#### 2. Underlying Technical Root Cause
- `src/routes/run.tsx` was implemented as a standalone route view without integrating `StandardAppShell`'s header badge or importing `APP_VERSION_INFO`.
- Version metadata resided in `version.json` and `src/lib/version-info.ts`, but no unified badge component was injected into the `/run` status bar.

#### 3. Architectural & Blast Radius Impact
Field diagnostics could not verify whether deployed workstations had received critical bug fixes, complicating telemetry audits.

#### 4. Targeted Remediation & Invariant Gate
- **Remediation**: Embed `APP_VERSION_INFO.version` badge component directly into the top header of `src/routes/run.tsx` and ensure standard display across `StandardAppShell.tsx`.
- **Invariant Gate**: Every top-level application view must prominently display the SemVer build number.

---

### 2.10 Root Cause 10: Layer Movement Inversion & Canvas ROI Lock Default

#### 1. Symptom & Trigger Condition
In `VisionLayersPanel.tsx`, clicking "Move Up" moves a layer lower in the visual stack or behind other canvas elements. In addition, when first opening the workpiece canvas, operators cannot resize the ROI by dragging without discovering the lock toggle.

#### 2. Underlying Technical Root Cause
- **Index Inversion**: The visual list renders from index `0` (top) down to index `N-1` (bottom). In contrast, canvas z-order renders from `z = 0` (back) to `z = max` (front). When `onReorderBox(id, "up")` decremented the array index to move it up visually, the canvas painter treated lower indices as lower z-indices, pushing the element behind other layers.
- **ROI Lock Default**: `isRoiLocked` initialized to `true` by default without intuitive inline visual feedback explaining why dragging handles were unresponsive.

#### 3. Architectural & Blast Radius Impact
Operators became frustrated attempting to adjust layer visibility and z-ordering, believing the canvas interaction was broken.

#### 4. Targeted Remediation & Invariant Gate
- **Remediation**: Harmonize array index operations with canvas painter z-index ordering so that "Move Up" decreases array index AND increases rendering layer precedence. Provide clear double-click hint badges when ROI handles are locked.
- **Invariant Gate**: Layer reorder operations must visually and functionally agree across panel and canvas rendering.
