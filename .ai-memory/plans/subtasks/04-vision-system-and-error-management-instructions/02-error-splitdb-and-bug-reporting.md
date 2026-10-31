# Subtask Plan 02: Error Architecture, SplitDB Persistence, Recipe Storage & Bug Export
# File: .ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/02-error-splitdb-and-bug-reporting.md
# Parent Plan: .ai-memory/plans/pending/04-vision-system-and-error-management-instructions.md
# Spec Reference: 02-spec/21-app/04-vision-system-and-error-management-instructions/02-error-splitdb-and-bug-reporting-spec.md
# Status: pending
# Priority: High / Non-Negotiable
# Estimated Steps: 10 Steps

## 1. Scope & Objective

This subtask plan delivers the complete implementation workflow for:
1. Automatic database migration and bootstrap in `BE/main.py` eliminating `"Failed to save recipe: no such table: Recipe"`.
2. Eradication of silent error swallowing across 5 frontend core files, wiring them to `ClientLogger` and `useErrorStore.captureException`.
3. Establishing the isolated `errors.db` SplitDB SQLite database, REST endpoints `POST /api/errors` & `GET /api/errors`, and evaluation failure recording for missing pattern boxes and missing Pin 1.
4. Implementing the CLI error tool `bin/errors-cli.py` and `run.ps1 -Errors`.
5. Developing the multi-channel bug reporting subsystem: backend SMTP dispatcher (`POST /api/recorder/email`) with `repo-secrets/11-go-email-reader/`, Supabase cloud synchronization (`bug-reports` bucket and `BugReports` table), and modernized `RecorderExportModal.tsx`.

---

## 2. Target File Ownership & Changes

| Area | File Path | Nature of Changes |
| :--- | :--- | :--- |
| **Backend Startup** | `BE/main.py` | Wire automated database migration bootstrap into `_app_lifespan` hook |
| **DB Connections** | `BE/db/connections.py` | Add `"errors"` tier, `get_errors_conn()`, and connection isolation guard |
| **DB Migration** | `BE/db/migrations/errors/0010_client_errors.sql` | Create `ClientErrors` table and indexes with WAL mode |
| **Error Routes** | `BE/routes/errors.py` | Implement `POST /api/errors` and `GET /api/errors` endpoints |
| **Router Registry**| `BE/main.py` | Register errors router and recorder email router |
| **CLI Tool** | `bin/errors-cli.py` | Command-line viewer for `errors.db` with `--limit`, `--code`, `--json` |
| **Run Script** | `run.ps1` | Support `-Errors` switch delegating to `bin/errors-cli.py` |
| **Error Swallowing**| `src/lib/data-source/store.ts` | Replace silent localStorage catch blocks with `ClientLogger` and error capture |
| **Error Swallowing**| `src/lib/rules/backendSync.ts` | Replace silent fetch probe and outer catch with structured logging and error capture |
| **Error Swallowing**| `src/lib/backend/validate.ts` | Add logging for malformed URL parse failures before returning false |
| **Error Swallowing**| `src/components/layout/WindowControlButtons.tsx` | Log and capture fullscreen API rejections and window close errors |
| **Error Swallowing**| `src/components/home/HomeBoundaries.tsx` | Catch and route diagnostic recording failures safely |
| **Rule Failure Sync**| `src/lib/vision/workpiece-rule-analyzer.ts` | Route missing pattern boxes and missing Pin 1 failures to `errors.db` |
| **Email Dispatcher** | `BE/routes/recorder.py` | Implement `POST /api/recorder/email` with SMTP TLS dispatch from `repo-secrets` |
| **Supabase Sync** | `src/lib/recorder/supabase-export-service.ts` | Create service uploading activity ZIP and inserting `BugReports` record |
| **Export Modal** | `src/components/recorder/RecorderExportModal.tsx` | Add one-click "Email Bug Report" and "Sync to Supabase" with live progress states |

---

## 3. Step-by-Step Execution Sequence

