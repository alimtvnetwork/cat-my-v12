import { ClientLogger } from "@/lib/observability/client-logger";
// Shared facade contracts and runtime helpers.
//
// Purpose: prevent drift between seeders and facade consumers. Every
// domain-specific facade in the app follows the same lifecycle
// (lazy hydrate, in-memory map, JSON array on the wire, per-row Zod
// validation, subscribe fan-out). Historically each facade re-implemented
// that block inline, which meant a schema change had to be mirrored in
// three places by hand. This module centralises the contract so a change
// in one place either propagates by types or is caught by TS.
//
// Nothing in this file talks to a specific storage backend; facades still
// pick their own `ProjectRepositoryFacade` implementation.

import type { z } from "zod";

/**
 * A schema whose output is `T` and whose input is `unknown`. Facade
 * hydrations read arbitrary JSON, so we cannot commit to the schema's
 * declared input type here; using `unknown` lets refined/branded schemas
 * (e.g. `RuleSchema` with a `ZodEffects` wrapper) plug in cleanly.
 */
export type FacadeRowSchema<T> = z.ZodType<T, z.ZodTypeDef, unknown>;

/**
 * Minimal shape every domain entity persisted through a facade must expose.
 * Enforced by `AsyncCrudFacade` so callers cannot store an entity whose id
 * type does not match the facade's id type parameter.
 */
export interface FacadeEntity<TId extends string> {
  readonly id: TId;
}

/**
 * Uniform asynchronous CRUD surface for facades that persist a bag of
 * entities keyed by id (rules, mic-settings, image-samples, ...).
 * `save` and `remove` return promises so remote backends can slot in
 * without changing callers.
 */
export interface AsyncCrudFacade<TId extends string, TEntity extends FacadeEntity<TId>> {
  list(): TEntity[];
  get(id: TId): TEntity | undefined;
  save(entry: TEntity): Promise<TEntity>;
  remove(id: TId): Promise<void>;
  subscribe(listener: () => void): () => void;
  /** Test-only. Forces a re-read from storage. */
  __hydrate(): Promise<void>;
}

/**
 * Result of an autoseed run. `null` marks "skipped, nothing to do" so the
 * caller can distinguish a first-run from an idempotent no-op.
 */
export type SeedRunResult = { seeded: number } | null;

/**
 * Every seeder in the app should conform to this shape. `flag` is the
 * localStorage key that gates re-runs; `run()` must be idempotent.
 */
export interface AutoSeeder {
  readonly flag: string;
  run(): Promise<SeedRunResult>;
}

/**
 * Parse a JSON-array payload from a facade store into validated rows.
 * Invalid rows are dropped with a `console.warn` tagged by `source`, so a
 * single broken row cannot poison the whole hydration. The returned array
 * is typed as the Zod output of `schema`, guaranteeing that callers only
 * ever see fully validated entities.
 */
export function parseFacadeRows<T>(
  raw: string | null,
  schema: FacadeRowSchema<T>,
  source: string,
): T[] {
  if (!raw) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch (err) {
    ClientLogger.error(`[${source}] hydrate parse failed`, err);

    return [];
  }

  if (Array.isArray(arr) === false) {
    ClientLogger.warn(`[${source}] hydrate payload was not an array`, typeof arr);

    return [];
  }

  const out: T[] = [];
  for (const row of arr) {
    const r = schema.safeParse(row);

    if (r.success) out.push(r.data);
    else ClientLogger.warn(`[${source}] dropped invalid row on hydrate`, r.error.issues);
  }

  return out;
}

/**
 * Canonical serializer for facade rows. Kept as a helper so a future
 * envelope change (versioning, compression) lands in exactly one place.
 */
export function serializeFacadeRows<T>(rows: readonly T[]): string {
  return JSON.stringify(rows);
}
