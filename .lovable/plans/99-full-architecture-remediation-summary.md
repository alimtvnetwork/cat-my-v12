# Plan 99 — Full Architecture Remediation: Summary

Slug: 99-full-architecture-remediation-summary
Created: 2026-08-17
Status: pending (mirrors `pending/99-full-architecture-remediation.md`)
Full plan: `.lovable/plans/pending/99-full-architecture-remediation.md`
Spec: `.lovable/spec/tasks/99-full-architecture-remediation.md`

---

## What This Plan Is

Plan 99 is pure structural hygiene. It does NOT add features, does NOT touch
the Standard UI vision tasks (plans 01, 08, 09), and does NOT change product
behavior. It remediates four architecture debts discovered in the 2026-08-17
review session so that the codebase is clean before the next feature wave.

**No version bump until ALL 200 steps are done and this plan is moved to `completed/`.**

---

## Why It Exists (The 4 Problems)

### Problem A — Backend "Split Brain"
There are two competing backend architectures living side-by-side in `BE/`:

| Path | Role | Status |
|---|---|---|
| `BE/routes/` + `BE/envelope.py` | Established, production-used architecture | KEEP |
| `BE/src/api/` + `BE/src/models/envelope.py` | Nascent duplicate with its own smaller envelope | DELETE |

Having two `envelope.py` files is a footgun. Any AI or developer reading `BE/`
cannot know which envelope is authoritative. The `BE/src/models/envelope.py`
(570 bytes) is a strict subset of `BE/envelope.py` (7640 bytes) and must be deleted.

### Problem B — Frontend Route Sprawl (69 flat files)
`src/routes/` uses TanStack Router flat-file naming with dot-separated segments:
```
projects.$projectId.rulesets.$rulesetId.rules.$ruleId.tsx  ← unreadable
```
With 69 files at the same depth, navigation and search are painful. The fix is
directory-based routing:
```
src/routes/projects/$projectId/rulesets/$rulesetId/rules/$ruleId.tsx  ← clear
```

### Problem C — Global Zustand Store Sprawl (11 stores)
`src/lib/stores/` has 11 global Zustand stores. Three of them are only consumed
within a single UI tree (editor shell, HMI shell) and have no business being
global singletons. Global state that is not globally needed is a memory leak
and a testing hazard.

| Store | Consumers | Fix |
|---|---|---|
| `palette-store.ts` | Editor shell only | Localize to `EditorContext` |
| `shortcuts-store.ts` | Editor shell only | Localize to `EditorContext` |
| `capture-history-store.ts` | HMI only | Localize to `HmiContext` |
| 8 remaining stores | Cross-tree | Stay global |

### Problem D — Missing Backend Bootstrapping
Running `pytest BE/tests/` on a clean checkout fails immediately with
`ModuleNotFoundError: No module named 'pydantic_settings'` because there is no
automated way to install backend dependencies. A `Makefile` with `make setup-backend`
fixes this.

---

## The 5 Phases (200 Steps Total)

### Phase A — Backend Split-Brain Resolution (Steps 1-37)
**Subtask:** `SS-01-backend-split-brain.md`

| Step Range | What Happens |
|---|---|
| 1-9 | Read and audit `BE/src/` tree; record all imports; compare the two envelope files |
| 10-14 | Create `BE/routes/system.py` + `BE/models/system.py` replicating the `GET /system/status` endpoint using the established envelope |
| 15-17 | Wire new system route into `BE/main.py`; remove `BE.src.api.router` import |
| 18-20 | `py_compile` all new files — must exit 0 |
| 21 | `grep "from BE.src"` must return zero |
| 22-29 | Delete `BE/src/` entire tree file-by-file |
| 30-31 | Verify directory gone; `py_compile BE/main.py` again |
| 32-35 | Final grep sweep; run `pytest` collection — zero `ModuleNotFoundError` |
| 36-37 | Commit; flip SS-01 subtask to `completed` |

**Exit criteria:** `BE/src/` does not exist. One `envelope.py`. All pytest tests collect.

---

### Phase B — Frontend Route Directory Migration (Steps 38-117)
**Subtask:** `SS-02-route-directory-migration.md`

