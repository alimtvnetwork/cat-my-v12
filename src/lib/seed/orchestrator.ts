// Unified seed orchestrator (Plan 100 Phase G, step 61).
//
// Root cause this file addresses: individual `autoSeed*IfEmpty` calls
// were wired ad-hoc inside `AutoSeedFromFacade`, each swallowing errors
// internally with a scattered `console.warn`. There was no single entry
// point, no aggregate outcome, no dedupe, and no way to prove from the
// logs which seeders actually ran, in which order, and how long each
// took. This module wraps every seeder in a uniform report envelope,
// single-flights the whole run so React StrictMode double-mounts don't
// double-seed, and emits one structured summary line.
//
// Seeders are called through injectable adapters so the vitest suite
// can substitute stubs without touching IndexedDB/localStorage.

import type { CatSeedProject } from "./types";
import { publishSeedReport } from "./telemetry-store";
import {
  runSeedGapCheck,
  isInvalid,
  hasInaccurateSpace,
  SEEDED_CAMERA_NAMES,
  SEEDED_MIC_SETTINGS_NAMES,
  type SeedGapReport,
} from "./gap-check";
import { SAMPLE_LIBRARY } from "@/lib/editor/sample-library";
import { DEFAULT_SWATCHES } from "@/lib/swatches/facade";
import bundle from "./data/bundle.json";
import type { CatSeedBundle } from "./types";

export enum SeederNameType {
  Rules = "rules",
  Projects = "projects",
  Cameras = "cameras",
  MicSettings = "mic-settings",
  ImageSamples = "image-samples",
  Bindings = "bindings",
}
export type SeederName = SeederNameType;

export enum SeederStatusType {
  Seeded = "seeded",
  Skipped = "skipped",
  Error = "error",
}
export type SeederStatus = SeederStatusType;

export interface SeederResult {
  name: SeederName;
  status: SeederStatus;
  /** Rows inserted by this seeder, when the seeder reports a count. */
  count: number | null;
  /** Wall clock milliseconds spent inside the seeder. */
  durationMs: number;
  /** Populated only when `status === "error"`. */
  error?: { message: string; name?: string };
}

export interface SeedRunReport {
  ok: boolean;
  totalMs: number;
  results: SeederResult[];
  /**
   * Gap check across swatches / categories / rules / rulesets / cameras
   * / mic-settings / projects / image-samples. Populated on every run;
   * `undefined` only if the gap check itself threw (recorded on
   * `fatalError`).
   */
  gaps?: SeedGapReport;
  /**
   * Populated when the orchestrator itself threw (not a per-seeder
   * failure). Consumers should treat this as fatal: `results` will be
   * partial and `ok === false`.
   */
  fatalError?: { message: string; name?: string };
}

export interface SeedOrchestratorAdapters {
  seedRules: () => Promise<number | null>;
  seedProjects: (projects: readonly CatSeedProject[]) => {
    createdProjectIds: string[];
  } | null;
  seedCameras: () => void;
  seedMicSettings: () => Promise<void>;
  seedImageSamples: () => Promise<void>;
  /**
   * Phase G step 68: resolve `cameraName` / `micSettingsName` on seed
   * projects into real facade ids and call `setProjectCamera` /
   * `setProjectMicSettings`. Runs after every other seeder so both sides
   * of every binding exist. Returns the number of bindings written; the
   * orchestrator reports that as `count`.
   */
  seedBindings: (projects: readonly CatSeedProject[]) => Promise<number> | number;
}

export interface RunAllSeedersOptions {
  projects: readonly CatSeedProject[];
  adapters: SeedOrchestratorAdapters;
  /** Injected clock, defaults to `performance.now` when available. */
  now?: () => number;
  /** Injected logger, defaults to `console`. Tests pass a spy. */
  logger?: Pick<Console, "info" | "warn">;
  /**
   * Optional post-run hook (Phase G step 64). Fires exactly once per
   * completed run with the aggregate report. Errors inside the hook are
   * caught and logged so they can't corrupt the single-flight guard.
   */
  onReport?: (report: SeedRunReport) => void;
}

