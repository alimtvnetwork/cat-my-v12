# Plan 29 Steps 7-11 - Exporter + baseline stats

Date: 2026-07-14
Source plan: `.lovable/plans/pending/29-denial-burst-threshold-tuning.md`
Prior evidence: `01-read-findings.md`

## Step 7 - Telemetry export shape

JSON Lines, one row per audit event:

```
{"ts": int, "code": "E_SEC_ROLE_DENIED"|"E_SEC_NOAUTH", "user_id": str|null, "subject": str, "detail": str}
```

Window: rolling 90 days (2160 hours). Source: `AuditSink.query(code=..., limit=10_000_000)` filtered by `ts >= now - window`.

## Step 8 - Exporter shipped

- Path: `scripts/security/export_denial_events.py`.
- Log lines: `export.start`, `export.code`, `export.done`, `export.exit`; failure logs `export.failed` and re-raises (satisfies `missing-log-is-a-bug`).
- Read-only: uses `AuditSink.query` only; never calls `.record`.
- Usage: `python3 scripts/security/export_denial_events.py --db audit.sqlite --out /tmp/denial.jsonl --window-hours 2160`.

## Step 9 - Fixture

- Path: `tests/fixtures/security/denial_sample.jsonl` (12 rows, 4 users, spans four minutes across an hour).
- Anonymised: user ids `op-01..op-04`; no PII in `detail`.
- Rows cover both `E_SEC_ROLE_DENIED` (10) and `E_SEC_NOAUTH` (2).

## Step 10 - Baseline distribution (fixture)

Bucketing rule per `denial_defaults.py:derive_denial_defaults` = `(user_id, minute)`; anonymous rows keyed as `("anon", minute)`.

- Bucket counts (ascending): `[1, 1, 1, 1, 2, 2, 4]`.
- `p50 = 1`, `p95 = 4`, `p99 = 4`.
- Distinct users: 4 + anonymous.

The sample is intentionally small (fixture, not field data). Real field export at Step B of the next turn will produce the honest 90-day numbers. This entry documents the pipeline works end-to-end and the arithmetic matches `denial_defaults._percentile` (nearest-rank, NIST SP 800-24).

## Step 11 - Candidate rules vs current

Current shipped rule: `p95 + margin(2) = 6` (matches `denial_defaults.py:_percentile` + `margin=2` default).

Candidate rules to score in Step B (full field data required):

| Rule    | Formula    | Fixture value           | Notes                                                          |
| ------- | ---------- | ----------------------- | -------------------------------------------------------------- |
| Current | `p95 + 2`  | 6                       | Shipped v2.28.0.                                               |
| Tight   | `p95 + 1`  | 5                       | Reduces false negatives; risks legit-operator false positive.  |
| Loose   | `p99`      | 4                       | Same as current fixture p95 here; different on real data.      |
| Wide    | `p99 + 3σ` | n/a (σ needs real data) | Robust against tail; may under-detect steady low-rate attacks. |

## SH-Q-07 status

Sample size question in `spec/21-app/shell/24-open-questions.md` still OPEN. The fixture is not the answer; the answer comes from the real 90-day export in the next turn. Documented so Step B does not accidentally close it early.

## Read/data phase status

- Steps 7-11 complete against the fixture (pipeline proven).
- Step 12-15 (candidate freeze + peer review with real field data + top-20 audited denials cross-check) is the next-turn scope.
- No app or spec files changed in this bump.
