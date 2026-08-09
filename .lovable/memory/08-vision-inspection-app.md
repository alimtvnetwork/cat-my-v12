---
name: Vision Inspection app spec
description: v1 spec for 2D machine-vision inspection app — 5-process runtime, split DB, locked UI screens, cross-cutting contracts, and 23 acceptance gates
type: feature
---

Plan 04 output. UI-only v1 clone; no hardware bridge, no backend code yet.

## Runtime

- 5 processes: Supervisor, Capture, Dispatcher, Worker Pool, UI shell (`spec/21-app/11`).
- Workers are stateless; no cross-worker mutable sharing (`13`, `16`).
- Capture pipeline target: 77 fps sustained (`14`, gate A-03).
- Instruction Bundle + `SourceHash` is the only worker input (`36`).

## Persistence

- Split DB: Root / Task / Rules (`21`–`23`).
- Results are append-only JSONL per Task (`24`).
- Migrations forward-only and idempotent (`26`).
- Config resolution: runtime > task > app > seed (`27`).

## UI screens

- Setup / Rule Setup / Run Monitor / Results / Settings (`30`–`39`).
- Run Monitor renders from stored `Result` only — never re-evaluates (`37`, gate A-11).
- Results queries hit indexed columns only; exports stream (`38`).
- Zoom 5–800 %, canvas never reflows siblings (`35`).

## Cross-cutting contracts

- 3-tier typed errors; retry only on `InfraError` (`40`).
- Structured JSON logs with correlation + redaction (`41`).
- Metric registry `ca.<area>.<name>`; fixed histogram buckets; cardinality guards (`42`).
- AI is advisory-only, isolated, no network egress (`43`, gate A-17).
- OCR_TEXT is schema-declared but disabled in v1; no OCR engine ships until v1.1 (`33`, Q-05).
- AI transport is an isolated local subprocess over local IPC; dispatcher redacts before handoff (`43`, `44`, Q-06).
- Local-first security; consent-gated exports; `E_SEC_*` taxonomy (`44`).
- Verification pyramid; CI gate order; `E_TEST_LOG_UNPROVEN` (`45`).
- Single-operator workstation; no login/PIN; `27.Operator.Id` stamps every audit row and non-worker log line; multi-user auth is out of scope, not deferred loosely (`39 §10`, `41 §10`, Q-07).
- Reference images stored as content-addressed sidecar files `refs/<SourceHash>.<ext>` per Task; rule rows and result rows reference by hash only; inline blobs and stored paths rejected (`20 §7`, `24 §9`, Q-08).
- Dual-clock time source: wall clock for event `Ts`, monotonic clock for durations; wall-clock steps > `27.Log.MaxClockStepMs` (default 2000) emit `W_LOG_CLOCK_STEP`; negative durations are `E_LOG_CLOCK_REGRESSION` (`41 §11`, Q-09).
- Health endpoints tiered: `/api/public/health/live` unauthenticated Ok-only body, `/api/public/health/ready` bearer-token gated by `27.Obs.HealthToken` with timing-safe compare and 300s rotation grace (`42 §7`, `44 §7`, Q-10).

## Governance

- Open questions live in `46` with `Q-<NN>` IDs; `BLOCKS_V1` must resolve before A-21.
- 23 acceptance gates `A-01`…`A-23` (`97`).
- Release-bundle contract (`98`): CHANGELOG + RELEASE_NOTES + README pin + prompt alias bumped atomically.
- Consistency report (`99`) is the evidence artifact for A-22.

## How to apply

- When editing any locked contract, also update the corresponding anchor section and bump per `98`.
- Never re-evaluate rules in the UI renderer.
- Never log raw image bytes, secrets, or full DB rows.
- Never route AI opinion into the verdict path.
