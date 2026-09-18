# SS-02: Pytest and Backend Isolation

## Objective

Review each existing backend and test modification against the intended architecture. Stabilize the pytest suite without modifying production behavior merely to satisfy an incorrect test.

## Files/Area Involved

- `BE/errors/apperror.py`
- `BE/cli/common/dispatcher.py`
- `BE/cli/common/session.py`
- `BE/app/installer_path.py`
- `BE/tests/` (including `test_e2e_inmemory.py` and `test_session_index.py`)

## Verification Command

```bash
python -m pytest BE/tests -x --tb=short
```

## Completion Condition

All tests pass (100% green). Uncommitted backend modifications (`apperror.py`, `dispatcher.py`, `installer_path.py`) are strictly reviewed against `02-spec/03-error-manage` and retained only if architecturally sound. Windows-only failures (e.g. file lock in `test_concurrent_open_serialised`) are handled appropriately without breaking Linux CI.

## Recovery/Checkpoint Instructions

- **Review Step:** Analyze the diff for `BE/errors/apperror.py` and ensure the `file_path` addition matches error spec rules. If invalid, revert it and fix the caller instead.
- **Commit Boundary:** Commit backend test fixes as `test(be): stabilize pytest suite and review error contracts` before proceeding to SS-03.
