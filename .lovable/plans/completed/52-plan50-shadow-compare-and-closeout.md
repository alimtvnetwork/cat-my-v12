# Plan 50 shadow-compare, spec closeout, and plan moves

Slug: plan50-shadow-compare-and-closeout
Steps: 5
Status: completed
Created: 2026-07-16

## Context

Plan 51 covers the dashboard + alert-emit scaffold. This slice finishes Plan 50's remaining steps: shadow-compare script, spec update, closeout memo, and moving the completed plan chain (29, 33, 47, 48, 49, 50, 51) into `completed/`. Files: `scripts/security/plan29_shadow_compare.py` (new), `spec/21-app/40-error-manage.md`, `.lovable/memory/v2/plan29/50-shadow-24h.json` (new), `.lovable/memory/v2/plan29/60-closeout.md` (new). No new commands or issues this turn.

Depends on Plans 49 (thresholds landed) and 51 (alert emit landed + verified green).

## Steps

1. Add `scripts/security/plan29_shadow_compare.py`: reads the last 24h via `export_denial_events.py --percentiles`, computes old-threshold vs new-threshold fire counts per window (1m/5m/15m), writes `.lovable/memory/v2/plan29/50-shadow-24h.json` with `{ generated_at, window, old_count, new_count, delta, tuning_version }` rows. Deterministic ordering. Errors surface with exit code non-zero and stderr message per error-mgmt guidelines.
2. Add `tests/unit/test_plan29_shadow_compare.py` fixture-driven: golden input from `tests/fixtures/security/denial_sample.jsonl` + Plan 48 synthetic rows; assert JSON shape and numeric deltas match a committed `50-shadow-24h.golden.json`.
3. Update `spec/21-app/40-error-manage.md` A.1 Security row: add dashboard route link (`/admin/security/denial-burst`), `W_SEC_DENIAL_BURST_ALERT` contract (payload keys + dedup rule), and link to `.lovable/memory/v2/plan29/40-decision.md` + `50-shadow-24h.json`.
4. Write `.lovable/memory/v2/plan29/60-closeout.md`: landed thresholds table, shadow-compare deltas summary (cites `50-shadow-24h.json`), rollback steps (git revert range + spec-row rollback), and links to every Plan 29 memo (00, 10, 15, 20, 30, 40, 50, 60).
5. Move (via `mv`) `.lovable/plans/pending/{29,33,47,48,49,50,51}-*.md` to `.lovable/plans/completed/` after their own verifications pass; flip each `Status:` to `completed`. Verify `git diff --stat` shows only expected paths and `tsgo --noEmit` + `vitest run` + `pytest tests/unit/` all exit 0.

## Verification

- `python scripts/security/plan29_shadow_compare.py` produces `50-shadow-24h.json` byte-identical to the golden on fixture input.
- `pytest tests/unit/test_plan29_shadow_compare.py` green.
- Spec row diff shows the three new references; `rg -n '50-shadow-24h.json' spec/` finds the citation.
- `60-closeout.md` exists and links to all eight memos; `rg -n 'plan-29-v1' .lovable/memory/v2/plan29/` finds the tuning_version tag on every referenced artifact.
- `ls .lovable/plans/pending/` no longer lists 29/33/47/48/49/50/51; `ls .lovable/plans/completed/` lists them; each has `Status: completed`.
- All CI tasks exit 0.

## Appended from prior pending tasks

- Continuation of Plan 50 steps 3-5; Plan 51 must be green before step 5 moves happen.
- Unrelated pending plans (32, 35-46) untouched.
