# Plan 29 read-phase status (v3.235.0)

Purpose: single map of what is landed vs open for the denial-burst tuning workstream, so the next execution slice does not re-read the tree.

## Landed

- `00-baseline-gap.md`, `10-telemetry-inventory.md`, `15-read-phase-summary.md`: read phase (steps 1-6) complete.
- `20-windows.json`, `30-derivation-inputs.md`: data phase (steps 7-15) complete; p95/p99 on 12-row fixture = 4; shipped default 5 kept.
- Server-fn `getDenialBurstWindow` at `src/lib/security-telemetry.functions.ts` (admin-gated).
- Deterministic percentile snapshot script: `scripts/security/plan29_windows.py --check`.
- CLI: `scripts/security/denial_evidence_cli.py`, `scripts/security/export_denial_events.py`.
- Fixture: `tests/fixtures/security/denial_sample.jsonl`.

## Open

- Steps 16-22 spec phase: threshold-tuning.md spec under `spec/22-security/` (folder does not exist; likely repathed to `spec/21-app/69*` per plan 29 REPATHED note).
- Steps 23-30 config + migration phase: no code path change yet; shipped default remains 5.
- Steps 31-40 tests + observability: pending fresh evidence larger than 12 rows.
- Sub-plans queued: `.lovable/plans/pending/49-plan29-threshold-derivation.md`, `50-plan29-rollout-and-observability.md`.

## Blockers

- Field data insufficient (12-row fixture); park decision recorded at `.lovable/plans/subtasks/29-denial-burst-threshold-tuning/05-park-decision.md`. Unblocks on larger telemetry export.

## Next action

Pick up plan 49 (threshold derivation) once telemetry export produces >=200 events, otherwise keep parked.
