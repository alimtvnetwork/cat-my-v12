# Error Management, SplitDB Persistence & CLI Stack Trace Diagnostics Specification
# Directory: 02-spec/21-app/04-vision-system-and-error-management-instructions/03-error-management-and-splitdb-spec.md
# Status: draft

## 1. Recipe Table Bootstrap & Persistence Root Cause Analysis (RCA)

### 1.1 The `Failed to save recipe: no such table: Recipe` Bug (`mr6_-1EdpFtG`)
- When the operator clicks the **SAVE** button in the Vision Workbench (`src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx` or `src/routes/projects/$projectId/rulesets/$rulesetId.tsx`), the client executes:
  `PUT /rules/{RuleSetId}`
- On the backend, this requests `SqliteRulesRepo.save_rule_set(envelope)`.
- `SqliteRulesRepo.__init__` acquires a connection via `get_root_conn()` (`BE/repos/sqlite_rules_repo.py`).
- Per `BE/db/connections.py` lines 30-31:
  > *"This module opens connections only. Applying migrations is Step 39 (`bin/db-bootstrap.py`); this file does not run DDL."*
- If the development server, desktop app, or test runner was started without explicitly executing `python bin/db-bootstrap.py`, migration `BE/db/migrations/root/0020_recipes.sql` has never executed against the SQLite database file!
- Consequently, executing `SELECT Version FROM Recipe WHERE RuleSetId = ?` fails immediately with `sqlite3.OperationalError: no such table: Recipe`.
- `SqliteRulesRepo` catches this and raises `AppError(E_BE_INTERNAL, "Failed to save recipe: no such table: Recipe")`, which bubbles back to the UI as an error toast.

### 1.2 Remediated Self-Healing DDL Bootstrap
1. In `BE/repos/sqlite_rules_repo.py`, `SqliteRulesRepo` must incorporate an idempotent table verification check:
   - On connection initialization or preflight, verify if table `Recipe` exists.
   - If missing, execute the verified schema DDL from `0020_recipes.sql` automatically:
     ```sql
     CREATE TABLE IF NOT EXISTS Recipe (
         RuleSetId INTEGER PRIMARY KEY,
         Name TEXT NOT NULL,
         Version INTEGER NOT NULL,
         IsEnabled INTEGER NOT NULL DEFAULT 1,
         PayloadJson TEXT NOT NULL,
         CreatedAt INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)),
         UpdatedAt INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
     );
     ```
   - This ensures immediate self-healing: regardless of whether `bin/db-bootstrap.py` was invoked externally, recipe saving succeeds seamlessly without manual intervention.

---

## 2. Anti-Swallowing Error Architecture & Leaf Error Sovereignty

### 2.1 Policy & Rules (02-spec/03-error-manage/)
- **Zero Swallowing**: Empty `catch {}` blocks and discarded error values (`_ = err`, `except: pass`) are strictly forbidden.
- **Structured Wrapping**: Every runtime exception must be transformed into a structured error envelope:
  - TypeScript/Frontend: `AppError { code: ErrorCode, message: string, details?: Record<string, unknown>, stack?: string, timestamp: string }`.
  - Python/Backend: `AppError(ErrorCode, message, details)`.
- **Audit Logging**: Every captured exception must be dispatched to the SplitDB error store (`errors.db` / `gitmap.db`) before any UI toast or notification is surfaced.

---

## 3. SplitDB Error Repository Architecture

### 3.1 SQLite Schema (`errors.db` / `SplitDB`)
Under `data/db/errors.db` (or `.ai-memory/errors.db`), maintain the partitioned error store:

```sql
CREATE TABLE IF NOT EXISTS SystemError (
    ErrorId TEXT PRIMARY KEY,
    ErrorCode TEXT NOT NULL,
    Subsystem TEXT NOT NULL,
    Message TEXT NOT NULL,
    StackTrace TEXT,
    ContextJson TEXT,
    Severity TEXT NOT NULL DEFAULT 'ERROR',
    IsResolved INTEGER NOT NULL DEFAULT 0,
    CreatedAt INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
);

CREATE INDEX IF NOT EXISTS idx_system_error_code ON SystemError(ErrorCode);
CREATE INDEX IF NOT EXISTS idx_system_error_created ON SystemError(CreatedAt);
```

### 3.2 Error Ingestion API
- Backend route: `POST /api/v1/errors` -> ingests client-side errors into `SystemError`.
- Backend middleware: captures all 5xx exceptions and logs them into `SystemError` with full tracebacks.

---

## 4. CLI Stack Trace Diagnostics Commands

The CLI must provide complete visibility into persisted errors so autonomous agents and developers can inspect and remediate failures step-by-step:

| Command | Purpose |
| :--- | :--- |
| `gitmap vision error list [--limit N]` | Lists recent system errors with ErrorId, Subsystem, Code, and Message. |
| `gitmap vision error show <ErrorId>` | Displays full stack trace, contextual payloads, and file citations for a specific error. |
| `gitmap vision error export [--out path.json]` | Exports unhandled errors as a structured bug report bundle. |
| `gitmap vision error clear [--all]` | Clears resolved error logs. |
