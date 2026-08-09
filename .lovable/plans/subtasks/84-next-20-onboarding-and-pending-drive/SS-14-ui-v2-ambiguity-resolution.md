# SS-14 UI v2 ambiguity resolution

Source: `.lovable/ambiguity-questions/01-ui-v2-open-questions.md`
Status: RESOLVED 2026-07-19 (defaults chosen; applied to code where relevant)

## Decisions

### Vocabulary

- Q1 Drop "Recipe" globally. Canonical noun: **Rule Set** (contains Rules). Applied: renamed 5 user-visible strings across `src/lib/favorites-store.ts`, `src/components/nav/TopMenuBar.tsx` (x2), `src/components/nav/CommandPalette.tsx`, `src/routes/__root.tsx`. Existing schema/types (`RuleSet*`, `createRuleset`) already conform.
- Q2 Default name pattern: **`Rule Set 01`** (space + 2-digit sequence). Already the convention in `src/lib/projects/__tests__/store.test.ts` and `src/lib/setup/__tests__/schemas.test.ts`.

### Setup structure

- Q3 `/setup` is a **top-level route with three tiles** (Camera, Rules, Lighting). Header dropdown remains as a secondary shortcut. Current router already exposes `/setup` + child routes.
- Q4 Lighting Setup v1 stub fields: `{ name, exposureMs: number, gainDb: number, targetLuxOptional?: number }`. Full model deferred to Plan 82.

### Rule creation

- Q5 "Category Rule" vs "Task-Based Rule" is **UI grouping only**; same underlying schema (`Rule`).
- Q6 Reference override = **live read-time merge** (parent changes propagate on read). No push-subscription.
- Q7 Snapshot = freeze the **merged state** at conversion time (child ignores future parent changes).

### Rules editor

- Q8 Custom JS runs in a **sandboxed worker** (later); v1 exposes the editor + persistence, no execution.
- Q9 Flaw Detection = **threshold on existing detector** (not a discrete algorithm).
- Q10 Barcode v1: **Code128, QR, DataMatrix**.
- Q11 Positional Adjustment (edge width/pitch) = **pre-processing step** applied to a region before the primary detector, not a standalone rule.

### Filesystem / DB

- Q12 Runtime `data/` colocated with the worker process; frontend uses **Lovable Cloud** as source of truth.
- Q13 **Lovable Cloud is the primary store**. SQLite only as an export/mirror target, not a migration.
- Q14 Mermaid: **one file per aggregate + a master overview**. PNG rendered manually on release.

### Export / import

- Q15 YAML export is **lossless and round-trippable** with JSON.
- Q16 Project zip: images embedded under `/assets/` inside the zip, referenced by relative path.

### Running / worker

- Q17 Running pill: **single active process**, non-stacking.
- Q18 Worker spec 21: UI hooks + stub endpoints only in v1; actual spawn later.

### Header nav

- Q19 Back/Forward bind to **`router.history.back/forward`**; buttons disabled when history is empty (no per-tab stack).

### AI settings

- Q20 v1 fields: `{ provider, endpoint, apiKeyRef, model }`. No validation, marked "Preview".

### Images

- Q21 Deferred documentation task; not blocking code. Assets folder `spec/24-app-ui-design-system/assets/` remains empty until user attaches.

## Applied to code

- 5 user-facing labels renamed from "Rules and recipes" / "Rules and Recipes" to "Rule Sets" (see files above).
- No schema, route, or store changes required; decisions ratify existing conventions.

## Follow-ups

- If Lighting Setup is scheduled, wire fields per Q4 in a Plan 82 subtask.
- Ambiguity file `01-ui-v2-open-questions.md` marked RESOLVED (pointer to this doc).
