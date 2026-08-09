# Plan 07 — Audit Remediation (v1 Blockers)

**Status:** completed · **Seed:** `.lovable/memory/audit/91-corrections.md` + `99-audit-report.md` · **Goal:** clear all 14 Blockers so ship status flips from **BLOCKED** → **READY**.

## Guardrails

- Apply corrections in the fixed order below; do not reorder without updating this plan.
- Every milestone ends with: build/typecheck green, targeted evidence (SQL query, pytest run, or Playwright screenshot), and a version bump.
- No milestone lands without touching `.lovable/memory/audit/03-missing-impl.md` (flip the row) and re-running `10-scores.md` for the affected area.
- Coding guidelines are missing (`.lovable/coding-guidelines.md` and `spec/coding-guidelines/` both absent). M0 must request them before any Python change lands.

## Milestones

### M0 — Coding guidelines request (blocking)

- **Action:** Ask the user to author `.lovable/coding-guidelines.md` (Python conventions, error handling, logging, migration style). Do not proceed to M1 until it exists.
- **Signal:** File present, ≥ 20 lines.

### M1 — F-76 PascalCase rename migration

- **Files:** new `app/core/io/migrations/root/001_pascalcase_rename.sql`; update `app/core/io/migrate.py` to enforce PascalCase via `PRAGMA table_info` self-check.
- **Signal:** `sqlite3 <root.db> "PRAGMA table_info(Task)"` returns `TaskId`, `JobId`, ...; audit row `F-76` → RESOLVED; `30-db-conventions.md` rescored ≥ 80.

### M2 — F-07 / F-08 Task DB + Rules DB

- **Files:** new `app/core/io/migrations/task/000_init.sql`, `.../rules/000_init.sql`; extend `migrate.py` with `--db {root|task|rules}` and `--dir` flags; call sites in `app/dispatcher/results_writer.py` and `app/worker/runner.py`.
- **Signal:** `pytest tests/unit/test_migrate.py::test_task_db_schema` green; `21-persistence.md` rescored ≥ 80.

### M3 — F-17 Config resolver

- **Files:** new `app/core/config/{__init__.py,resolver.py,sources.py,schema.py}`.
- **Signal:** `resolve("worker.pool.size")` returns from seed with `source="seed"`; unknown key raises `DomainError(E_CONFIG_KEY_UNKNOWN)`; `23-config.md` rescored ≥ 70.

### M4 — F-42 AI stub + gate

- **Files:** new `app/ai/{__init__.py,gate.py,transport.py}`; extend `app/core/errors/codes.py` with `E_AI_DISABLED`, `E_AI_TRANSPORT`.
- **Signal:** `pytest tests/unit/test_ai_gate.py::test_disabled_by_default` green; `27-security.md` rescored ≥ 55.

### M5 — F-19 Home + F-30 RPC + F-82 memory sync

- **Files:** rewrite `src/routes/index.tsx` as two-pane; new `src/lib/rpc/{client.ts,guards.ts}`; new server fns `src/lib/jobs.functions.ts` (`listJobs`, `createJob`); update `.lovable/memory/index.md` Core (namespace `--ca-*`).
- **Signal:** Playwright `home.spec.ts` finds both `role="region"` panes; `rg "\-\-hmi-" src/` returns 0; `24-ui.md` rescored ≥ 65; `31-design-system.md` rescored ≥ 85.

### M6 — F-67 / F-71 regenerate consistency report

- **Files:** new `spec/22-app-issues/consistency-0.87.0.md` with §3.1–3.7 (add 3.5 open-questions ledger, 3.7 prompt registry) and §4 gate table using PARTIAL where signals are missing. Freeze v0.76.0 as historical.
- **Signal:** `grep "^### 3\." spec/22-app-issues/consistency-0.87.0.md | wc -l` returns 7; `29-governance.md` rescored ≥ 85.

### M7 — F-54..F-56 test pyramid seed

- **Files:** `pytest.ini`, `tests/unit/test_migrate.py`, `tests/contract/test_result_jsonl.py`, `tests/integration/test_dispatch_loop.py`.
- **Signal:** `pytest -q` runs ≥ 3 tests, all pass; `28-tests.md` rescored ≥ 40.

### M8 — Regression rescore + ship flip

- **Action:** Rerun `10-scores.md`; regenerate `99-audit-report.md` at the new version; flip ship status if mean ≥ 80 and Blocker count = 0.
- **Signal:** Blocker roster empty; README banner updated.

## Runners-up (folded into matching milestones)

- **F-44 / F-45** (consent + security codes) → M4 tail.
- **F-46** (telemetry OperatorId) → M6 tail (touches log_record contract).
- **F-68 / F-92** (named gate signals in metrics.py) → M6.

## Definition of done

All 14 Blockers flipped RESOLVED in `.lovable/memory/audit/index.md`, mean score ≥ 80, consistency-0.87.0.md 7/7 PASS with real evidence, README banner reads **READY**.
