# Specification: Error Management, SplitDB Error Logging & Bug Export CLI
# Directory: 02-spec/21-app/04-vision-system-and-error-management-instructions/02-error-management-and-splitdb-spec.md
# Status: approved
# Tier: Root / Task / Rules / Error (SplitDB 4th Tier)

## 1. Executive Summary & Problem Formulation

The CAT Vision inspection system requires zero-tolerance reliability across its algorithmic image evaluation routines, camera capture threads, UI state handlers, and database persistence layers. Analysis of production telemetry, user bug reports, and code audits has identified three severe architectural vulnerabilities:

1. **Pervasive Error Swallowing & Silent Failure Modes**:
   - Algorithmic evaluation routines in `BE/app/domain/vision_eval.py` silently discard resizing and Fourier phase-correlation exceptions via empty `except Exception: pass` blocks, yielding untraceable evaluation drifts.
   - Score routes in `BE/routes/score.py` discard file read `OSError` and coordinate parsing exceptions, producing opaque null objects rather than actionable diagnostics.
   - Daheng camera primitives in `BE/sdk_facade/vendors/daheng/primitives.py` break silently out of the frame capture loop on exceptions without logging or worker failure dispatching.
   - Frontend components (`src/components/layout/WindowControlButtons.tsx`, `src/lib/diagnostics/home-error-log.ts`, and `src/lib/vision/workpiece-rule-analyzer.ts`) swallow `JSON.parse`, DOM fullscreen, and window close exceptions via empty `catch {}` blocks.

2. **Database Bootstrap Dependency & Recipe Save Crash (`mr6_-1EdpFtG`)**:
   - The Vision Workbench SAVE operation (`PUT /rules/{RuleSetId}`) invokes `SqliteRulesRepo.save_rule_set()`.
   - `SqliteRulesRepo` connects to `root.db` via `get_root_conn()`.
   - Because `connections.py` strictly opens connections and delegates schema migrations to `bin/db-bootstrap.py`, if the application is launched without executing bootstrap migrations, the `Recipe` table does not exist.
   - Queries against `Recipe` immediately throw `sqlite3.OperationalError: no such table: Recipe`, surfacing an unhandled error toast to the operator and blocking recipe authoring.

3. **Absence of a Dedicated Error Persistence Tier & Offline AI Bug Packaging**:
   - System errors are currently scattered between ephemeral stdout logs, temporary JSONL files, and unpersisted UI toasts.
   - There is no unified, indexed error repository where autonomous agents and engineers can inspect full stack traces, correlation IDs, and runtime contextual snapshots.
   - Autonomous debugging requires a standalone, self-contained bug archive (containing structured reproduction reports, recorded interaction logs, screenshot frames, and environment metadata) exportable via CLI and API.

---

## 2. Anti-Swallowing Error Architecture & Leaf Error Sovereignty

### 2.1 Core Invariants (02-spec/03-error-manage/)

1. **Leaf Error Sovereignty**: Leaf functions (math kernels, image decoders, socket readers) must never swallow exceptions or terminate processes. They must either:
   - Raise a typed `AppError` carrying an explicit `ErrorCode`, descriptive message, and structured context dictionary.
   - Return a monadic `Result[T]` encapsulating the error state (`hasError == true`, `isFail == true`).
2. **Zero Empty Blocks**: No bare `except:`, no `except Exception: pass`, and no empty `catch {}` blocks are permitted in any repository codebase.
3. **Structured Context Enrichment**: When catching an lower-level exception (e.g. `OSError`, `KeyError`, `cv2.error`), the handler must enrich the error with operational parameters (e.g., file paths, image dimensions, coordinate tuples, rule IDs) before propagating or logging.
4. **Correlation Tracing**: Every error generated or captured in the system must be tagged with a `correlationId` to link client-side user actions with backend worker logs.

### 2.2 Swallowed Error Audit & Remediation Catalog

