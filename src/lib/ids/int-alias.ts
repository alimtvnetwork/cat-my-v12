// Generic integer-alias table for URL-facing IDs.
//
// Rules use their own `src/lib/rules/rule-id-alias.ts` (kept for back-compat).
// Every other URL-facing entity (project, ruleset, run, category, ...) routes
// through this file so the address bar always shows a small positive integer
// instead of an opaque uuid/slug, while the underlying store keeps its
// string ids untouched.
//
// Storage layout:
//   ca.intAlias.v1 → { [ns]: { next: number, map: { [realId]: number } } }

export enum IntAliasNamespaceType {
  Project = "project",
  Ruleset = "ruleset",
  Run = "run",
  Category = "category",
}
export type IntAliasNamespace = IntAliasNamespaceType;

type NsBucket = { next: number; map: Record<string, number> };
type Persisted = Partial<Record<IntAliasNamespace, NsBucket>>;

const STORAGE_KEY = "ca.intAlias.v1";

function readStore(): Persisted {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) return {};
    const parsed = JSON.parse(raw);

    return (parsed && typeof parsed === "object" ? parsed : {}) as Persisted;
  } catch (err) {
    console.warn("[int-alias] read failed, resetting", err);

    return {};
  }
}

function writeStore(store: Persisted): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn("[int-alias] write failed", err);
  }
}

function bucket(store: Persisted, ns: IntAliasNamespace): NsBucket {
  const existing = store[ns];

  if (
    existing &&
    typeof existing.next === "number" &&
    existing.map &&
    typeof existing.map === "object"
  ) {
    return existing;
  }

  const created: NsBucket = { next: 1, map: {} };
  store[ns] = created;

  return created;
}

/** Assign (or return existing) integer alias for a real id in the given namespace. */
export function toIntParam(ns: IntAliasNamespace, realId: string | undefined | null): string {
  if (!realId) return "";
  // If already numeric, treat as an alias and pass through.
  if (/^\d+$/.test(realId)) return realId;
  const store = readStore();
  const b = bucket(store, ns);
  const existing = b.map[realId];

  if (typeof existing === "number" && existing > 0) return String(existing);
  const assigned = b.next;
  b.map[realId] = assigned;
  b.next = assigned + 1;
  writeStore(store);

  return String(assigned);
}

/** Convert a URL param (int alias or legacy real id) back to the real id. */
export function resolveIdParam(ns: IntAliasNamespace, param: string | undefined | null): string {
  if (!param) return "";

  if (/^\d+$/.test(param) === false) return param; // legacy real id — pass through
  const n = Number(param);
  const store = readStore();
  const b = store[ns];

  if (!b) return param;
  for (const [realId, alias] of Object.entries(b.map)) {
    if (alias === n) return realId;
  }

  return param;
}

/**
 * Deterministic bulk-seed for a namespace. Assigns integer aliases to the
 * given real ids in lexicographic order so a fresh install always produces
 * the same URL numbers for the same seed. Existing entries are preserved
 * (URL bookmarks stay stable across upgrades). Runs in a single localStorage
 * round-trip; skips numeric-looking ids because those are already aliases.
 */
export function seedIntParams(ns: IntAliasNamespace, realIds: readonly string[]): void {
  if (typeof window === "undefined") return;

  if (realIds.length === 0) return;
  const store = readStore();
  const b = bucket(store, ns);
  const sorted = [
    ...new Set(
      realIds.filter(
        (id): id is string => typeof id === "string" && id.length > 0 && /^\d+$/.test(id) === false,
      ),
    ),
  ].sort();
  let isMutated = false;
  for (const id of sorted) {
    if (typeof b.map[id] === "number" && b.map[id] > 0) continue;
    b.map[id] = b.next;
    b.next += 1;
    isMutated = true;
  }

  if (isMutated) writeStore(store);
}

/** Test-only. Clear all alias tables. */
export function __resetIntAliasForTests(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
