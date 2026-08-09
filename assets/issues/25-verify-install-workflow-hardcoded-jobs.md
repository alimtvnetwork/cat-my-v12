# 25 - `test_workflow_exists_and_parses` hardcodes `{posix, windows}` job set

Status: open
Filed: 2026-07-21 (Plan 90 Step 100 closeout)
Severity: low (test drift, not production regression)

## Context

`BE/tests/app/test_verify_install_workflow.py::test_workflow_exists_and_parses`
asserts `set(doc["jobs"]) == {"posix", "windows"}` against
`.github/workflows/verify-install.yml`. Plan 90 Step 95 (2026-07-21) extended
the workflow with a third job `post-publish-smoke` under a
`workflow_call`-only gate, so the assertion is now stale.

## Evidence

- `.lovable/evidence/plan-90/step-100/failures-detail.txt` (traceback)
- `.github/workflows/verify-install.yml` (jobs: `posix`, `windows`, `post-publish-smoke`)
- `.lovable/plans/pending/90-worker-and-processing-cli.md` L130 (Step 95 rationale)

```
AssertionError: assert {'posix', 'post-publish-smoke', 'windows'} == {'posix', 'windows'}
  Extra items in the left set: 'post-publish-smoke'
```

## Fix (deferred to Phase 13)

Change the assertion to `{"posix", "windows"} <= set(doc["jobs"])` and add a
positive assertion that `post-publish-smoke` exists AND has
`if: github.event_name == 'workflow_call'` on the job. Do not soften to
`>=` alone: the gated smoke job is a contract requirement of Step 95.
