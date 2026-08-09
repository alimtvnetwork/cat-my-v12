# 27 - Plan 90 verification scripts `scripts/verify-cli-logs.sh` + `scripts/verify-api.sh` do not exist

Status: open
Filed: 2026-07-21 (Plan 90 Step 100 closeout)
Severity: medium (Verification section of plan 90 cites them as gates)

## Context

`.lovable/plans/pending/90-worker-and-processing-cli.md` §Verification (L249,
L254) and §Steps 100 (L135) both invoke `scripts/verify-cli-logs.sh` and
`scripts/verify-api.sh`. Neither file exists on disk. `ls scripts/` shows
only the PowerShell wrapper tree under `scripts/ps/`. Step 100 could not
execute those two gates as written.

## Evidence

```
$ ls scripts/verify-cli-logs.sh scripts/verify-api.sh
ls: cannot access 'scripts/verify-cli-logs.sh': No such file or directory
ls: cannot access 'scripts/verify-api.sh': No such file or directory
```

- `.lovable/plans/pending/90-worker-and-processing-cli.md` L249, L254, L260

## Fix (Phase 13 pre-work)

Create both scripts as bash gates that:

- `verify-cli-logs.sh`: walk `<APP_LOG_ROOT>/{worker,processing,ps-wrapper}/`,
  assert every JSONL line parses AND contains `ts`, `level`, `logger`,
  `CorrelationId`, `code` (per spec/03-error-manage envelope logging).
- `verify-api.sh`: `curl -fsS http://127.0.0.1:8787/api/cli/sessions` and
  assert the response validates against the Universal Envelope schema.

Wire both into `_guards.yml` so drift is caught in CI, not on next Step 100
rerun.