| ID | File Location | Offending Pattern | Root Cause | Remediated Architecture |
| :--- | :--- | :--- | :--- | :--- |
| **ERR-SW-01** | `BE/app/domain/vision_eval.py` (L261-264) | `try: smp_tile = cv2.resize(...) except Exception: pass` | If sample tile dimensions do not match reference tile and resize fails, execution continues with mismatched arrays, triggering downstream shape mismatch crashes. | Log warning with tile dimensions, record error event to SplitDB, and raise `AppError(ErrorCode.E_BE_INTERNAL, ...)` or return typed failure outcome. |
| **ERR-SW-02** | `BE/app/domain/vision_eval.py` (L280-284) | `try: shift_x, shift_y = cv2.phaseCorrelate(...) except Exception: pass` | If phase correlation throws due to zero-variance or corrupted image buffers, `dx` and `dy` remain unchanged without logging, masking alignment failures. | Catch specific `cv2.error`, log structured warning with buffer statistics, record fallback displacement `(0.0, 0.0)` with `hasShiftFallback=True`. |
| **ERR-SW-03** | `BE/routes/score.py` (L75-78) | `try: return c.read_bytes() except OSError: pass` | Path candidate file reads swallow filesystem permissions or missing file errors silently, falling through to subsequent candidates without logging failure causes. | Log candidate read failures at DEBUG level with target path and system errno; if all candidates fail, raise `AppError(ErrorCode.E_BE_NOT_FOUND, ...)`. |
| **ERR-SW-04** | `BE/routes/score.py` (L93-96) | `try: return BoundingBox(...) except (KeyError, ValueError, TypeError): pass` | Malformed bounding box dictionary fields return `None` silently without notifying caller why the ROI was rejected. | Validate payload schema explicitly; on validation failure, log diagnostic warning with offending keys and return structured validation error. |
| **ERR-SW-05** | `BE/sdk_facade/vendors/daheng/primitives.py` (L186-190) | `try: on_frame(env) except Exception: break` | An unhandled exception in frame callback silently breaks the continuous capture loop, freezing the live feed without notifying the operator. | Log critical error with traceback, persist `ErrorEvent` to `error.db`, trigger camera fault notification, and execute clean stream teardown. |
| **ERR-SW-06** | `src/components/layout/WindowControlButtons.tsx` (L30, L32, L49-51) | `.catch(() => {})` & `try { window.close(); } catch { // Ignored }` | DOM fullscreen rejection and Chromium `--app` mode `window.close()` failure swallow errors, leaving application in an indeterminate zombie state. | Use unified `WindowManager` bridge; catch rejections, log diagnostics to `remoteErrorReporter`, and trigger graceful backend shutdown fallback. |
| **ERR-SW-07** | `src/lib/diagnostics/home-error-log.ts` (L24, L46, L70, L84) | `catch { /* ignore quota */ }` | Storage quota exhaustion and JSON deserialization errors are silently dropped, preventing diagnostic telemetry from logging. | Fallback to in-memory telemetry queue with positive boolean `hasStorageQuotaExceeded=True` and dispatch error to backend endpoint. |
| **ERR-SW-08** | `src/lib/vision/workpiece-rule-analyzer.ts` (L290, L318, L338, L585, L619, L1409, L3769, L4597) | Multiple `try { JSON.parse(...) } catch { // Ignored }` | Malformed rule parameters, Pin 1 configurations, and ROI JSON arrays silently fallback to empty objects/null, obscuring corrupted recipe state. | Implement `safeJsonParse<T>(raw, fallback, context)` helper that logs malformed payloads, marks `hasParseError=True`, and records diagnostic events. |

---

## 3. Recipe Persistence Self-Healing DDL Bootstrap (`mr6_-1EdpFtG`)

### 3.1 Problem Analysis
In `BE/repos/sqlite_rules_repo.py`, `save_rule_set` executes:
```sql
SELECT Version FROM Recipe WHERE RuleSetId = ?
```
When `root.db` has not been pre-migrated via `bin/db-bootstrap.py`, SQLite raises `sqlite3.OperationalError: no such table: Recipe`. This bubbles up through `AppError(ErrorCode.E_BE_INTERNAL, "Failed to save recipe: no such table: Recipe")` and surfaces as an error toast in the frontend.

