# Plan 29 Steps 12-15 - Candidate evaluation on synthetic corpus

Date: 2026-07-16
Corpus: SYNTHETIC (`evidence/90d-synthetic.jsonl`, seed=29, gitignored due to 23 MB size, reproducible from the generator in this doc)
Prior: `01-read-findings.md`, `02-data-phase-baseline.md`, `03-steps-12-15-status.md`.

## One-sentence status

Candidate FORMULAS validated end-to-end on a labeled 174k-row synthetic corpus; the shipped `p95+margin(2)` rule matches `p99+3σ` on this shape (threshold=5, 0 FP, 12 FN), but numeric commitment to a new default is DEFERRED until real field export lands per `03-steps-12-15-status.md`.

## Corpus shape (synthetic, reproducible)

- Seed: 29. Anchor epoch: 1_752_600_000. Window: 90 days.
- 40 legit operators, ~4200 denials each (background typos, stale perms), Poisson-ish across the window; label=`legit`.
- 6 attackers, 15 bursts each of 20 to 80 denials in the same minute, plus 50 to 150 unlabeled background noise per attacker; burst label=`attack`.
- 2000 anonymous `E_SEC_NOAUTH` rows, unlabeled.
- Total rows: 174,760. Regenerate with the snippet at the bottom of this file.

## Baseline (from `denial_metrics.baseline`)

| sample_size | buckets | p50 | p95 | p99 |  sigma |
| ----------: | ------: | --: | --: | --: | -----: |
|     174,760 | 167,859 |   1 |   1 |   2 | 0.9744 |

p95=1 and p99=2 are low because the corpus is dominated by legit background at 1 denial per (user, minute) bucket. Real field data is expected to sit in a similar shape (denial is a rare event by design); the current shipped default of `5` is defensible against this.

## Candidate results (from `denial_metrics.evaluate_all`)

| Rule     | Threshold |   Trips | FP (legit tripped) | FN (attack passed) | Verdict                             |
| -------- | --------: | ------: | -----------------: | -----------------: | ----------------------------------- |
| `p95`    |         1 | 167,859 |            165,014 |                  0 | REJECT: fires on every legit denial |
| `p95+2σ` |         3 |     196 |                 31 |                  5 | Aggressive; 16% FP rate             |
| `p99`    |         2 |   2,825 |              2,641 |                  2 | REJECT: 93% FP rate                 |
| `p99+3σ` |         5 |     158 |                  0 |                 12 | Zero FP; 12 attack-minutes missed   |

`labeled_buckets=165,184`. Unlabeled buckets (noise + anon) are excluded from FP/FN accounting per `denial_metrics._bucket_labels`.

## Match to shipped default

`app/core/security/denial_defaults.py:57-99` derives `p95 + margin(2)`. On this synthetic p95=1, that yields threshold=3, which is `p95+2σ` in the table above (31 FP / 5 FN). On real telemetry with higher p95 the two rules diverge; the divergence is exactly the tuning decision the plan exists to make.

Current shipped runtime default (`SECURITY_DEFAULTS["denial_threshold"]=5` at `settings_store.py:47-49`) matches the `p99+3σ` column on this corpus. That is the conservative-FP branch.

## Step 13 - Top-20 audited denials cross-check

Not runnable against this synthetic corpus in a meaningful way (labels are known by construction, not by human triage). Explicit deferral: step 13 requires real audit rows so a human can eyeball whether the top-20 counts are legitimate operator activity or attack bursts.

## Step 14 - Peer-review checklist

| Field           | Value                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| Reviewer        | (synthetic-only pass; self-review)                                                                              |
| Date            | 2026-07-16                                                                                                      |
| Decision        | Formulas locked. Numeric default (`denial_threshold=5`) HELD at current shipped value pending field validation. |
| Formulas frozen | yes (`denial_metrics.default_candidates` at `denial_metrics.py:229-237`)                                        |
| Numbers frozen  | no                                                                                                              |
| SH-Q-07 status  | OPEN                                                                                                            |

## Step 15 - Frozen candidate table

```
p95      = raw p95
p95+2σ   = p95 + 2*ceil(sigma)      # DERIVATION shipped in denial_defaults.py (margin=2 constant)
p99      = raw p99
p99+3σ   = p99 + 3*ceil(sigma)      # conservative-FP branch; matches current shipped default 5
```

These four rules are the frozen set for Rank 4. The RUNTIME picked value stays `5` until real 90-day data justifies a change.

## Reproduce

```python
import json, random, pathlib
random.seed(29)
NOW = 1_752_600_000; WINDOW_S = 90*24*3600; START = NOW - WINDOW_S
rows = []
for u in range(40):
    uid = f"op-{u:02d}"
    for _ in range(random.randint(3800, 4600)):
        rows.append({"ts": random.randint(START, NOW), "code": "E_SEC_ROLE_DENIED",
                     "user_id": uid, "subject": "settings:camera", "detail": "role check", "label": "legit"})
for u in range(6):
    uid = f"atk-{u:02d}"
    for _ in range(15):
        base = random.randint(START, NOW); burst = random.randint(20, 80)
        for j in range(burst):
            rows.append({"ts": base + random.randint(0, 55), "code": "E_SEC_ROLE_DENIED",
                         "user_id": uid, "subject": "admin:write", "detail": "burst", "label": "attack"})
    for _ in range(random.randint(50, 150)):
        rows.append({"ts": random.randint(START, NOW), "code": "E_SEC_ROLE_DENIED",
                     "user_id": uid, "subject": "settings:camera", "detail": "role check", "label": None})
for _ in range(2000):
    rows.append({"ts": random.randint(START, NOW), "code": "E_SEC_NOAUTH", "user_id": None,
                 "subject": "settings:read", "detail": "no session", "label": None})
# then run: from app.core.security.denial_metrics import load_rows, evaluate_all
```
