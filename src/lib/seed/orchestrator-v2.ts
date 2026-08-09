// Plan 86 Step 25: v2 seed orchestrator.
//
// Reads a `SeedBundleV2` (see `schemas-v2.ts`) and fans it out through a
// `DomainFacadeRegistry` (see `../facades/domain-facade.ts`) in the exact
// dependency order frozen by SS-09. This is the single entry point that
// downstream slice migrations (Steps 26+) plug into. Nothing else in the
// app should call `upsertMany` per slice directly for seed purposes.
//
// Guarantees (map 1:1 to SS-09 invariants):
//   1. Validates the bundle via `parseSeedBundleV2` before any write, so a
//      malformed JSON never touches storage.
//   2. Walks slices in `SEED_WRITE_ORDER` so relational refs resolve at
//      write time.
//   3. Every write is idempotent (`upsertMany`), scoped to `profileId`.
//      Running the same profile twice yields identical row counts and
//      never clobbers user-authored rows (they carry no `profile` field).
//   4. Missing facades are recorded as `skipped`, not a crash. This lets
//      Steps 26-38 land one slice at a time.
//   5. Per-slice failures are captured on the report; the run continues so
//      operators see the full picture instead of one error masking others.
//   6. Single-flight guard prevents StrictMode double-seeding.

import { parseSeedBundleV2, type SeedBundleV2, type SliceKey, SLICE_ID_PREFIX } from "./schemas-v2";
import type {
  DomainFacade,
  DomainFacadeRegistry,
  DomainRow,
  UpsertManyResult,
} from "../facades/domain-facade";

/**
 * SS-09 point 3: exact dependency order. Do NOT reorder without a plan step.
 * Rationale per slice:
 *   - categories/cameras/micSettings/swatches/propertyPresets/settings: master
 *     data, no cross-refs.
 *   - projects: refs categories + cameras + micSettings by id.
 *   - samples: refs projects.
 *   - rulesets: refs projects.
 *   - rules: refs rulesets + categories.
 *   - commands/emptyStates/errorScenarios: presentation-only, run last.
 */
export const SEED_WRITE_ORDER: readonly SliceKey[] = [
  "categories",
  "cameras",
  "micSettings",
  "swatches",
  "propertyPresets",
  "settings",
  "projects",
  "samples",
  "rulesets",
  "rules",
  "commands",
  "emptyStates",
  "errorScenarios",
] as const;

export enum SliceStatusType {
  Written = "written",
  SkippedNoFacade = "skipped-no-facade",
  SkippedEmpty = "skipped-empty",
  Error = "error",
}
export type SliceStatus = SliceStatusType;

export interface SliceResult {
  slice: SliceKey;
  status: SliceStatus;
  /** Row count considered for this profile (post-filter). */
  candidateRows: number;
  /** Populated when `status === "written"`. */
  upsert?: UpsertManyResult;
  durationMs: number;
  /** Populated when `status === "error"`. */
  error?: { message: string; name?: string };
}

export interface SeedRunV2Report {
  ok: boolean;
  profileId: string;
  totalMs: number;
  results: SliceResult[];
  /** Set only when validation or a non-slice code path threw. */
  fatalError?: { message: string; name?: string };
}

export interface RunSeedV2Options {
  bundle: unknown; // parsed lazily so callers can pass raw JSON
  registry: DomainFacadeRegistry;
  profileId: string;
  now?: () => number;
  logger?: Pick<Console, "info" | "warn">;
}

let inFlight: Promise<SeedRunV2Report> | null = null;

