// Seed telemetry store (Plan 100 Phase G step 64).
//
// Root cause this file addresses: the orchestrator produced a structured
// `SeedRunReport` but nothing outside the console could see it. Errors
// were logged but never surfaced through the Global Error Modal, and
// the UI had no way to show "last seeded 20 ms ago, 3 seeded / 1
// skipped / 0 errored". This is a small subscribable store: the
// orchestrator publishes; a hook selects; errored results are pushed
// to the shared `useErrorStore` so users see them in the modal.

import { create } from "zustand";

import { useErrorStore } from "@/lib/errors/errorStore";
import type { SeedRunReport, SeederResult } from "./orchestrator";

const MAX_HISTORY = 10;
const MAX_FATAL_HISTORY = 20;

/**
 * Structured telemetry for the fatal reseed path (Plan 100 Phase G,
 * step 69). "Fatal" here means anything the operator should treat as
 * a failed reseed run: the orchestrator itself threw (`report.fatalError`),
 * one or more seeders threw (`status === "error"`), or the pre-flight
 * `resetSeedFlags` couldn't clear localStorage. We keep a bounded ring
 * of events plus per-cause counters so a future diagnostics pane can
 * show "3 fatal reseeds in the last hour, all failing on `image-samples`".
 * Each event carries a stable id so the Global Error Modal correlation
 * id can be cross-referenced with the seed history.
 */
export enum FatalReseedModeType {
  Auto = "auto",
  Reset = "reset",
}
export type FatalReseedMode = FatalReseedModeType;
export enum FatalReseedCauseType {
  OrchestratorThrow = "orchestrator-throw",
  SeederError = "seeder-error",
  ResetFlags = "reset-flags",
}
export type FatalReseedCause = FatalReseedCauseType;

export interface FatalReseedEvent {
  id: string;
  timestamp: number;
  mode: FatalReseedMode;
  cause: FatalReseedCause;
  /** Message + name from the primary failure (fatal, first errored seeder, or reset). */
  error: { message: string; name?: string };
  /** Wall-clock duration of the run, when available. */
  totalMs: number | null;
  /** Names of seeders that reported `status === "error"`. */
  failedSeeders: readonly string[];
  /** Correlation id linking to `useErrorStore` when captured. */
  correlationId?: string;
}

export interface FatalReseedCounters {
  total: number;
  byMode: Record<FatalReseedMode, number>;
  byCause: Record<FatalReseedCause, number>;
  bySeeder: Record<string, number>;
}

function emptyCounters(): FatalReseedCounters {
  return {
    total: 0,
    byMode: { auto: 0, reset: 0 },
    byCause: {
      "orchestrator-throw": 0,
      "seeder-error": 0,
      "reset-flags": 0,
    },
    bySeeder: {},
  };
}

export interface SeedTelemetryState {
  /** Most recent report, or null before the first run. */
  lastReport: SeedRunReport | null;
  /** Newest-first, bounded to MAX_HISTORY. */
  history: SeedRunReport[];
  /** Newest-first, bounded to MAX_FATAL_HISTORY. */
  fatalHistory: FatalReseedEvent[];
  fatalCounters: FatalReseedCounters;
  publish: (report: SeedRunReport) => void;
  logFatal: (event: FatalReseedEvent) => void;
  __reset: () => void;
}

export const useSeedTelemetryStore = create<SeedTelemetryState>((set) => ({
  lastReport: null,
  history: [],
  fatalHistory: [],
  fatalCounters: emptyCounters(),
  publish: (report) => {
    set((s) => ({
      lastReport: report,
      history: [report, ...s.history].slice(0, MAX_HISTORY),
    }));
  },
  logFatal: (event) => {
    set((s) => {
      const counters: FatalReseedCounters = {
        total: s.fatalCounters.total + 1,
        byMode: { ...s.fatalCounters.byMode },
        byCause: { ...s.fatalCounters.byCause },
        bySeeder: { ...s.fatalCounters.bySeeder },
      };
      counters.byMode[event.mode] += 1;
      counters.byCause[event.cause] += 1;
      for (const name of event.failedSeeders) {
        counters.bySeeder[name] = (counters.bySeeder[name] ?? 0) + 1;
      }

      return {
        fatalHistory: [event, ...s.fatalHistory].slice(0, MAX_FATAL_HISTORY),
        fatalCounters: counters,
      };
    });
  },
  __reset: () =>
    set({
      lastReport: null,
      history: [],
      fatalHistory: [],
      fatalCounters: emptyCounters(),
    }),
}));

