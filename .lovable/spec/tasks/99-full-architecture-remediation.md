# Spec Task 99 — Full Architecture Remediation & Code Quality Plan

Slug: 99-full-architecture-remediation
Status: pending
Created: 2026-08-17
Raised-by: User (architecture review session, 2026-08-17)

## Intent

Remediate every structural and code-quality issue surfaced in the architecture
review session conducted on 2026-08-17. The review identified four primary
problem areas: (1) backend "split brain" — two competing architectures in `BE/`
(the established `BE/routes/` + `BE/envelope.py` versus the nascent `BE/src/`
with its own competing `envelope.py`); (2) frontend route sprawl — 69 flat files
in `src/routes/` with long dot-delimited filenames that make navigation painful;
(3) global Zustand store sprawl — 11 global stores when several should be
component-scoped; (4) missing backend bootstrapping automation — developers
cannot run BE tests without manually resolving Python dependencies.

This plan does NOT touch the Standard UI vision tasks (plans 01, 08, 09) or any
feature development. It is purely structural hygiene.

## Scope

- `BE/` — resolve the split-brain, delete or integrate `BE/src/`, unify `envelope.py`
- `src/routes/` — migrate from flat-file naming to directory-based routing
- `src/lib/stores/` — audit and localize stores that are not truly global
- `BE/` bootstrapping — `Makefile` with `setup-backend`, `test-backend` targets
- Spec alignment — update affected spec docs to reflect new structure
- CI verification — `npx tsc --noEmit` + `pytest` must pass after each phase

## Inputs

- Architecture overview generated 2026-08-17: `.lovable/brain/*/architecture_overview.md`
- Completed Plan 98 (architecture consolidation) context: `.lovable/plans/completed/98-architecture-consolidation-improvements.md`
- Coding guidelines: `.lovable/coding-guidelines.md`, `spec/02-coding-guidelines/`, `spec/03-error-manage/`
- Strictly avoid: `.lovable/strictly-avoid.md`
- Memory: `.lovable/memory/01-code-red.md`, `.lovable/memory/03-error-manage.md`, `.lovable/memory/13-avoid-blind-mass-refactors.md`
- Backend structure: `BE/main.py`, `BE/envelope.py`, `BE/src/api/`, `BE/src/models/`, `BE/routes/`
- Frontend routes: `src/routes/` (69 flat files)
- Frontend stores: `src/lib/stores/` (11 Zustand store files)

## Acceptance Criteria

1. `BE/src/` is either deleted (if orphaned) or fully integrated and the competing
   `BE/src/models/envelope.py` is removed — exactly ONE `envelope.py` exists in `BE/`.
2. `BE/routes/` continues to function; all router imports in `BE/main.py` remain valid.
3. `src/routes/` uses TanStack Router directory-based routing for all nested route
   groups; flat filenames are eliminated for routes with two or more dot segments.
4. `npx tsc --noEmit` exits with code 0 after the route migration.
5. All stores that are not read by two or more unrelated top-level route trees
   are converted to React Contexts scoped to the closest layout component.
6. `make setup-backend` installs Python dependencies via `uv sync`; `make test-backend`
   runs `pytest BE/tests/` with zero collection errors.
7. All spec files and READMEs that reference `BE/src/` or the old flat route
   filenames are updated to reflect the new paths.
8. No force-push, no rebase of published commits (Lovable constraint).

## Affected Files

### Backend (Phase A)
- `BE/src/` (entire tree — delete or integrate)
- `BE/src/models/envelope.py` (delete after integration)
- `BE/src/api/router.py`, `BE/src/api/system.py` (migrate or delete)
- `BE/main.py` (update imports after BE/src cleanup)
- `Makefile` (new file at repo root)
- `BE/pyproject.toml` (verify `uv` toolchain config)
- `BE/README.md` (update to reflect unified structure)

### Frontend Routes (Phase B)
- `src/routes/` — every file with two or more dot segments in its name
- `app.config.ts` or `vite.config.ts` — TanStack Router plugin config for directory routing
- Any import that references `src/routes/` by filename (server-function imports, lazy route loaders)

### Frontend Stores (Phase C)
- `src/lib/stores/palette-store.ts` — candidate for EditorShell context
- `src/lib/stores/shortcuts-store.ts` — candidate for EditorShell context
- `src/lib/stores/capture-history-store.ts` — candidate for HMI context
- All component files that import the above stores (import path updates)
- New context files: `src/contexts/EditorContext.tsx`, `src/contexts/HmiContext.tsx`

### Spec / Docs (Phase D)
- `.lovable/memory/index.md` — update cross-references
- `.lovable/memory/07-lovable-folder-guide.md` — update plans lifecycle section
- `spec/21-app/` — any file referencing `BE/src/` or old route filenames
- Root `README.md` — update "run backend" instructions

## Links

- Prior closed plan: `.lovable/plans/completed/98-architecture-consolidation-improvements.md`
- Coding guidelines: `.lovable/coding-guidelines.md`
- Strictly avoid: `.lovable/strictly-avoid.md`
- Memory (blind-mass-refactor rule): `.lovable/memory/13-avoid-blind-mass-refactors.md`
- Memory (error architecture): `.lovable/memory/03-error-manage.md`

## Attachments

None for this spec (no screenshots; this is a structural/code task).

## Release Policy

Individual next-task turns executing steps from this plan NEVER bump the version
or add a changelog entry. Version bump + changelog fires ONLY when ALL 200 steps
across this plan are complete and moved to completed/. The release ceremony follows
`11-release.md` at that single moment.
