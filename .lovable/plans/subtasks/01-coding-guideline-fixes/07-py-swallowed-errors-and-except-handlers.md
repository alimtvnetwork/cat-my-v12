# Subtask 07: Python Swallowed Errors & Except Handlers Remediation

**Slug:** `07-py-swallowed-errors-and-except-handlers`
**Parent Plan:** `.lovable/plans/pending/01-coding-guideline-fixes.md`
**Target Area:** `BE/` and `app/`
**Rules Violated:** `spec/03-error-manage/00-overview.md`, `.lovable/coding-guidelines.md` § Hard Rules (Rule 4)

## 1. Context & Root Cause
Except blocks containing bare `pass` or `continue` without logging.
**Root Cause:** Ignoring expected missing files or cleanup errors.
**Fallout Analysis:**
- If an exception was silently skipped, logging it may surface in test logs; ensure logger uses `_log.debug` or `_log.warning` with structured extras.

## 2. Granular Execution Steps (Steps 121-135)

### Step 121: Fix except handler in `BE/app/installer_doctor.py`
- **File:** [`BE/app/installer_doctor.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/installer_doctor.py)
- **Line:** 264
- **Violation:** `Except handler contains only pass/continue`
- **Action:** Replace bare pass/continue with explicit structured log (`_log.warning('operation.failed', exc_info=True)`) or `contextlib.suppress(SpecificException)` with documented comment.
- **Fallout Check:** Run pytest on BE to verify clean logging output.

### Step 122: Fix except handler in `BE/app/installer_path.py`
- **File:** [`BE/app/installer_path.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/installer_path.py)
- **Line:** 193
- **Violation:** `Except handler contains only pass/continue`
- **Action:** Replace bare pass/continue with explicit structured log (`_log.warning('operation.failed', exc_info=True)`) or `contextlib.suppress(SpecificException)` with documented comment.
- **Fallout Check:** Run pytest on BE to verify clean logging output.

### Step 123: Fix except handler in `BE/app/installer_rollback.py`
- **File:** [`BE/app/installer_rollback.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/installer_rollback.py)
- **Line:** 258
- **Violation:** `Except handler contains only pass/continue`
- **Action:** Replace bare pass/continue with explicit structured log (`_log.warning('operation.failed', exc_info=True)`) or `contextlib.suppress(SpecificException)` with documented comment.
- **Fallout Check:** Run pytest on BE to verify clean logging output.

### Step 124: Fix except handler in `BE/cli/common/ipc_bootstrap.py`
- **File:** [`BE/cli/common/ipc_bootstrap.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/ipc_bootstrap.py)
- **Line:** 123
- **Violation:** `Except handler contains only pass/continue`
- **Action:** Replace bare pass/continue with explicit structured log (`_log.warning('operation.failed', exc_info=True)`) or `contextlib.suppress(SpecificException)` with documented comment.
- **Fallout Check:** Run pytest on BE to verify clean logging output.

### Step 125: Fix except handler in `BE/cli/common/logger.py`
- **File:** [`BE/cli/common/logger.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/logger.py)
- **Line:** 223
- **Violation:** `Except handler contains only pass/continue`
- **Action:** Replace bare pass/continue with explicit structured log (`_log.warning('operation.failed', exc_info=True)`) or `contextlib.suppress(SpecificException)` with documented comment.
- **Fallout Check:** Run pytest on BE to verify clean logging output.

### Step 126: Fix except handler in `BE/cli/common/session_index.py`
- **File:** [`BE/cli/common/session_index.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/session_index.py)
- **Line:** 155
- **Violation:** `Except handler contains only pass/continue`
- **Action:** Replace bare pass/continue with explicit structured log (`_log.warning('operation.failed', exc_info=True)`) or `contextlib.suppress(SpecificException)` with documented comment.
- **Fallout Check:** Run pytest on BE to verify clean logging output.

