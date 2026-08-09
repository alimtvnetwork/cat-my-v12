# Rule / Category / Project domain (V4)

Applies to: `src/types/rules/**`, `src/lib/rules/**`, `src/lib/projects/**`, `src/routes/setup.rules*`, `src/routes/projects*`.
Source of truth: `spec/21-app/53-ui-improvements-v4.md` sections 1, 4, 5.
Plan: `.lovable/plans/pending/79-ui-improvements-v4.md` (steps 11-17, 22-26, 40-46).

## Invariants

1. Rule and Category are the SAME type. A Category is a `Rule` with `isCategory = true` and an optional `notes` string. There is no separate `Category` table, no separate editor route, no separate facade.
2. Every rule (including a category) carries an ordered `appliesBefore: RuleId[]`. Semantics: evaluating rule `R` runs each id in `R.appliesBefore` in order first, then `R` itself. Recursive: those pre-rules apply their own `appliesBefore` transitively.
3. Cycles in `appliesBefore` are rejected at save time via a transitive walk. The error surfaces inline in the metadata bar picker; save is blocked.
4. Project is a disjoint aggregate. It stores `rules: RuleId[]` in the order the user picked, plus `imageSamples`, `cameraSettingId?`, `micSettingsId?`, and run history.
5. Project effective chain = `flatten(project.rules.map(r => [...expand(r.appliesBefore), r]))` then `dedupeByIdKeepFirst`. Example given in the spec: `project.rules = [X3, X4]` with `X3.appliesBefore = [X1, X2]` expands to `[X1, X2, X3, X4]`.
6. Deletion of a rule or category is blocked while any other rule references it in `appliesBefore` or any project references it in `rules`. The delete UI must list references before allowing a forced delete.
7. `Uncategorized` is a built-in category (seeded, `isCategory = true`, empty `conditions`) and cannot be deleted or renamed.

## Canonical types (target shape)

```ts
// src/types/rules/Rule.ts
export type RuleId = string;

export interface Rule {
  id: RuleId;
  name: string;
  isCategory: boolean;
  notes?: string; // categories mostly
  pocketSize?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; // rules only
  categoryId?: RuleId; // points to a Rule where isCategory === true
  appliesBefore: RuleId[]; // ordered
  conditions: RuleCondition[]; // existing type from spec 21/47
  cameraSettingId?: string;
  createdAt: string; // ISO
  updatedAt: string;
}
```

`RuleCondition` and its ROIs carry a `rotation: number` (radians or degrees, chosen in step 36). Default 0 for migrated records.

## Chain expander (target)

```ts
// src/lib/projects/chain.ts
export function computeEffectiveChain(
  rootRuleIds: readonly RuleId[],
  resolve: (id: RuleId) => Rule | null,
): { chain: Rule[]; cycle?: RuleId[] } {
  const seen = new Set<RuleId>();
  const stack: RuleId[] = [];
  const out: Rule[] = [];
  function visit(id: RuleId): RuleId[] | null {
    if (stack.includes(id)) return [...stack.slice(stack.indexOf(id)), id];
    if (seen.has(id)) return null;
    const r = resolve(id);
    if (!r) return null;
    stack.push(id);
    for (const dep of r.appliesBefore) {
      const cyc = visit(dep);
      if (cyc) return cyc;
    }
    stack.pop();
    seen.add(id);
    out.push(r);
    return null;
  }
  for (const id of rootRuleIds) {
    const cyc = visit(id);
    if (cyc) return { chain: out, cycle: cyc };
  }
  return { chain: out };
}
```

The exact code lives in the facade; this snippet is the reference so PRs can be reviewed against a fixed algorithm.

## UI implications

- `/setup/rules` shows both rules and categories with a filter chip (All / Rules / Categories).
- `<RuleEditor>` renders identically for rule and category; when `isCategory`, it shows `notes` and hides the `Pocket Size` selector (or renders it as informational).
- Project editor's Rules section shows a per-row derived badge naming the expanded pre-rules (`X3 runs X1, X2 first`).
- Deleting a rule shows the referrers dialog before allowing removal.

## Verification triggers

- Any PR that adds a new persistence field on `Rule` or `Project` must update this file.
- `computeEffectiveChain` unit tests (`src/lib/projects/__tests__/chain.test.ts`) must cover: empty, single, nested, shared ancestor dedupe, direct cycle, indirect cycle.
- Playwright fixture `My Proj 1` must render the expanded chain `[X1, X2, X3, X4]` in the editor.