/**
 * Publish a report into the telemetry store and, for every errored
 * seeder, capture a `CapturedError` so it appears in the Global Error
 * Modal. Called by the orchestrator; keep dependency-free of React so
 * it can be invoked from any surface.
 */
export function publishSeedReport(report: SeedRunReport): void {
  useSeedTelemetryStore.getState().publish(report);
  const errored: SeederResult[] = report.results.filter((r) => r.status === "error");

  if (errored.length === 0) return;
  const capture = useErrorStore.getState().captureError;
  for (const r of errored) {
    const err = new Error(r.error?.message ?? `Seeder ${r.name} failed with no message`);

    if (r.error?.name) err.name = r.error.name;
    capture(
      err,
      {
        source: "seed-orchestrator",
        context: { seeder: r.name, durationMs: r.durationMs },
      },
      "E_SEED_FAILURE",
    );
  }
}

function makeEventId(): string {
  // 8-char base36 is plenty for a bounded ring; matches CapturedError
  // correlation id length so operators can eyeball the mapping.
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Emit a structured fatal-reseed telemetry event. This is the single
 * choke point for the "the reseed didn't work" path so we can count
 * frequency (`fatalCounters.total`), attribute root cause
 * (`fatalCounters.bySeeder`), and cross-reference to the Global Error
 * Modal via `correlationId`. Callers should invoke this AFTER
 * `publishSeedReport` so per-seeder `E_SEED_FAILURE` captures already
 * exist when the summary lands.
 *
 * Emits one `console.warn` with a stable prefix (`[seed/telemetry] fatal`)
 * so log-scrapers can filter without regex-parsing per-seeder lines.
 * Also captures an `E_SEED_FATAL` in the Global Error Modal so operators
 * see the aggregate cause (not just each seeder's leaf error).
 */
export function logFatalReseed(input: {
  mode: FatalReseedMode;
  cause: FatalReseedCause;
  report?: SeedRunReport | null;
  error: { message: string; name?: string };
  /** Extra context merged into the Global Error Modal payload. */
  context?: Record<string, unknown>;
}): FatalReseedEvent {
  const failedSeeders =
    input.report?.results.filter((r) => r.status === "error").map((r) => r.name) ?? [];
  const totalMs = input.report?.totalMs ?? null;

  const err = new Error(input.error.message);

  if (input.error.name) err.name = input.error.name;
  const captured = useErrorStore.getState().captureError(
    err,
    {
      source: "seed-orchestrator",
      method: input.mode,
      context: {
        cause: input.cause,
        failedSeeders,
        totalMs,
        // Per-seeder durations help identify slow-then-fail patterns.
        seederDurations: input.report?.results.map((r) => ({
          name: r.name,
          status: r.status,
          durationMs: r.durationMs,
        })),
        ...input.context,
      },
    },
    "E_SEED_FATAL",
  );

  const event: FatalReseedEvent = {
    id: makeEventId(),
    timestamp: Date.now(),
    mode: input.mode,
    cause: input.cause,
    error: { ...input.error },
    totalMs,
    failedSeeders,
    correlationId: captured.correlationId,
  };
  useSeedTelemetryStore.getState().logFatal(event);

  // Single structured line, stable prefix, JSON-shaped so a scraper can
  // ingest it without touching the per-seeder warnings. Intentionally a
  // warn (not error) so the Playwright console-error assertion in the
  // existing regression tests still passes.
  console.warn("[seed/telemetry] fatal", {
    id: event.id,
    correlationId: event.correlationId,
    mode: event.mode,
    cause: event.cause,
    error: event.error,
    totalMs: event.totalMs,
    failedSeeders: event.failedSeeders,
  });

  return event;
}
