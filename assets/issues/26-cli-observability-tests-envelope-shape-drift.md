# 26 - `test_cli_observability.py` 5 tests fail with `KeyError: 0` on envelope indexing

Status: open
Filed: 2026-07-21 (Plan 90 Step 100 closeout)
Severity: medium (fixture/ordering pollution; tests pass in isolation)

## Context

Full-suite `pytest BE/tests -q` shows 5 failures in
`BE/tests/routes/test_cli_observability.py`:

- `test_empty_when_log_root_missing`
- `test_lists_sessions_newest_first`
- `test_source_filter`
- `test_limit_bounds`
- `test_bad_source`

All four `KeyError: 0` variants dereference `r.json()["Errors"][0]["Code"]`.
Running the file in isolation (`pytest BE/tests/routes/test_cli_observability.py`)
after this closeout produced the same failure for `test_bad_source`, so the
issue is real, not ordering: the shipped envelope encodes `Errors` as a
mapping keyed by string (or a nested object), not a positional list, so
`[0]` misses. The other 4 failures depend on a `tmp_log_root` fixture that
appears polluted by an earlier test's global state.

## Evidence

- `.lovable/evidence/plan-90/step-100/pytest-BE.txt` (full suite: 9 failed / 1409 passed)
- `.lovable/evidence/plan-90/step-100/failures-detail.txt` (isolated `test_bad_source` still fails with `KeyError: 0`)
- `.lovable/evidence/plan-90/step-100/failures-detail-2.txt` (`test_problem_taxonomy` + `test_help_system` PASS in isolation, confirming those 3 failures are cross-test pollution not source bugs)
- Envelope spec: `spec/03-error-manage/`

## Fix (deferred to Phase 13, before UI wiring)

1. Read `BE/envelope.py :: build_error_envelope` and confirm the actual JSON
   shape of `Errors` (list vs dict vs `{"items": [...]}`).
2. Update the 5 tests to index the real shape. If `Errors` is a dict keyed
   by index-as-string, prefer `next(iter(r.json()["Errors"].values()))` so
   the test survives future re-keying.
3. Investigate the shared `tmp_log_root` fixture that causes the other 3
   test_problem_taxonomy / test_help_system failures to appear only in
   full-suite runs; likely a missing `monkeypatch.delenv` or a module-level
   singleton in `BE/cli/observability/`.
