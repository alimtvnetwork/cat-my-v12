# 42 — Observability

**Status:** Locked (Plan 04 Step 39). Defines the metrics, traces, health checks, and alerting derived from the logs (41) and the results stream (24). Observability never introduces new event sources — it only aggregates and shapes.

Anchors: 11 (runtime processes), 14/15 (pipelines), 24 (results JSONL), 27 (config), 37 (run monitor), 40 (error management), 41 (logging).

## 1. Signal Sources

Three, and only three:

1. **Structured logs** (41 §1) — the substrate for counters and error rates.
2. **Results JSONL** (24) — the substrate for verdict rates and per-rule KPIs.
3. **Process supervisor** — liveness (`up`), CPU, RSS. Emitted per proc at `27.Obs.HeartbeatMs`.

Any metric that cannot be derived from these three is `E_OBS_UNGROUNDED_METRIC` — invent a log line first, then the metric.

## 2. Metric Names

Namespace `ca.<area>.<name>`, snake_case (this is the one place snake_case wins over PascalCase — Prometheus/OTel convention). Units in the name suffix (`_ms`, `_bytes`, `_total`).

| Metric                               | Type      | Labels                                                    |
| ------------------------------------ | --------- | --------------------------------------------------------- |
| `ca.pipeline.frames_captured_total`  | counter   | `task_id`                                                 |
| `ca.pipeline.frames_processed_total` | counter   | `task_id`, `verdict`                                      |
| `ca.pipeline.processing_ms`          | histogram | `task_id`, `rule_kind` (33)                               |
| `ca.queue.depth`                     | gauge     | `stage` (`capture`/`process`)                             |
| `ca.worker.up`                       | gauge     | `worker_id`                                               |
| `ca.worker.rss_bytes`                | gauge     | `worker_id`                                               |
| `ca.errors_total`                    | counter   | `code` (40), `proc` (41), `tier` (`domain`/`infra`/`bug`) |
| `ca.retries_total`                   | counter   | `code`, `attempt`                                         |
| `ca.log.dropped_total`               | counter   | `level`, `reason`                                         |
| `ca.results.export_bytes_total`      | counter   | `format` (`csv`/`bundle`)                                 |

Adding a metric requires an entry here and a test in 45. Missing either is `E_OBS_METRIC_ORPHAN`.

## 3. Histogram Buckets

Fixed globally:

- Latency (`*_ms`): `[1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]`.
- Sizes (`*_bytes`): `[1KB, 4KB, 16KB, 64KB, 256KB, 1MB, 4MB, 16MB, 64MB]`.

Per-metric bucket overrides are banned — comparability across metrics matters more than a tighter fit. Overrides are `E_OBS_BAD_BUCKETS`.

## 4. Traces (v1 minimal)

- One span per server-function invocation, one per Instruction Bundle evaluation, one per worker rule.
- Trace id = `CorrelationId` (41 §4). Span id = ULID.
- No baggage carries PII; only ids (`InstructionId`, `RunSessionId`, `TaskId`) and enum labels.
- Exporter is OTLP over stdout in v1 (`27.Obs.TraceSink = "stdout"`), captured by the supervisor same as logs. Networked exporters land in v2.

## 5. Health Checks

Two endpoints on the dispatcher, both `GET`, both under `/api/public/*` (bypass auth per platform rules):

| Path                       | Meaning                                                                              | Failure =             |
| -------------------------- | ------------------------------------------------------------------------------------ | --------------------- |
| `/api/public/health/live`  | Process is up and event loop responsive                                              | supervisor restarts   |
| `/api/public/health/ready` | Dispatcher + all worker slots healthy AND last capture < `27.Obs.CaptureStaleMs` ago | load balancer removes |

Rules:

- `live` MUST NOT touch disk or DB — it is a heartbeat, not a diagnostic. Adding a DB call is `E_OBS_LIVE_TOO_HEAVY`.
- `ready` returns the failing sub-check name in the body (`{"Ok": false, "Failing": "worker_slot_2"}`) — silent 503 is `E_OBS_READY_OPAQUE`.
- Health responses are never cached; `Cache-Control: no-store`.

## 6. Alerts (declared, not implemented in v1)

Declared here so 45 (testing) and future ops wiring have a target. Each is a rule over the metrics above:

| Alert                | Condition                                                                  | Severity |
| -------------------- | -------------------------------------------------------------------------- | -------- |
| `WorkerDown`         | `ca.worker.up == 0` for 30s                                                | page     |
| `ErrorRateSpike`     | `rate(ca.errors_total{tier="bug"}[5m]) > 0`                                | page     |
| `InfraRetryStorm`    | `rate(ca.retries_total[5m]) > 27.Obs.RetryStormRate`                       | ticket   |
| `ProcessingSlow`     | p95 `ca.pipeline.processing_ms > 27.Obs.P95BudgetMs` for 10m               | ticket   |
| `CaptureStalled`     | `time() - last(ca.pipeline.frames_captured_total) > 27.Obs.CaptureStaleMs` | page     |
| `ResultsTailStalled` | mirrors `E_UI_TAIL_STALLED` (37 §8)                                        | page     |

