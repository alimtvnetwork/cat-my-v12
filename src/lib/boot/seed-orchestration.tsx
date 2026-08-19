import { ClientLogger } from "@/lib/observability/client-logger";
import { useEffect, useRef } from "react";
import { CommandIdType, onCommand } from "@/lib/command-bus";
import { registerApplySeedProfileHandler } from "@/lib/seed/apply-profile-command";
import { useSeedSlice } from "@/lib/seed";
import { autoSeedIfEmpty } from "@/lib/projects/seed";
import { bindSeededProjects } from "@/lib/projects/seed-bindings";
import { autoSeedRulesIfEmpty } from "@/lib/rules/seed";
import { autoSeedCamerasIfEmpty } from "@/lib/camera/seed";
import { autoSeedMicSettingsIfEmpty } from "@/lib/mic-settings/seed";
import { autoSeedImageSamplesIfEmpty } from "@/lib/image-samples/seed";
import { runAllSeeders, resetSeedFlags, type SeedRunReport } from "@/lib/seed/orchestrator";
import {
  logFatalReseed,
  FatalReseedCauseType,
  FatalReseedModeType,
} from "@/lib/seed/telemetry-store";
import {
  buildResetSummaryJson,
  emitResetSummaryJson,
  copyResetSummaryJson,
  type ResetSummaryJson,
  ResetSummaryPhaseType,
} from "@/lib/seed/reset-summary-json";
import { toast } from "sonner";
import { useErrorStore } from "@/lib/stores/errorStore";
import { showToastError } from "@/lib/errors/notify";
import { useProjectStore } from "@/lib/projects/store";
import { useRouter } from "@tanstack/react-router";
import { runBootReconcile } from "@/lib/rules/bootReconcile";

