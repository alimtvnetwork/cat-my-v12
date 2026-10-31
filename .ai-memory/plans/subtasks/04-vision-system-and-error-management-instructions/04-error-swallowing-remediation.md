---
Slug: error-swallowing-remediation
Status: pending
Created: 2026-10-31
Parent: 04-vision-system-and-error-management-instructions
Owner: Worker 02
---

# Subtask 04: Anti-Swallowing Remediation & Leaf Error Sovereignty

## 1. Overview & Objective

Eliminate all instances of error swallowing, silent `except Exception: pass`, and unhandled promise/exception rejections across critical backend evaluation routines, camera capture pipelines, frontend window controllers, and vision workpiece analyzers. Additionally, implement idempotent self-healing schema bootstrapping in `BE/repos/sqlite_rules_repo.py` to eradicate the `Failed to save recipe: no such table: Recipe` bug (`mr6_-1EdpFtG`).

Owning Specifications:
- `02-spec/21-app/04-vision-system-and-error-management-instructions/02-error-management-and-splitdb-spec.md` §2, §3
- `02-spec/03-error-manage/01-error-sovereignty.md` (Leaf Error Sovereignty)
- `02-spec/04-database-conventions/` (PascalCase, idempotent migrations)

---

## 2. Target File Boundaries & Code Remediation Tasks

### Task 4.1: Backend Vision Evaluation Swallowing Remediation
- **Target File**: `BE/app/domain/vision_eval.py`
- **Issue 1 (Lines 261-264)**:
  ```python
  # Offending code:
  try:
      smp_tile = cv2.resize(smp_tile, (ref_tile.shape[1], ref_tile.shape[0]))
  except Exception:
      pass
  ```
  - **Remediation**:
    - Check tile validity before resize.
    - If `cv2.resize` raises, log `logger.warning("tile_resize_failed", extra={"smp_shape": smp_tile.shape, "ref_shape": ref_tile.shape})`.
    - Set boolean `hasTileResizeFailed = True` and handle array fallback cleanly without letting shape mismatches cause subsequent unhandled crashes.
- **Issue 2 (Lines 280-284)**:
  ```python
  # Offending code:
  if abs(shift_x) < 30 and abs(shift_y) < 30:
      dx, dy = float(shift_x), float(shift_y)
  except Exception:
      pass
  ```
  - **Remediation**:
    - Catch specific `cv2.error` and `ValueError`.
    - Log `logger.warning("phase_correlation_failed", extra={"error": str(exc), "ref_shape": ref_tile.shape})`.
    - Set positive boolean `hasShiftFallback = True` and retain default zero displacement `(0.0, 0.0)` with diagnostic trace.

### Task 4.2: Backend Score Route Swallowing Remediation
- **Target File**: `BE/routes/score.py`
- **Issue 1 (Lines 75-78)**:
  ```python
  # Offending code:
  try:
      return c.read_bytes()
  except OSError:
      pass
  ```
  - **Remediation**:
    - Log candidate path attempts: `logger.debug("score_candidate_read_missed", extra={"path": str(c), "error": str(err)})`.
    - If all candidates fail, raise `AppError(ErrorCode.E_BE_NOT_FOUND, f"Image path candidate not found: {c}", details={"candidates": [str(x) for x in candidates]})`.
- **Issue 2 (Lines 93-96)**:
  ```python
  # Offending code:
  if w > 0 and h > 0:
      return BoundingBox(x=x, y=y, width=w, height=h)
  except (KeyError, ValueError, TypeError):
      pass
  return None
  ```
  - **Remediation**:
    - If required keys are missing or malformed, log diagnostic warning with offending raw dictionary keys.
    - Return explicit `Result[BoundingBox]` or raise `AppError(ErrorCode.E_BE_BAD_REQUEST, "Malformed bounding box payload")` when strict validation is requested.

### Task 4.3: Daheng Camera Capture Loop Swallowing Remediation
- **Target File**: `BE/sdk_facade/vendors/daheng/primitives.py`
- **Issue (Lines 186-190)**:
  ```python
  # Offending code:
  on_frame(env)
  except Exception:
      break
  ```
  - **Remediation**:
    - Capture exception traceback: `logger.error("daheng_capture_frame_callback_crashed", exc_info=True, extra={"serial": serial})`.
    - Discarding frame errors without notification freezes the stream. Catch exception, record `ErrorEvent` to `error.db`, set `isCaptureFaulted = True`, invoke clean `handle.device.stream_off()`, and raise `AppError(ErrorCode.E_CAMERA_STREAM_FAULT, ...)`.

### Task 4.4: Recipe Persistence Self-Healing Bootstrap (`mr6_-1EdpFtG`)
- **Target File**: `BE/repos/sqlite_rules_repo.py`
- **Issue**:
  - Missing `Recipe` table causes `sqlite3.OperationalError: no such table: Recipe` on SAVE.
