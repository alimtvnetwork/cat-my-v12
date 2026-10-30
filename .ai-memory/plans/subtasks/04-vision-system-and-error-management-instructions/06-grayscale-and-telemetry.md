# Subtask Execution Plan: Grayscale Bit-Depth Transformation, Supabase Sync & Email Telemetry
# File: .ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/06-grayscale-and-telemetry.md
# Slug: grayscale-and-telemetry
# Status: PENDING
# Batch Size: 7 files (Bounded Micro-Batch 5–8 Files)

## 1. Subtask Overview & Metadata

| Metadata Field | Subtask Detail |
| :--- | :--- |
| **Subtask ID** | `SUBTASK-VISION-06-GRAYSCALE-TELEMETRY` |
| **Parent Plan** | `.ai-memory/plans/pending/04-vision-system-and-error-management-instructions.md` |
| **Related Spec** | `02-spec/21-app/04-vision-system-and-error-management-instructions/06-supabase-and-email-telemetry-spec.md` |
| **Evidence Citations** | `assets/screenshots/rzcoeqtbFB8l_20261031_014810.png`, `assets/screenshots/9qwZWqYiKV95_20261031_014810.png`, `assets/screenshots/pUuIGz0ih_ZZ_20261031_014730.png` |
| **Boolean Standard** | Strict positive booleans only (`isRecording`, `isSyncEnabled`, `isConfigured`, `hasAttachment`, `isConnected`, `isBinarized`) |

### Objective

Fix the 1-sided thresholding bug in `src/lib/vision/white-box-marking.ts`, implement multi-bit depth quantization (1-bit, 2-bit, 8-bit) and dynamic contrast stretching, mount the `RECORD BUG` header launcher, integrate Supabase telemetry sync with mock fallback, dispatch diagnostic alert emails, and provide CLI hooks for filter tolerance controls and telemetry downloads.

---

## 2. Bounded Micro-Batch Target Matrix (7 Files)

| Index | Target File Path | Primary Architectural Responsibility |
| :--- | :--- | :--- |
| 1 | `src/lib/vision/white-box-marking.ts` | Fix 1-sided bug in `toThresholdPreviewRgba`, implement strict 1-bit binarization, dynamic contrast stretching, and 2-bit/8-bit modes. |
| 2 | `src/components/vision/WhiteBoxMarkingTool.tsx` | Wire bit-depth mode selectors (`1-bit`, `2-bit`, `8-bit`), contrast slider, and live preview rendering. |
| 3 | `src/components/layout/StandardAppShell.tsx` | Mount `RECORD BUG` header launcher with live recording state (`isRecording: true`), duration counter, and export modal trigger. |
| 4 | `src/components/telemetry/SupabaseSettingsModal.tsx` | Author Supabase settings modal with project URL/key inputs, test connection ping, and Antigravity mock preset. |
| 5 | `src/services/telemetry/supabase-client.ts` | Implement non-blocking Supabase sync client, object storage uploader (`cat-vision-telemetry`), and SplitDB mock fallback. |
| 6 | `src/services/telemetry/email-notifier.ts` | Implement diagnostic email dispatcher with structured HTML summary, SMTP/REST transport, and SplitDB `email_outbox` queue. |
| 7 | `scripts/cat-vision-cli.ts` | Add CLI commands for filter tolerance tuning (`vision filter set/inspect`) and telemetry download (`vision telemetry download`). |

---

## 3. Step-by-Step Implementation Breakdown

### Step 1: Remediate 1-Sided Bug & Bit-Depth Shader (`src/lib/vision/white-box-marking.ts`)
- Refactor `toThresholdPreviewRgba` so that pixels where `gray[index] < threshold` are clamped strictly to `0` (true pitch black), eliminating faint background noise.
- Implement `applyGrayscaleBitDepthTransformation` supporting:
  - `"1-bit"`: Strict two-level binary mask $\{0, 255\}$.
  - `"2-bit"`: 4 discrete quantization bands $\{0, 85, 170, 255\}$ at break thresholds $64, 128, 192$.
  - `"8-bit"`: Continuous 256 grayscale levels with min/max contrast normalization.
- Implement dynamic contrast stretching formula:
  $$\text{stretched} = \frac{\text{val} - \text{min}}{\text{max} - \text{min}} \times 255$$

### Step 2: Grayscale UI Controls & Live Preview (`src/components/vision/WhiteBoxMarkingTool.tsx`)
- Add segmented control for bit-depth mode: `[ 1-Bit (Binary) | 2-Bit (Contour) | 8-Bit (Full) ]`.
- Add slider for `Contrast Stretch (0–100%)` and label with percentage readout.
- Connect white threshold slider directly to the binarization engine for instant live canvas updates.
- Ensure high-performance preview updates using `requestAnimationFrame` debouncing.

### Step 3: Global Header `RECORD BUG` Launcher (`src/components/layout/StandardAppShell.tsx`)
- Mount `<Button>` in the persistent header:
  - Default: `<Bug className="h-4 w-4 mr-1.5" /> RECORD BUG` with `data-automation-id="btn-header-record-bug"`.
  - Active: Red pulsating badge `🔴 REC [mm:ss]` when `isRecording === true`.