### Step 127: Fix except handler in `BE/cli/common/verbose.py`
- **File:** [`BE/cli/common/verbose.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/verbose.py)
- **Line:** 71
- **Violation:** `Except handler contains only pass/continue`
- **Action:** Replace bare pass/continue with explicit structured log (`_log.warning('operation.failed', exc_info=True)`) or `contextlib.suppress(SpecificException)` with documented comment.
- **Fallout Check:** Run pytest on BE to verify clean logging output.

### Step 128: Fix except handler in `BE/cli/common/verbose.py`
- **File:** [`BE/cli/common/verbose.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/verbose.py)
- **Line:** 79
- **Violation:** `Except handler contains only pass/continue`
- **Action:** Replace bare pass/continue with explicit structured log (`_log.warning('operation.failed', exc_info=True)`) or `contextlib.suppress(SpecificException)` with documented comment.
- **Fallout Check:** Run pytest on BE to verify clean logging output.

### Step 129: Fix except handler in `BE/cli/processing/commands/watch.py`
- **File:** [`BE/cli/processing/commands/watch.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/processing/commands/watch.py)
- **Line:** 129
- **Violation:** `Except handler contains only pass/continue`
- **Action:** Replace bare pass/continue with explicit structured log (`_log.warning('operation.failed', exc_info=True)`) or `contextlib.suppress(SpecificException)` with documented comment.
- **Fallout Check:** Run pytest on BE to verify clean logging output.

### Step 130: Fix except handler in `BE/cli/worker/camera_lease.py`
- **File:** [`BE/cli/worker/camera_lease.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/worker/camera_lease.py)
- **Line:** 145
- **Violation:** `Except handler contains only pass/continue`
- **Action:** Replace bare pass/continue with explicit structured log (`_log.warning('operation.failed', exc_info=True)`) or `contextlib.suppress(SpecificException)` with documented comment.
- **Fallout Check:** Run pytest on BE to verify clean logging output.

### Step 131: Fix except handler in `BE/cli/worker/subcommands/open_stream.py`
- **File:** [`BE/cli/worker/subcommands/open_stream.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/worker/subcommands/open_stream.py)
- **Line:** 80
- **Violation:** `Except handler contains only pass/continue`
- **Action:** Replace bare pass/continue with explicit structured log (`_log.warning('operation.failed', exc_info=True)`) or `contextlib.suppress(SpecificException)` with documented comment.
- **Fallout Check:** Run pytest on BE to verify clean logging output.

### Step 132: Fix except handler in `BE/cli/worker/subcommands/open_stream.py`
- **File:** [`BE/cli/worker/subcommands/open_stream.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/worker/subcommands/open_stream.py)
- **Line:** 90
- **Violation:** `Except handler contains only pass/continue`
- **Action:** Replace bare pass/continue with explicit structured log (`_log.warning('operation.failed', exc_info=True)`) or `contextlib.suppress(SpecificException)` with documented comment.
- **Fallout Check:** Run pytest on BE to verify clean logging output.

### Step 133: Fix except handler in `BE/routes/cli_observability.py`
- **File:** [`BE/routes/cli_observability.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/routes/cli_observability.py)
- **Line:** 457
- **Violation:** `Except handler contains only pass/continue`
- **Action:** Replace bare pass/continue with explicit structured log (`_log.warning('operation.failed', exc_info=True)`) or `contextlib.suppress(SpecificException)` with documented comment.
- **Fallout Check:** Run pytest on BE to verify clean logging output.

### Step 134: Fix except handler in `BE/sdk_facade/vendors/daheng/facade.py`
- **File:** [`BE/sdk_facade/vendors/daheng/facade.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/sdk_facade/vendors/daheng/facade.py)
- **Line:** 70
- **Violation:** `Except handler contains only pass/continue`
- **Action:** Replace bare pass/continue with explicit structured log (`_log.warning('operation.failed', exc_info=True)`) or `contextlib.suppress(SpecificException)` with documented comment.
- **Fallout Check:** Run pytest on BE to verify clean logging output.

### Step 135: Fix except handler in `app/capture/vimba_device_io.py`
- **File:** [`app/capture/vimba_device_io.py`](file:///D:/wp-work/riseup-asia/cat-my/app/capture/vimba_device_io.py)
- **Line:** 96
- **Violation:** `Except handler contains only pass/continue`
- **Action:** Replace bare pass/continue with explicit structured log (`_log.warning('operation.failed', exc_info=True)`) or `contextlib.suppress(SpecificException)` with documented comment.
- **Fallout Check:** Run pytest on BE to verify clean logging output.