let inFlight: Promise<SeedRunReport> | null = null;

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

async function runOne(
  name: SeederName,
  fn: () => Promise<number | null | void> | number | null | void,
  now: () => number,
  logger: Pick<Console, "info" | "warn">,
): Promise<SeederResult> {
  const started = now();
  try {
    const raw = await fn();
    const count = typeof raw === "number" ? raw : null;
    const status: SeederStatus = count === 0 ? SeederStatusType.Skipped : SeederStatusType.Seeded;

    return {
      name,
      status,
      count,
      durationMs: Math.round(now() - started),
    };
  } catch (err) {
    logger.warn(`[seed/orchestrator] ${name} failed`, err);

    return {
      name,
      status: SeederStatusType.Error,
      count: null,
      durationMs: Math.round(now() - started),
      error: toErrorPayload(err),
    };
  }
}

/**
 * Run every seeder in the required order and return a structured report.
 *
 * Order rationale: rules are independent, projects come from the seed
 * bundle and must complete before facades that bind by projectId
 * (image samples). Cameras and mic settings have no cross-facade
 * dependency and run in parallel after projects.
 *
 * Single-flight: repeated calls while a run is in progress return the
 * same promise so React StrictMode double-mounts do not double-seed.
 */
export function runAllSeeders(options: RunAllSeedersOptions): Promise<SeedRunReport> {
  if (inFlight) return inFlight;
  const now = options.now ?? defaultNow;
  const logger = options.logger ?? console;
  const started = now();

  inFlight = (async () => {
    const results: SeederResult[] = [];
    let fatalError: { message: string; name?: string } | undefined;
    try {
      // Phase 1: rules + projects. Projects is sync but wrapped for a
      // uniform report shape.
      const rules = await runOne(SeederNameType.Rules, options.adapters.seedRules, now, logger);
      results.push(rules);

      const projects = await runOne(
        SeederNameType.Projects,
        () => {
          const out = options.adapters.seedProjects(options.projects);

          return out ? out.createdProjectIds.length : 0;
        },
        now,
        logger,
      );
      results.push(projects);

      // Phase 2: facades that depend on the project store being populated
      // (image samples binds by projectId). Cameras + mic settings run in
      // parallel with samples because none of them cross-reference each
      // other.
      const [cameras, mic, samples] = await Promise.all([
        runOne(SeederNameType.Cameras, options.adapters.seedCameras, now, logger),
        runOne(SeederNameType.MicSettings, options.adapters.seedMicSettings, now, logger),
        runOne(SeederNameType.ImageSamples, options.adapters.seedImageSamples, now, logger),
      ]);
      results.push(cameras, mic, samples);

      // Phase 3: cross-facade bindings. Requires every other seeder to
      // have completed so name lookups succeed. Runs even when an upstream
      // seeder errored (it just no-ops on the missing side and logs the
      // unresolved binding).
      const bindings = await runOne(
        SeederNameType.Bindings,
        () => options.adapters.seedBindings(options.projects),
        now,
        logger,
      );
      results.push(bindings);
    } catch (err) {
      // Catastrophic failure: something above the per-seeder guard threw
      // (e.g. Promise.all rejected on a non-Error, or a bad adapter
      // shape). Record it on the report so callers still see an error
      // state instead of a hung promise.
      fatalError = toErrorPayload(err);
      logger.warn("[seed/orchestrator] fatal", err);
    }

    const totalMs = Math.round(now() - started);
    // Gap check across every by-name link in the seed bundle. Runs even
    // when a per-seeder errored so operators can see whether the missing
    // rows were the root cause of the broken links.
    let gaps: SeedGapReport | undefined;
    try {
      gaps = runSeedGapCheck(bundle as unknown as CatSeedBundle, {
        cameraNames: new Set(SEEDED_CAMERA_NAMES),
        micSettingsNames: new Set(SEEDED_MIC_SETTINGS_NAMES),
        sampleLibraryIds: new Set(SAMPLE_LIBRARY.map((s) => s.id)),
        swatches: new Set(DEFAULT_SWATCHES.map((s) => s.toLowerCase())),
      });

      if (isInvalid(gaps) || hasInaccurateSpace(gaps)) {
        logger.warn("[seed/orchestrator] gap check found broken links", {
          count: gaps.findings.length,
          byKind: gaps.countsByKind,
          findings: gaps.findings,
        });
      }
    } catch (err) {
      logger.warn("[seed/orchestrator] gap check threw", err);

      if (!fatalError) fatalError = toErrorPayload(err);
    }

    const isSeederSuccess = fatalError === undefined && results.every((r) => r.status !== "error");
    const isSuccess = isSeederSuccess && (gaps ? !isInvalid(gaps) : true);
    const report: SeedRunReport = fatalError
      ? { ok: isSuccess, totalMs, results, gaps, fatalError }
      : { ok: isSuccess, totalMs, results, gaps };
    logger.info("[seed/orchestrator] report", report);
    // Publish telemetry (module import: cheap, no react dependency). Any
    // subscriber crash is isolated so it can't corrupt the single-flight
    // guard. Explicit try/catch, no silent swallow.
    try {
      publishSeedReport(report);
    } catch (err) {
      logger.warn("[seed/orchestrator] telemetry publish failed", err);
    }

    if (options.onReport) {
      try {
        options.onReport(report);
      } catch (err) {
        logger.warn("[seed/orchestrator] onReport hook threw", err);
      }
    }

    return report;
  })();

  const settled = inFlight;
  settled.finally(() => {
    if (inFlight === settled) inFlight = null;
  });

  return settled;
}

