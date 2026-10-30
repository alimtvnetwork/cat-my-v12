# Subtask SS-04: SplitDB Error Database, CLI Error Inspector & Bug Recorder Integrations
# File: .ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/SS-04-splitdb-error-database-and-recorder.md
# Reference Specs: 
#   - 02-spec/21-app/04-vision-system-and-error-management-instructions/03-error-management-and-splitdb-spec.md
#   - 02-spec/21-app/04-vision-system-and-error-management-instructions/04-bug-recorder-email-and-supabase-spec.md
# Status: Ready for Execution

## 1. Executive Summary & Objective

The objective of Subtask SS-04 is to establish the persistent SplitDB error architecture (`data/errors.db`), build developer-grade CLI inspection tooling (`cat-cli errors`), and modernize the activity recorder export subsystem with dual-channel remote dispatch:
1. **SplitDB Error Persistence**: Dedicated SQLite tier `"errors"` in `BE/db/connections.py` with `ErrorLog` and `ErrorBreadcrumb` tables following PascalCase, UTC epoch integer timestamps, and affirmative booleans (`HasStackTrace`, `IsResolved`).
2. **CLI Error Inspector**: Terminal CLI commands (`cat-cli errors list / inspect / tail / resolve`) providing colorized step-by-step stack traces, breadcrumb inspection, and live streaming.
3. **Bug Recorder Remote Dispatch**:
   - `src/lib/recorder/email-service.ts`: Direct backend SMTP relay with graceful client-side `mailto:` fallback.
   - `src/lib/recorder/supabase-sync.ts`: Diagnostic ZIP upload to Supabase storage bucket `bug-reports`, audit trail creation in `audit_events`, and generation of 7-day signed download URLs.
   - `src/components/recorder/RecorderExportModal.tsx`: Modernized UI with progress spinners, status badges, and one-click URL clipboard copying.

---

## 2. Inventory of Affected Components & Files

```text
Backend & Database:
  - BE/db/connections.py                              (Add "errors" tier & get_errors_conn)
  - BE/db/migrations/errors/001_create_error_tables.sql (DDL for ErrorLog & ErrorBreadcrumb)
  - BE/routers/errors.py                              (REST endpoints: POST/GET/PATCH)
  - BE/routers/recorder.py                            (SMTP dispatch endpoint: POST /api/recorder/email)
  - BE/cli/common/errors_inspector.py                 (CLI inspector: list, inspect, tail, resolve)

Frontend Services & Components:
  - src/lib/recorder/email-service.ts                 (SMTP API caller & mailto fallback)
  - src/lib/recorder/supabase-sync.ts                 (Supabase storage uploader & signed URL)
  - src/components/recorder/RecorderExportModal.tsx   (Multi-channel export UI modernization)
  - src/lib/recorder/types.ts                         (Type definitions with affirmative booleans)
```

---

## 3. Micro-Batch Implementation Steps

### Step 1: Extend `BE/db/connections.py` with the `"errors"` Tier
- **Actions**:
  1. Add `"errors"` to the `Tier` literal union: `Tier = Literal["root", "task", "rules", "errors"]`.
  2. Map `"errors"` in `_DB_FILENAME`: `_DB_FILENAME["errors"] = "errors.db"`.
  3. Export helper function `get_errors_conn() -> sqlite3.Connection` enforcing WAL mode and foreign key constraints.
  4. Preserve the `ATTACH DATABASE` guard assertion.

### Step 2: Author SQL Migration `BE/db/migrations/errors/001_create_error_tables.sql`
- **Actions**:
  1. Create table `ErrorLog` with columns:
     - `Id INTEGER PRIMARY KEY AUTOINCREMENT`
     - `ErrorUuid TEXT NOT NULL UNIQUE`
     - `CreatedAt INTEGER NOT NULL` (epoch seconds)
     - `Source TEXT NOT NULL`
     - `ErrorCode TEXT NOT NULL`
     - `Message TEXT NOT NULL`
     - `StackTrace TEXT`
     - `HasStackTrace INTEGER NOT NULL DEFAULT 0`
     - `ContextJson TEXT`
     - `Severity TEXT NOT NULL`
     - `IsResolved INTEGER NOT NULL DEFAULT 0`
     - `ResolvedAt INTEGER`
  2. Create table `ErrorBreadcrumb` with columns:
     - `Id INTEGER PRIMARY KEY AUTOINCREMENT`
     - `ErrorUuid TEXT NOT NULL`
     - `CreatedAt INTEGER NOT NULL`
     - `Category TEXT NOT NULL`
     - `Message TEXT NOT NULL`
     - `DataJson TEXT`
     - `Level TEXT NOT NULL`
     - `FOREIGN KEY (ErrorUuid) REFERENCES ErrorLog(ErrorUuid) ON DELETE CASCADE`
  3. Create indexes on `CreatedAt`, `ErrorCode`, `Source`, and `IsResolved`.

### Step 3: Implement FastAPI Errors Router (`BE/routers/errors.py`)
- **Actions**:
  1. Implement `POST /api/errors` to ingest error reports with breadcrumbs, write atomically to `data/errors.db`, and return `{ isSuccess: true, hasError: false, errorUuid }` inside the Universal Response Envelope.
  2. Implement `GET /api/errors` supporting `limit`, `offset`, `source`, `severity`, and `unresolvedOnly` filter query parameters.
  3. Implement `PATCH /api/errors/{error_uuid}/resolve` to set `IsResolved = 1` and `ResolvedAt = now()`.

