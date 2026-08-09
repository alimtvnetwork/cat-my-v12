// Plan 79 step 16. Project effective-chain expander (V4).
//
// Sources of truth:
//   .lovable/memory/features/rule-category-project-model.md (Invariants 2, 5)
//   spec/21-app/53-ui-improvements-v4.md sections 4, 5
//   .lovable/plans/subtasks/79-ui-improvements-v4/SS-04-domain-model.md
//
// What this module does (and only this):
//   Given an ordered list of "root" rule ids the user picked for a project,
//   walk each rule's `appliesBefore` transitively and produce the flat,
//   deduped chain that will be evaluated at run time.
//
//   flatten(project.rules.map(r => [...expand(r.appliesBefore), r]))
//   then dedupeByIdKeepFirst.
//
//   `resolve(id)` returns the Rule or null when the id is dangling (rule
//   was deleted / referrer guard bypassed). Dangling refs are dropped
//   silently so a broken project can still render; callers get to see the
//   missing id via the `missing` field on the result.
//
// Cycle handling:
//   `appliesBefore` cycles are ALSO rejected at save time by the rule
//   facade (see src/lib/rules/facade.ts detectCycle). This expander is
//   the second line of defense: if a cycle sneaks in via manual JSON
//   import or a race, we stop the walk and return the cycle path so the
//   UI can surface it instead of infinite-looping.
//
// Pure data. No React, no persistence, no side effects.

import type { Rule, RuleId } from "@/lib/rules/model";

export interface ChainResult {
  /** Deduped, ordered list of rules to run. Empty on total cycle failure. */
  chain: Rule[];
  /**
   * Path from the root that closed a cycle, e.g. [A, B, C, A]. Present
   * only when the walk aborted. When present, `chain` holds the rules
   * that were successfully expanded BEFORE the cycle was hit.
   */
  cycle?: RuleId[];
  /** Ids that could not be resolved. Never blocks the walk. */
  missing: RuleId[];
  /**
   * Ids that resolved successfully but were skipped because the rule has
   * `enabled === false`. Plan 83 backlog 11c: the inline toggle in
   * `/setup/rules` sets this flag and the runtime must honour it.
   * Categories are structural and cannot be disabled, so this list
   * contains rule ids only. Missing == enabled per model.ts contract.
   */
  disabled: RuleId[];
}

/**
 * Expand a project's `rules: RuleId[]` into the full evaluation order.
 *
 * Matches the reference algorithm in
 * `.lovable/memory/features/rule-category-project-model.md` §Chain expander.
 */
export function computeEffectiveChain(
  rootRuleIds: readonly RuleId[],
  resolve: (id: RuleId) => Rule | null,
): ChainResult {
  const seen = new Set<RuleId>();
  const stack: RuleId[] = [];
  const onStack = new Set<RuleId>();
  const out: Rule[] = [];
  const missing = new Set<RuleId>();
  const disabled = new Set<RuleId>();

  function visit(id: RuleId): RuleId[] | null {
    if (onStack.has(id)) {
      // Close the cycle: slice from first occurrence of id in stack and
      // append id again so the returned path is A -> B -> C -> A.
      const from = stack.indexOf(id);

      return [...stack.slice(from), id];
    }

    if (seen.has(id)) return null;
    const rule = resolve(id);

    if (!rule) {
      missing.add(id);

      return null;
    }
    // Plan 83 backlog 11c. Disabled rules are excluded from the evaluation
    // chain and their `appliesBefore` deps are NOT traversed on their
    // behalf: "applies before" is only meaningful for a rule that runs.
    // Deps still land in `out` if another enabled root pulls them.
    if (!rule.isCategory && rule.enabled === false) {
      disabled.add(id);
      seen.add(id);

      return null;
    }

    stack.push(id);
    onStack.add(id);
    for (const dep of rule.appliesBefore) {
      const cyc = visit(dep);

      if (cyc) {
        // Unwind stack so caller state is clean, then bubble the cycle up.
        stack.pop();
        onStack.delete(id);

        return cyc;
      }
    }

    stack.pop();
    onStack.delete(id);
    seen.add(id);
    out.push(rule);

    return null;
  }

  for (const id of rootRuleIds) {
    const cyc = visit(id);

    if (cyc) {
      return { chain: out, cycle: cyc, missing: [...missing], disabled: [...disabled] };
    }
  }

  return { chain: out, missing: [...missing], disabled: [...disabled] };
}