### 3.2 Self-Healing Implementation
`SqliteRulesRepo` must implement an idempotent bootstrap preflight check:
```python
def _ensure_recipe_table(conn: sqlite3.Connection) -> None:
    """Ensure the Recipe table and indexes exist (Plan 90 Step 35 self-healing)."""
    ddl = """
    CREATE TABLE IF NOT EXISTS Recipe (
        RecipeId     INTEGER PRIMARY KEY AUTOINCREMENT,
        RuleSetId    INTEGER NOT NULL,
        Name         TEXT    NOT NULL,
        Version      INTEGER NOT NULL CHECK (Version >= 0),
        IsEnabled    INTEGER NOT NULL DEFAULT 1 CHECK (IsEnabled IN (0, 1)),
        PayloadJson  TEXT    NOT NULL,
        CreatedAt    INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)),
        UpdatedAt    INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS IdxRecipe_RuleSetId
        ON Recipe (RuleSetId);
    """
    conn.executescript(ddl)
```
- In `SqliteRulesRepo.__init__`, execute `_ensure_recipe_table(self.conn)` immediately after acquiring `get_root_conn()`.
- Guarantees seamless operation in test environments, standalone desktop mode, and development previews without requiring external migration commands.

---

## 4. SplitDB 4th Tier: `error.db` Database Architecture

### 4.1 SplitDB Decoupling Principles
In alignment with `02-spec/05-split-db-architecture/` and `02-spec/21-app/76-cli-log-and-ipc.md`:
1. **Physical File Isolation**: System errors and bug recordings are persisted in `<APP_DB_ROOT>/error.db`.
2. **Zero Cross-Tier Joins**: No foreign keys or SQL joins exist between `error.db` and `root.db`, `task.db`, or `rules.db`. Cross-references (e.g. `RunId`, `RuleSetId`, `SessionId`) are stored as opaque scalar fields.
3. **No Cross-Tier ATTACH**: The guarded connection wrapper forbids `ATTACH DATABASE` statements on the `error` connection.
4. **WAL Mode & Concurrency**: Configured with `PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;`.

### 4.2 Database Schema (`BE/db/migrations/error/0001_error_initial.sql`)

```sql
-- SplitDB Tier 4: Error & Diagnostic Persistence
BEGIN;

CREATE TABLE IF NOT EXISTS SchemaVersion (
    Version   INTEGER PRIMARY KEY,
    AppliedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ErrorEvent (
    ErrorId        TEXT    PRIMARY KEY,
    ErrorCode      TEXT    NOT NULL,
    Subsystem      TEXT    NOT NULL,
    Severity       TEXT    NOT NULL CHECK (Severity IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    Message        TEXT    NOT NULL,
    StackTrace     TEXT,
    ContextJson    TEXT    NOT NULL DEFAULT '{}',
    CorrelationId  TEXT,
    IsResolved     INTEGER NOT NULL DEFAULT 0 CHECK (IsResolved IN (0, 1)),
    CreatedAt      INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
);

CREATE INDEX IF NOT EXISTS IdxErrorEvent_ErrorCode ON ErrorEvent (ErrorCode);
CREATE INDEX IF NOT EXISTS IdxErrorEvent_Subsystem ON ErrorEvent (Subsystem);
CREATE INDEX IF NOT EXISTS IdxErrorEvent_Severity ON ErrorEvent (Severity);
CREATE INDEX IF NOT EXISTS IdxErrorEvent_CreatedAt ON ErrorEvent (CreatedAt DESC);
CREATE INDEX IF NOT EXISTS IdxErrorEvent_CorrelationId ON ErrorEvent (CorrelationId);
CREATE INDEX IF NOT EXISTS IdxErrorEvent_IsResolved ON ErrorEvent (IsResolved);

CREATE TABLE IF NOT EXISTS RecordedBug (
    BugId            TEXT    PRIMARY KEY,
    Title            TEXT    NOT NULL,
    Description      TEXT,
    SessionJson      TEXT    NOT NULL,
    ScreenshotsJson  TEXT    NOT NULL DEFAULT '[]',
    LogExcerptJson   TEXT    NOT NULL DEFAULT '[]',
    EnvironmentJson  TEXT    NOT NULL DEFAULT '{}',
    Status           TEXT    NOT NULL DEFAULT 'OPEN' CHECK (Status IN ('OPEN', 'EXPORTED', 'RESOLVED')),
    CreatedAt        INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)),
    ExportedAt       INTEGER
);

CREATE INDEX IF NOT EXISTS IdxRecordedBug_Status ON RecordedBug (Status);
CREATE INDEX IF NOT EXISTS IdxRecordedBug_CreatedAt ON RecordedBug (CreatedAt DESC);

INSERT OR IGNORE INTO SchemaVersion (Version, AppliedAt)
VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

COMMIT;
```