- On start, initialize user action tracker and snapshot active recipe and canvas state.
- On stop, aggregate recent SplitDB errors from `errors.db`, package the diagnostic bundle, and trigger export dialog.

### Step 4: Supabase Telemetry Settings Modal (`src/components/telemetry/SupabaseSettingsModal.tsx`)
- Author dialog with fields:
  - `Supabase Project URL`
  - `API Key (Anon / Service)`
  - `Storage Bucket Name` (defaults to `cat-vision-telemetry`)
  - `Cloud Sync Toggle` (`isSyncEnabled: boolean`)
- Provide `"Test Connection"` button executing lightweight ping query.
- Include `"Use Antigravity Default Telemetry"` one-click button to load pre-seeded mock configuration.

### Step 5: Supabase Non-Blocking Client & Bucket Uploader (`src/services/telemetry/supabase-client.ts`)
- Initialize Supabase client via `@supabase/supabase-js`.
- Wrap all network operations in non-blocking try/catch logic; network failures never throw uncaught exceptions to UI.
- Implement `uploadDiagnosticBundle(payload: DiagnosticBundlePayload)`:
  - Uploads canvas PNG to bucket `cat-vision-telemetry/reports/{sessionId}/canvas.png`.
  - Inserts metadata record into `bug_reports` table.
  - If unconfigured, automatically delegates bundle persistence to SplitDB SQLite table `telemetry_queue.db`.

### Step 6: Email Notifier & SplitDB Offline Outbox (`src/services/telemetry/email-notifier.ts`)
- Implement `dispatchBugReportEmail(payload: DiagnosticBundlePayload, config?: EmailConfigOptions)`.
- Build high-contrast HTML email template with error summary, machine hostname, recipe name, and stack trace snippet.
- In offline mode or when SMTP is unconfigured, serialize message into SplitDB table `email_outbox` in `errors.db` with `is_dispatched = 0`.

### Step 7: CLI Filter Tuning & Telemetry Download Subcommands (`scripts/cat-vision-cli.ts`)
- Add CLI command `cat-vision-cli vision filter set --bit-depth <mode> --white-threshold <val> --contrast-stretch <val>`.
- Add CLI command `cat-vision-cli vision filter inspect --format json` returning pixel distribution metrics.
- Add CLI command `cat-vision-cli vision telemetry download --id <reportId> --out <dir>` downloading bundle manifest and canvas artifact.

---

## 4. Data Contracts & Architecture Schemas

```typescript
// Grayscale Transformation Contract
export interface GrayscaleFilterParams {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  bitDepthMode: "1-bit" | "2-bit" | "8-bit";
  whiteThreshold: number;
  contrastStretchPercent: number;
  isAutoThresholdEnabled: boolean;
}

// Telemetry Bundle Contract
export interface DiagnosticBundlePayload {
  bundleVersion: "1.0.0";
  reportId: string;
  sessionId: string;
  createdAtIso: string;
  appVersion: string;
  osPlatform: "windows" | "linux" | "darwin";
  summaryTitle: string;
  severity: "critical" | "error" | "warning" | "info";
  recentErrors: Array<{
    id: string;
    errorCode: string;
    message: string;
    stackTrace: string;
  }>;
  actionTimeline: Array<{
    timestampMs: number;
    eventType: string;
    automationId?: string;
  }>;
  canvasSnapshotBase64: string;
}
```

---

## 5. Acceptance Criteria & Automated Verification Matrix

| Verification ID | Component / File | Verification Condition | Target Result |
| :--- | :--- | :--- | :--- |
| `VERIF-GRAY-01` | `white-box-marking.ts` | Pixels below threshold are clamped strictly to `0` in `1-bit` mode. | Passed |
| `VERIF-GRAY-02` | `white-box-marking.ts` | Contrast stretch increases dynamic range between minimum and maximum luma. | Passed |
| `VERIF-GRAY-03` | `WhiteBoxMarkingTool.tsx` | Selecting `1-bit`, `2-bit`, or `8-bit` updates live canvas preview accurately. | Passed |
| `VERIF-REC-01`  | `StandardAppShell.tsx` | Clicking `"RECORD BUG"` starts duration timer and logs user actions to timeline. | Passed |
| `VERIF-REC-02`  | `StandardAppShell.tsx` | Stopping recording packages JSON bundle with canvas snapshot and errors. | Passed |
| `VERIF-SUPA-01` | `supabase-client.ts` | Uploads bundle to `cat-vision-telemetry` bucket when credentials are valid. | Passed |
| `VERIF-SUPA-02` | `supabase-client.ts` | Falls back gracefully to SplitDB local storage when credentials are empty. | Passed |
| `VERIF-MAIL-01` | `email-notifier.ts` | Constructs formatted diagnostic HTML email with error metadata. | Passed |
| `VERIF-MAIL-02` | `email-notifier.ts` | Queues un-dispatched emails in SplitDB `email_outbox` table during offline runs. | Passed |
| `VERIF-CLI-01`  | `cat-vision-cli.ts` | CLI sets filter bit-depth and threshold headlessly via `--bit-depth` and `--white-threshold`. | Passed |
