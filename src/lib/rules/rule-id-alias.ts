import { ClientLogger } from "@/lib/observability/client-logger";
// Rule-ID integer alias.
//
// Rule IDs across the app are opaque strings (seeded slugs, generated
// `r-<n>` ids, uuids). The URL segment `$ruleId` should render as a
// user-friendly positive integer instead. This helper assigns a stable
// integer alias per string id and persists the mapping to localStorage
// so aliases survive reloads. Internal storage stays strings; only the
// URL is remapped.

const STORAGE_KEY = "ca.ruleIdAlias.v1";

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
    ClientLogger.warn("[rule-id-alias] read failed, resetting", err);

    return { next: 1, map: {} };
  }
}

function writeStore(store: Persisted): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    ClientLogger.warn("[rule-id-alias] write failed", err);
  }
}

/** Return (creating if needed) the positive integer alias for a string rule id. */
export function toIntId(ruleId: string): number {
  if (!ruleId) throw new Error("[rule-id-alias] empty ruleId");
  const store = readStore();
  const existing = store.map[ruleId];

  if (typeof existing === "number" && Number.isInteger(existing) && existing > 0) {
    return existing;
  }

  const assigned = store.next;
  store.map[ruleId] = assigned;
  store.next = assigned + 1;
  writeStore(store);

  return assigned;
}

/** Reverse lookup: string id for a given integer alias, or null if unknown. */
export function fromIntId(intId: number): string | null {
  if (Number.isInteger(intId) === false || intId <= 0) return null;
  const store = readStore();
  for (const [ruleId, n] of Object.entries(store.map)) {
    if (n === intId) return ruleId;
  }

  return null;
}

/**
 * Deterministic bulk-seed. Given the full set of rule ids present after
 * hydration, assign integer aliases in a stable order (lexicographic sort
 * of the raw ids) so a fresh install always produces the same mapping for
 * the same seed. Existing entries are preserved so URLs users have already
 * bookmarked remain stable across upgrades. Runs in a single read/write
 * pair to avoid N localStorage round-trips.
 */
export function seedIntIds(ruleIds: readonly string[]): void {
  if (typeof window === "undefined") return;

  if (ruleIds.length === 0) return;
  const store = readStore();
  // Sort defensively so callers don't have to. Lexicographic on the raw
  // id string is deterministic across browsers/locales when using the
  // default comparator (byte order).
  const sorted = [
    ...new Set(ruleIds.filter((id) => typeof id === "string" && id.length > 0)),
  ].sort();
  let isMutated = false;
  for (const id of sorted) {
    if (typeof store.map[id] === "number" && store.map[id] > 0) continue;
    store.map[id] = store.next;
    store.next += 1;
    isMutated = true;
  }

  if (isMutated) writeStore(store);
}

/** Test-only. Wipe the alias table (does not clear other localStorage keys). */
export function __resetRuleIdAliasForTests(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
