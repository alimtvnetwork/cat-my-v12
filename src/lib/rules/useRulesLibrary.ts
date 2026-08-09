// Plan 79 step 18. React 18 subscribable hook over RuleFacade.
//
// Design:
//   - useSyncExternalStore for tear-free reads (concurrent React safe).
//   - Snapshot is cached and only replaced when the underlying facade
//     actually notifies, so consumers keep stable identity between renders
//     (React bails out of updates on Object.is equality).
//   - Exposes derived helpers: rules only, categories only, byId lookup,
//     plus imperative save/remove that surface typed errors from
//     src/lib/rules/model.ts (RuleCycleError, RuleReferencedError,
//     BuiltinCategoryError, RuleValidationError).
//
// Errors are re-thrown, NEVER swallowed. Callers render them next to the
// offending field. This matches spec 21/40 error surfacing.

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { makeRuleFacade, type RuleFacade } from "./facade";
import type { Rule, RuleId } from "./model";

export interface UseRulesLibrary {
  /** All rules and categories, insertion order from the facade. */
  all: readonly Rule[];
  /** `isCategory === false`. */
  rules: readonly Rule[];
  /** `isCategory === true`. */
  categories: readonly Rule[];
  /** Constant-time lookup. */
  byId: (id: RuleId) => Rule | undefined;
  /** Persist. Throws typed errors from the facade. */
  save: (rule: Rule) => Promise<Rule>;
  /** Delete. Throws RuleReferencedError / BuiltinCategoryError. */
  remove: (id: RuleId) => Promise<void>;
}

function makeSnapshotCache(facade: RuleFacade) {
  // Ref-stable snapshot: only rebuild when notify() fires.
  let cache: readonly Rule[] = facade.list();
  let isDirty = true;

  return {
    get(): readonly Rule[] {
      if (isDirty) {
        cache = facade.list();
        isDirty = false;
      }

      return cache;
    },
    invalidate(): void {
      isDirty = true;
    },
  };
}

export function useRulesLibrary(injected?: RuleFacade): UseRulesLibrary {
  const facade = injected ?? makeRuleFacade();

  // One cache per facade instance per component. useRef survives renders.
  const cacheRef = useRef<ReturnType<typeof makeSnapshotCache> | null>(null);

  if (!cacheRef.current) cacheRef.current = makeSnapshotCache(facade);
  const cache = cacheRef.current;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return facade.subscribe(() => {
        cache.invalidate();
        onStoreChange();
      });
    },
    [facade, cache],
  );

  const getSnapshot = useCallback((): readonly Rule[] => cache.get(), [cache]);

  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const rules = useMemo(() => all.filter((r) => !r.isCategory), [all]);
  const categories = useMemo(() => all.filter((r) => r.isCategory), [all]);
  const index = useMemo(() => {
    const m = new Map<RuleId, Rule>();
    for (const r of all) m.set(r.id, r);

    return m;
  }, [all]);

  const byId = useCallback((id: RuleId) => index.get(id), [index]);
  const save = useCallback((rule: Rule) => facade.save(rule), [facade]);
  const remove = useCallback((id: RuleId) => facade.remove(id), [facade]);

  return { all, rules, categories, byId, save, remove };
}
