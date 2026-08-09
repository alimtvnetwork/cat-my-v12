# Plan 89: Implement `spec/03-error-manage/01-error-resolution/` end-to-end

**Version:** 1.1
**Depends on:** Plan 88 (BE envelope + FE parser)
**Deliverable:** Every rule in `01-error-resolution/` is enforced by tooling, retros exist for every prior fix, and both BE and FE emit logs that satisfy the Code Red file-path rule.

---

## Scope (only what `01-error-resolution/` mandates)

`01-error-resolution/` covers five concerns. This plan implements each:

1. `00-error-documentation-guideline.md`: mandatory retro per fix.
2. `02-debugging-cheat-sheet.md`: quick-reference must be reachable from BE and FE error surfaces.
3. `03-retrospectives/`: prior time-wasters get case studies.
4. `04-verification-patterns/01-frontend-backend-sync.md`: three-step verification is mandatory before claiming any endpoint works.
5. `05-debugging-guides/`: per-language debugging guides referenced from log output.
6. `app-issues/` including the Code Red file-path rule.

---

## Steps

### S1. Backfill retros for the envelope refactor turn (blocking)

Create in `spec/03-error-manage/01-error-resolution/app-issues/`:

- `2026-07-21-envelope-refactor-undocumented.md`: root cause = agent skipped the retro step; prevention = S2 hook.
- `2026-07-21-pydantic-field-name-shadows-class.md`: root cause = PascalCase field names collided with class names under `from __future__ import annotations`; prevention = lint rule in S6.

Update `01-error-resolution/00-overview.md` inventory to list both.

### S2. Turn-exit checklist (process, not code)

Add `spec/03-error-manage/01-error-resolution/CHECKLIST.md` with a 6-item gate the agent MUST satisfy before ending any turn that touches error paths:

1. Retro file created for every fix in this turn.
2. Retro registered in `00-overview.md` inventory.
3. `04-verification-patterns` three-step run for every touched endpoint.
4. New file-path errors satisfy the Code Red template (path, reason, operation, module).
5. Cheat-sheet link surfaced in any new error UI.
6. Tests pass.

### S3. Backend: file-path errors satisfy Code Red

Edit `BE/errors/apperror.py` and any current call site that raises on file/path failures:

- Extend `AppError.details` shape with typed keys: `path`, `operation` (Read | Write | Copy | Move | Inject | Load | Extract | Resolve), `reason` (from the approved list), `module`.
- Add helper `AppError.for_file(reason, *, path, operation, module, message=...)` so callers cannot forget a field.
- Handlers already inject `Backend` frames; also copy `path/operation/reason/module` into `Errors.DelegatedServiceErrorStack` prefix line so it is visible on the wire.

Add `BE/tests/test_apperror_file_path.py` asserting a raise-without-path fails a schema check.

### S4. Frontend parser + error surface

Under `src/lib/backend/`:

- `envelope.ts`: Zod schema for the Universal Response Envelope (PascalCase). Reject responses missing `Status`, `Attributes`, `Results`. Never coerce.
- `beFetch.ts`: single fetch wrapper. Runs the three-step verification contract client-side (status code, envelope shape, then hands typed result to caller). Attaches `X-Correlation-Id` in and out.
- `errorMapping.ts`: maps `Errors.Code` (E\_\*) to user-facing strings via a table. Unknown codes fall through to `E_BUG_UNKNOWN_CODE` per registry.

Wire `src/components/errors/GlobalErrorModal.tsx` to the existing `errorStore.ts`, populated by `beFetch` on any `Status.IsFailed`. Modal shows `BackendMessage`, `Errors.Code`, correlation id, and a "Copy diagnostics" button that dumps the full envelope.

### S5. Verification pattern automation

Add `scripts/verify-api.sh` (from spec 04-verification-patterns verbatim, adapted for our routes: `/healthz`, `/meta`, `/rules`, `/samples`). Runs the three-step check. Exit non-zero on any failure. Wire into the BE test job so a broken envelope fails CI, not just a broken unit test.

### S6. Lint rules to prevent the two classes of bug from S1

- `scripts/lint/no-shadowing-field-names.py`: AST-walk `BE/**/*.py` Pydantic models, fail if any field name matches a class defined in the same module.
- `scripts/lint/file-path-error-fields.py`: AST-walk any `raise AppError(` with `E_BE_NOT_FOUND | E_*_FILE_*`, require `details` to include the four Code Red keys.

### S7. Debugging cheat-sheet surfaces

- Log formatter includes a URL to `spec/03-error-manage/01-error-resolution/02-debugging-cheat-sheet.md` on every 5xx envelope in dev mode.
- FE error modal includes a "Debug guide" link resolving to the per-language guide in `05-debugging-guides/`.

### S8. Backfill retros for known prior fixes

Read `assets/issues/*.md` from the last 30 days; every one that describes a resolved bug gets a matching retro under `app-issues/` if not already present. This closes the historical gap without rewriting history.

---

## Exit criteria

- `spec/03-error-manage/01-error-resolution/app-issues/` contains a dated retro for every fix landed since Plan 88 started.
- `00-overview.md` inventory is in sync with the folder.
- `scripts/verify-api.sh` passes against a fresh `uvicorn BE.main:app`.
- Both lint scripts run clean in CI.
- FE `beFetch` is the only path that reads BE JSON; grep for `fetch(` outside `src/lib/backend/` returns zero hits in production code.

---

## Non-goals

- Rewriting `02-error-architecture/` or `03-error-code-registry/`. Plan 88 already implements those.
- Adding new error codes. Registry additions get their own plan.
- Any UI polish beyond wiring the existing `GlobalErrorModal`.