Adding an alert without a corresponding metric row in §2 is `E_OBS_ALERT_ORPHAN`.

## 7. Dashboards (declared)

Named dashboards, one JSON per name, checked into `spec/21-app/observability/`:

- `overview` — throughput, verdicts, worker fleet.
- `errors` — error rate by code / tier / proc.
- `capacity` — queue depth, RSS, retries.
- `results` — verdict rate by task, per-rule fail hotspots.

Every panel MUST cite the metric(s) it renders (§2). Panels with ad-hoc queries not backed by a declared metric are `E_OBS_PANEL_UNGROUNDED`.

## 8. Cardinality Guards

- No metric label may be a ULID or free-form string. Allowed label values: enum members, `task_id` (bounded, human-registered), `worker_id` (bounded by `27.Runtime.WorkerCount`).
- Adding a high-cardinality label is `E_OBS_LABEL_EXPLOSION`. If a signal genuinely needs ULID granularity, it belongs in logs/traces, not metrics.

## 9. Failure Taxonomy (observability-local)

| Code                      | When                                              |
| ------------------------- | ------------------------------------------------- |
| `E_OBS_UNGROUNDED_METRIC` | Metric with no log/result/heartbeat source.       |
| `E_OBS_METRIC_ORPHAN`     | Metric in code but not in §2 (or vice versa).     |
| `E_OBS_BAD_BUCKETS`       | Non-standard histogram buckets.                   |
| `E_OBS_LIVE_TOO_HEAVY`    | `/health/live` performs I/O beyond process check. |
| `E_OBS_READY_OPAQUE`      | `/health/ready` failure without `Failing` field.  |
| `E_OBS_ALERT_ORPHAN`      | Alert without a backing metric.                   |
| `E_OBS_PANEL_UNGROUNDED`  | Dashboard panel not backed by a declared metric.  |
| `E_OBS_LABEL_EXPLOSION`   | Unbounded-cardinality metric label.               |

## 10. Cross-References

- Log record shape (source of counters): 41.
- Error codes / tiers (labels of `ca.errors_total`): 40.
- Verdict / rule-kind labels: 33.
- Run-monitor tail-stall parity: 37 §8.
- Config keys (`27.Obs.*`): 27.

## 11. Health Endpoint Auth (LOCKED, resolves Q-10)

The two endpoints declared in §5 have **different auth postures** because they carry different information.

| Path                       | Auth                                               | Body                                                                                    |
| -------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `/api/public/health/live`  | **unauthenticated**                                | `{"Ok": true}` only — no proc names, no counts, no ids                                  |
| `/api/public/health/ready` | **bearer token** (`Authorization: Bearer <token>`) | full `{"Ok": bool, "Failing": "<sub-check>", "Workers": N, "LastCaptureMsAgo": N, ...}` |

Rules:

- `live` is the LAN heartbeat for supervisors and load balancers. Its body is a fixed 2-field JSON and MUST NOT include worker counts, TaskIds, RunSessionIds, or queue depths. Adding any is `E_HEALTH_LIVE_LEAK`.
- `ready` requires a bearer token whose value comes from `27.Obs.HealthToken` (see 44 §7). Missing/invalid token returns HTTP `401` with body `{"Ok": false, "Error": "unauthorized"}` and increments `ca.errors_total{code="E_HEALTH_UNAUTHORIZED"}`. Timing-safe comparison is mandatory; short-circuit `==` is `E_SEC_TIMING_UNSAFE_COMPARE`.
- Neither endpoint accepts query params in v1; unknown params are `E_HEALTH_UNKNOWN_PARAM`.
- Both endpoints keep `Cache-Control: no-store` (§5) and MUST NOT set CORS headers — they are LAN-only.
- Verifying the token inside the route handler is REQUIRED per the platform's public-API-endpoints rule; relying on the `/api/public/*` prefix for protection is `E_HEALTH_UNAUTHORIZED`.

Failure modes added by this section:

| Code                     | Meaning                                                      |
| ------------------------ | ------------------------------------------------------------ |
| `E_HEALTH_LIVE_LEAK`     | `/health/live` body contained anything beyond `Ok`.          |
| `E_HEALTH_UNAUTHORIZED`  | `/health/ready` called without a valid bearer token.         |
| `E_HEALTH_UNKNOWN_PARAM` | Health endpoint called with an unrecognized query parameter. |

## Acceptance Checklist

- [ ] Metrics namespace `ca_*` and counter/gauge/histogram kinds locked.
- [ ] Every SLO in this file has a probe cited from `spec/21-app/45-testing-strategy.md`.
- [ ] No duplicate metric name across the spec set (`E_METRIC_NAME_COLLISION`).

## Cross-reference: TS constants sync

Frontend string registries (`HttpMethod`, `StorageKey`, `AppEvent`) live under `src/lib/constants/`. See `spec/21-app/40-error-manage.md` Appendix Z for the reality-aligned inventory and the rationale for not mirroring `ErrorCode`/`IpcChannel`/vendor/pixel-format on the TS side.
