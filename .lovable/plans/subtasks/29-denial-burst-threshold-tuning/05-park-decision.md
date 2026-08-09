# Plan 29 park decision

Status: PARKED (numeric-threshold decision), open (formulas frozen, observability shipped)
Created: 2026-07-16 (v3.201.0)

## Root cause of parking (one sentence)

The synthetic 174,760-row corpus in `04-candidate-evaluation.md` cannot legitimately displace the shipped runtime default (`denial_threshold=5, denial_window_seconds=60`) because it was generated from an assumed attacker/legit ratio (seed=29), not observed field traffic; any numeric flip made from it would be circular.

## What stays as-is until the gate lifts

- Runtime defaults in `app/core/security/denial_defaults.py`: unchanged.
- Candidate formulas in `app/core/security/denial_metrics.default_candidates`: frozen (p95, p95+2σ, p99, p99+3σ).
- Observability shipped in v3.199.0: `W_SEC_BURST_APPROACHING` (`remediation.py::_maybe_emit_approaching`) and `I_SEC_BURST_THRESHOLDS_LOADED` (`boot.py::_record_thresholds_loaded`). These stay live so real deployments accumulate the audit rows we need.
- Spec `spec/21-app/69a-v2-denial-tuning-evidence.md`: stays draft-provisional, methodology preserved.
- SH-Q-07 in `spec/21-app/shell/24-open-questions.md`: stays OPEN with its existing close-condition.

## Explicit close-condition (single, non-negotiable)

A real 90-day export from at least one production deployment lands at `.lovable/plans/subtasks/29-denial-burst-threshold-tuning/evidence/90d.jsonl` (gitignored). `evaluate_all` is rerun against it. The candidate with FN <= 5 per 90 days and lowest FP wins. Only then does the runtime default in `denial_defaults.py` flip, and only then does Plan 29 move to `done/`.

## Why this parks rather than closes

The plan is 90 percent shipped (formulas, tests, observability, spec, decision rule, quarterly cadence). Closing it now would erase the field-data waiting slot; leaving it "pending" indefinitely made it appear on every next-10 queue. Parking is the honest middle: not on the active queue, still tracked as blocked on a named artifact.

## Ownership

Reopen and move to `done/` in the same turn the 90d export lands. No other trigger. Do not re-plan this without new data.