function defaultNow(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function toErrorPayload(err: unknown): { message: string; name?: string } {
  if (err instanceof Error) return { message: err.message, name: err.name };

  return { message: String(err) };
}

/**
 * Filter slice rows to those belonging to `profileId`. Master-data slices
 * (SS-08: categories, rules, swatches, propertyPresets, settings) declare
 * no `profileId`; those rows always ship with every profile so relational
 * refs resolve regardless of which profile the user picks.
 */
function rowsForProfile<T extends DomainRow & { profileId?: string }>(
  rows: readonly T[],
  profileId: string,
): T[] {
  return rows.filter((r) => r.profileId === undefined || r.profileId === profileId);
}

async function runSlice(
  slice: SliceKey,
  bundle: SeedBundleV2,
  registry: DomainFacadeRegistry,
  profileId: string,
  now: () => number,
  logger: Pick<Console, "info" | "warn">,
): Promise<SliceResult> {
  const started = now();
  const facade = registry[slice] as DomainFacade<DomainRow & { profileId?: string }> | undefined;
  const rawRows = bundle[slice] as unknown as ReadonlyArray<DomainRow & { profileId?: string }>;
  const rows = rowsForProfile(rawRows, profileId);

  if (!facade) {
    return {
      slice,
      status: SliceStatusType.SkippedNoFacade,
      candidateRows: rows.length,
      durationMs: Math.round(now() - started),
    };
  }

  if (rows.length === 0) {
    return {
      slice,
      status: SliceStatusType.SkippedEmpty,
      candidateRows: 0,
      durationMs: Math.round(now() - started),
    };
  }

  // Sanity: every row id starts with the frozen prefix. schemas-v2 already
  // enforces this at parse time, but we re-check because a caller could
  // hand-inject rows past the validator (e.g. tests). Cheap and defensive.
  const prefix = SLICE_ID_PREFIX[slice];
  const badId = rows.find((r) => r.id.startsWith(prefix) === false);

  if (badId) {
    const message = `slice ${slice} row ${badId.id} missing prefix ${prefix}`;
    logger.warn(`[seed-v2] ${message}`);

    return {
      slice,
      status: SliceStatusType.Error,
      candidateRows: rows.length,
      durationMs: Math.round(now() - started),
      error: { message, name: "SeedPrefixError" },
    };
  }

  try {
    const upsert = await facade.upsertMany(rows, { profileId });

    return {
      slice,
      status: SliceStatusType.Written,
      candidateRows: rows.length,
      upsert,
      durationMs: Math.round(now() - started),
    };
  } catch (err) {
    logger.warn(`[seed-v2] slice ${slice} failed`, err);

    return {
      slice,
      status: SliceStatusType.Error,
      candidateRows: rows.length,
      durationMs: Math.round(now() - started),
      error: toErrorPayload(err),
    };
  }
}

export function runSeedV2(options: RunSeedV2Options): Promise<SeedRunV2Report> {
  if (inFlight) return inFlight;
  const now = options.now ?? defaultNow;
  const logger = options.logger ?? console;
  const started = now();

  inFlight = (async () => {
    const results: SliceResult[] = [];
    let fatalError: { message: string; name?: string } | undefined;
    let parsed: SeedBundleV2 | undefined;
    try {
      parsed = parseSeedBundleV2(options.bundle);
    } catch (err) {
      fatalError = toErrorPayload(err);
      logger.warn("[seed-v2] bundle validation failed", err);
      const totalMs = Math.round(now() - started);

      return {
        ok: false,
        profileId: options.profileId,
        totalMs,
        results,
        fatalError,
      };
    }

    for (const slice of SEED_WRITE_ORDER) {
      const r = await runSlice(slice, parsed, options.registry, options.profileId, now, logger);
      results.push(r);
    }

    const ok = results.every((r) => r.status !== "error");
    const totalMs = Math.round(now() - started);
    const report: SeedRunV2Report = { ok, profileId: options.profileId, totalMs, results };
    logger.info("[seed-v2] report", report);

    return report;
  })();

  const settled = inFlight;
  settled.finally(() => {
    if (inFlight === settled) inFlight = null;
  });

  return settled;
}

/** Test-only reset for the single-flight guard. */
export function __resetSeedV2(): void {
  inFlight = null;
}
