import { CommandIdType } from "@/lib/command-bus";
import { FatalReseedCauseType } from "@/lib/seed/telemetry-store";
import { FatalReseedModeType } from "@/lib/seed/telemetry-store";
import { ResetSummaryPhaseType } from "@/lib/seed/reset-summary-json";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BugErrorModal } from "../components/BugErrorModal";
import { ErrorDialogProvider } from "../components/errors/ErrorDialogProvider";
import { GlobalErrorModal } from "../components/errors/GlobalErrorModal";
import { EnvelopeErrorBoundary } from "../components/errors/EnvelopeErrorBoundary";
import { IpcErrorBridge } from "../lib/errors/ipcErrorBridge";
import { ErrorHistoryDrawer } from "../components/errors/ErrorHistoryDrawer";

import { Toaster } from "../components/ui/sonner";
import { RunningPill } from "../components/app-shell/RunningPill";
import { GlobalCliStatusWidget } from "../components/cli/GlobalCliStatusWidget";
import { AgentLogo } from "../components/cli/AgentLogo";
import { useCliHotkeys } from "../hooks/use-cli-hotkeys";
import { CliLiveRegionHost } from "../components/cli/LiveRegion";

import { CommandPalette } from "../components/nav/CommandPalette";
import { ShortcutsDialog } from "../components/nav/ShortcutsDialog";
import { LayoutHotkeys } from "../components/app-shell/LayoutHotkeys";
import { GlobalHomeAffordance } from "../components/nav/GlobalHomeAffordance";
import { AppShellNav } from "../components/app-shell/nav";
import { AppShellSidebar } from "../components/app-shell/sidebar";
import { StandardAppShellNav } from "../components/app-shell/StandardAppShellNav";
import { useUiPrefsStore } from "../lib/ui-prefs-store";
import { useSingleHeaderInvariant } from "../lib/dev/single-header-invariant";
import { useProjectStore } from "../lib/projects/store";
import { autoSeedIfEmpty } from "../lib/projects/seed";
import { bindSeededProjects } from "../lib/projects/seed-bindings";
import { autoSeedRulesIfEmpty } from "../lib/rules/seed";
import { runBootReconcile } from "../lib/rules/bootReconcile";
import { autoSeedCamerasIfEmpty } from "../lib/camera/seed";
import { autoSeedMicSettingsIfEmpty } from "../lib/mic-settings/seed";
import { autoSeedImageSamplesIfEmpty } from "../lib/image-samples/seed";
import { runAllSeeders, resetSeedFlags } from "../lib/seed/orchestrator";
import type { SeedRunReport } from "../lib/seed/orchestrator";
import { logFatalReseed } from "../lib/seed/telemetry-store";
import {
  buildResetSummaryJson,
  emitResetSummaryJson,
  copyResetSummaryJson,
  type ResetSummaryJson,
} from "../lib/seed/reset-summary-json";
import { toast } from "sonner";
import { onCommand } from "../lib/command-bus";
import { registerApplySeedProfileHandler } from "../lib/seed/apply-profile-command";
import { installGlobalErrorCapture } from "../lib/errors/globalCapture";
import { useErrorStore } from "../lib/errors/errorStore";
import { showToastError } from "../lib/errors/notify";
import { SeedProvider, SeedRecoveryToast, useSeedSlice } from "../lib/seed";
import { ThemeController } from "../components/theme/ThemeController";
import { ShortcutProvider } from "../components/shortcuts/ShortcutProvider";
import { ShortcutCheatSheet } from "../components/shortcuts/ShortcutCheatSheet";
import { AltMnemonicLayer } from "../components/shortcuts/AltMnemonicLayer";
import { InputModalityTracker } from "../hooks/useInputModality";
import { InlineEditNavigationGuard } from "../components/shell/InlineEditNavigationGuard";
import { LiveAnnouncer } from "../components/a11y/LiveAnnouncer";
import { BackendProvider } from "../lib/backend/provider";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Control Automation, Pick a workflow" },
      {
        name: "description",
        content:
          "Configure the line, open a project, run a trial, or batch-test a ruleset with AI. Every screen is one click away.",
      },
      { name: "author", content: "Control Automation" },
      { property: "og:title", content: "Control Automation, Pick a workflow" },
      {
        property: "og:description",
        content:
          "Configure the line, open a project, run a trial, or batch-test a ruleset with AI. Every screen is one click away.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Control Automation, Pick a workflow" },
      {
        name: "twitter:description",
        content:
          "Configure the line, open a project, run a trial, or batch-test a ruleset with AI. Every screen is one click away.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8b7124bd-5659-42c8-a731-2d024bbfb18c/id-preview-67cb3264--6f894d1f-b67f-4abb-bd4c-850fa2db5583.lovable.app-1784195500308.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8b7124bd-5659-42c8-a731-2d024bbfb18c/id-preview-67cb3264--6f894d1f-b67f-4abb-bd4c-850fa2db5583.lovable.app-1784195500308.png",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Ubuntu:wght@500;700&family=Poppins:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" data-theme="dark" style={{ colorScheme: "dark" }}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const uiFlavor = useUiPrefsStore((s) => s.uiFlavor);
  useSingleHeaderInvariant();
  // Plan 90 Step 132: gmail/vim-style CLI hotkeys (g s / g r / g p / g c, /, j, k).
  useCliHotkeys();

  // run.ps1 launcher handoff: honour `?ds=seed|backend&backend=<url>` once.
  useEffect(() => {
    void import("../lib/data-source/url-bootstrap").then((m) => m.applyDataSourceFromUrl());
  }, []);

  // Route uncaught errors + unhandled rejections into the Global Error Modal.
  // Idempotent inside `installGlobalErrorCapture`, so StrictMode double-mounts
  // don't attach duplicate listeners.
  useEffect(() => {
    const uninstall = installGlobalErrorCapture();

    return uninstall;
  }, []);

  // Plan 71 Step 15: hydrate persisted error history from the SDK facade so
  // reloads keep the audit trail. Idempotent (merges by id).
  useEffect(() => {
    void useErrorStore.getState().hydrateFromStorage();
  }, []);

  // Plan 90 Step 138 + 141: boot reconciliation for locally-cached RuleSet
  // drafts. Runs `reconcileDrafts()` once per page load and toasts every
  // drift entry (server-newer / local-newer) with an "Open" action that
  // deep-links back into the editor via `fromRulesetIntId`. Never throws;
  // a failed pass is logged and the shell continues to boot.
  const router = useRouter();
  useEffect(() => {
    let isCancelled = false;
    void import("../lib/rules/ruleset-id-alias").then(({ fromRulesetIntId }) => {
      if (isCancelled) return;
      void runBootReconcile({
        onOpenRuleSet: (intId) => {
          const rulesetId = fromRulesetIntId(intId);

          if (!rulesetId) {
            console.warn("[__root] boot toast: no alias for ruleset intId", { intId });

            return;
          }

          const rs = useProjectStore.getState().rulesets[rulesetId];

          if (!rs) {
            console.warn("[__root] boot toast: ruleset not in store", { rulesetId });

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

  return (
    <QueryClientProvider client={queryClient}>
      {/* Theme variant sync: mirrors the persisted `theme` pref (dark /
          light / system) onto <html> so `.dark` + `.light` chrome tokens
          and shadcn semantic tokens flip together. Mounted once at the
          root so every route inherits the same resolved theme. */}
      <ThemeController />
      <BackendProvider>
      {/* Plan 72 step 11: UI seed facade provider. Wraps the entire tree so
          every route can call useSeedContext / useSeedBundle / useSeedSlice.
          `SeedProvider` owns one `UiSeedFacade` instance and logs source +
          version + load errors (spec/03-error-manage: no silent failure). */}
      <SeedProvider>
        {/* Plan 72 step 13: auto-seed bridge. Runs inside the provider so it
            can wait for both the seed bundle and the persisted project
            store to be ready before calling `autoSeedIfEmpty`. */}
        <AutoSeedFromFacade />
        {/* Plan 86 Step 28: mount the `cmd:apply-seed-profile` handler so
            Command Palette entries can flip v2 seed profiles at runtime. */}
        <ApplySeedProfileMount />
        {/* Plan 72 step 20: non-blocking recovery toast. Renders only
            when the SeedProvider is in the error state. Sibling of the
            <Outlet />, not a modal, because the app remains usable with
            a broken seed (spec/03-error-manage §3). */}
        <SeedRecoveryToast />
        {/* Plan 90 Step 103: intercept `EnvelopeError` (thrown by beFetch and
            during render) and route into GlobalErrorModal via useErrorStore. */}
        <EnvelopeErrorBoundary>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </EnvelopeErrorBoundary>
      </SeedProvider>
      </BackendProvider>
      {/* Spec/21-app/40 §6 - BugError modal surfaced from anywhere via `ca:bug-error`. */}
      <BugErrorModal />
      {/* Plan 43 slice-1: global error dialog (Dev/Test) + toast (Prod). */}
      <ErrorDialogProvider />
      {/* Plan 71 Step 10: Global Error Modal (spec/03-error-manage §5). Single mount, store-driven. */}
      <GlobalErrorModal />
      {/* Plan 90 Step 78: bridge CLI IPC `Error` frames -> Global Error Modal. */}
      <IpcErrorBridge />
      {/* Ctrl/Cmd+Shift+E error history drawer. Single mount, store-driven. */}
      <ErrorHistoryDrawer />

      {/* Sonner toast host for confirm-delete undo (Rule Sets) and other transient actions. */}
      <Toaster />
      {/* Plan 66 SH-05: floating operator (drag, click-to-jump, persist). */}
      <RunningPill />
      {/* Plan 90 Step 123: global CLI status widget (worker state, IPC backlog, last error). */}
      <GlobalCliStatusWidget />
      {/* Plan 90 Step 129: agent logo brand mark (fixed top-left, deep-links to /cli/sessions). */}
      <AgentLogo />
      {/* Plan 90 Step 133: a11y polite/assertive live-region host for tail updates. */}
      <CliLiveRegionHost />

      {/* Plan 66 SH-06: global Command Palette (Cmd/Ctrl+K, Cmd/Ctrl+Shift+P). */}
      <CommandPalette />
      <ShortcutsDialog />
      <LayoutHotkeys />
      {/* Plan 100 §13 steps 12-13: registry-driven shortcut dispatcher +
          Ctrl/Cmd+/ cheat sheet listing every registered shortcut. */}
      <ShortcutProvider />
      <ShortcutCheatSheet />
      <AltMnemonicLayer />
      <InputModalityTracker />
      {/* Plan 100 Phase C step 22: prompt on SPA navigation when any
          shared InlineEdit editor holds an unsaved draft. */}
      <InlineEditNavigationGuard />
      {/* Plan 83 backlog item 21: sr-only live regions for imperative
          announcements (copy details success, seed reset outcomes, etc.). */}
      <LiveAnnouncer />
      {/* Plan 75 - Issue 15: fallback Home link on routes without HmiShell.
          Hidden via CSS when the app-shell titlebar is mounted. */}
      {uiFlavor === "modern" ? (
        <>
          <GlobalHomeAffordance />
          {/* Plan 63: app-shell nav + sidebar. CSS-gated to shell-less routes. */}
          <AppShellNav />
          <AppShellSidebar />
        </>
      ) : (
        <StandardAppShellNav />
      )}
    </QueryClientProvider>
  );
}

// Bridge: watches the seed provider (`useSeedSlice("projects")`) and the
// persisted project store, then calls `autoSeedIfEmpty` once both are
// ready. Silent selection is not acceptable (spec/03-error-manage): every
// branch logs why it fired or skipped.
function ApplySeedProfileMount() {
  // Plan 86 Step 28: subscribes to `cmd:apply-seed-profile` once per mount.
  // Handler is defined in `lib/seed/apply-profile-command.ts` so it can be
  // tested in isolation without React.
  useEffect(() => registerApplySeedProfileHandler(), []);

  return null;
}

function AutoSeedFromFacade() {
  const { data: seedProjects, status, error } = useSeedSlice("projects");
  // Every seed.reset run must produce a single summary toast (success or
  // failure) that carries an 8-char correlation id badge, so operators
  // can cross-reference the toast with the Global Error Modal history
  // and the console `[seed/telemetry] fatal` line. Success runs mint a
  // fresh id; failure runs reuse the correlation id captured by
  // `logFatalReseed` so the toast points at the same entry.
  const showResetSummaryToast = (input: {
    ok: boolean;
    title: string;
    description: string;
    correlationId: string;
    /** When provided, exposes a "Copy JSON" action on the toast. */
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
  // Phase G bootstrap gate: the auto path must fire exactly once per
  // page load. `useEffect` deps already dedupe most re-renders, but a
  // `status` flip (error → ready after a manual reload) or React
  // StrictMode double-mount could re-enter. The ref makes intent
  // explicit and pairs with the orchestrator's in-flight guard.
  const autoRanRef = useRef(false);

  useEffect(() => {
    if (status === "error") {
      // Load failure is already logged by SeedProvider. Do not seed:
      // seeding with no bundle would poison the flag and hide the issue.
      console.warn("[projects/seed] auto-seed skipped, seed bundle failed to load", error);

      return;
    }

    if (status !== "ready" || !seedProjects) return;

    // The bindings adapter returns a plain count for the orchestrator's
    // uniform report shape, but the operator needs the FULL unresolved
    // list (missing key + available names + guidance). Capture the last
    // result via closure ref so the effect can surface it after the run
    // without changing the orchestrator's SeederResult contract.
    let lastBindings: Awaited<ReturnType<typeof bindSeededProjects>> | null = null;
    const run = (): Promise<SeedRunReport> =>
      // Phase G step 61: single orchestrator entry point. Every seeder
      // is idempotent; the orchestrator single-flights concurrent
      // invocations and emits one aggregated report.
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

    // Central, one-shot surfacing for unresolved seed bindings. Runs after
    // every seed pass (auto and reset+reseed). Contextual: names the
    // project, the missing kind, the wanted key, and the guidance hint.
    const surfaceUnresolvedBindings = () => {
      const unresolved = lastBindings?.unresolved ?? [];

      if (unresolved.length === 0) return;
      // Group by kind for a compact toast, but preserve per-project detail
      // in the error store (context field) so the modal shows everything.
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
      console.warn("[seed-bindings] unresolved surfaced", unresolved);
    };

    // Unified finalizer: same failure surfacing for auto boot and
    // reset+reseed. Previously the auto path only surfaced unresolved
    // bindings, so a per-seeder crash on first load went silent to the
    // error modal without a toast. This routes both paths through the
    // same "fatal → errored → unresolved" ladder.
    const finalizeSeedRun = (report: SeedRunReport, mode: "auto" | "reset") => {
      // Structured console summary so operators get a single, greppable
      // line per seed pass (both auto boot and reset+reseed) plus the
      // full fatalError payload on the failure path.
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
        console.info("[seed/orchestrator] summary", summary);
      } else {
        console.error("[seed/orchestrator] summary", summary);

        if (report.fatalError) {
          console.error("[seed/orchestrator] fatalError", {
            name: report.fatalError.name,
            message: report.fatalError.message,
          });
        }

        for (const r of report.results.filter((x) => x.status === "error")) {
          console.error(`[seed/orchestrator] seeder "${r.name}" failed`, r.error);
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

    // Reset + reseed: keyed on the Command Palette entry. Surfaces the
    // outcome via sonner + errorStore so an operator sees success or
    // failure without opening devtools.
    const handleResetAndReseed = async () => {
      console.info("[seed/orchestrator] cmd:reset-and-reseed received");
      const reset = resetSeedFlags();

      if (!reset.hadStorage) {
        console.error("[seed/orchestrator] reset summary", {
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
        console.error("[seed/orchestrator] reset summary", {
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
        // Still fall through: run the seeders so the caller sees the
        // per-seeder outcome as well.
      }

      const report = await run();
      finalizeSeedRun(report, "reset");
    };
    const off = onCommand(CommandIdType.CmdResetAndReseed, () => {
      void handleResetAndReseed();
    });

    // Auto path: one-shot per mount. Command Palette reseed reuses the
    // same `run()` closure but bypasses the gate on purpose (operator
    // action, deliberate re-entry).
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
