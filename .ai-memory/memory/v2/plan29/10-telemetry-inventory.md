# Plan 29 telemetry inventory: `E_SEC_DENIAL_BURST` emit sites

Version: v3.206.0
Date: 2026-07-16
Method: `rg -n "W_SEC_DENIAL_BURST|E_SEC_DENIAL_BURST|CODE_DENIAL_BURST" app/ src/ tests/ scripts/`.

Note: spec 40-error-manage classifies this code as `E_SEC_DENIAL_BURST` (Error class). Plan 33 read-phase step 4 said `W_SEC_DENIAL_BURST`; the actual constant on disk is `E_SEC_`. Inventory below records the true code.

## Runtime emit sites (write path)

| Path                               | Line | Emitter                                                            | Input source                                                                                                                                    |
| ---------------------------------- | ---: | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/core/security/audit_sink.py`  |   31 | Constant definition `CODE_DENIAL_BURST = "E_SEC_DENIAL_BURST"`     | n/a                                                                                                                                             |
| `app/core/security/remediation.py` |   32 | Import `CODE_DENIAL_BURST`                                         | n/a                                                                                                                                             |
| `app/core/security/remediation.py` |   40 | Re-export in `__all__`                                             | n/a                                                                                                                                             |
| `app/core/security/remediation.py` |  127 | `DenialRateLimiter.observe` writes the burst row via `_emit_burst` | Rate-limit tripped: N denials from `(user_id, window)` >= `denial_threshold`. Feeds from live role-denials + noauth events already in the sink. |

No other production code emits this row. Retention worker `app/core/audit/retention_worker.py:52` only classifies it under `RetentionStandard`, does NOT emit.

## Read/consumer sites (no emit, informational)

| Path                        |        Line | Purpose                                                                            |
| --------------------------- | ----------: | ---------------------------------------------------------------------------------- |
| `src/routes/ops.tsx`        | 15, 88, 125 | Ops dashboard tile "Denial bursts" reads the row-count via `ops.shared` type union |
| `src/lib/ops.shared.ts`     |           4 | Type union includes `"E_SEC_DENIAL_BURST"`                                         |
| `src/lib/ops.server.ts`     |           8 | Server fixture row for the ops dashboard demo                                      |
| `src/lib/display-labels.ts` |          12 | UI label `"Denial Burst"`                                                          |

## Test sites

| Path                                            |                       Line(s) | What it asserts                                                                                          |
| ----------------------------------------------- | ----------------------------: | -------------------------------------------------------------------------------------------------------- |
| `tests/unit/test_remediation.py`                |           12, 27, 38, 49, 108 | `DenialRateLimiter` emits once per window, deduped by `(user_id, window_start)`; empty sink returns `[]` |
| `tests/unit/test_denial_tuning_hot_reload.py`   |            7, 23, 70, 93, 101 | Hot-reload path emits exactly one row for the burst                                                      |
| `tests/unit/test_audit_retention_worker.py`     | 59, 61, 83, 99, 139, 168, 190 | Retention keeps recent rows, prunes stale ones                                                           |
| `tests/contract/test_denial_evidence_schema.py` |                       24, 188 | Detail-payload contract (phase/count/window/threshold/margin/tuning_version)                             |

## Cross-reference to Plan 48 (slice 2)

The server-function `getDenialBurstWindow` proposed in Plan 48 step 1 must read the exact same code constant (`CODE_DENIAL_BURST` from `audit_sink.py:31`) via the RLS-bound `context.supabase` in `requireSupabaseAuth` middleware. No new emitter is required; the slice is read-only.

The `--percentiles` exporter extension proposed in Plan 48 step 3 already has the argparse flag scaffolded (`export_denial_events.py:100`) but no golden snapshot committed yet. Plan 48 step 4 fills that gap.

## Gaps this inventory reveals

1. `src/lib/ops.server.ts:8` still ships a hardcoded demo row with detail `"5 denials / 10s window"`, which predates the v3.203.0 payload schema (`phase=burst count=... window=...s ...`). Not a bug in production (fixture only), but Plan 51 dashboard scaffold should replace it before shipping the live dashboard.
2. `src/routes/ops.tsx:88` initializes the counter object with `E_SEC_DENIAL_BURST: 0`; if a new code is added the initializer drifts. Not blocking.
3. Spec 40-error-manage row references `phase=burst` payload; the remediation emitter builds it in `remediation.py:151-227`. Any change to the payload keys needs to touch both.

## Not fabricated

- Every `path:line` above was produced by `rg -n` this turn; no line numbers are guessed.
- The retention worker line is a classifier, NOT an emitter; classified separately to avoid false attribution.