- **Remediation**:
  - In `SqliteRulesRepo.__init__`, implement and execute `_ensure_recipe_table(self.conn)`:
    ```python
    def _ensure_recipe_table(conn: sqlite3.Connection) -> None:
        conn.executescript("""
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
        CREATE UNIQUE INDEX IF NOT EXISTS IdxRecipe_RuleSetId ON Recipe (RuleSetId);
        """)
    ```

### Task 4.5: Frontend Window Controls & Fullscreen Swallowing Remediation
- **Target File**: `src/components/layout/WindowControlButtons.tsx`
- **Issue**: Lines 30, 32 `.catch(() => {})`, Lines 49-51 `try { window.close(); } catch { // Ignored }`.
- **Remediation**:
  - Provide fallback window closing logic that triggers the backend shutdown API (`/api/v1/system/shutdown`) when running in browser or Chromium desktop app mode.
  - Log fullscreen and window errors to `remoteErrorReporter` with positive boolean `hasWindowActionFailed = true`.

### Task 4.6: Frontend Diagnostics Quota Swallowing Remediation
- **Target File**: `src/lib/diagnostics/home-error-log.ts`
- **Issue**: Lines 24, 46, 70, 84 silent `catch { /* ignore */ }`.
- **Remediation**:
  - Maintain an in-memory ring buffer (`memoryLogQueue`) when `localStorage` is inaccessible or quota is exceeded.
  - Set boolean flag `hasStorageQuotaExceeded = true` and forward logs to backend error ingestion endpoint (`POST /api/v1/errors`).

### Task 4.7: Frontend Workpiece Analyzer Safe JSON Parsing
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Issue**: Repetitive `catch { // Ignored if invalid json }` across lines 290, 318, 338, 354, 585, 619, 782, 826, 1409, 3769, 4597.
- **Remediation**:
  - Introduce `safeJsonParse<T>(jsonString: string | null | undefined, fallback: T, contextName: string): { readonly data: T; readonly hasParseError: boolean }`.
  - Log warning via `console.warn` when JSON parsing fails, including the first 100 characters of the payload and the context identifier.
  - Return safe fallback data while setting positive boolean `hasParseError = true`.

---

## 3. Step-by-Step Implementation Sequence

1. **Step 1**: In `BE/repos/sqlite_rules_repo.py`, add `_ensure_recipe_table(self.conn)` helper. Verify by creating an empty in-memory/fresh database connection and calling `save_rule_set()`.
2. **Step 2**: In `BE/app/domain/vision_eval.py`, eliminate the two `except Exception: pass` blocks in `align_sample_to_reference()` and replace with structured logging and `hasShiftFallback` / `hasTileResizeFailed` flags.
3. **Step 3**: In `BE/routes/score.py`, refactor `_read_image_bytes()` and `_extract_bounding_box()` to replace `except OSError: pass` and `except (KeyError, ValueError, TypeError): pass` with structured diagnostics and explicit `AppError` raises when all attempts fail.
4. **Step 4**: In `BE/sdk_facade/vendors/daheng/primitives.py`, refactor frame acquisition thread loop in `start_stream()` to log exceptions with full traceback and trigger clean camera disconnect.
5. **Step 5**: In `src/lib/vision/workpiece-rule-analyzer.ts`, implement `safeJsonParse<T>()` utility and replace all 11 silent try/catch JSON blocks with the safe parsing utility.
6. **Step 6**: In `src/components/layout/WindowControlButtons.tsx` and `src/lib/diagnostics/home-error-log.ts`, replace empty catch blocks with structured in-memory buffering and remote error dispatch.
7. **Step 7**: Run targeted test suites: `pytest BE/tests/domain/test_vision_eval_error_handling.py` and `pytest BE/tests/repos/test_sqlite_rules_repo_bootstrap.py`.

---

## 4. Verification Contracts & Quality Gates

1. **Zero Swallowing Linter Check**:
   ```pwsh
   # Must return 0 lines matching bare pass in exception handlers
   Get-ChildItem -Path "BE/app/domain/vision_eval.py", "BE/routes/score.py", "BE/sdk_facade/vendors/daheng/primitives.py" | Select-String -Pattern "except.*:\s*pass"
   ```
2. **Recipe Bootstrap Unit Test**:
   - Given a brand new database connection with no prior tables,
   - When `SqliteRulesRepo.save_rule_set()` is invoked,
   - Then the `Recipe` table is dynamically created and the recipe record is successfully persisted without error.
3. **Strict Boolean Compliance**:
   - All new status flags must use `is*` or `has*` (`hasShiftFallback`, `hasParseError`, `isCaptureFaulted`, `hasStorageQuotaExceeded`).
