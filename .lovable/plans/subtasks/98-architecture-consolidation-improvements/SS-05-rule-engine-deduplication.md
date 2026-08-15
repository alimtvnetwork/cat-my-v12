# SS-05 — Rule Engine Deduplication

**Plan:** 98  
**Status:** ✅ Done (2026-08-16T01:37:20+08:00)  
**Parallel:** No — **requires SS-01 complete**  
**Risk:** High — hot path for inspection accuracy

---

## Problem

Rule evaluation logic exists in two Python trees:

| Location        | Used by                                   | Examples                       |
| --------------- | ----------------------------------------- | ------------------------------ |
| `app/rules/`    | Capture/runtime worker pipeline           | `engine.py`                    |
| `BE/app/rules/` | HTTP validation, editor remote score path | `kernel/engine.py`, evaluators |

Drift causes: editor preview matches runtime incorrectly; BE save validates differently than worker judges.

---

## Decision Required (record in `docs/plans/98/decisions.md`)

Pick one:

### Option A — Shared package (recommended)

Extract **`rule_kernel/`** at repo root (or `app/rules/` as canonical):

- `BE/app/rules/` imports from `app/rules/` (or shared package)
- Single test suite for evaluators
- BE adds HTTP/adapters only; no duplicate predicate math

### Option B — BE owns kernel, runtime imports BE

- Worker process adds `BE` to PYTHONPATH
- `app/worker` imports `rule_kernel`
- Heavier coupling to FastAPI package layout

### Option C — Generated parity tests only (minimum)

- Keep two copies temporarily
- CI runs golden-fixture tests: same inputs → same judgments in both trees
- Document as tech debt with expiry date

---

## Steps

1. Complete SS-01 runtime map — identify all call sites
2. Diff evaluator modules: presence, count, math, flaw, graphic display
3. Write decision D-002 in `docs/plans/98/decisions.md`
4. Implement chosen option with parity tests
5. Update SS-01 runtime map "canonical owner" row
6. Remove dead duplicate modules

---

## Acceptance

- [x] Decision recorded with rationale
- [x] Parity test suite: ≥1 fixture per rule kind passes in both paths (or single path after merge)
- [x] No duplicate predicate implementations without `# parity-mirror` comment + linked test
- [x] CHANGELOG entry for behavior-locked merge

## Changes

- **Extracted rule_kernel:** Moved `BE/app/rules/kernel` and `BE/app/rules/evaluators` to root `rule_kernel/` package to serve as the unified canonical logic.
- **Removed Duplicates:** Deleted the duplicate implementation in `app/rules/`.
- **Refactored Imports:** Updated all imports across the codebase (`BE/`, tests, `rule_kernel/` itself) to correctly reference `rule_kernel`.
- **Documented Decision:** Added D-002 to `docs/plans/98/decisions.md` describing Option A.

---

## Verification

```bash
pytest BE/tests/app/rules/ -q
pytest app/ -q  # or tests/unit covering app.rules if present
```

---

## Non-Goals

- Changing rule semantics (refactor only unless bug found — file app-issue separately)