### 4.3 Connection Factory Updates (`BE/db/connections.py`)
Extend the SplitDB connection factory to recognize the `error` tier:
```python
Tier = Literal["root", "task", "rules", "error"]

_DB_FILENAME: dict[Tier, str] = {
    "root": "root.db",
    "task": "task.db",
    "rules": "rules.db",
    "error": "error.db",
}

def get_error_conn(
    *, db_root: Path | str | None = None, env: Mapping[str, str] | None = None
) -> sqlite3.Connection:
    """Open a guarded connection to the Error-tier DB (<db_root>/error.db)."""
    return _open("error", _resolve_db_root(db_root, env))
```

### 4.4 High-Performance Writer (`BE/app/db/writers/error_writer.py`)
The error writer module provides strictly typed, transactional write operations complying with positive boolean invariants:

```python
@dataclass(frozen=True)
class ErrorEventParams:
    errorId: str
    errorCode: str
    subsystem: str
    severity: str
    message: str
    stackTrace: str | None = None
    contextJson: str = "{}"
    correlationId: str | None = None
    isResolved: bool = False

@dataclass(frozen=True)
class RecordedBugParams:
    bugId: str
    title: str
    sessionJson: str
    description: str | None = None
    screenshotsJson: str = "[]"
    logExcerptJson: str = "[]"
    environmentJson: str = "{}"
    status: str = "OPEN"

@dataclass(frozen=True)
class ErrorWriteOutcome:
    isInserted: bool
    recordId: str
    errorMessage: str | None = None

def write_error_event(conn: sqlite3.Connection, params: ErrorEventParams) -> ErrorWriteOutcome:
    """Persist an ErrorEvent record idempotently using BEGIN IMMEDIATE."""
    # Strict validation, transaction isolation, returns ErrorWriteOutcome

def write_recorded_bug(conn: sqlite3.Connection, params: RecordedBugParams) -> ErrorWriteOutcome:
    """Persist a RecordedBug session report."""
    # Strict validation, transaction isolation, returns ErrorWriteOutcome

def query_error_events(
    conn: sqlite3.Connection,
    *,
    subsystem: str | None = None,
    severity: str | None = None,
    hasResolved: bool | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Query recent error events with bounded pagination."""
```

---

## 5. Error Ingestion API Surface (`BE/routes/errors.py`)

A high-speed HTTP interface enables the frontend and external background workers to persist and query error logs and bug recordings:

```
POST   /api/v1/errors               -> Ingest client error event into error.db
GET    /api/v1/errors               -> List recent error events with query filters
GET    /api/v1/errors/{error_id}    -> Fetch single error event with full stack trace
PATCH  /api/v1/errors/{error_id}    -> Mark error as resolved / update status
POST   /api/v1/errors/bugs          -> Ingest UI bug recorder session
GET    /api/v1/errors/bugs          -> List recorded bug sessions
GET    /api/v1/errors/bugs/{bug_id} -> Fetch bug recording details
GET    /api/v1/errors/bugs/{bug_id}/export -> Download standalone bug ZIP bundle
```

