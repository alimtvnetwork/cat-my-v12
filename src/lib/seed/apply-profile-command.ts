import { ClientLogger } from "@/lib/observability/client-logger";
import { CommandIdType } from "@/lib/command-bus";
// Plan 86 Step 28: Command Palette handler for `cmd:apply-seed-profile`.
//
// Subscribes to the command bus and runs `runSeedV2({ bundle: bundle.v2.json,
// registry: defaultDomainRegistry, profileId })`. Any failure (validation,
// per-slice error, or fatal) is funneled through the errorStore so it lands
// in the Global Error Modal + History Drawer (Tier 1/2 of the error
// architecture). No silent swallows: even the happy path logs a single
// structured line consumers can grep.

import bundleV2 from "./data/bundle.v2.json";
import { runSeedV2, type SeedRunV2Report } from "./orchestrator-v2";
import { defaultDomainRegistry } from "@/lib/facades/registry";
import { onCommand } from "@/lib/command-bus";
import { FROZEN_PROFILE_IDS, SeedBundleValidationError } from "./schemas-v2";
import { validateBundleLoud } from "./validate-bundle-loud";
import { useErrorStore } from "@/lib/stores/errorStore";
import { setActiveProfile } from "./active-profile";

// Boot-time loud validation. If `bundle.v2.json` is malformed (duplicate ids,
// missing required fields, dangling FKs) this logs a grouped console.error
// report and forwards to the Global Error Modal via useErrorStore. We do NOT
// rethrow here: the orchestrator revalidates on every run, so keeping the app
// mounted lets the user open the error drawer to see what broke.
try {
  validateBundleLoud(bundleV2, {
    source: "bundle.v2.json (boot)",
    onError: (err) => {
      try {
        useErrorStore
          .getState()
          .captureError(
            err,
            { source: "seed-v2:boot-validate", context: { issues: err.issues } },
            "SEED_V2_BUNDLE_INVALID",
          );
      } catch {
        // errorStore unavailable (e.g. during SSR prerender) — console
        // group already emitted, nothing else to do.
      }
    },
  });
} catch (err) {
  if (!(err instanceof SeedBundleValidationError)) throw err;
}

export const FROZEN_SEED_PROFILES: ReadonlyArray<{ id: string; label: string }> = [
  { id: "prof-default-pcb", label: "Seed: Default sample PCB" },
  { id: "prof-soic-inspection", label: "Seed: SOIC inspection" },
  { id: "prof-connector-bank", label: "Seed: Connector bank" },
  { id: "prof-blister-qa", label: "Seed: Blister pack QA" },
  { id: "prof-empty-preview", label: "Seed: Empty-state preview" },
  { id: "prof-error-preview", label: "Seed: Error-state preview" },
  { id: "prof-ui-craft-demo", label: "Seed: UI craft demo" },
];

const FROZEN_IDS = new Set<string>(FROZEN_PROFILE_IDS);

export async function applySeedProfile(profileId: string): Promise<SeedRunV2Report | null> {
  if (FROZEN_IDS.has(profileId) === false) {
    const err = new Error(
      `[seed-v2] cmd:apply-seed-profile rejected: unknown profileId "${profileId}". ` +
        `Expected one of ${[...FROZEN_IDS].join(", ")}.`,
    );
    useErrorStore
      .getState()
      .captureError(
        err,
        { source: "cmd:apply-seed-profile", context: { profileId } },
        "SEED_V2_UNKNOWN_PROFILE",
      );

    return null;
  }

  ClientLogger.info("[seed-v2] cmd:apply-seed-profile start", { profileId });
  try {
    const report = await runSeedV2({
      bundle: bundleV2,
      registry: defaultDomainRegistry,
      profileId,
    });
    ClientLogger.info("[seed-v2] cmd:apply-seed-profile done", {
      profileId,
      ok: report.ok,
      totalMs: report.totalMs,
      writtenSlices: report.results.filter((r) => r.status === "written").length,
    });

    if (report.ok) {
      // Plan 86 Step 30: flip the global active-profile signal so
      // `useFacadeOrStore` starts preferring facade rows over legacy stores.
      setActiveProfile(profileId);
    } else {
      const failed = report.results.filter((r) => r.status === "error");
      const message = report.fatalError
        ? `[seed-v2] bundle validation failed: ${report.fatalError.message}`
        : `[seed-v2] slices failed: ${failed.map((s) => `${s.slice}(${s.error?.message ?? "?"})`).join("; ")}`;
      useErrorStore
        .getState()
        .captureError(
          new Error(message),
          { source: "cmd:apply-seed-profile", context: { profileId, report } },
          report.fatalError ? "SEED_V2_BUNDLE_INVALID" : "SEED_V2_SLICE_FAILURE",
        );
    }

    return report;
  } catch (err) {
    // Should not happen: runSeedV2 catches per-slice errors, but a bug in
    // the orchestrator itself lands here. Surface it, do not swallow.
    useErrorStore
      .getState()
      .captureError(
        err,
        { source: "cmd:apply-seed-profile", context: { profileId } },
        "SEED_V2_ORCHESTRATOR_CRASH",
      );

    return null;
  }
}

/**
 * Registers the command-bus handler. Idempotent per mount; returns an
 * unsubscribe. Call from a client-only effect (e.g. `__root.tsx`).
 */
export function registerApplySeedProfileHandler(): () => void {
  return onCommand(CommandIdType.CmdApplySeedProfile, (payload) => {
    void applySeedProfile(payload.profileId);
  });
}
