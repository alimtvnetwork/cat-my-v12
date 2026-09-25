// Plan 90 Step 139 / Cross-UI alignment.
// Unified ruleset integer alias registry delegating to the shared
// `src/lib/ids/int-alias.ts` store (`IntAliasNamespaceType.Ruleset`).
//
// This eliminates the dual-storage bug where `ca.rulesetIdAlias.v1` and
// `ca.intAlias.v1` maintained divergent integer aliases for the same ruleset.

import {
  IntAliasNamespaceType,
  toIntParam,
  resolveIdParam,
  __resetIntAliasForTests,
} from "@/lib/ids/int-alias";

/** Return (creating if needed) the positive integer alias for a ruleset string id. */
export function toRulesetIntId(rulesetId: string): number {
  if (!rulesetId) throw new Error("[ruleset-id-alias] empty rulesetId");
  const param = toIntParam(IntAliasNamespaceType.Ruleset, rulesetId);
  return Number(param);
}

/** Reverse lookup: string ruleset id for an integer alias, or null if unknown. */
export function fromRulesetIntId(intId: number): string | null {
  if (Number.isInteger(intId) === false || intId <= 0) return null;
  const resolved = resolveIdParam(IntAliasNamespaceType.Ruleset, String(intId));
  return resolved && resolved !== String(intId) ? resolved : null;
}

/** Test-only. Wipe the alias table. */
export function __resetRulesetIdAliasForTests(): void {
  __resetIntAliasForTests();
}

