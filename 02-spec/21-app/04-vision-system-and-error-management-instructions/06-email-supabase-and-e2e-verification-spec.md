# Bug Recording Export, Email & Supabase Telemetry, and E2E Verification Specification
# Directory: 02-spec/21-app/04-vision-system-and-error-management-instructions/06-email-supabase-and-e2e-verification-spec.md
# Status: draft

## 1. Bug Recording Export Pipeline

### 1.1 Multi-Tier Telemetry Bundling
When an operator activates **Recording Mode** or experiences a vision inspection fault:
- The system captures a diagnostic bundle containing:
  1. **SplitDB Error Snapshot**: Recent `SystemError` records with full stack traces.
  2. **Active Project & Ruleset Envelope**: Serialized JSON representation of configured ROIs and patterns.
  3. **Canvas State Screenshot**: High-resolution PNG or 60% JPEG capture of the inspection stage.
  4. **User Action Timeline**: Timestamped clicks, tool selections, and threshold adjustments.
- The bundle is compressed into a standard `.zip` archive or structured `.json` manifest.

---

## 2. Notification Dispatch: Email & Supabase Telemetry

### 2.1 Email Notifier Integration
- In `src/services/telemetry/email-notifier.ts`, implement an email dispatch client:
  - Supports configurable SMTP host, port, authentication, sender, and recipient addresses.
  - Generates a formatted HTML notification detailing the error code, machine host, timestamp, and attached bug summary.
  - In offline environments or when unconfigured, falls back to a mock local transporter that logs the payload to the SplitDB error queue.

### 2.2 Supabase Telemetry Integration (Antigravity Tools Pattern)
- Modeled after the `Antigravity Manager / Antigravity Tools` packet architecture:
  - Uses `@supabase/supabase-js` (already present in `package.json`).
  - Supports user-configurable Supabase URL and Anon/Service Key in application Settings (`src/pages/Settings.tsx`).
  - Default / Inbuilt Fallback: When no cloud credentials are provided, operates in local self-contained mock mode without blocking user interactions or throwing connection errors.
  - Automatically synchronizes recorded bug packages to the `bug_reports` table for remote developer analysis.

---

## 3. End-to-End Test Suite Architecture (100–200 Test Cases)

### 3.1 Headless CLI Test Suite (`scripts/cli-ui-test-runner.ts` & `tests/e2e/`)
A comprehensive, automated Playwright/Chromium test runner executes 100 to 200 granular validation assertions:

1. **Titlebar & Window Controls (20 cases)**:
   - Verify Minimize, Maximize/Restore, and Close buttons exist, have valid Automation IDs, and trigger without process crash.
   - Verify confirmation modal triggers and can be cancelled.
2. **Error SplitDB & Self-Healing Persistence (30 cases)**:
   - Trigger rule save operation and verify `Recipe` table auto-bootstraps without `no such table: Recipe`.
   - Verify all errors log to `SystemError` table in `errors.db`.
   - Verify CLI commands (`gitmap vision error list/show`) output correct stack traces.
3. **UI Automation Actuator (30 cases)**:
   - Query all buttons on Home, Setup, and Analysis screens for `Id`, `Name`, and `XPath`.
   - Execute CLI click via `--id` and `--xpath` and verify DOM reaction.
4. **Layout Stability & Simulation Timing (25 cases)**:
   - Assert zero layout shift on Menu item hover.
   - Assert simulation dwell slider accepts 1s to 10s and advances within <= 50ms of configured time.
5. **ROI & Multi-Shape Pattern Tools (40 cases)**:
   - Assert ROI is locked on mount and ignores single clicks.
   - Assert double-click unlocks ROI and displays corner transform handles.
   - Assert Rectangle, Square, and Circle pattern shapes can be created and numbered.
   - Assert Layers Panel z-index reordering (`Bring to Front`, `Send to Back`).
6. **Grayscale Preprocessing & Camera Dropdown (30 cases)**:
   - Assert grayscale slider updates contrast and binary mask.
   - Assert Live Camera dropdown opens in Portal without container clipping.
7. **Email & Supabase Export (25 cases)**:
   - Trigger bug record export and verify bundle structure and mock dispatch.
