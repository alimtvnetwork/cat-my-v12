// Plan 67 step 41 (PR-06): pure override-chain resolver.
//
// A ruleset can be authored "direct" (independent), "reference" (live
// pointer to a parent ruleset, follows parent edits), or "snapshot"
// (frozen copy at clone time). The parent link lives on
// `parentRulesetId`, and the picker needs to render a compact chain so
// operators can see which ruleset ultimately drives the rule list.
//
// Kept as a pure helper so the Run picker rebuild (step 42) and later
// validation dialogs can reuse the same walk without a store hook.
import type { RuleSet } from "./store";

export interface OverrideChainNode {
  id: string;
  name: string;
  mode: NonNullable<RuleSet["overrideMode"]>;
}

export interface OverrideChainResult {
  /** Root->leaf order. First entry is the ultimate ancestor. */
  chain: OverrideChainNode[];
  /** True when a `reference` cycle was detected and walk was truncated. */
  isTruncated: boolean;
}

const MAX_DEPTH = 16;

export function resolveOverrideChain(
  ruleset: RuleSet,
  rulesetsById: Record<string, RuleSet>,
): OverrideChainResult {
  const chain: OverrideChainNode[] = [];
  const seen = new Set<string>();
  let cursor: RuleSet | undefined = ruleset;
  let isTruncated = false;
  while (cursor && chain.length < MAX_DEPTH) {
    if (seen.has(cursor.id)) {
      isTruncated = true;
      break;
    }

    seen.add(cursor.id);
    chain.unshift({
      id: cursor.id,
      name: cursor.name,
      mode: cursor.overrideMode ?? "direct",
    });
    const parentId: string | undefined = cursor.parentRulesetId;

    if (!parentId) break;
    const next: RuleSet | undefined = rulesetsById[parentId];

    if (!next) {
      // Dangling parent: surface as truncated so UI can flag it.
      isTruncated = true;
      break;
    }

    cursor = next;
  }

  if (chain.length >= MAX_DEPTH && cursor?.parentRulesetId) isTruncated = true;

  return { chain, isTruncated };
}

/** Short human label like "Direct" or "Reference of Parent Name". */
export function summarizeOverrideChain(result: OverrideChainResult): string {
  const leaf = result.chain[result.chain.length - 1];

  if (!leaf) return "Unknown";

  if (leaf.mode === "direct") return "Direct";
  const parent = result.chain[result.chain.length - 2];
  const parentName = parent?.name ?? "unknown parent";
  const label = leaf.mode === "reference" ? "Reference" : "Snapshot";

  return `${label} of ${parentName}${result.isTruncated ? " (chain truncated)" : ""}`;
}
