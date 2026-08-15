// Structured JSON summary for reset-and-reseed runs.
//
// Root cause this addresses: the reset+reseed path already emits a
// human-readable toast and per-seeder console lines, but there is no
// single machine-readable envelope that a debugger, screen-recorder,
// or log scraper can copy in one shot. This helper produces one
// stable JSON payload per run (success or failure), covering both
// the pre-flight `resetSeedFlags` phase and the seeder pass.
//
// The payload shape is intentionally flat and stable so downstream
// tooling can key on top-level fields. Version-bump the `schema`
// field if you change field semantics.

import type { SeedRunReport, SeederResult } from "./orchestrator";

export const RESET_SUMMARY_JSON_SCHEMA = "seed.reset-summary/v1";
export const RESET_SUMMARY_JSON_PREFIX = "[seed/reset-summary/json]";

export enum ResetSummaryPhaseType {
  ResetFlags = "reset-flags",
  Seeders = "seeders",
}
export type ResetSummaryPhase = ResetSummaryPhaseType;

export interface ResetSummaryJson {
  schema: typeof RESET_SUMMARY_JSON_SCHEMA;
  ok: boolean;
  mode: "reset";
  phase: ResetSummaryPhase;
  /** Correlation id shown on the toast and in the Global Error Modal. */
  correlationId: string;
  /** ISO 8601, wall-clock stamp captured when the summary is built. */
  emittedAt: string;
  totalMs: number | null;
  counts: {
    seeders: number;
    seeded: number;
    skipped: number;
    errored: number;
  };
  fatalError: { name?: string; message: string } | null;
  resetFlags: {
    hadStorage: boolean;
    failedKeys: string[];
  } | null;
  results: Array<{
    name: SeederResult["name"];
    status: SeederResult["status"];
    count: SeederResult["count"];
    durationMs: SeederResult["durationMs"];
    error: SeederResult["error"] | null;
  }>;
}

export interface BuildResetSummaryInput {
  correlationId: string;
  phase: ResetSummaryPhase;
  report?: SeedRunReport | null;
  fatalError?: { name?: string; message: string } | null;
  resetFlags?: { hadStorage: boolean; failedKeys: string[] } | null;
  ok?: boolean;
}

/**
 * Build the structured JSON summary. `ok` is derived from the report
 * unless overridden (for the pre-flight `reset-flags` failure path,
 * where there is no report yet).
 */
export function buildResetSummaryJson(input: BuildResetSummaryInput): ResetSummaryJson {
  const results = input.report?.results ?? [];
  const counts = {
    seeders: results.length,
    seeded: results.filter((r) => r.status === "seeded").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errored: results.filter((r) => r.status === "error").length,
  };
  const derivedOk =
    input.ok ??
    (input.report ? input.report.ok && !input.report.fatalError && counts.errored === 0 : false);

  return {
    schema: RESET_SUMMARY_JSON_SCHEMA,
    ok: derivedOk,
    mode: "reset",
    phase: input.phase,
    correlationId: input.correlationId,
    emittedAt: new Date().toISOString(),
    totalMs: input.report?.totalMs ?? null,
    counts,
    fatalError:
      input.fatalError ??
      (input.report?.fatalError
        ? {
            name: input.report.fatalError.name,
            message: input.report.fatalError.message,
          }
        : null),
    resetFlags: input.resetFlags ?? null,
    results: results.map((r) => ({
      name: r.name,
      status: r.status,
      count: r.count,
      durationMs: r.durationMs,
      error: r.error ?? null,
    })),
  };
}

/**
 * Emit the JSON payload to the console with a stable, greppable
 * prefix. Success runs use `console.info`, failures use `console.warn`
 * so the Playwright console-error assertion still passes. Returns the
 * stringified payload so callers can also expose it via a "Copy JSON"
 * toast action.
 */
export function emitResetSummaryJson(payload: ResetSummaryJson): string {
  const text = JSON.stringify(payload);
  const line = `${RESET_SUMMARY_JSON_PREFIX} ${text}`;

  if (payload.ok) console.info(line);
  else console.warn(line);

  return text;
}

/** Best-effort clipboard write; swallows unsupported-environment errors. */
export async function copyResetSummaryJson(payload: ResetSummaryJson): Promise<boolean> {
  const text = JSON.stringify(payload, null, 2);
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);

      return true;
    }
  } catch {
    // fall through to the DOM fallback
  }

  try {
    if (typeof document === "undefined") return false;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);

    return ok;
  } catch {
    return false;
  }
}