export function useSeedBootReconcile() {
  const router = useRouter();
  useEffect(() => {
    let isCancelled = false;
    void import("@/lib/rules/ruleset-id-alias").then(({ fromRulesetIntId }) => {
      if (isCancelled) return;
      void runBootReconcile({
        onOpenRuleSet: (intId) => {
          const rulesetId = fromRulesetIntId(intId);

          if (!rulesetId) {
            ClientLogger.warn("[__root] boot toast: no alias for ruleset intId", { intId });
            return;
          }

          const rs = useProjectStore.getState().rulesets[rulesetId];

          if (!rs) {
            ClientLogger.warn("[__root] boot toast: ruleset not in store", { rulesetId });
            return;
          }

          void router.navigate({
            to: "/projects/$projectId/rulesets/$rulesetId",
            params: { projectId: rs.projectId, rulesetId },
          });
        },
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [router]);
}

export function ApplySeedProfileMount(): React.JSX.Element | null {
  useEffect(() => registerApplySeedProfileHandler(), []);
  return null;
}

export function AutoSeedFromFacade(): React.JSX.Element | null {
  const { data: seedProjects, status, error } = useSeedSlice("projects");
  const showResetSummaryToast = (input: {
    ok: boolean;
    title: string;
    description: string;
    correlationId: string;
    json?: ResetSummaryJson;
  }) => {
    const badge = `[id: ${input.correlationId}]`;
    const description = `${input.description} ${badge}`;
    const copyAction = input.json
      ? {
          label: "Copy JSON",
          onClick: () => {
            const payload = input.json!;
            void copyResetSummaryJson(payload).then((ok) => {
              if (ok) toast.success("Reseed summary JSON copied");
              else toast.error("Copy failed; JSON logged to console");
            });
          },
        }
      : undefined;

    if (input.ok) {
      toast.success(input.title, {
        description,
        duration: 6_000,
        ...(copyAction ? { action: copyAction } : {}),
      });

      return;
    }

    toast.error(input.title, {
      description,
      duration: 10_000,
      action: {
        label: "View Details",
        onClick: () => {
          const store = useErrorStore.getState();
          const entry = store.history.find(
            (e: { correlationId: string }) => e.correlationId === input.correlationId,
          );

          if (entry) store.openErrorModal(entry);
        },
      },
      ...(copyAction
        ? {
            cancel: {
              label: "Copy JSON",
              onClick: copyAction.onClick,
            },
          }
        : {}),
    });
  };
  const makeRunCorrelationId = () => Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  const autoRanRef = useRef(false);

  useEffect(() => {
    if (status === "error") {
      ClientLogger.warn("[projects/seed] auto-seed skipped, seed bundle failed to load", error);
      return;
    }

    if (status !== "ready" || !seedProjects) return;

    let lastBindings: Awaited<ReturnType<typeof bindSeededProjects>> | null = null;
    const run = (): Promise<SeedRunReport> =>
      runAllSeeders({
        projects: seedProjects,
        adapters: {
          seedRules: autoSeedRulesIfEmpty,
          seedProjects: autoSeedIfEmpty,
          seedCameras: autoSeedCamerasIfEmpty,
          seedMicSettings: autoSeedMicSettingsIfEmpty,
          seedImageSamples: autoSeedImageSamplesIfEmpty,
          seedBindings: async (projects) => {
            const r = await bindSeededProjects(projects);
            lastBindings = r;
            return r.camerasBound + r.micSettingsBound;
          },
        },
      });

    const surfaceUnresolvedBindings = () => {
      const unresolved = lastBindings?.unresolved ?? [];

      if (unresolved.length === 0) return;
      const first = unresolved[0];
      const summary = `Seed binding unresolved: ${unresolved.length} project(s) could not resolve a ${first.missing === "camera" ? "camera" : "mic settings"} preset`;
      const err = new Error(
        unresolved
          .map((u: any) => `${u.projectName} → ${u.missing} "${u.wanted}" (${u.reason}). ${u.hint}`)
          .join("\n"),
      );
      err.name = "SeedBindingUnresolved";
      showToastError(summary, err, {
        source: "seed-bindings",
        method: "resolve",
      });
      ClientLogger.warn("[seed-bindings] unresolved surfaced", unresolved);
    };

    const finalizeSeedRun = (report: SeedRunReport, mode: "auto" | "reset") => {
      const seededCount = report.results.filter((r) => r.status === "seeded").length;
      const skippedCount = report.results.filter((r) => r.status === "skipped").length;
      const erroredCount = report.results.filter((r) => r.status === "error").length;
      const summary = {
        mode,
        ok: report.ok,
        totalMs: report.totalMs,
        seeders: report.results.length,
        seeded: seededCount,
        skipped: skippedCount,
        errored: erroredCount,
        fatal: Boolean(report.fatalError),
      };

      if (report.ok) {
        ClientLogger.info("[seed/orchestrator] summary", summary);
      } else {
        ClientLogger.error("[seed/orchestrator] summary", summary);

        if (report.fatalError) {
          ClientLogger.error("[seed/orchestrator] fatalError", {
            name: report.fatalError.name,
            message: report.fatalError.message,
          });
        }

        for (const r of report.results.filter((x) => x.status === "error")) {
          ClientLogger.error(`[seed/orchestrator] seeder "${r.name}" failed`, r.error);
        }
      }

      if (report.fatalError) {
        const fatal = new Error(report.fatalError.message);

        if (report.fatalError.name) fatal.name = report.fatalError.name;
        const event = logFatalReseed({
          mode: mode as FatalReseedModeType,
          cause: FatalReseedCauseType.OrchestratorThrow,
          report,
          error: {
            message: report.fatalError.message,
            name: report.fatalError.name,
          },
        });

        if (mode === "reset") {
          const correlationId = event.correlationId ?? makeRunCorrelationId();
          const json = buildResetSummaryJson({
            correlationId,
            phase: ResetSummaryPhaseType.Seeders,
            report,
          });
          emitResetSummaryJson(json);
          showResetSummaryToast({
            ok: false,
            title: "Reseed failed",
            description: report.fatalError.message,
            correlationId,
            json,
          });
        } else {
          showToastError("Initial seeding failed", fatal, {
            source: "seed-orchestrator",
            method: "bootstrap",
          });
        }

        return;
      }

      const errored = report.results.filter((r) => r.status === "error");

      if (errored.length > 0) {
        const first = errored[0];
        const event = logFatalReseed({
          mode: mode as FatalReseedModeType,
          cause: FatalReseedCauseType.SeederError,
          report,
          error: {
            message: `${errored.length} seeder(s) failed: ${errored
              .map((r) => `${r.name}: ${r.error?.message ?? "unknown"}`)
              .join("; ")}`,
            name: first.error?.name,
          },
        });

        if (mode === "reset") {
          const correlationId = event.correlationId ?? makeRunCorrelationId();
          const json = buildResetSummaryJson({
            correlationId,
            phase: ResetSummaryPhaseType.Seeders,
            report,
          });
          emitResetSummaryJson(json);
          showResetSummaryToast({
            ok: false,
            title: `Reseed finished with ${errored.length} error(s)`,
            description: errored
              .map((r) => `${r.name}: ${r.error?.message ?? "unknown"}`)
              .join("; "),
            correlationId,
            json,
          });
        } else {
          showToastError(
            `Initial seeding finished with ${errored.length} error(s)`,
            new Error(errored.map((r) => `${r.name}: ${r.error?.message ?? "unknown"}`).join("; ")),
            { source: "seed-orchestrator", method: "bootstrap" },
          );
        }
      } else if (mode === "reset") {
        const seeded = report.results.filter((r) => r.status === "seeded").length;
        const correlationId = makeRunCorrelationId();
        const json = buildResetSummaryJson({
          correlationId,
          phase: ResetSummaryPhaseType.Seeders,
          report,
        });
        emitResetSummaryJson(json);
        showResetSummaryToast({
          ok: true,
          title: "Reseed complete",
          description: `${seeded} seeder(s) ran in ${report.totalMs} ms.`,
          correlationId,
          json,
        });
      }

      surfaceUnresolvedBindings();
    };

    const handleResetAndReseed = async () => {
      ClientLogger.info("[seed/orchestrator] cmd:reset-and-reseed received");
      const reset = resetSeedFlags();

      if (!reset.hadStorage) {
        ClientLogger.error("[seed/orchestrator] reset summary", {
          mode: "reset",
          phase: "reset-flags",
          ok: false,
          reason: "no-storage",
        });
        const event = logFatalReseed({
          mode: FatalReseedModeType.Reset,
          cause: FatalReseedCauseType.ResetFlags,
          error: { message: "Browser storage is unavailable." },
          context: { hadStorage: false, failedKeys: [] },
        });
        const correlationId = event.correlationId ?? makeRunCorrelationId();
        const json = buildResetSummaryJson({
          correlationId,
          phase: ResetSummaryPhaseType.ResetFlags,
          ok: false,
          fatalError: { message: "Browser storage is unavailable." },
          resetFlags: { hadStorage: false, failedKeys: [] },
        });
        emitResetSummaryJson(json);
        showResetSummaryToast({
          ok: false,
          title: "Reseed skipped",
          description: "Browser storage is unavailable.",
          correlationId,
          json,
        });

        return;
      }

      if (reset.failed.length > 0) {
        ClientLogger.error("[seed/orchestrator] reset summary", {
          mode: "reset",
          phase: "reset-flags",
          ok: false,
          failedKeys: reset.failed.map((f) => f.key),
          failed: reset.failed,
        });
        const detail = reset.failed.map((f) => `${f.key}: ${f.message}`).join("; ");
        const event = logFatalReseed({
          mode: FatalReseedModeType.Reset,
          cause: FatalReseedCauseType.ResetFlags,
          error: {
            message: `resetSeedFlags failed for ${reset.failed.length} key(s): ${detail}`,
          },
          context: { failedKeys: reset.failed.map((f) => f.key) },
        });
        const correlationId = event.correlationId ?? makeRunCorrelationId();
        const json = buildResetSummaryJson({
          correlationId,
          phase: ResetSummaryPhaseType.ResetFlags,
          ok: false,
          fatalError: {
            message: `resetSeedFlags failed for ${reset.failed.length} key(s): ${detail}`,
          },
          resetFlags: {
            hadStorage: true,
            failedKeys: reset.failed.map((f) => f.key),
          },
        });
        emitResetSummaryJson(json);
        showResetSummaryToast({
          ok: false,
          title: "Reseed partially reset",
          description: `resetSeedFlags failed for ${reset.failed.length} key(s): ${detail}`,
          correlationId,
          json,
        });
      }

      const report = await run();
      finalizeSeedRun(report, "reset");
    };
    const off = onCommand(CommandIdType.CmdResetAndReseed, () => {
      void handleResetAndReseed();
    });

    if (autoRanRef.current) {
      return () => off();
    }

    autoRanRef.current = true;

    const persistApi = useProjectStore.persist;

    if (!persistApi || persistApi.hasHydrated()) {
      void run().then((r) => finalizeSeedRun(r, "auto"));

      return () => off();
    }

    const unsub = persistApi.onFinishHydration(() => {
      void run().then((r) => finalizeSeedRun(r, "auto"));
    });

    return () => {
      unsub();
      off();
    };
  }, [status, seedProjects, error]);

  return null;
}
