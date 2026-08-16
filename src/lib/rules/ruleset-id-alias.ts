import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 90 Step 139. Stable integer alias for ruleset string ids.
//
// Why: `RuleSetEnvelope.RuleSetId` is `number` (wire contract with the BE
// SQLite schema), but the router + `useProjectStore` key rulesets by
// opaque string ids (seeded slugs, generated uuids). This module assigns
// a stable positive integer per string ruleset id, persisted to
// localStorage so aliases survive reloads, and exposes a reverse lookup
// so boot-toast deep-links can navigate from an envelope back to the
// editor route.
//
// Mirrors `src/lib/rules/rule-id-alias.ts` byte-for-byte in shape so the
// two tables never diverge.

const STORAGE_KEY = "ca.rulesetIdAlias.v1";

type Persisted = { next: number; map: Record<string, number> };

function readStore(): Persisted {
  if (typeof window === "undefined") return { next: 1, map: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) return { next: 1, map: {} };
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    const map =
      parsed.map && typeof parsed.map === "object" ? (parsed.map as Record<string, number>) : {};
    const next = typeof parsed.next === "number" && parsed.next > 0 ? Math.floor(parsed.next) : 1;

    return { next, map };
  } catch (err) {
    ClientLogger.warn("[ruleset-id-alias] read failed, resetting", err);

    return { next: 1, map: {} };
  }
}

function writeStore(store: Persisted): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    ClientLogger.warn("[ruleset-id-alias] write failed", err);
  }
}

/** Return (creating if needed) the positive integer alias for a ruleset string id. */
export function toRulesetIntId(rulesetId: string): number {
  if (!rulesetId) throw new Error("[ruleset-id-alias] empty rulesetId");
  const store = readStore();
  const existing = store.map[rulesetId];

  if (typeof existing === "number" && Number.isInteger(existing) && existing > 0) {
    return existing;
  }

  const assigned = store.next;
  store.map[rulesetId] = assigned;
  store.next = assigned + 1;
  writeStore(store);

  return assigned;
}

/** Reverse lookup: string ruleset id for an integer alias, or null if unknown. */
export function fromRulesetIntId(intId: number): string | null {
  if (Number.isInteger(intId) === false || intId <= 0) return null;
  const store = readStore();
  for (const [rulesetId, n] of Object.entries(store.map)) {
    if (n === intId) return rulesetId;
  }

  return null;
}

/** Test-only. Wipe the alias table (does not clear other localStorage keys). */
export function __resetRulesetIdAliasForTests(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