/** Test-only reset for the single-flight guard. */
export function __resetSeedOrchestrator(): void {
  inFlight = null;
}

/**
 * Phase G step 63: clear the autoseed localStorage flags so the next
 * `runAllSeeders` call rehydrates from bundle. Silent no-op when
 * localStorage is unavailable (SSR, private-mode failures). Always
 * clears the single-flight guard so an in-flight run doesn't block
 * the reseed. Returns the flag keys touched (for logging + tests).
 */
export const SEED_FLAG_KEYS = [
  "ca:autoseeded:v1", // projects
  "ca:rules-autoseeded:v1", // rules
  "ca.camera.seed.v1", // cameras
] as const;

export interface ResetSeedFlagsResult {
  /** Flag keys we successfully removed. */
  cleared: readonly string[];
  /**
   * Keys we tried to remove but couldn't (localStorage.removeItem threw
   * on that specific key). Populated only in adversarial browsers.
   */
  failed: readonly { key: string; message: string }[];
  /**
   * `false` when `window.localStorage` was unreachable entirely (SSR,
   * private mode with disabled storage). Callers treat this as a soft
   * failure: the next auto-seed run will still no-op because in-memory
   * state is fresh, but persisted flags survive.
   */
  hadStorage: boolean;
}

export function resetSeedFlags(
  logger: Pick<Console, "info" | "warn"> = console,
): ResetSeedFlagsResult {
  inFlight = null;
  // Accessing `window.localStorage` throws in some sandboxed contexts
  // (Safari private mode, blocked third-party storage), so gate the
  // access itself, not just the truthiness of the returned handle.
  let storage: Storage | null = null;
  try {
    storage = typeof window !== "undefined" ? window.localStorage : null;
  } catch (err) {
    logger.warn("[seed/orchestrator] resetSeedFlags: localStorage access threw", err);
    storage = null;
  }

  if (!storage) {
    logger.warn("[seed/orchestrator] resetSeedFlags: no localStorage");

    return { cleared: [], failed: [], hadStorage: false };
  }

  interface SeedFailureEntry {
    key: string;
    message: string;
  }

  const cleared: string[] = [];
  const failed: SeedFailureEntry[] = [];
  for (const key of SEED_FLAG_KEYS) {
    try {
      storage.removeItem(key);
      cleared.push(key);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({ key, message });
      logger.warn("[seed/orchestrator] resetSeedFlags failed", { key, err });
    }
  }

  logger.info("[seed/orchestrator] flags cleared", { cleared, failed });

  return { cleared, failed, hadStorage: true };
}