### Step 4: Implement CLI Error Inspector (`cat-cli errors`)
- **Target File**: `BE/cli/common/errors_inspector.py`
- **Actions**:
  1. Register `errors` subcommands under `cat-cli`:
     - `list`: Render an ANSI-colorized table of recent errors (columns: Timestamp, UUID, Source, Code, Message, Status).
     - `inspect <uuid>`: Format and print complete error details, context JSON, formatted step-by-step stack trace, and chronological breadcrumb list.
     - `tail [-n N] [-f]`: Stream newly inserted records from `ErrorLog` via dynamic polling or WAL change observation.
     - `resolve <uuid>`: Execute resolution update and output confirmation.
  2. Ensure all output handles terminal width gracefully and uses color tokens matching repository styling.

### Step 5: Implement Backend SMTP Relay Endpoint (`BE/routers/recorder.py`)
- **Actions**:
  1. Implement `POST /api/recorder/email` endpoint.
  2. Read SMTP configuration from environment variables or `repo-secrets/11-go-email-reader/`:
     - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_USE_TLS`.
  3. Support multipart MIME attachment of the ZIP diagnostic archive.
  4. Automatically create an `ErrorLog` entry in `data/errors.db` with `Source = "recorder"` for every bug report email sent.

### Step 6: Author `src/lib/recorder/email-service.ts`
- **Actions**:
  1. Create `dispatchBugReportEmail(params: EmailPayload): Promise<EmailDispatchResult>`.
  2. Attempt `POST /api/recorder/email` with timeout.
  3. If backend is offline or returns an error, construct a URL-encoded `mailto:` string pre-populated with:
     - Recipient: `support@catvision.ai` (or configured team address)
     - Subject: `[Bug Report] ${title}`
     - Body: Formatted summary including category, initial route, event count, and expected/actual behaviors.
  4. Trigger `window.open(mailtoUrl, "_blank")` in fallback mode and return `{ isSuccess: true, hasError: false, methodUsed: "mailto" }`.

### Step 7: Author `src/lib/recorder/supabase-sync.ts`
- **Actions**:
  1. Initialize Supabase client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  2. Implement `uploadBugReportToSupabase(params: SupabaseSyncParams): Promise<SupabaseSyncResult>`.
  3. Upload the ZIP blob to bucket `bug-reports` at path `reports/{year}/{month}/{day}/{sessionId}.zip`.
  4. Insert a row into table `audit_events` with session metadata, storage path, file size, and affirmative boolean `hasSignedUrl: true`.
  5. Generate a 7-day signed download URL (`createSignedUrl`) and return `{ isSuccess: true, hasError: false, storagePath, signedDownloadUrl, expiresInSec: 604800 }`.

### Step 8: Modernize `src/components/recorder/RecorderExportModal.tsx`
- **Actions**:
  1. Add state variables: `isSendingEmail`, `isSyncingSupabase`, `emailResult`, `supabaseResult`.
  2. Add action button: **Email Bug Report** (triggers `dispatchBugReportEmail`, displays spinner during transit, shows success/mailto badge).
  3. Add action button: **Sync to Supabase** (triggers `uploadBugReportToSupabase`, displays upload progress, renders signed download URL upon completion).
  4. Add one-click "Copy Signed Link" button with visual confirmation checkmark (`CheckCircle2`).
  5. Enforce mutual exclusion: Disable all action buttons while any export or upload is active.

### Step 9: Link Recorder Events to SplitDB Persistence
- **Actions**:
  1. Ensure that upon exporting or syncing a report, a background request sends the session's recorded errors and events to `POST /api/errors`.
  2. Verify that running `cat-cli errors list --source recorder` displays the bug report and its attached breadcrumb timeline.

---

## 4. Verification & Quality Gates

1. **SplitDB Validation**:
   - Verify `data/errors.db` is created by running `bin/db-bootstrap.py` or the FastAPI lifespan migration runner.
   - Run SQLite schema check to verify all tables and columns use PascalCase and UTC integer epoch timestamps.
   - Verify that attempting `ATTACH DATABASE` on an errors connection raises `AppError(E_CLI_PREFLIGHT_FAILED)`.
2. **CLI Inspection Test**:
   - Insert a mock error via `POST /api/errors`.
   - Run `cat-cli errors list` and verify the mock error is displayed.
   - Run `cat-cli errors inspect <uuid>` and verify the colorized stack trace and breadcrumbs render cleanly.
3. **Recorder Export Test**:
   - Run test suite in `scripts/cli-ui-test-runner.ts` covering modal rendering, action button click events, and clipboard copying.
   - Validate that both SMTP dispatch and mailto fallback handle network state changes gracefully.
4. **Boolean Standard Audit**:
   - Verify zero occurrences of `ok`, `can`, `should`, `was`.
   - All state variables use `is` / `has` prefixes (`isExporting`, `isSendingEmail`, `isSyncingSupabase`, `hasSignedUrl`).