| Step Range | What Happens |
|---|---|
| 38-39 | Read router config; run baseline `npx tsc --noEmit` (must be 0) |
| 40 | List all flat files with 2+ dot segments — the migration targets |
| 41-52 | Create all new directory scaffolding |
| 53-66 | Move `projects.$projectId.*` group into `projects/$projectId/` |
| 67 | `npx tsc --noEmit` checkpoint — fix all errors |
| 68-74 | Move `settings.*` group; typecheck |
| 75-86 | Move `setup.*` group; typecheck |
| 87-98 | Move `cli.*` group; typecheck |
| 99-100 | Move `cli-sessions.*` group |
| 101-104 | Move `observability.*` group |
| 105-107 | Move `admin.debug.*` group |
| 108-109 | Final typecheck; verify zero flat multi-dot files remain |
| 110-114 | Dev server smoke test — all major routes reachable |
| 115-117 | Final typecheck; commit; flip SS-02 to `completed` |

**Migration map (flat → directory):**

```
BEFORE (flat)                                     AFTER (directory)
projects.$projectId.rulesets.index.tsx     →      projects/$projectId/rulesets/index.tsx
settings.camera.tsx                        →      settings/camera.tsx
setup.categories.$id.tsx                   →      setup/categories/$id.tsx
cli.sessions.$sessionId.tsx                →      cli/sessions/$sessionId.tsx
observability.sessions.$id.ipc.tsx         →      observability/sessions/$id.ipc.tsx
admin.debug.calibration.tsx                →      admin/debug/calibration.tsx
```

**Exit criteria:** `ls src/routes/*.tsx` with 2+ dots returns zero. `npx tsc --noEmit` exits 0. All routes navigable.

---

### Phase C — Zustand Store Localization (Steps 118-150)
**Subtask:** `SS-03-store-localization.md`

| Step Range | What Happens |
|---|---|
| 118-126 | Audit `capture-history-store`; create `HmiContext`; mount on `HmiShell`; delete store |
| 127-134 | Audit `palette-store`; add palette slice to `EditorContext`; mount on `EditorShell`; delete store |
| 135-142 | Audit `shortcuts-store`; add shortcuts slice to `EditorContext`; delete store |
| 143-144 | Verify 8 stores remain; grep for deleted store hooks returns zero |
| 145-148 | Runtime smoke test — editor palettes, shortcuts, HMI capture history all work |
| 149-150 | Commit; flip SS-03 to `completed` |

**Store count: 11 → 8**

**New files created:**
- `src/contexts/HmiContext.tsx` — wraps `HmiShell`, provides capture history state
- `src/contexts/EditorContext.tsx` — wraps `EditorShell`, provides palette + shortcuts state

**Exit criteria:** Zero imports of the three deleted stores. `npx tsc --noEmit` exits 0. Editor and HMI features work.

---

### Phase D — Backend Bootstrapping & Docs Alignment (Steps 151-170)
**Subtask:** `SS-04-backend-bootstrap-docs.md`

| Step Range | What Happens |
|---|---|
| 151-152 | Read `BE/pyproject.toml`; check for existing `Makefile` |
| 153 | Write `Makefile` at repo root with 4 targets |
| 154-155 | `make setup-backend` — confirm venv populated; `pydantic_settings` importable |
| 156 | `make test-backend` — document pass/fail state |
| 157-158 | Update `BE/README.md` — remove `BE/src/` refs; add Getting Started section |
| 159-163 | Sweep `spec/`, `.lovable/`, root `README.md` for `BE/src/` references; fix each |
| 164-165 | Update `memory/index.md` and `overview.md` |
| 166 | `grep "BE/src"` across all files returns zero |
| 167-168 | Final `npx tsc --noEmit` + `make test-backend` |
| 169-170 | Commit; flip SS-04 to `completed` |

**New file:** `Makefile` at repo root
```makefile
make setup-backend    # cd BE && uv sync
make test-backend     # cd BE && uv run pytest tests/ -v
make lint-backend     # cd BE && uv run ruff check .
make dev-backend      # cd BE && uv run python -m BE.main
```

