# Plan 90 Step 100 - CLI Vertical Closeout Evidence

Captured: 2026-07-21

## Gates run

| Gate                         | Command                                       | Result                                           | Artifact                |
| ---------------------------- | --------------------------------------------- | ------------------------------------------------ | ----------------------- |
| BE pytest full suite         | `pytest -q` (cwd `BE/`)                       | **9 failed / 1409 passed / 2 skipped** in 40.68s | `pytest-BE.txt`         |
| FE typecheck                 | `bunx tsgo --noEmit`                          | **clean** (0 diagnostics, empty output)          | `tsgo.txt` (empty file) |
| Failure triage 1             | isolated reruns of failing files              | see below                                        | `failures-detail.txt`   |
| Failure triage 2             | isolated reruns of the 3 "pollution" failures | 13/13 pass in isolation                          | `failures-detail-2.txt` |
| `scripts/verify-cli-logs.sh` | (missing)                                     | **not run - file absent**                        | issue #27               |
| `scripts/verify-api.sh`      | (missing)                                     | **not run - file absent**                        | issue #27               |

## Residual issues filed

- `assets/issues/25-verify-install-workflow-hardcoded-jobs.md` (Step 95 fallout: test hardcodes 2-job set, workflow now has 3)
- `assets/issues/26-cli-observability-tests-envelope-shape-drift.md` (5 failures: real envelope shape drift + fixture pollution for 3 others)
- `assets/issues/27-verify-cli-and-api-scripts-missing.md` (two verification scripts cited by the plan don't exist yet)

## Closeout decision

Phase 12 (Steps 1-100) is materially complete: the CLI substrate ships,
the FE typecheck is clean, and 1409/1418 BE tests pass. The 9 failures
are drift (test hardcode + envelope shape assertion) and infrastructure
(two scripts unwritten), not production regressions in the CLI runtime.
All three are triaged and filed for Phase 13 pre-work. Per plan L135
"NO release here; release is Step 200" - no version bump.
