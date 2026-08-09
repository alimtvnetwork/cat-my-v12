// Plan 86 Step 26: concrete categories DomainFacade (v2 pipeline).
//
// Frozen by SS-09; slice `categories` is master-data (no `profileId` on
// bundle rows, no cross-slice refs), so it goes first in
// `SEED_WRITE_ORDER` (see `../seed/orchestrator-v2.ts`).
//
// This module intentionally does NOT touch `src/lib/rules/facade.ts`
// (which today mixes category rows into the rules store as
// "category rules"). Per SS-09 invariant 6 the legacy storage is
// wrapped, not replaced, until Step 35. For the v2 pipeline the
// authoritative surface is this facade + `defaultDomainRegistry`.
//
// Row shape mirrors what `bundle.v2.json` ships today (id, name, color,
// order, optional description). Passthrough on unknown fields so the
// bundle can grow without breaking the facade seam.

import type { DomainRow } from "./domain-facade";
import { createMemoryDomainFacade } from "./memory-domain-facade";

export interface CategoryRow extends DomainRow {
  readonly id: string; // SS-08 prefix: `cat-`
  readonly name: string;
  readonly color?: string;
  readonly order?: number;
  readonly description?: string;
  // Master-data: no `profileId`; `profile` gets stamped on write by the
  // memory facade so `resetProfile` can scope teardown.
}

/**
 * Module-level singleton. Same reason every slice will use a singleton:
 * facade subscribers (React `useSyncExternalStore`) need a stable
 * reference across renders, and the orchestrator needs the same instance
 * every call so idempotency ratchets work.
 */
export const categoriesFacade = createMemoryDomainFacade<CategoryRow>("categories");