**Exit criteria:** `make setup-backend` exits 0. `make test-backend` exits 0. Zero `BE/src` refs in any file.

---

### Phase E — Spec Alignment & Final Gates (Steps 171-200)
No subtask file — pure cross-cutting verification and housekeeping.

| Step Range | What Happens |
|---|---|
| 171 | Update `spec/21-app/backend-implementation-request-v1.md` if stale |
| 172 | Append Plan 99 completion note to `architecture-and-code-observations.md` |
| 173 | Register Plan 99 in `plans/index.md` |
| 174-175 | Fix any remaining hardcoded old route strings (Link `to=` props) |
| 176-177 | Verify `__root.tsx` has no deleted flat-file references |
| 178 | Penultimate full `npx tsc --noEmit` |
| 179-180 | Asset naming audit; `eslint src/contexts/` — zero warnings |
| 181-182 | `eslint src/routes/` + `make lint-backend` — zero warnings |
| 183-186 | Manual review: new context files and BE files follow all coding guideline rules |
| 187 | No file exceeds 300 lines (hard cap) |
| 188-189 | No `let` at module level; no string unions; no Enum without `Type` suffix |
| 190-191 | Final `npx tsc --noEmit` + `make test-backend` — both exit 0 |
| 192 | Full browser smoke test — all route groups reachable |
| 193-195 | Update `suggestions.md`, `memory/index.md`, `memory/06-spec-map.md` |
| 196 | Final commit for Phase E |
| 197-198 | Move plan to `completed/`; update `plans/index.md` |
| 199 | 4-check state audit (BE/src gone, flat routes gone, 8 stores, `npx tsc` clean) |
| 200 | End-to-end gate: `make setup-backend && make test-backend && npx tsc --noEmit` — all exit 0 |

---

## Files Created/Modified at a Glance

### New files
- `BE/routes/system.py` — migrated `GET /system/status` from `BE/src/`
- `BE/models/__init__.py`, `BE/models/system.py`, `BE/models/camera.py` — BE model layer
- `src/contexts/HmiContext.tsx` — localized HMI state
- `src/contexts/EditorContext.tsx` — localized editor palette + shortcuts state
- `Makefile` — backend bootstrapping targets

### Deleted files
- `BE/src/` entire directory (6 files)
- `src/lib/stores/capture-history-store.ts`
- `src/lib/stores/palette-store.ts`
- `src/lib/stores/shortcuts-store.ts`

### Moved files (route migration — flat → directory)
- 50+ route files reorganized (see Phase B steps 53-107)

### Updated files
- `BE/main.py` — removes `BE.src.api.router` import
- `BE/README.md` — Getting Started section
- `.lovable/plans/index.md` — Plan 99 registered
- `.lovable/memory/index.md`, `overview.md`, `06-spec-map.md`
- Any spec file referencing `BE/src/`

---

## Definition of Done (Step 200 Gate)

```
make setup-backend   # exits 0
make test-backend    # exits 0 (or matches documented pre-existing failures)
npx tsc --noEmit     # exits 0

grep -rn "BE.src\|BE/src" ./   # returns zero
ls src/routes/*.tsx (2+ dots)   # returns zero
ls src/lib/stores/*.ts | wc -l  # returns 8
Test-Path BE/src                # returns False
```

All checks pass simultaneously = Plan 99 complete = version bump eligible.

---

## Quick Reference for Executing Agents

1. **Read before coding:** `.lovable/coding-guidelines.md`, `.lovable/strictly-avoid.md`, `.lovable/memory/13-avoid-blind-mass-refactors.md`
2. **Work in phase order:** A then B then C then D then E. Do not skip phases.
3. **After every file move or creation:** run `npx tsc --noEmit` and fix errors before moving to the next step.
4. **After every phase:** commit with the prescribed message; flip the subtask `Status` to `completed`.
5. **Never version-bump mid-plan.** The bump fires only at step 200.
6. **Never force-push or rebase** already-published commits (Lovable constraint in `AGENTS.md`).
7. **If a step produces unexpected output**, file it as an issue in `.lovable/issues/` before continuing. Do not guess past it.
