// Plan 86 Step 23: Memory facade variant for every seeded domain.
//
// Generic in-memory implementation of the frozen `DomainFacade<T>` contract
// (SS-09). Every per-slice memory facade (projects, categories, rulesets,
// rules, cameras, micSettings, samples, swatches, propertyPresets, settings,
// commands, emptyStates, errorScenarios) is a thin call to `createMemoryDomainFacade`.
//
// Purpose (per plan step 23):
//   - Unit tests and UI fixtures run without coupling to a storage impl.
//   - Orchestrator can seed a profile end-to-end against memory in tests.
//   - Ratchet in Step 40 asserts UI never imports storage primitives.
//
// Invariants (mirror SS-09):
//   1. Profile isolation: `upsertMany` stamps `profile: opts.profileId`;
//      `resetProfile` removes only rows with that profile; user rows (no
//      profile) are untouched.
//   2. Id-keyed upsert: duplicate ids inside a single `upsertMany` call throw.
//   3. `get` returns `undefined` on miss, never throws.
//   4. All writes are structural clones so callers cannot mutate internal state.

import type {
  DomainFacade,
  DomainRow,
  ResetProfileResult,
  UpsertManyResult,
} from "./domain-facade";
import type { SliceKey } from "@/lib/seed/schemas-v2";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createMemoryDomainFacade<T extends DomainRow>(slice: SliceKey): DomainFacade<T> {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  const rows = new Map<string, T>();

  const facade: DomainFacade<T> = {
    slice,

    async list(profileId?: string) {
      const all = Array.from(rows.values());
      const filtered = profileId ? all.filter((r) => r.profile === profileId) : all;

      return filtered.map(clone);
    },

    snapshot(profileId?: string) {
      const all = Array.from(rows.values());
      const filtered = profileId ? all.filter((r) => r.profile === profileId) : all;

      return filtered.map(clone);
    },

    async get(id: string) {
      const row = rows.get(id);

      return row ? clone(row) : undefined;
    },

    async count(profileId?: string) {
      if (!profileId) return rows.size;
      let n = 0;
      for (const r of rows.values()) if (r.profile === profileId) n += 1;

      return n;
    },

    async create(input: T) {
      if (!input?.id) {
        throw new Error(`[${slice}] create requires stable id`);
      }

      if (rows.has(input.id)) {
        throw new Error(`[${slice}] duplicate id on create: ${input.id}`);
      }

      const stored = clone(input);
      rows.set(stored.id, stored);
      notify();

      return clone(stored);
    },

    async update(id: string, patch: Partial<T>) {
      const current = rows.get(id);

      if (!current) {
        throw new Error(`[${slice}] update miss: ${id}`);
      }

      const next = { ...current, ...patch, id: current.id } as T;
      rows.set(id, next);
      notify();

      return clone(next);
    },

    async remove(id: string) {
      if (rows.delete(id)) notify();
    },

    async upsertMany(records, opts): Promise<UpsertManyResult> {
      const seen = new Set<string>();
      for (const r of records) {
        if (!r?.id) {
          throw new Error(`[${slice}] upsertMany row missing id`);
        }

        if (seen.has(r.id)) {
          throw new Error(`[${slice}] duplicate id in upsertMany batch: ${r.id}`);
        }

        seen.add(r.id);
      }

      let created = 0;
      let updated = 0;
      for (const r of records) {
        const stamped = { ...clone(r), profile: opts.profileId } as T;

        if (rows.has(r.id)) {
          rows.set(r.id, stamped);
          updated += 1;
        } else {
          rows.set(r.id, stamped);
          created += 1;
        }
      }

      if (created + updated > 0) notify();

      return { created, updated, skipped: 0 };
    },

    async resetProfile(profileId: string): Promise<ResetProfileResult> {
      let removed = 0;
      for (const [id, row] of Array.from(rows.entries())) {
        if (row.profile === profileId) {
          rows.delete(id);
          removed += 1;
        }
      }

      if (removed > 0) notify();

      return { removed };
    },

    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  };

  return facade;
}