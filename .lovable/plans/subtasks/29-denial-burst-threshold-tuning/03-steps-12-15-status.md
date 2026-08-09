# Plan 29 Steps 12-15 - Candidate freeze status

Date: 2026-07-16
Source plan: `.lovable/plans/pending/29-denial-burst-threshold-tuning.md` (repathed this turn)
Prior: `01-read-findings.md`, `02-data-phase-baseline.md`.

## One-sentence status

Steps 12-15 are BLOCKED pending real 90-day audit export; the sandbox holds only the 12-row fixture `tests/fixtures/security/denial_sample.jsonl`, which is documented at `02-data-phase-baseline.md:26-38` as pipeline-proof, not evidence.

## Why no candidates are frozen this turn

Freezing a threshold from 12 rows across 4 users would fabricate a decision. Per the plan's own rule at Step 12 ("document them with the numeric evidence") and the user's hard rule "Do not fabricate", the freeze must wait for:

1. A live `audit_log.sqlite` from a `/ops` production window (or a de-identified sample of same shape and volume).
2. That file, exported via `scripts/security/export_denial_events.py` (shipped, see `02-data-phase-baseline.md:17-23`), producing a `.jsonl` with `>= 10_000` rows for statistical stability.
3. `denial_metrics.evaluate_all(rows)` output containing `BaselineStats` + four `CandidateResult` rows with non-degenerate `p95`, `p99`, `sigma`.

None of (1)-(3) is present in this sandbox. `find . -name "*.sqlite"` returns nothing under `app/` or `data/`. `rg "audit_log" -l` finds only source references, not a populated DB.

## What IS locked this turn

- Candidate FORMULAS are locked in code at `app/core/security/denial_metrics.py:229-237` (`default_candidates`): `p95`, `p95+2σ`, `p99`, `p99+3σ`. These are the four rules the plan (Step 11) called for; they are already implemented and unit-tested via `tests/unit/test_denial_replay_harness.py`.
- Evaluation harness is locked at `denial_metrics.py:205-278` (`evaluate_candidate`, `evaluate_all`). FP/FN accounting is per-bucket with `label` majority vote, tie -> "attack" (`_bucket_labels:198-201`). Baseline provenance is captured on every `CandidateResult` row.
- SH-Q-07 (sample-size question) in `spec/21-app/shell/24-open-questions.md` remains OPEN. Explicit non-closure.

## Peer-review checklist (per Step 14, deferred)

| Field           | Value                                     |
| --------------- | ----------------------------------------- |
| Reviewer        | TBD when evidence lands                   |
| Date            | TBD                                       |
| Decision        | pending real-data evaluation              |
| Formulas frozen | yes (`denial_metrics.default_candidates`) |
| Numbers frozen  | no                                        |

## Unblock recipe

1. Land an anonymised 90-day export at `.lovable/plans/subtasks/29-denial-burst-threshold-tuning/evidence/90d.jsonl` (git-ignored).
2. Run `python3 -c "from pathlib import Path; from app.core.security.denial_metrics import load_rows, evaluate_all; rows = load_rows(Path('.../90d.jsonl')); stats, cands = evaluate_all(rows); print(stats); [print(c) for c in cands]"`.
3. Paste the output into a new `04-candidate-decision.md` alongside the reviewer signoff.
4. Only then update `spec/21-app/69-v2-denial-tuning-contract.md §4` and `spec/03-error-manage/03-error-code-registry/*` with any newly required codes.

## Verification signal captured this turn

`python3 -m pytest tests/unit/test_denial_replay_harness.py tests/unit/test_denial_defaults_derivation.py tests/unit/test_denial_tuning_hot_reload.py tests/unit/test_denial_tuning_admin_write.py tests/unit/test_settings_driven_thresholds.py tests/unit/test_boot_security_wiring.py -q` = 25 passed. Baseline is green before any tuning work touches these files.
