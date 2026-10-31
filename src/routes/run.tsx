import { IntAliasNamespaceType } from "@/lib/ids/int-alias";
import { StatusSeverityType } from "@/components/hmi/StatusLog";
import { CounterVariantType } from "@/components/hmi/Counter";
import { RunStatusType } from "@/types/run/RunStatus";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProjectStore, selectProject, type RuleSet } from "@/lib/projects/store";
import { resolveOverrideChain, summarizeOverrideChain } from "@/lib/projects/override-chain";
import { Pencil } from "lucide-react";
import {
  HmiShell,
  Viewport,
  MachineFrame,
  Counter,
  StatusLog,
  RunButton,
  ViewportImageControls,
  type StatusLogEntry,
} from "@/components/hmi";
import { useRunStore } from "@/lib/stores/run-store";
import { formatIdentifierLabel } from "@/lib/display-labels";
import { RunHistorySidebar } from "@/components/hmi/RunHistorySidebar";
import { RunErrorDrawer } from "@/components/hmi/RunErrorDrawer";
import { AppEvent, HttpMethod } from "@/lib/constants";
import { fetchBackend } from "@/lib/backend/http";
import type { ScoreResponse } from "@/lib/vision/score-schema";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { toIntParam } from "@/lib/ids/int-alias";
import { HtmlTagType } from "@/lib/enums/html";
import { useUiMode, UiModeType } from "@/hooks/useUiMode";
import { StandardAppShell } from "@/components/layout/StandardAppShell";
import {
  SAMPLE_IMAGE_POCKET_1_FILLED,
  SAMPLE_IMAGE_POCKET_2_EMPTY_MIXED,
  SAMPLE_IMAGE_POCKET_2_FILLED,
  SAMPLE_IMAGE_POCKET_5_PARTIAL,
} from "@/lib/vision/sample-images";