### Step 1: Wire Automatic Database Migration into FastAPI Lifespan
- **Action**: In `BE/main.py`, import migration logic from `bin/db-bootstrap.py` (or extract `bootstrap_databases()` into `BE/db/bootstrap.py`).
- **Implementation**:
  - In `_app_lifespan(app: FastAPI)`, invoke `bootstrap_databases()` for tiers `("root", "task", "rules", "errors")` prior to `yield`.
  - Ensure migrations (`0020_recipes.sql`, etc.) are executed idempotently.
  - Assert `Recipe` table is created in `root.db` on server launch.
- **Verification**: Start backend with empty or fresh database directory and assert `Recipe` table exists and `PUT /rules/{id}` commits without error.

### Step 2: Establish SplitDB `errors.db` & Connection Factory
- **Action**: Extend `BE/db/connections.py` to support tier `"errors"`.
- **Implementation**:
  - Update `Tier = Literal["root", "task", "rules", "errors"]`.
  - Update `_DB_FILENAME["errors"] = "errors.db"`.
  - Add function `get_errors_conn(*, db_root=None, env=None) -> sqlite3.Connection`.
  - Author migration `BE/db/migrations/errors/0010_client_errors.sql` creating table `ClientErrors (Id, ErrorCode, Severity, Message, StackTrace, Source, TriggerAction, MetadataJson, CreatedAt)`.
- **Verification**: Execute `get_errors_conn()`; verify table `ClientErrors` exists and attachment of other databases is blocked.

### Step 3: Implement Backend Endpoints `POST /api/errors` and `GET /api/errors`
- **Action**: Author `BE/routes/errors.py` and mount in `BE/main.py`.
- **Implementation**:
  - `POST /api/errors` (and `/errors`): Parse incoming JSON error payload; insert into `ClientErrors`; return Universal Response Envelope with created row ID.
  - `GET /api/errors` (and `/errors`): Query `ClientErrors` with filters `limit`, `severity`, `code`, `source`; return Universal Response Envelope sorted descending by `CreatedAt`.
- **Verification**: Execute curl / HTTP requests against `POST /api/errors` and `GET /api/errors`; assert valid PascalCase envelope.

### Step 4: Develop CLI Tool `bin/errors-cli.py` & PowerShell Flag `-Errors`
- **Action**: Create `bin/errors-cli.py` and update `run.ps1`.
- **Implementation**:
  - Parse CLI arguments: `--limit`, `--severity`, `--code`, `--json`, `--clear`.
  - Read from `errors.db` via `get_errors_conn()`.
  - If `--json`, output pure JSON document for AI consumption; if human mode, render formatted ANSI table.
  - In `run.ps1`, add `[switch]$Errors` and forward arguments to `uv run --project BE python bin/errors-cli.py`.
- **Verification**: Run `python bin/errors-cli.py --limit 5` and `.\run.ps1 -Errors --json`.

### Step 5: Audit & Remediate Error Swallowing Across 5 Files
- **Action**: Eliminate silent catch blocks across the target frontend files.
- **Files & Fixes**:
  1. `src/lib/data-source/store.ts`: In `readInitial()`, `readInitialBaseUrl()`, and `readInitialPersistRules()`, replace empty catch blocks with `ClientLogger.warn` and `useErrorStore.getState().captureException`.
  2. `src/lib/rules/backendSync.ts`: In version check fetch and outer catch, replace silent ignores with `ClientLogger.warn/error` and `useErrorStore.getState().captureException`.
  3. `src/lib/backend/validate.ts`: In `isValidBackendPrefix`, log warning before returning false on invalid URLs.
  4. `src/components/layout/WindowControlButtons.tsx`: Attach error loggers to fullscreen promises and window close catch blocks.
  5. `src/components/home/HomeBoundaries.tsx`: Add fallback error logging in `HomeError` catch block.
- **Verification**: Inspect modified files for zero empty `catch {}` blocks; run linter.

