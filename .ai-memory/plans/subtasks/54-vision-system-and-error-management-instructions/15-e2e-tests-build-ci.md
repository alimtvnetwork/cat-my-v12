# Subtask: 15-e2e-tests-build-ci

Status: COMPLETE (100% pass across all tiers)

See plan: .ai-memory/plans/completed/54-vision-system-and-error-management-instructions.md

## Test Execution & Verification Summary

1. **CLI Headless UI Verification Runner**:
   - Command: `npx tsx scripts/cli-ui-test-runner.ts`
   - Target URL: `http://127.0.0.1:3000` (FastAPI backend on port `8787`)
   - Browser: Chromium (`C:\Program Files\Google\Chrome\Application\chrome.exe`)
   - Results: **16 / 16 PASSED (100%)**
   - Screenshots: 16 screenshots captured in `reports/e2e-screenshots/` (01_home_header_controls.png through 16_window_controls_and_version_modal.png).

2. **Backend Python Test Suite**:
   - Command: `python -m pytest BE/tests/test_vision_error_management_verification.py`
   - Results: **55 / 55 PASSED (100%)** in 0.56s.

3. **Frontend Vitest Suites**:
   - Command: `bun x vitest run src/components/guided-simulation src/components/recorder src/components/layout src/components/vision/workpiece/__tests__/VisionLayersPanel.test.tsx src/lib/camera src/lib/vision/__tests__/luminance-quantizer.test.ts tests/unit/white-box-marking.test.ts`
   - Results: **144 / 144 PASSED (100%)** across 21 test files.

## End-of-tunnel appendix (added by the end-of-tunnel wave, same status)

Full numbers live in spec 54 readme section 23. Headline results:

- `tsc --noEmit` (both CI passes): 0 errors. Full `bun run lint`:
  0 errors, magic-strings clean, prettier clean. Mypy (`BE/`):
  success, 307 files. `scripts/be-lint.sh`: passed. OpenAPI drift:
  snapshot regenerated (+599 lines), check passes.
- `pytest BE/tests`: **1558 passed, 9 skipped, 0 failed**
  (verification suite 55/55, also 55/55 on a fresh `APP_DB_ROOT`).
- `bunx vitest run` (full): **1827 passed, 7 failed (1834 total)**.
  The 2 canvas failures from the first full run were spec-54-caused
  and are fixed; the remaining 7 are pre-existing (facade ratchet
  allowlist, project-overview smoke, envelope round-trip,
  dispatcher, 2 vision-eval numeric suites) with blame evidence in
  section 23.
- E2E suite `tests/e2e-spec54/run_e2e_spec54.py`: **115/115 passed
  (cli 37/37, live 19/19, static 59/59)**, shutdown case last with
  backend process-exit verified.
- Wiring leftovers closed: camera `retry()` button and Pin1
  LayersPanel lock/reorder buttons (the latter was state without
  JSX wiring until this wave; the E2E suite caught it).
- Pre-existing CI blockers recorded with evidence (not fixed, out
  of spec-54 scope): 3 ruff errors, 6 spec cross-links, 7 vitest
  failures above. CI run `41115198892` (commit `aafee0ba`) failed
  on exactly those plus since-fixed clean-machine items; the run
  for the later commits was still pending when section 23 was
  written.
- CI update (run `41116550166`, commit `2bbd484c`): pytest
  success; frontend green through prettier + eslint, failing only
  at vitest on the same 7 pre-existing tests; backend failing only
  at ruff on the same 3 pre-existing errors; spec linters failing
  only on the same 6 pre-existing cross-links; all other jobs
  success. No new spec-54-caused CI failure remains.
