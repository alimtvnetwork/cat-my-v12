# Issue: Envelope Refactor Landed Without Retros

**Date:** 2026-07-21
**Severity:** High
**Status:** Resolved

---

## Error Description

The Universal Response Envelope refactor (Plan 88 fixup) replaced `{ok,data,error}` with the PascalCase `Status/Attributes/Results/Errors` shape across `BE/envelope.py`, `BE/errors/apperror.py`, `BE/errors/handlers.py`, four routes, and eight tests. 110 tests passed. Zero `app-issues/*.md` retros were created. The turn also skipped the mandatory three-step verification from `04-verification-patterns/01-frontend-backend-sync.md`.

## Root Cause

Agent treated documentation as post-hoc polish instead of a first-class turn output. Root causes, in order:

1. No turn-exit checklist forced the agent to check `01-error-resolution/00-error-documentation-guideline.md` before ending the turn.
2. Green tests were misread as sufficient evidence of correctness. `04-verification-patterns` explicitly requires curl + FE grep + browser check on top of unit tests.
3. Speed-optimized token budget: agent skipped reading `01-error-resolution/` because the fix was in `02-error-architecture/` territory.

## Solution

- This retro file created.
- Companion retro `2026-07-21-pydantic-field-name-shadows-class.md` created for the Pydantic bug hit during the same turn.
- Plan 89 (`.lovable/plans/pending/89-error-manage-01-error-resolution.md`) adds a mandatory turn-exit checklist (`CHECKLIST.md`) and a lint rule to enforce retro presence.
- `00-overview.md` inventory updated to list both new retros.

## Prevention

- Plan 89 Step 2: create `01-error-resolution/CHECKLIST.md` and require the agent to satisfy it before ending any turn touching error paths.
- Plan 89 Step 5: `scripts/verify-api.sh` wired into CI so a green unit-test run alone cannot pass a broken envelope.
- Anti-hallucination rule: any refactor of files under `BE/errors/` or `BE/envelope.py` must produce at least one `app-issues/` retro in the same turn.

## Related

- `spec/03-error-manage/01-error-resolution/00-error-documentation-guideline.md`
- `spec/03-error-manage/01-error-resolution/04-verification-patterns/01-frontend-backend-sync.md`
- `.lovable/plans/pending/89-error-manage-01-error-resolution.md`
- `BE/envelope.py`, `BE/errors/handlers.py`
