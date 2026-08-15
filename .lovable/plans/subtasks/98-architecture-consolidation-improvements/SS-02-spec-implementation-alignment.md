# SS-02 — Spec & README Alignment

**Plan:** 98  
**Status:** ✅ Done

**Summary:** Aligned BE README and meta capabilities with current reality, documented shell state, and recorded envelope migration.
**Changed Files:**

- `BE/README.md`
- `BE/routes/meta.py`
- `BE/tests/test_meta.py`
- `spec/21-app/shell/03-implementation-status.md`
- `spec/03-error-manage/02-error-architecture/05-response-envelope/02-changelog.md`

**Parallel:** Yes (Wave 1)

---

## Problem

Multiple docs describe **target state** as if it were **current state**:

- `BE/README.md` — "skeleton, NotImplementedError"
- `spec/21-app/shell/02-runtime-architecture.md` — Tauri host; code uses Chromium MV3
- Plan 88 changelog — `{ok, data, error}` envelope; code uses PascalCase envelope
- `BE/routes/meta.py` — capabilities may still say `"stub"` while repos exist

This causes wrong assumptions during implementation and review.

---

## Deliverables

### D-001 — Update `BE/README.md`

- Reflect actual routers in `BE/main.py` (health, meta, rules, samples, observability, CLI)
- Document PascalCase envelope (link `BE/envelope.py` + `src/lib/backend/envelope.ts`)
- Remove "all modules raise NotImplementedError" unless still true per file
- Add "Last verified: YYYY-MM-DD" footer

### D-002 — Shell status note

Add **`spec/21-app/shell/03-implementation-status.md`** (new):

| Item            | Spec target             | Current implementation          |
| --------------- | ----------------------- | ------------------------------- |
| Host            | Tauri (AI-01 TBD)       | `chromium-shell/` MV3 extension |
| Worker restart  | Shell supervisor thread | Not wired                       |
| `app://` scheme | Required                | Vite dev / built assets         |

Do not resolve AI-01 here — document gap only.

### D-003 — Envelope migration note

Add one paragraph to `spec/03-error-manage/02-error-architecture/05-response-envelope/` or CHANGELOG pointer:

> Plan 88 Step 10 shipped `{ok,data,error}`; later refactored to PascalCase `Status/Attributes/Results/Errors`. FE adapter: `src/lib/backend/envelope.ts`.

### D-004 — Meta capabilities audit

- Read `BE/routes/meta.py` capabilities dict
- Update values from `stub` → `in-memory` / `vendor` where repos/facades are live
- Add test lock in `BE/tests/test_meta.py`

---

## Steps

1. Diff `BE/README.md` against `BE/main.py` + `BE/routes/`
2. Write D-001..D-004
3. Run link check on edited markdown paths
4. No runtime behavior changes unless meta capabilities fix is trivial and tested

---

## Acceptance

- [ ] `BE/README.md` accurate to pytest green state
- [ ] Shell implementation status doc exists
- [ ] Envelope history documented in one canonical place
- [ ] Meta capabilities match repo reality

---

## Non-Goals

- Choosing Tauri vs CEF (defer to `spec/22-app-issues/` AI-01 resolution)
