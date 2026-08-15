# SS-07 — Onboarding & What-To-Read Refresh

**Plan:** 98  
**Status:** ✅ Done (2026-08-16T01:46:00+08:00)
**Summary:** Updated onboarding docs with architecture map links.
**Changed Files:** `.lovable/what-to-read.md`, `README.md`, `.lovable/suggestions.md`, `.lovable/plans/pending/98-architecture-consolidation-improvements.md` (moved to `completed/`), `.lovable/spec/tasks/98-architecture-consolidation-improvements.md`, `.lovable/plans/index.md`
**Parallel:** No — **requires SS-01 and SS-02**

---

## Problem

`.lovable/what-to-read.md` is the authoritative onboarding map but does not link:

- Architecture observations from this review
- Runtime map (SS-01)
- Facade migration policy (SS-04)
- Known spec-vs-code gaps (SS-02)

New agents and humans re-discover the same confusion each session.

---

## Deliverables

### Update `.lovable/what-to-read.md`

Add section **"Architecture state (read before backend work)"**:

1. Link [`plans/architecture-and-code-observations.md`](../plans/architecture-and-code-observations.md)
2. Link `docs/architecture/runtime-map.md` (SS-01)
3. Link `.lovable/memory/features/facade-migration-policy.md` (SS-04)
4. Link `spec/21-app/shell/03-implementation-status.md` (SS-02)
5. Changelog entry with date

### Update root `README.md`

Under **Project structure**, add row:

| `docs/architecture/` | Runtime map, integration tests, architecture decisions |

### Create `docs/plans/98/decisions.md`

Index for Plan 98 decisions (SS-05 rule engine choice, etc.)

### Optional: `.lovable/suggestions.md`

Move implemented observation items to **Implemented** when subtasks close.

---

## Steps

1. Wait for SS-01, SS-02, SS-04 deliverables (or stub links with "pending SS-0X")
2. Edit what-to-read.md + README
3. Create decisions.md scaffold
4. Write closeout memo `.lovable/memory/v2/plan98/00-closeout.md` when all SS complete

---

## Acceptance

- [ ] what-to-read.md lists architecture docs in section 1 or new section 1b
- [ ] README points to runtime map
- [ ] decisions.md exists with template for D-001, D-002
- [ ] No broken relative links (manual check)

---

## Closeout checklist (entire Plan 98)

- [ ] All SS acceptance boxes checked
- [ ] `pending/98-architecture-consolidation-improvements.md` status → completed
- [ ] Move plan file to `completed/` per repo convention
- [ ] Update `.lovable/plans/index.md`
