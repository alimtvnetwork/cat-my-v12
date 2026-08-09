# Plan 05 — v1 Implementation Kickoff

**Status:** completed
**Opened:** 2026-07-12 (pinned to v0.70.0)
**Predecessors:** Plan 04 (spec, done). Consistency report `spec/22-app-issues/consistency-0.69.0.md` green.
**Parks:** Plan 02 (Control Automation UI redesign) — remains parked until this plan reaches M4.

## 1. Goal

Move from spec to running v1. Every milestone binds directly to a locked spec section and one or more acceptance gates in `spec/21-app/97-acceptance-criteria.md` (A-01…A-23). No milestone invents a contract — it implements one.

## 2. Guardrails

- The 10 resolved `BLOCKS_V1` decisions (Q-01…Q-10) are immutable inputs. Reopening any of them requires a new spec section under 46, not a code shortcut.
- Every code change that touches a locked contract MUST cite the spec section it implements in the commit body.
- Every milestone ends with a re-run of the 99 consistency report and a version bump per 98.
- No milestone starts before its predecessor's acceptance gates flip from PENDING to PRESENT.

## 3. Milestones

### M0 — Kickoff housekeeping (½ day)

- Refresh `.lovable/memory/08-vision-inspection-app.md` to include Q-07 (single operator), Q-08 (content-addressed refs), Q-09 (dual-clock), Q-10 (health token) rules.
- Snapshot the `.lovable/prompts/` directory state and archive Plan 04 links out of pending views.
- **Acceptance signal:** consistency report 3.3 flips from PENDING to PASS.

### M1 — Root DB + migrations skeleton (2–3 days)

- Implement `backend/db/root.db` schema per `spec/21-app/21-root-db.md` and migration runner per `26-migrations.md`.
- Boot-time checks from `20-folder-structure.md §5` land in the supervisor entry.
- **Gates targeted:** A-01, A-02, A-03.
- **Failure modes wired:** `E_DB_MIGRATION_*`, `E_ROOT_DB_MISSING`.
- **Status (v0.72.0):** Complete. Artifacts: `app/core/io/migrations/root/000_init.sql`, `app/core/io/migrate.py`, `app/supervisor/boot.py`, `app/core/io/migrations/readme.md`. Gates A-01/A-02/A-03 code-present; fixture-based verification lands with M2.

### M2 — Capture stub with dual trigger source (2 days)

- Implement `TriggerSource` abstraction from `14-capture-pipeline.md` covering both `SOFTWARE_TIMER` and `GPIO_EDGE` (Q-01 lock).
- Atomic `.part → final` rename; `pending/` intake per 14/20.
- **Gates:** A-04, A-05.
- **Status (v0.73.0):** Complete. Artifacts: `app/capture/trigger/{base,software_timer,gpio_edge}.py`, `app/capture/pending_writer.py`.

### M3 — Dispatcher + worker skeleton (3–4 days)

- Dispatcher loop, worker pool sized to `min(cpu-2, 6)` from `27-config-surface.md` (Q-02).
- Instruction Bundle handoff per `36-json-instruction-output.md`.
- Snapshot resolve per `23-rules-db-overrides.md §Snapshot`.
- **Gates:** A-06, A-07, A-08, A-09.
- **Status (v0.73.0):** Complete. Artifacts: `app/dispatcher/{pool,snapshot,instruction_bundle,loop}.py`, `app/worker/runner.py`.

### M4 — UI shell wiring (3 days)

- Route tree per `30-ui-overview.md`; RunMonitor `37`, Results `38`, Settings `39`.
- Operator identity input from `39 §10` + `27.Operator.Id`.
- **Gates:** A-10, A-11, A-12.
- **Unpark:** Plan 02 (Control Automation redesign) is released from parked state after M4 lands; redesign work resumes against real wired screens.
- **Status (v0.74.0):** Complete. Artifacts: `src/routes/results.tsx`, `src/routes/settings.index.tsx` (Operator ID persisted via `ca-hmi:settings.operatorId`).

### M5 — Health endpoints with tiered auth (1 day)

- `/api/public/health/live` unauthenticated Ok-only body (42 §7 + Q-10).
- `/api/public/health/ready` bearer-token gated by `27.Obs.HealthToken`; timing-safe compare; 300s rotation grace; `I_HEALTH_TOKEN_ROTATED` / `I_HEALTH_TOKEN_GRACE_EXPIRED` markers.
- **Gates:** A-13.
- **Security anchor:** 44 §7.
- **Status (v0.74.0):** Complete. Artifacts: `src/routes/api/public/health.live.ts`, `src/routes/api/public/health.ready.ts`.

### M6 — Results JSONL + size-based rotation (2 days)

- Append-only writer per `24-results-json.md`; reference linkage by `SourceHash` from `refs/` (Q-08).
- 256 MiB size rotation with `<RunSessionId>.jsonl.<NNN>` parts (Q-04).
- **Gates:** A-14, A-15, A-16.
- **Status (v0.75.0):** Complete. Artifacts: `app/dispatcher/results_writer.py`, `app/core/telemetry/{clock,log_record,metrics}.py`. Append/fsync, atomic summary write, complete-line reader, reference-path rejection, and `results.rotate` marker are code-present.

### M7 — Logging + observability wiring (2 days)

- Log record shape from `41 §1`; dual-clock rule from `41 §11` (Q-09); operator-identity stamping rules from `41 §10`.
- Metrics from `42 §2` fed from monotonic durations.
- **Gates:** A-17, A-18, A-19.
- **Status (v0.75.0):** Complete. Artifacts: `app/core/telemetry/{clock,log_record,metrics}.py`. Structured PascalCase JSON logs, redaction, operator guardrails, `W_LOG_CLOCK_STEP`, metric registry, and cardinality reports are code-present.

### M8 — Error surfacing + acceptance sweep (2 days)

- BugError modal per `40 §6`; every typed `E_*` reaches a surfaced path.
- Full sweep against A-01…A-23; A-22 evidence = fresh consistency report; A-23 = release-ready checklist.
- **Gates:** A-14, A-20, A-22, A-23.
- **Status (v0.76.0):** Complete. Artifacts: `app/core/errors/{__init__,codes,types}.py`, `src/components/BugErrorModal.tsx`, `src/routes/__root.tsx` (modal mount), `spec/22-app-issues/consistency-0.76.0.md` (7/7 PASS).

## 4. Explicit Non-Goals

- OCR (Q-05, disabled in v1).
- In-process AI advisory (Q-06 requires isolated subprocess; AI lane is not part of v1 scope M1–M8).
- Multi-camera sync (Q-11 — v1.1).
- Remote result mirror (Q-12 — v1.1).
- Cloud sync, multi-tenant, model training UI, Windows-native installer (46 §4).

## 5. Exit Criteria

Plan 05 closes when:

1. All milestones M0–M8 marked Complete.
2. `spec/22-app-issues/consistency-<version>.md` reports 7/7 PASS (no PENDING).
3. All 23 acceptance gates in 97 flip to PRESENT with cited evidence.
4. Plan is moved from `.lovable/plans/pending/` to `.lovable/plans/done/`, and Plan 02 is either merged into scope or explicitly re-parked with a reason.

## 6. Tracking

Progress lives in this file. Each milestone flip appends a dated line under a `## 7. Progress Log` block (created on first update). Version bump policy per 98: minor bump per milestone completion, patch bumps allowed inside a milestone.