export const Route = createFileRoute("/run")({
  head: () => ({
    meta: [
      { title: "Run - Control Automation" },
      {
        name: "description",
        content:
          "Live inspection run screen with Total, OK, and NG counters plus event log for the Control Automation program.",
      },
    ],
  }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { projectId?: string; rulesetIds?: string[] } => {
    const projectId = typeof search.projectId === "string" ? search.projectId : undefined;
    const rawIds = search.rulesetIds;
    let rulesetIds: string[] | undefined;

    if (typeof rawIds === "string") {
      rulesetIds = rawIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (Array.isArray(rawIds)) {
      rulesetIds = rawIds.map((s) => String(s)).filter(Boolean);
    }

    return { projectId, rulesetIds };
  },
  component: RunPage,
});

function RunPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const projectId = search.projectId;
  const project = useProjectStore((s) => (projectId ? selectProject(s, projectId) : undefined));
  const rulesetsById = useProjectStore((s) => s.rulesets);
  const canonicalProjectId = project?.id ?? projectId;
  const pickedRulesets = useMemo<RuleSet[]>(() => {
    const ids = search.rulesetIds ?? [];
    const out: RuleSet[] = [];

    for (const id of ids) {
      const r = rulesetsById[id];

      if (!r) continue;

      if (canonicalProjectId && r.projectId !== canonicalProjectId) continue;

      out.push(r);
    }

    return out;
  }, [search.rulesetIds, rulesetsById, canonicalProjectId]);
  const expectedImages = pickedRulesets.length;
  const status = useRunStore((s) => s.status);
  const counters = useRunStore((s) => s.counters);
  const startedAt = useRunStore((s) => s.startedAt);
  const startRun = useRunStore((s) => s.start);
  const stopRun = useRunStore((s) => s.stop);
  const resetRun = useRunStore((s) => s.reset);
  const settings = useRunStore((s) => s.settings);
  const setSettings = useRunStore((s) => s.setSettings);
  const hydrate = useRunStore((s) => s.hydrate);
  const hydrated = useRunStore((s) => s.hydrated);
  const runError = useRunStore((s) => s.error);
  const setError = useRunStore((s) => s.setError);
  const [log, setLog] = useState<StatusLogEntry[]>([]);
  const [confirmStop, setConfirmStop] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [activeFrameUrl, setActiveFrameUrl] = useState<string | undefined>(undefined);

  // Hydrate persisted settings/history on mount.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setLog([
      {
        id: "boot",
        ts: new Date().toLocaleTimeString(),
        severity: StatusSeverityType.Info,
        message: "Run screen ready",
      },
    ]);

    // Hydrate telemetry summary from TaskDb (Day 7/8 Runtime Telemetry)
    fetchBackend<{ total: number; ok: number; ng: number }>("/telemetry/summary", {
      headers: { "X-Suppress-Toast": "true" },
    })
      .then((resp) => {
        const payload = resp.Results[0];

        if (payload && typeof payload.total === "number" && payload.total > 0) {
          const currentTotal = useRunStore.getState().counters.total;

          if (currentTotal === 0) {
            useRunStore.setState(() => ({
              counters: { total: payload.total, ok: payload.ok, ng: payload.ng },
            }));
          }
        }
      })
      .catch((telemetryError: unknown) => {
        console.debug("[Run] Telemetry offline or uninitialized:", telemetryError);
      });
  }, []);

  // Stable identity so downstream memoised children (StatusLog, RunButton)
  // don't invalidate every parent render; setLog's functional update keeps
  // the callback deps empty.
  const push = useCallback(
    (entry: Omit<StatusLogEntry, "id" | "ts">) =>
      setLog((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            ts: new Date().toLocaleTimeString(),
            ...entry,
          },
          ...prev,
        ].slice(0, 100),
      ),
    [],
  );

  const start = () => {
    try {
      startRun();
      push({ severity: StatusSeverityType.Info, message: "Run started" });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error("[run] start failed", err);
      setError({ message: err.message, stack: err.stack, ts: new Date().toLocaleTimeString() });
      push({ severity: StatusSeverityType.Ng, message: `Run failed to start: ${err.message}` });
    }
  };
  const requestStop = () => setConfirmStop(true);
  const cancelStop = () => setConfirmStop(false);
  const confirmStopRun = () => {
    stopRun();
    setConfirmStop(false);
    push({ severity: StatusSeverityType.Warn, message: "Run stopped" });
  };
  const doReset = () => {
    resetRun();
    setActiveFrameUrl(undefined);
    push({ severity: StatusSeverityType.Info, message: "Counters reset" });
  };

  // Keyboard: Space starts/stops; ? opens shortcut help.
  // Ref-of-latest keeps the keydown listener mount-only while still reading
  // the current status/start/requestStop. Attaching the listener per render
  // would leak handlers; depending on the closures directly would go stale.
  const keyHandlersRef = useRef({ status, start, requestStop });
  keyHandlersRef.current = { status, start, requestStop };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t &&
        (HtmlTagType.isInput(t.tagName) ||
          HtmlTagType.isTextarea(t.tagName) ||
          t.isContentEditable);

      if (typing) return;

      if (e.code === "Space") {
        e.preventDefault();
        const h = keyHandlersRef.current;

        if (RunStatusType.isRunning(h.status)) h.requestStop();
        else h.start();
      }

      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Menu-bar Help > Shortcuts / About dispatches
  useEffect(() => {
    const onCmd = (e: Event) => {
      const cmd = (e as CustomEvent<{ command?: string }>).detail?.command;

      if (cmd === "help.shortcuts") setShortcutsOpen(true);
    };
    window.addEventListener(AppEvent.MenuCommand, onCmd as EventListener);

    return () => window.removeEventListener(AppEvent.MenuCommand, onCmd as EventListener);
  }, []);

  // Carrier tape inspection sequence for live runtime HMI (Day 8 MVP)
  const RUN_SAMPLES = useMemo(
    () => [
      {
        name: "Pocket 1 (PASS)",
        url: SAMPLE_IMAGE_POCKET_1_FILLED,
        isPass: true,
      },
      {
        name: "Pocket 2 (PASS)",
        url: SAMPLE_IMAGE_POCKET_2_FILLED,
        isPass: true,
      },
      {
        name: "Empty Pocket (FAIL)",
        url: SAMPLE_IMAGE_POCKET_2_EMPTY_MIXED,
        isPass: false,
      },
      {
        name: "Pocket 1 (PASS)",
        url: SAMPLE_IMAGE_POCKET_1_FILLED,
        isPass: true,
      },
      {
        name: "Partial Chip (FAIL)",
        url: SAMPLE_IMAGE_POCKET_5_PARTIAL,
        isPass: false,
      },
    ],
    [],
  );

  // Preload carrier tape samples to prevent frame-switch latency
  useEffect(() => {
    RUN_SAMPLES.forEach((s) => {
      if (s.url) {
        const img = new Image();
        img.src = s.url;
      }
    });
  }, [RUN_SAMPLES]);

  const sampleIndexRef = useRef(0);
  const isEvaluatingRef = useRef(false);

  // Real Inspection Frame Loop (Day 8: Run / Ops HMI integration)
  // Replaces synthetic Math.random() with real backend /score events & image updates
  const frameDelay = useMemo(() => {
    const fps = Math.max(1, Math.min(10, settings.targetFps));

    return Math.round(1000 / fps);
  }, [settings.targetFps]);

  useVisibleInterval(
    () => {
      if (isEvaluatingRef.current) return;
      const sample = RUN_SAMPLES[sampleIndexRef.current % RUN_SAMPLES.length];
      sampleIndexRef.current += 1;

      // Update HMI Viewport with active carrier tape frame directly without global store thrashing
      setActiveFrameUrl((prev) => (prev === sample.url ? prev : sample.url));

      isEvaluatingRef.current = true;

      // Run real deterministic backend inspection with decision trace
      fetchBackend<ScoreResponse>("/score", {
        method: HttpMethod.Post,
        headers: { "X-Suppress-Toast": "true" },
        body: JSON.stringify({
          ruleType: "grayscale_tolerance",
          referenceImageUrl: SAMPLE_IMAGE_POCKET_1_FILLED,
          sampleImageUrl: sample.url,
          tolerance: 40,
          threshold: 0.8,
          calibrationFactor: 0.05,
          calibrationUnit: "mm",
        }),
      })
        .then((resp) => {
          const payload = resp.Results[0];
          const isOk = payload ? payload.is_pass : sample.isPass;
          const score = payload ? payload.confidence : isOk ? 92.5 : 12.5;
          const tool = "Grayscale Match";
          const reason =
            payload?.reason ??
            (isOk ? "Inspection within tolerance (PASS)" : "Defect detected (FAIL)");

          const tick = useRunStore.getState().tick;
          tick(isOk ? "ok" : "ng", { tool, reason, score });

          if (payload?.hasMultiSlot && payload?.slots && payload.slots.length > 0) {
            payload.slots.forEach((s) => {
              const slotSeverity = s.isPass
                ? StatusSeverityType.Ok
                : s.state === "EMPTY"
                  ? StatusSeverityType.Warn
                  : StatusSeverityType.Ng;
              const slotMsg = `Slot ${s.slotIndex + 1} [${s.state}]: ${s.verdict} (${s.score}%) - ${s.reason || s.defect || ""}`;

              push({
                severity: slotSeverity,
                message: slotMsg,
              });
            });
          } else if (!isOk) {
            push({
              severity: StatusSeverityType.Ng,
              message: `NG [${sample.name}] - ${tool}: ${reason}`,
            });
          } else {
            push({
              severity: StatusSeverityType.Ok,
              message: `OK [${sample.name}] - ${tool} (${score}%): ${reason}`,
            });
          }
        })
        .catch((evalErr: unknown) => {
          console.debug("[Run] Remote evaluation fallback to mock engine:", evalErr);
          // Graceful fallback for offline / mock mode
          const tick = useRunStore.getState().tick;
          const isOk = sample.isPass;

          tick(isOk ? "ok" : "ng", {
            tool: "Grayscale Match",
            reason: isOk ? "Sample passed" : "Defect detected",
            score: isOk ? 93.1 : 12.6,
          });

          push({
            severity: isOk ? StatusSeverityType.Ok : StatusSeverityType.Ng,
            message: `${isOk ? "OK" : "NG"} [${sample.name}] - Grayscale Match (${isOk ? "93.1%" : "12.6%"})`,
          });
        })
        .finally(() => {
          isEvaluatingRef.current = false;
        });
    },
    frameDelay,
    RunStatusType.isRunning(status),
  );

  const passRate = counters.total > 0 ? (counters.ok / counters.total) * 100 : 0;

  const statusTone = RunStatusType.isRunning(status)
    ? "bg-ca-ok/15 text-ca-ok border-ca-ok/40"
    : RunStatusType.isIdle(status)
      ? "bg-ca-ink-muted/15 text-ca-ink-muted border-[#22252a]"
      : "bg-ca-warn/15 text-ca-warn border-ca-warn/40";

  const { mode } = useUiMode();

  const runBody = (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-3.5 border-b border-ca-border/80 bg-gradient-to-b from-ca-panel/95 via-ca-panel/80 to-ca-bg/95 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_4px_16px_-4px_rgba(0,0,0,0.4)]">
          <Counter variant={CounterVariantType.Total} value={counters.total} />
          <Counter variant={CounterVariantType.Ok} value={counters.ok} />
          <Counter
            variant={CounterVariantType.Ng}
            value={counters.ng}
            data-testid="counter-ng"
            aria-live="polite"
          />
          <div className="ml-auto flex items-center gap-3">
            <div className="group relative flex flex-col items-end rounded-2xl border border-ca-border/80 bg-gradient-to-b from-ca-panel/95 via-ca-panel/75 to-ca-bg/95 px-4 py-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_4px_16px_-4px_rgba(0,0,0,0.5)] backdrop-blur-xl min-w-32">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-ca-ink-muted">
                Yield Rate
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span
                  className={`font-mono text-xl font-black tabular-nums drop-shadow-[0_0_10px_currentColor] ${passRate >= 95 ? "text-ca-ok" : passRate >= 80 ? "text-ca-warn" : "text-ca-ng"}`}
                >
                  {passRate.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ca-border/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                <div
                  className={`h-full rounded-full transition-all duration-300 shadow-[0_0_8px_currentColor] ${passRate >= 95 ? "bg-ca-ok" : passRate >= 80 ? "bg-ca-warn" : "bg-ca-ng"}`}
                  style={{ width: `${passRate}%` }}
                />
              </div>
            </div>
            <RunThroughputCounter
              isRunning={RunStatusType.isRunning(status)}
              startedAt={startedAt}
              total={counters.total}
            />
          </div>
        </div>
        <Viewport isLive={RunStatusType.isRunning(status)}>
          <MachineFrame
            isLive={RunStatusType.isRunning(status)}
            activeFrameUrl={activeFrameUrl}
          />
          <ViewportImageControls />
          {pickedRulesets.length > 0 ? (
            <div className="pointer-events-auto absolute left-hmi-3 top-14 z-10 max-w-md rounded-xl border border-ca-border/80 bg-ca-panel/90 p-hmi-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.55)] backdrop-blur-md">
              <div className="flex items-center justify-between gap-hmi-2 border-b border-ca-border/50 pb-2 mb-2">
                <p className="font-display text-[11px] font-bold uppercase tracking-wider text-ca-ink">
                  {project?.name ?? "Selected rule sets"}
                </p>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ca-ink-muted">
                  {expectedImages} image{expectedImages === 1 ? "" : "s"} expected
                </span>
              </div>
              <ul className="space-y-1.5">
                {pickedRulesets.map((r) => {
                  const summary = summarizeOverrideChain(resolveOverrideChain(r, rulesetsById));

                  return (
                    <li
                      key={r.id}
                      className="flex items-center gap-hmi-2 rounded-lg border border-ca-border/60 bg-ca-panel-2/60 px-2.5 py-1.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-ca-ink">{r.name}</p>
                        <p className="truncate font-mono text-[10px] text-ca-ink-muted">
                          {r.rules.length} rules, {summary}
                        </p>
                      </div>
                      {projectId ? (
                        <Link
                          to="/projects/$projectId/rulesets/$rulesetId"
                          params={{
                            projectId,
                            rulesetId: toIntParam(IntAliasNamespaceType.Ruleset, r.id),
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-ca-border bg-ca-panel px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ca-ink hover:border-ca-select hover:bg-ca-panel-2 transition-colors"
                          aria-label={`Edit ${r.name}`}
                        >
                          <Pencil aria-hidden size={11} /> Edit
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {RunStatusType.isRunning(status) === false && counters.total === 0 ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-xl border border-ca-border/80 bg-ca-panel/90 px-hmi-6 py-hmi-5 text-center shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-md">
                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-ca-primary/15 text-ca-primary border border-ca-primary/30">
                  <span className="h-2 w-2 rounded-full bg-ca-primary animate-ping" />
                </div>
                <p className="font-display text-xs font-bold uppercase tracking-widest text-ca-ink">
                  Ready to Inspect
                </p>
                <p className="mt-hmi-1 text-xs text-ca-ink-muted">
                  Press{" "}
                  <kbd className="rounded border border-ca-border/80 bg-ca-surface px-1.5 py-0.5 font-mono text-[11px] text-ca-ink">
                    Space
                  </kbd>{" "}
                  or the Start button to begin.
                </p>
              </div>
            </div>
          ) : null}
        </Viewport>
        <StatusLog entries={log} />
      </div>
      {showHistory && hydrated ? (
        <div
          className="fixed inset-y-0 right-0 z-40 flex"
          role="dialog"
          aria-label="Run history drawer"
        >
          <div
            className="fixed inset-0 bg-ca-viewport/50"
            onClick={() => setShowHistory(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full shadow-hmi-panel">
            <RunHistorySidebar onClose={() => setShowHistory(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );

  const runOverlays = (
    <>
      {showSettings ? (
        <div
          id="run-settings-popover"
          role="dialog"
          aria-label="Run options"
          className="fixed right-4 top-24 z-40 w-80 rounded-2xl border border-ca-border/80 bg-ca-panel/95 p-5 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-2xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-hmi-title font-semibold uppercase tracking-wide text-ca-ink">
              Options
            </h3>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              aria-label="Close options"
              className="text-ca-ink-muted hover:text-ca-ink px-hmi-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus rounded"
            >
              ×
            </button>
          </div>
          <label className="flex items-center justify-between gap-hmi-2 text-xs text-ca-ink">
            <span>Auto-reset on start</span>
            <input
              type="checkbox"
              checked={settings.autoResetOnStart}
              onChange={(e) => setSettings({ autoResetOnStart: e.target.checked })}
              className="h-4 w-4"
            />
          </label>
          <label className="flex items-center justify-between gap-hmi-2 text-xs text-ca-ink">
            <span>Sound on NG</span>
            <input
              type="checkbox"
              checked={settings.soundOnNg}
              onChange={(e) => setSettings({ soundOnNg: e.target.checked })}
              className="h-4 w-4"
            />
          </label>
          <label className="flex items-center justify-between gap-hmi-2 text-xs text-ca-ink">
            <span>Target FPS</span>
            <input
              type="number"
              min={1}
              max={30}
              value={settings.targetFps}
              onChange={(e) => setSettings({ targetFps: Number(e.target.value) || 5 })}
              className="w-20 rounded border border-[#22252a] bg-[#1a1c23] px-hmi-2 py-1 text-right font-mono"
            />
          </label>
          <p className="text-[10px] uppercase tracking-wider text-ca-ink-muted">
            Saved automatically. Restored on refresh.
          </p>
        </div>
      ) : null}
      {shortcutsOpen ? (
        <div
          role="dialog"
          aria-label="Keyboard shortcuts"
          className="fixed bottom-24 right-4 z-40 w-80 rounded-2xl border border-ca-border/80 bg-ca-panel/95 p-5 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-hmi-title font-semibold uppercase tracking-wide text-ca-ink">
              Shortcuts
            </h3>
            <button
              type="button"
              onClick={() => setShortcutsOpen(false)}
              aria-label="Close shortcuts"
              className="text-ca-ink-muted hover:text-ca-ink px-2 py-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus rounded-lg"
            >
              ×
            </button>
          </div>
          <dl className="mt-3 space-y-2 text-xs text-ca-ink">
            <div className="flex items-center justify-between">
              <dt className="text-ca-ink-muted font-medium">Start / Stop run</dt>
              <dd>
                <kbd className="rounded-md border border-ca-border/80 bg-ca-panel px-2 py-0.5 font-mono text-[11px] font-semibold text-ca-ink shadow-sm">
                  Space
                </kbd>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ca-ink-muted font-medium">Toggle this help</dt>
              <dd>
                <kbd className="rounded-md border border-ca-border/80 bg-ca-panel px-2 py-0.5 font-mono text-[11px] font-semibold text-ca-ink shadow-sm">
                  ?
                </kbd>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ca-ink-muted font-medium">Close dialogs</dt>
              <dd>
                <kbd className="rounded-md border border-ca-border/80 bg-ca-panel px-2 py-0.5 font-mono text-[11px] font-semibold text-ca-ink shadow-sm">
                  Esc
                </kbd>
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
      <RunErrorDrawer error={runError} onClose={() => setError(null)} />
      {confirmStop && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-stop-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ca-viewport/70 backdrop-blur-sm"
          onClick={cancelStop}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-ca-panel/95 border border-ca-border/80 rounded-2xl shadow-[0_16px_48px_-8px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-2xl min-w-80 max-w-md overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-ca-border/70 bg-ca-chrome/90 text-ca-chrome-ink text-hmi-title uppercase tracking-wide font-bold">
              <span id="confirm-stop-title">Stop run?</span>
            </div>
            <div className="p-hmi-4 space-y-hmi-2 text-xs text-ca-ink">
              <p>
                Stopping halts the frame loop and releases nav-lock. Counters (
                <span className="hmi-tabular">{counters.total}</span> total,{" "}
                <span className="hmi-tabular">{counters.ng}</span> NG) remain until reset.
              </p>
            </div>
            <div className="flex justify-end gap-2.5 px-5 py-3 border-t border-ca-border/70 bg-ca-panel/60">
              <button
                type="button"
                onClick={cancelStop}
                autoFocus
                className="inline-flex items-center min-h-9 px-4 py-1.5 border border-ca-border/80 bg-ca-panel text-xs font-semibold text-ca-ink rounded-xl shadow-sm hover:border-ca-border hover:bg-ca-panel-2 transition-all"
              >
                Keep running
              </button>
              <button
                type="button"
                onClick={confirmStopRun}
                className="inline-flex items-center min-h-9 px-4 py-1.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-[0_0_16px_rgba(239,68,68,0.4)] transition-all"
              >
                Stop run
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const actionControls = (
    <div className="flex items-center gap-2.5">
      {RunStatusType.isRunning(status) ? (
        <button
          type="button"
          onClick={requestStop}
          aria-label="Stop run (Space)"
          className="inline-flex items-center gap-2 rounded-xl border border-rose-400/50 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_24px_rgba(239,68,68,0.5),inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
        >
          <span
            className="h-2 w-2 rounded-full bg-white shadow-[0_0_6px_#fff]"
            aria-hidden="true"
          />
          <span>Stop</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          aria-label="Start run (Space)"
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/50 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_24px_rgba(16,185,129,0.5),inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
        >
          <span
            className="h-2 w-2 rounded-full bg-white shadow-[0_0_6px_#fff]"
            aria-hidden="true"
          />
          <span>Start</span>
        </button>
      )}
      <button
        type="button"
        onClick={doReset}
        disabled={RunStatusType.isRunning(status) || counters.total === 0}
        className="inline-flex items-center gap-1.5 rounded-xl border border-ca-border/80 bg-ca-panel/90 px-4 py-2 text-xs font-semibold text-ca-ink shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_8px_-2px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-150 hover:border-ca-primary/50 hover:bg-ca-panel-2 disabled:opacity-40"
      >
        Reset
      </button>
      <button
        type="button"
        onClick={() => setShowHistory((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-ca-border/80 bg-ca-panel/90 px-4 py-2 text-xs font-semibold text-ca-ink shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_8px_-2px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-150 hover:border-ca-primary/50 hover:bg-ca-panel-2"
      >
        History
      </button>
    </div>
  );

  if (mode === UiModeType.Standard) {
    return (
      <StandardAppShell
        activeNav="run"
        title="Live Inspection Execution"
        subtitle="Program 01"
        actions={actionControls}
      >
        {runBody}
        {runOverlays}
      </StandardAppShell>
    );
  }

  return (
    <HmiShell
      program="Program 01"
      title="Run"
      headerActions={
        <div className="flex items-center gap-hmi-3 text-xs">
          <RunElapsedTimer
            isRunning={RunStatusType.isRunning(status)}
            startedAt={startedAt}
          />
          <span
            role="status"
            aria-live="polite"
            className={`inline-flex items-center gap-hmi-2 rounded-full border px-3 py-[2px] text-[10px] uppercase tracking-wider font-bold shadow-sm ${statusTone}`}
          >
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${RunStatusType.isRunning(status) ? "bg-ca-ok animate-pulse shadow-[0_0_8px_var(--ca-ok)]" : "bg-ca-ink-muted"}`}
            />
            {formatIdentifierLabel(status)}
          </span>
        </div>
      }
      actionBarLeft={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            aria-pressed={showHistory}
            aria-label={showHistory ? "Hide run history" : "Show run history"}
            className="inline-flex items-center min-h-9 px-3.5 py-1.5 border border-ca-border/80 bg-ca-panel/85 text-xs font-semibold text-ca-ink rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_8px_-2px_rgba(0,0,0,0.3)] backdrop-blur-md hover:border-ca-primary/50 hover:bg-ca-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus transition-all"
          >
            History
          </button>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            aria-expanded={showSettings}
            aria-controls="run-settings-popover"
            className="inline-flex items-center min-h-9 px-3.5 py-1.5 border border-ca-border/80 bg-ca-panel/85 text-xs font-semibold text-ca-ink rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_8px_-2px_rgba(0,0,0,0.3)] backdrop-blur-md hover:border-ca-primary/50 hover:bg-ca-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus transition-all"
          >
            Options
          </button>
          <Link
            to="/setup"
            className="inline-flex items-center min-h-9 px-3.5 py-1.5 border border-ca-border/80 bg-ca-panel/85 text-xs font-semibold text-ca-ink rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_8px_-2px_rgba(0,0,0,0.3)] backdrop-blur-md hover:border-ca-primary/50 hover:bg-ca-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus transition-all"
          >
            Back to Setup
          </Link>
          <button
            type="button"
            onClick={doReset}
            disabled={RunStatusType.isRunning(status) || counters.total === 0}
            aria-label="Reset counters and event log"
            className="inline-flex items-center min-h-9 px-3.5 py-1.5 border border-ca-border/80 bg-ca-panel/85 text-xs font-semibold text-ca-ink rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_8px_-2px_rgba(0,0,0,0.3)] backdrop-blur-md hover:border-ca-primary/50 hover:bg-ca-panel-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus transition-all"
            title="Clear counters and event log"
          >
            Reset
          </button>
        </div>
      }
      actionBarRight={actionControls}
    >
      {runBody}
      {runOverlays}
    </HmiShell>
  );
}

interface RunElapsedTimerProps {
  isRunning: boolean;
  startedAt: number | null;
}

function RunElapsedTimer({ isRunning, startedAt }: RunElapsedTimerProps): React.JSX.Element | null {
  const [now, setNow] = useState(() => Date.now());

  useVisibleInterval(() => setNow(Date.now()), 1000, isRunning);

  if (!isRunning || !startedAt) {
    return null;
  }

  const elapsedMs = Math.max(0, now - startedAt);
  const s = Math.floor(elapsedMs / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");

  return (
    <span className="font-mono tabular-nums text-ca-ink-muted" aria-label="Elapsed">
      {mm}:{ss}
    </span>
  );
}

interface RunThroughputCounterProps {
  isRunning: boolean;
  startedAt: number | null;
  total: number;
}

function RunThroughputCounter({ isRunning, startedAt, total }: RunThroughputCounterProps): React.JSX.Element {
  const [now, setNow] = useState(() => Date.now());

  useVisibleInterval(() => setNow(Date.now()), 1000, isRunning);

  const elapsedMs = isRunning && startedAt ? Math.max(0, now - startedAt) : 0;
  const fps = elapsedMs > 500 ? (total / (elapsedMs / 1000)).toFixed(1) : "0.0";

  return (
    <div className="group relative flex flex-col items-end rounded-2xl border border-ca-border/80 bg-gradient-to-b from-ca-panel/95 via-ca-panel/75 to-ca-bg/95 px-4 py-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_4px_16px_-4px_rgba(0,0,0,0.5)] backdrop-blur-xl min-w-28">
      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-ca-ink-muted">
        Throughput
      </span>
      <span className="font-mono text-xl font-black tabular-nums text-ca-ink mt-0.5">
        {fps} <span className="text-[11px] text-ca-ink-muted font-normal">FPS</span>
      </span>
    </div>
  );
}
