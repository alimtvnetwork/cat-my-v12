---
title: v2.0.3 Denial-Burst Tuning Evidence
spec_id: 69a
status: draft-provisional
owner: Plan 29 Steps 16-19
amends: spec/21-app/69-v2-denial-tuning-contract.md §4
---

# 69a - Denial-Burst Tuning Evidence (Provisional)

Numeric evidence for the `derive_denial_defaults` rule in spec 69 §4. Companion to the locked contract at `spec/21-app/69-v2-denial-tuning-contract.md`.

## Status

Provisional. Formulas frozen; runtime default held at `denial_threshold=5, denial_window_seconds=60` (per `app/core/config/settings_store.py:47-49`). No numeric change ships from this document.

## Methodology

Locked in code, not prose:

- `app/core/security/denial_metrics.py:229-237` (`default_candidates`) emits the four candidate rules: `p95`, `p95+2σ`, `p99`, `p99+3σ`.
- `app/core/security/denial_metrics.py:180-227` (`_bucket_labels`, `evaluate_candidate`) accounts FP/FN per bucket with majority-label vote; tie breaks to `"attack"` so FN stays visible.
- `app/core/security/denial_defaults.py:54-111` (`derive_denial_defaults`) is the runtime derivation used at boot: 24h window, per-actor per-minute bucket, `p95 + margin(2)`, no-telemetry fallback to `SECURITY_DEFAULTS`.
- Percentile method: nearest-rank (NIST SP 800-24), implemented at `denial_metrics.py:77-87` and `denial_defaults.py:40-51`.

## Evidence (synthetic, pending field replacement)

See `.lovable/plans/subtasks/29-denial-burst-threshold-tuning/04-candidate-evaluation.md` for the reproducible synthetic run (seed=29, 174,760 rows, 90-day span).

| Rule   | Threshold |   Trips |      FP |  FN | Verdict                         |
| ------ | --------: | ------: | ------: | --: | ------------------------------- |
| p95    |         1 | 167,859 | 165,014 |   0 | reject                          |
| p95+2σ |         3 |     196 |      31 |   5 | held for field test             |
| p99    |         2 |   2,825 |   2,641 |   2 | reject                          |
| p99+3σ |         5 |     158 |       0 |  12 | matches current shipped default |

Field replacement: an anonymised 90-day export at `.lovable/plans/subtasks/29-denial-burst-threshold-tuning/evidence/*.jsonl` (gitignored) plus a rerun of `evaluate_all` closes the provisional status.

## Decision rule

Adopt the highest-threshold candidate whose FN count on real data is `<= 5` per 90 days. If no candidate meets that bound, escalate to Rank 4 owner (see execution order §v2.0.3) before changing the default.

## Review cadence

Quarterly. Re-run the export, re-run `evaluate_all`, append the new row to `04-candidate-evaluation.md`.

## Back-links

- Contract: `spec/21-app/69-v2-denial-tuning-contract.md` §4.
- Execution order: `spec/21-app/62-v2-execution-order.md` Rank 4 / v2.0.3 row.
- Open question: `spec/21-app/shell/24-open-questions.md` SH-Q-07 (kept OPEN until field data lands).