### Step 6: Hook Rule Evaluation Failures to `errors.db`
- **Action**: Connect `src/lib/vision/workpiece-rule-analyzer.ts` failure events to error persistence.
- **Implementation**:
  - Identify evaluation failure points for missing pattern boxes (line 1129) and missing Pin 1 (line 1830).
  - Construct typed error with codes `E_VISION_MISSING_PATTERN_BOXES` and `E_VISION_PIN1_MISSING`.
  - Dispatch error to `useErrorStore.getState().captureError(...)` and fire asynchronous POST to `/api/errors`.
- **Verification**: Trigger inspection on an empty or unconfigured workpiece image; run `bin/errors-cli.py --code E_VISION_MISSING_PATTERN_BOXES` and verify error row exists.

### Step 7: Author Backend SMTP Email Dispatcher (`POST /api/recorder/email`)
- **Action**: Author `BE/routes/recorder.py` and register in `BE/main.py`.
- **Implementation**:
  - Read SMTP credentials from `D:/work/repo-secrets/11-go-email-reader/01-email-setup.json` and default recipient `morgan.harris.riseup@gmail.com` from `02-default-notifier.json`.
  - Construct multipart MIME email containing HTML / text bug report summary and attach the base64-decoded ZIP activity archive.
  - Connect via `smtplib.SMTP_SSL` (port 465) or `STARTTLS` (port 587); dispatch message.
  - Return Universal Response Envelope confirming dispatch.
- **Verification**: Trigger POST request to `/api/recorder/email`; assert successful dispatch or informative error handling when offline.

### Step 8: Build Frontend Supabase Bug Report Sync Service
- **Action**: Author `src/lib/recorder/supabase-export-service.ts`.
- **Implementation**:
  - Leverage `src/integrations/supabase/client.ts`.
  - Build activity ZIP via `exportSessionToZip(session, summary)`.
  - Upload ZIP buffer to Supabase Storage bucket `bug-reports` under `archives/{SessionId}_{Timestamp}.zip`.
  - Insert record into table `BugReports` with session metrics, category, expected/actual behavior, and download URL.
  - Return status object `{ isSuccess: true, zipUrl, reportId }`.
- **Verification**: Unit test `supabase-export-service.ts` with mock / live Supabase client.

### Step 9: Modernize `RecorderExportModal.tsx`
- **Action**: Overhaul `src/components/recorder/RecorderExportModal.tsx`.
- **Implementation**:
  - Retain local **Download ZIP** button.
  - Replace rudimentary mailto with **Email Bug Report** button invoking `POST /api/recorder/email`, displaying inline spinner (`Loader2`) and toast feedback.
  - Add **Sync to Supabase** button invoking `syncBugReportToSupabase`, displaying live progress bar and shareable report URL.
  - Ensure UI adheres strictly to positive booleans (`isExporting`, `isSendingEmail`, `isSyncingSupabase`, `isSuccess`).
- **Verification**: Open modal in recording session; test all three action paths and verify UI feedback.

### Step 10: Regression Verification & Acceptance Sign-Off
- **Action**: Execute end-to-end regression verification.
- **Checklist**:
  - [ ] Fresh backend bootstrap materializes `Recipe` and `ClientErrors` tables.
  - [ ] Saving recipe ruleset succeeds without `no such table: Recipe`.
  - [ ] Zero unlogged `catch {}` blocks across target frontend files.
  - [ ] Rule evaluation failures record into `errors.db`.
  - [ ] `bin/errors-cli.py` outputs formatted errors and valid JSON.
  - [ ] `RecorderExportModal.tsx` supports Email and Supabase sync.
- **Verification**: Run `python bin/errors-cli.py --limit 10 --json` and inspect output.

---

## 4. Coding Guideline Compliance Invariants

- **Functions ≤ 15 Lines**: All newly authored Python and TypeScript helper functions must not exceed 15 lines.
- **Zero Nested Ifs**: Conditionals must use guard clauses and early returns.
- **Positive Booleans**: Variable and field names must start with `is` or `has` (`isSuccess`, `hasAttachment`, `isEnabled`, `isFailed`).
- **Error Sovereignty**: Leaf functions return errors directly; no exit handlers in leaf functions.
- **Universal Response Envelope**: Every backend endpoint responds with PascalCase keys and `Results` array.
