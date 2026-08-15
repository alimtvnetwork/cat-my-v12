# SS-04 — Facade Migration Closeout

**Plan:** 98  
**Status:** ✅ Done (2026-08-16T01:37:00+08:00)
**Summary:** Created migration policy, added dev warnings for facade-only slices without profiles, and triaged pending facades.
**Changed Files:**

- `src/lib/facades/useFacadeOrStore.ts`
- `.lovable/memory/features/facade-migration-policy.md`
- `.lovable/pending-facades/README.md`
  **Parallel:** Yes (Wave 1)  
  **Related:** Plan 86, `.lovable/pending-facades/`

---

## Problem

Three parallel data paths coexist:

1. Legacy Zustand stores (`src/lib/*/store.ts`)
2. v2 seed facades + `useFacadeOrStore`
3. Backend HTTP writes via `runBackendWrite`

New features don't know which path to use. Bugs appear when `getActiveProfile()` is null vs active, or seed/backend mode diverges.

---

## Deliverables

### D-001 — Migration policy doc

Create **`.lovable/memory/features/facade-migration-policy.md`**:

| Slice    | Status | Read path      | Write path  | Store deprecated? |
| -------- | ------ | -------------- | ----------- | ----------------- |
| projects | …      | facade / store | facade / BE | …                 |
| rules    | …      | …              | …           | …                 |
| cameras  | …      | …              | …           | …                 |
| …        |        |                |             |                   |

Statuses: `facade-only` | `facade-preferred` | `store-only` | `backend-only`

### D-002 — Ratchet enforcement

- Extend `facade-only-ratchet.step40.test.ts` or add linter rule: new files under `src/routes/` must not import `*/store` for slices marked `facade-only`
- List violations in plan closeout

### D-003 — Pending facade backlog triage

Review `.lovable/pending-facades/` — for each item:

- **Keep** — schedule under Plan 98 follow-up or existing plan
- **Merge** — duplicate of existing facade
- **Defer** — mark with reason

Update `.lovable/pending-facades/README.md` with status column.

### D-004 — Profile null behavior

Document in policy: when `getActiveProfile() === null`, `useFacadeOrStore` returns legacy store — intentional for non-seeded operator data. Add dev-only warning if facade slice is `facade-only` but profile is null on routes that require v2 seed.

---

## Steps

1. Audit all `useFacadeOrStore` call sites
2. Audit remaining direct `useXStore` imports in routes/components
3. Write D-001 policy table (source: Plan 86 SS docs + code)
4. Triage pending-facades (D-003)
5. Implement ratchet extension (D-002) if feasible in one session; else document as follow-up step

---

## Acceptance

- [x] Policy doc lists every seed slice with explicit status
- [x] No slice marked `facade-only` still requires store for happy-path reads
- [x] Pending-facades README has status per item
- [x] Team/agents have a single answer to "store or facade?"

---

## Non-Goals

- Deleting all Zustand stores in one pass (only mark deprecated + stop new usage)
