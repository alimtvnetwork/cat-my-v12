# Subtask 09: Grayscale Thresholding, Contrast Preprocessing & Telemetry Dispatch
# File: .ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/09-grayscale-contrast-and-telemetry.md
# Reference Spec: 02-spec/21-app/04-vision-system-and-error-management-instructions/03-vision-roi-layers-and-telemetry-spec.md
# Status: PENDING

## 1. Problem Statement & Root Cause

1. **Defective Thresholding in `toThresholdPreviewRgba` (`rzcoeqtbFB8l`, `9qwZWqYiKV95`)**:
   - In `src/lib/vision/white-box-marking.ts` lines 174–189:
     ```typescript
     export function toThresholdPreviewRgba(
       input: WhiteBoxMarkingInput,
       whiteThreshold: number,
     ): Uint8ClampedArray {
       assertRgba(input);
       const gray = toContinuousGray(input.rgba);
       const threshold = clampByte(whiteThreshold);

       for (let index = 0; index < gray.length; index += 1) {
         if (gray[index] >= threshold) {
           gray[index] = 255;
         }
       }

       return grayToRgba(gray);
     }
     ```
   - Only pixels above `whiteThreshold` are mapped to 255; sub-threshold pixels remain unchanged! This is partial ceiling clamping, NOT true binarization.
   - Real-world carrier tape vision matching (evidence `rzcoeqtbFB8l`) requires true binary binarization (0 or 255), adjustable polarity, contrast stretching S-curves (darks darker, whites whiter), and 2-bit quantization for feature extraction.

2. **Absence of Bug Packaging & Telemetry Dispatch in Backend**:
   - `BE/routes/telemetry.py` provides runtime KPI readouts (`/telemetry/latest`, `/telemetry/summary`) but has no endpoint to accept bug reports or dispatch reproduction archives via SMTP email.
   - When vision matching fails or exceptions occur, operators cannot export or transmit diagnostic bundles.

3. **Fragile Supabase Client & Missing Settings UI**:
   - `src/integrations/supabase/client.ts` uses a Proxy that unconditionally throws `new Error("Missing Supabase environment variable(s)...")` when env vars are absent, breaking client startup in air-gapped factory environments.
   - No UI exists in `src/routes/settings/` to configure SMTP credentials or Supabase endpoints.

---

## 2. Target File Manifest

- `src/lib/vision/white-box-marking.ts`
- `src/lib/vision/__tests__/white-box-marking.test.ts`
- `BE/routes/telemetry.py`
- `BE/services/email_dispatcher.py`
- `BE/tests/unit/test_telemetry_bug_report.py`
- `src/integrations/supabase/client.ts`
- `src/services/telemetry/bug-report-service.ts`
- `src/routes/settings/telemetry.tsx`
- `src/routes/settings.tsx`
- `cli/commands/vision.py`

---

## 3. Implementation Steps

### Step 3.1: Implement True Binarization, Contrast S-Curve & 2-Bit Quantization
In `src/lib/vision/white-box-marking.ts`:
1. Expand options parameter:
   ```typescript
   export interface BinarizeOptionsParams {
     whiteThreshold: number;
     isPolarityInverted?: boolean;
     contrastFactor?: number;
     quantizationBits?: 1 | 2 | 8;
   }
   ```
2. Refactor `toThresholdPreviewRgba`:
   - Enforce parameter struct `BinarizeOptionsParams`.
   - **Contrast S-Curve**: For `contrastFactor > 1.0`, apply sigmoidal transform:
     $$S(x) = \frac{1}{1 + e^{-c \cdot (x - 0.5) \cdot 10}}$$
     This aggressively stretches dark values toward 0 and bright values toward 255.
   - **Quantization Modes**:
     - `1-bit` (default): `isAbove ? 255 : 0`, inverted if `isPolarityInverted === true`.
     - `2-bit`: Map to 4 discrete steps ($0, 85, 170, 255$) via $\lfloor x / 64 \rfloor \times 85$.
     - `8-bit`: Continuous contrast-stretched grayscale.
3. Write comprehensive unit tests in `src/lib/vision/__tests__/white-box-marking.test.ts` verifying binary parity, S-curve outputs, and 2-bit quantization levels.

