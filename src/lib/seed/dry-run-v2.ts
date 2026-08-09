// Plan 86 follow-up: seed orchestrator DRY-RUN.
//
// Validates a `SeedBundleV2` and reports what the real orchestrator WOULD
// write for a given `profileId`, without touching any facade / IDB / memory
// store. Callable from the command palette, CI, or a Playwright setup step.
//
// Guarantees:
//   1. Runs `parseSeedBundleV2` first, which combines Zod shape checks,
//      integrity checks (frozen profiles, duplicate ids, unsupported
//      slices), and full cross-slice referential integrity. Any failure
//      surfaces as `fatalError` with the complete `SeedBundleValidationError`
//      issue list (never truncated to the first).
//   2. Applies the SAME `profileId` filter the real orchestrator uses
//      (`rowsForProfile`: keep rows without `profileId` or matching), so
//      per-slice `candidateRows` numbers match what a live seed would write.
//   3. Walks slices in `SEED_WRITE_ORDER` so the report reads in the same
//      order the orchestrator would execute.
//   4. Never calls any DomainFacade. No writes, no reads, no I/O beyond
//      the caller-supplied logger.
//   5. Emits structured info/warn/error lines so operators see the same
//      output whether they run this from a browser command, `bunx vitest`,
//      or a CI shell.

import {
  parseSeedBundleV2,
  SeedBundleValidationError,
  SLICE_ID_PREFIX,
  type SeedBundleV2,
  type SeedIssue,
  type SliceKey,
} from "./schemas-v2";
import { SEED_WRITE_ORDER } from "./orchestrator-v2";

export interface SliceDryRunResult {
  slice: SliceKey;
  totalRows: number;
  /** Rows the orchestrator would attempt to upsert for this profileId. */
  candidateRows: number;
}

export interface SeedDryRunV2Report {
  ok: boolean;
  profileId: string;
  totalMs: number;
  results: SliceDryRunResult[];
  /** Populated when shape/integrity/referential validation threw. */
  fatalError?: {
    message: string;
    name?: string;
    issues?: SeedIssue[];
  };
}

export interface DryRunSeedV2Options {
  bundle: unknown;
  profileId: string;
  now?: () => number;
  logger?: Pick<Console, "info" | "warn" | "error">;
}

function defaultNow(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function toFatal(err: unknown): SeedDryRunV2Report["fatalError"] {
  if (err instanceof SeedBundleValidationError) {
    return { message: err.message, name: err.name, issues: err.issues };
  }

  if (err instanceof Error) return { message: err.message, name: err.name };

  return { message: String(err) };
}

/** Mirrors `orchestrator-v2.ts` `rowsForProfile`. */
function candidateCount(rows: ReadonlyArray<{ profileId?: string }>, profileId: string): number {
  let n = 0;
  for (const r of rows) {
    if (r.profileId === undefined || r.profileId === profileId) n += 1;
  }

  return n;
}

function logIssues(
  logger: Pick<Console, "info" | "warn" | "error">,
  header: string,
  issues: readonly SeedIssue[],
): void {
  if (issues.length === 0) return;
  logger.warn(`[seed-v2:dry-run] ${header} (${issues.length}):`);
  for (const i of issues) {
    const parts = [`  - [${i.kind}]`, i.path, "-", i.message];

    if (i.expected !== undefined) parts.push(`(expected: ${i.expected})`);

    if (i.got !== undefined) parts.push(`(got: ${String(i.got)})`);
    logger.warn(parts.join(" "));
  }
}

export function dryRunSeedV2(options: DryRunSeedV2Options): SeedDryRunV2Report {
  const now = options.now ?? defaultNow;
  const logger = options.logger ?? console;
  const started = now();

  let parsed: SeedBundleV2;
  try {
    parsed = parseSeedBundleV2(options.bundle);
  } catch (err) {
    const fatalError = toFatal(err);
    logger.error(`[seed-v2:dry-run] bundle validation FAILED for profile "${options.profileId}"`);

    if (fatalError?.issues) logIssues(logger, "validation issues", fatalError.issues);
    else logger.error(`[seed-v2:dry-run] ${fatalError?.message ?? "unknown error"}`);

    return {
      ok: false,
      profileId: options.profileId,
      totalMs: Math.round(now() - started),
      results: [],
      fatalError,
    };
  }

  const results: SliceDryRunResult[] = SEED_WRITE_ORDER.map((slice) => {
    const rows = parsed[slice] as ReadonlyArray<{ profileId?: string }>;

    return {
      slice,
      totalRows: rows.length,
      candidateRows: candidateCount(rows, options.profileId),
    };
  });

  const totalMs = Math.round(now() - started);
  const report: SeedDryRunV2Report = {
    ok: true,
    profileId: options.profileId,
    totalMs,
    results,
  };

  logger.info(
    `[seed-v2:dry-run] OK profile="${options.profileId}" slices=${results.length} totalMs=${totalMs}`,
  );
  logger.info(
    `[seed-v2:dry-run] candidate rows per slice: ${results
      .map((r) => `${r.slice}=${r.candidateRows}/${r.totalRows}`)
      .join(", ")}`,
  );

  // Reference SLICE_ID_PREFIX to keep the frozen prefix set in scope for
  // downstream consumers that import from this module (no runtime effect).
  void SLICE_ID_PREFIX;

  return report;
}