### 5.1 Request Envelopes
- Client-side error payload matches `UniversalRequestEnvelope`:
```json
{
  "errorCode": "E_FE_CANVAS_RENDER",
  "subsystem": "ui_workbench",
  "severity": "ERROR",
  "message": "Failed to compile WebGL shader for greyscale contrast preview",
  "stackTrace": "Error: WebGL compilation failed\n  at compileShader (gl-utils.ts:42)...",
  "context": {
    "canvasWidth": 1920,
    "canvasHeight": 1080,
    "zoomLevel": 1.25,
    "activeRuleId": 401
  },
  "correlationId": "req_01h8x9p3_fe"
}
```

---

## 6. Error Inspection CLI & Standalone Bug Export Engine

### 6.1 CLI Architecture & Commands
CLI entrypoint `error-cli` (with PowerShell wrapper `scripts/ps/Invoke-ErrorCli.ps1`):

```bash
# List recent error events
error-cli list [--limit 20] [--subsystem vision] [--severity ERROR] [--json]

# View detailed error with stack trace and context
error-cli view <ErrorId> [--json]

# Mark error as resolved
error-cli resolve <ErrorId>

# List recorded UI bug sessions
error-cli bugs list [--status OPEN] [--limit 10] [--json]

# View recorded bug details
error-cli bugs view <BugId>

# Export standalone bug report ZIP bundle
error-cli bugs export <BugId> --out ./bug-reports/
```

### 6.2 Standalone Bug Report Archive Specification
When `bugs export <BugId>` is executed, the exporter creates a compressed archive `bug_<id>_<timestamp>.zip` containing:

```
bug_archive/
├── AI_BUG_REPORT.md       # Exhaustive RCA & fix specification for autonomous AI agents
├── README.md              # Operator-facing summary and reproduction instructions
├── session.json           # Serialized user actions, router states, clicks, and inputs
├── environment.json       # OS, screen dimensions, GPU vendor, app version, Python version
├── logs.jsonl             # Associated error logs and backend traces during the session
└── screenshots/           # Extracted PNG screenshots captured before and during the fault
    ├── step_001_click.png
    ├── step_002_inspect.png
    └── step_003_fault.png
```

#### Contract for `AI_BUG_REPORT.md`:
1. **Executive Summary**: Bug ID, title, severity, timestamp, affected component.
2. **Reproduction Sequence**: Numbered, deterministic steps executed by the operator.
3. **Primary Error & Root Cause**: Error code, raw error message, and formatted stack trace.
4. **Impacted Source Code**: Exact file paths and line ranges implicated in the failure.
5. **Remediation Plan**: Actionable steps for an autonomous subagent to resolve the defect.

---

## 7. Verification & Acceptance Criteria

### 7.1 Automated Quality Gates
1. **Zero Error Swallowing Check**:
   - Ast-based grep / linter confirms zero occurrences of `except Exception: pass`, bare `except:`, or empty `catch {}` in target files.
2. **Database Bootstrap Self-Healing**:
   - Test suite deletes `root.db` and executes `SqliteRulesRepo.save_rule_set()` directly without running `bin/db-bootstrap.py`.
   - Verified that `Recipe` table is automatically bootstrapped and recipe save completes with HTTP 200 / valid envelope.
3. **SplitDB Isolation Enforcement**:
   - Unit tests confirm `get_error_conn()` opens `<APP_DB_ROOT>/error.db` in WAL mode.
   - Guarded connection verifies that `ATTACH DATABASE` on `error.db` raises `AppError(ErrorCode.E_CLI_PREFLIGHT_FAILED)`.
4. **CLI Subcommand Integrity**:
   - `error-cli list --json` returns valid JSON array of error events.
   - `error-cli bugs export <id> --out ./temp/` generates valid ZIP containing all 5 required artifacts (`AI_BUG_REPORT.md`, `README.md`, `session.json`, `environment.json`, `screenshots/`).