### Step 3.2: CLI Parameter Control Flags
In `cli/commands/vision.py` (or Python CLI runner):
1. Expose command-line arguments:
   - `--threshold <0-255>` (default: 65, per evidence `rzcoeqtbFB8l`)
   - `--tolerance <0.0-1.0>` (match score tolerance threshold)
   - `--contrast <1.0-3.0>` (contrast stretching factor, default: 1.5)
   - `--polarity <normal|inverted>` (signal polarity)
   - `--bit-depth <1|2|8>` (quantization bit depth)
2. Pass parameters into image preprocessing pipeline and verify matching outputs.

### Step 3.3: Backend Bug Report & SMTP Dispatcher Endpoint
1. Author `BE/services/email_dispatcher.py`:
   - Provide `send_email_with_attachments(smtp_config, subject, body, recipients, attachments)`.
   - Support TLS (port 587) and SSL (port 465) with proper timeout guards (10s limit).
   - If SMTP is not configured or transmission fails, return a clean `Result` without crashing the service.
2. In `BE/routes/telemetry.py`:
   - Add endpoint `POST /telemetry/bug-report`.
   - Ingest `BugReportPayload`: title, description, recipeId, recipePayloadJson, screenshotBase64, logs, systemInfo.
   - Package into an in-memory ZIP archive:
     - `report.json` (metadata and diagnostic info)
     - `snapshot.png` (decoded from base64)
     - `execution.log` (captured console and backend log traces)
     - `recipe.json` (active inspection recipe)
   - Dispatch email if SMTP configured; save reference to local SQLite table `BugReports` in SplitDB.
3. Add tests in `BE/tests/unit/test_telemetry_bug_report.py`.

### Step 3.4: Harden Supabase Client & Offline Bug Queue
1. In `src/integrations/supabase/client.ts`:
   - Replace throw in Proxy with graceful no-op client that returns `{ data: null, error: { message: "Supabase credentials not configured (offline mode)" } }`.
2. In `src/services/telemetry/bug-report-service.ts`:
   - Implement `dispatchBugReport(params: BugReportParams)`:
     - Tries `POST /telemetry/bug-report` on the backend first.
     - Tries `supabase.from("bug_reports").insert(...)` if Supabase client is available.
     - If both are offline, appends report to `localStorage.getItem("cat_offline_bug_reports")`.

### Step 3.5: Author Settings UI for Telemetry & SMTP Configuration
1. Author `src/routes/settings/telemetry.tsx`:
   - **SMTP Configuration Card**:
     - Host, Port, Username, Password, From Address, To Address.
     - "Test Email Dispatch" action button.
   - **Supabase Configuration Card**:
     - Supabase Project URL, Publishable API Key, Table Name.
     - "Test Connection Ping" action button.
   - **Pending Offline Reports Card**:
     - Shows count of locally queued bug reports with "Flush / Resend Now" button.
2. Add navigation link in `src/routes/settings.tsx` (`SettingsNav`):
   ```tsx
   <Link to="/settings/telemetry" className="inline-flex items-center min-h-10 px-hmi-3 py-hmi-2 border border-ca-border text-ca-ink">
     Telemetry
   </Link>
   ```

---

## 4. Acceptance Criteria & Verification Contracts

- [ ] **True Binarization**: `toThresholdPreviewRgba` produces values of strictly 0 or 255 for all pixels when `quantizationBits === 1`.
- [ ] **Contrast Stretching**: S-curve pulls pixel values $< 128$ closer to 0 and $> 128$ closer to 255.
- [ ] **2-Bit Mode**: Pixels map strictly to $[0, 85, 170, 255]$.
- [ ] **CLI Preprocessing**: CLI flags `--threshold`, `--contrast`, and `--bit-depth` execute without error.
- [ ] **ZIP Archive Generation**: Bug report endpoint generates a valid ZIP containing `report.json`, `snapshot.png`, and `execution.log`.
- [ ] **SMTP Dispatch**: `POST /telemetry/bug-report` dispatches email with attached ZIP when SMTP is active, or gracefully stores locally when unconfigured.
- [ ] **Supabase Offline Resilience**: App does not throw fatal runtime error when Supabase environment variables are missing.
- [ ] **Settings Integration**: Telemetry tab renders in Settings with SMTP and Supabase credential forms and test buttons.
