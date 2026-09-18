---
Status: pending
Created: 2026-08-27
Goal: Resolve 4 failing CI/CD areas and stabilize the branch
---

# CI/CD Remediation Plan

This plan orchestrates the resolution of 4 failing CI areas while preserving legitimate compatibility fixes and reverting harmful linter weakenings.

## Subtasks

1. [SS-01 Spec and IPC Linters](../subtasks/02-cicd-remediation/SS-01-spec-linters.md)
2. [SS-02 Pytest and Backend Isolation](../subtasks/02-cicd-remediation/SS-02-pytest.md)
3. [SS-03 Frontend Lint and Typecheck](../subtasks/02-cicd-remediation/SS-03-frontend.md)
4. [SS-04 Visual Regression Gate](../subtasks/02-cicd-remediation/SS-04-visual.md)

## Uncommitted Changes Review Ledger

- `BE/app/installer_path.py`: **REVIEW** - Ensure path change aligns with architecture.
- `BE/cli/common/dispatcher.py`: **REVIEW** - Check `E_CAM_SDK_UNAVAILABLE` addition against `02-spec/03-error-manage`.
- `BE/cli/common/session.py`: **REVIEW** - Check `E_CAM_SDK_UNAVAILABLE` addition.
- `BE/cli/worker/subcommands/capture.py`: **KEEP** - Valid bugfix (`ctx` to `context`).
- `BE/errors/apperror.py`: **REVIEW** - `file_path` vs `path` signature change must be verified against usage.
- `BE/tests/app/test_installer_rollback.py`: **KEEP** - Path string casting fix.
- `BE/tests/cli/worker/test_e2e_inmemory.py`: **REVIEW** - Relaxed assertion for vendor error.
- `BE/tests/db/test_split_isolation.py`: **KEEP** - Legitimate `ReferenceImage` table addition.
- `BE/tests/test_samples_writes.py`: **KEEP** - Correct facade import resolution.
- `linter-scripts/check-spec-cross-links.py`: **REVERT** - Linter weakened to pass CI.
- `linter-scripts/check-spec-folder-refs.py`: **REVERT** - Linter weakened to pass CI.
- `linter-scripts/spec-cross-links.allowlist`: **REVERT** - Bloated to hide broken links.
- `linter-scripts/spec-folder-refs.allowlist`: **REVERT** - Bloated to hide broken links.
- `scripts/check-magic-strings.sh`: **KEEP** - Windows fallback `git grep` compatibility fix.
