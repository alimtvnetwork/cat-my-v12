# Subtask 02: Split-DB Unified CLI Command (`processing-cli errors`)

## Status: Completed

## Implemented
1. Extended `BE/cli/processing/commands/errors.py`:
   - Added `--tier {all,task,root}` argument (default: `all`).
   - Added `--trace` flag to output executive human-readable stack traces directly in the terminal.
   - When `--tier all`, queries both `task.db` (`Error`) and `root.db` (`SystemError`), normalizes records, and sorts by `CreatedAt DESC`.
   - Updated `show` command to find errors by `CorrelationId` or `ErrorId` across both tiers.
2. Verified with automated tests in `BE/tests/test_vision_error_management_verification.py`.
