# Subtask 02: Python Inverted Booleans Remediation

**Slug:** `02-py-inverted-booleans`
**Status:** completed
**Parent Plan:** `.lovable/plans/pending/01-coding-guideline-fixes.md`
**Target Area:** `BE/` and `app/`
**Rules Violated:** `.lovable/coding-guidelines.md` § Boolean Naming, `spec/02-coding-guidelines/01-cross-language/02-boolean-principles/`

## 1. Context & Root Cause
Python modules use `not is_x` or `not res.is_success` instead of direct property access (`res.is_failure` or `is_x is False`).
**Root Cause:** Standard Python `not` keyword idioms used across dispatcher, workers, and route handlers.
**Fallout Analysis:**
- Mutating check logic could affect error paths if failure flags aren't mutually exclusive.
- Safe refactor: Check `is_failure is True` or `is_success is False` explicitly.

## 2. Granular Execution Steps (Steps 21-35)

### Step 21: Fix inverted boolean in `BE/app/installer_doctor.py`
- **File:** [`BE/app/installer_doctor.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/installer_doctor.py)
- **Line:** 249
- **Violation:** `not exe.is_file` in `if not exe.is_file():`
- **Action:** Convert to explicit positive state test (`is_failure` or explicit `is False`).
- **Fallout Check:** Run pytest on corresponding module to verify zero regressions.

### Step 22: Fix inverted boolean in `BE/app/installer_upgrade.py`
- **File:** [`BE/app/installer_upgrade.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/installer_upgrade.py)
- **Line:** 173
- **Violation:** `not policy.is_downgrade_allowed` in `if not policy.is_downgrade_allowed:`
- **Action:** Convert to explicit positive state test (`is_failure` or explicit `is False`).
- **Fallout Check:** Run pytest on corresponding module to verify zero regressions.

### Step 23: Fix inverted boolean in `BE/app/retention_scheduler.py`
- **File:** [`BE/app/retention_scheduler.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/retention_scheduler.py)
- **Line:** 100
- **Violation:** `not stop_event.is_set` in `return not stop_event.is_set()`
- **Action:** Convert to explicit positive state test (`is_failure` or explicit `is False`).
- **Fallout Check:** Run pytest on corresponding module to verify zero regressions.

### Step 24: Fix inverted boolean in `BE/cli/common/config_loader.py`
- **File:** [`BE/cli/common/config_loader.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/config_loader.py)
- **Line:** 73
- **Violation:** `not path.is_file` in `if not path.is_file():`
- **Action:** Convert to explicit positive state test (`is_failure` or explicit `is False`).
- **Fallout Check:** Run pytest on corresponding module to verify zero regressions.

### Step 25: Fix inverted boolean in `BE/cli/common/ipc.py`
- **File:** [`BE/cli/common/ipc.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/ipc.py)
- **Line:** 351
- **Violation:** `not drop.is_dir` in `if not drop.is_dir():`
- **Action:** Convert to explicit positive state test (`is_failure` or explicit `is False`).
- **Fallout Check:** Run pytest on corresponding module to verify zero regressions.

### Step 26: Fix inverted boolean in `BE/cli/common/ipc.py`
- **File:** [`BE/cli/common/ipc.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/ipc.py)
- **Line:** 359
- **Violation:** `not entry.is_file` in `if not entry.is_file():`
- **Action:** Convert to explicit positive state test (`is_failure` or explicit `is False`).
- **Fallout Check:** Run pytest on corresponding module to verify zero regressions.

### Step 27: Fix inverted boolean in `BE/cli/common/logger.py`
- **File:** [`BE/cli/common/logger.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/logger.py)
- **Line:** 112
- **Violation:** `not is_registered` in `if not is_registered(code):`
- **Action:** Convert to explicit positive state test (`is_failure` or explicit `is False`).
- **Fallout Check:** Run pytest on corresponding module to verify zero regressions.

### Step 28: Fix inverted boolean in `BE/cli/common/log_reader.py`
- **File:** [`BE/cli/common/log_reader.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/log_reader.py)
- **Line:** 94
- **Violation:** `not log_root.is_dir` in `if not log_root.exists() or not log_root.is_dir():`
- **Action:** Convert to explicit positive state test (`is_failure` or explicit `is False`).
- **Fallout Check:** Run pytest on corresponding module to verify zero regressions.

### Step 29: Fix inverted boolean in `BE/cli/common/log_reader.py`
- **File:** [`BE/cli/common/log_reader.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/log_reader.py)
- **Line:** 108
- **Violation:** `not date_dir.is_dir` in `if not date_dir.is_dir() or date_dir.name in _RESERVED_DIRS:`
- **Action:** Convert to explicit positive state test (`is_failure` or explicit `is False`).
- **Fallout Check:** Run pytest on corresponding module to verify zero regressions.

### Step 30: Fix inverted boolean in `BE/cli/common/log_reader.py`
- **File:** [`BE/cli/common/log_reader.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/log_reader.py)
- **Line:** 113
- **Violation:** `not file.is_file` in `if not file.is_file():`
- **Action:** Convert to explicit positive state test (`is_failure` or explicit `is False`).
- **Fallout Check:** Run pytest on corresponding module to verify zero regressions.

### Step 31: Fix inverted boolean in `BE/cli/common/log_rotation.py`
- **File:** [`BE/cli/common/log_rotation.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/log_rotation.py)
- **Line:** 99
- **Violation:** `not child.is_dir` in `if not child.is_dir():`
- **Action:** Convert to explicit positive state test (`is_failure` or explicit `is False`).
- **Fallout Check:** Run pytest on corresponding module to verify zero regressions.

### Step 32: Fix inverted boolean in `BE/cli/common/log_rotation.py`
- **File:** [`BE/cli/common/log_rotation.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/log_rotation.py)
- **Line:** 139
- **Violation:** `not source_dir.is_dir` in `if not source_dir.is_dir() or source_dir.name in _RESERVED_DIRS:`
- **Action:** Convert to explicit positive state test (`is_failure` or explicit `is False`).
- **Fallout Check:** Run pytest on corresponding module to verify zero regressions.

### Step 33: Fix inverted boolean in `BE/cli/common/log_schema.py`
- **File:** [`BE/cli/common/log_schema.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/log_schema.py)
- **Line:** 106
- **Violation:** `not is_registered` in `if code is not None and (not isinstance(code, str) or not is_registered(code)):`
- **Action:** Convert to explicit positive state test (`is_failure` or explicit `is False`).
- **Fallout Check:** Run pytest on corresponding module to verify zero regressions.

### Step 34: Fix inverted boolean in `BE/cli/processing/commands/batch.py`
- **File:** [`BE/cli/processing/commands/batch.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/processing/commands/batch.py)
- **Line:** 100
- **Violation:** `not d.is_dir` in `if not d.exists() or not d.is_dir():`
- **Action:** Convert to explicit positive state test (`is_failure` or explicit `is False`).
- **Fallout Check:** Run pytest on corresponding module to verify zero regressions.

### Step 35: Fix inverted boolean in `BE/cli/processing/commands/batch.py`
- **File:** [`BE/cli/processing/commands/batch.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/processing/commands/batch.py)
- **Line:** 119
- **Violation:** `not mpath.is_file` in `if not mpath.exists() or not mpath.is_file():`
- **Action:** Convert to explicit positive state test (`is_failure` or explicit `is False`).
- **Fallout Check:** Run pytest on corresponding module to verify zero regressions.
