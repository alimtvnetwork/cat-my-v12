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
import { RunSkeleton } from "@/components/hmi/RunSkeleton";
import { AppEvent } from "@/lib/constants";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { toIntParam } from "@/lib/ids/int-alias";
import { HtmlTag } from "@/lib/enums/html";

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
  const pickedRulesets = useMemo<RuleSet[]>(() => {
    const ids = search.rulesetIds ?? [];
    const out: RuleSet[] = [];
    for (const id of ids) {
      const r = rulesetsById[id];

      if (!r) continue;

      if (projectId && r.projectId !== projectId) continue;
      out.push(r);
    }

    return out;
  }, [search.rulesetIds, rulesetsById, projectId]);
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
  const [now, setNow] = useState(() => Date.now());
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [ready, setReady] = useState(false);

  // Hydrate persisted settings/history + stage first paint after mount.
  useEffect(() => {
    hydrate();
    const id = window.setTimeout(() => setReady(true), 120);

    return () => window.clearTimeout(id);
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
        t && (t.tagName === HtmlTag.Input || t.tagName === HtmlTag.Textarea || t.isContentEditable);

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

  // Tick a wall clock while running so the elapsed timer updates.
  // Gated on tab visibility: no point re-rendering the counter 2Hz while
  // the user is on another tab. On tab focus the hook fires immediately
  // so the displayed elapsed time snaps to the true wall clock.
  useVisibleInterval(() => setNow(Date.now()), 500, RunStatusType.isRunning(status));

  // Mock frame loop: while running, tick at the configured fps with ~70% OK.
  // Also visibility-gated: a hidden tab does not need to accrue synthetic
  // frames, and pausing prevents the log from ballooning while unattended.
  const frameDelay = useMemo(() => {
    const fps = Math.max(1, Math.min(30, settings.targetFps));

    return Math.round(1000 / fps);
  }, [settings.targetFps]);
  useVisibleInterval(
    () => {
      const tick = useRunStore.getState().tick;
      const judgment: "ok" | "ng" = Math.random() < 0.7 ? "ok" : "ng";
      tick(judgment);

      if (judgment === "ng") {
        const ng = useRunStore.getState().ngEvents[0];

        if (ng)
          push({
            severity: StatusSeverityType.Ng,
            message: `NG frame #${ng.frame} - ${ng.tool}: ${ng.reason}`,
          });
      }
    },
    frameDelay,
    RunStatusType.isRunning(status),
  );

  const elapsedMs = RunStatusType.isRunning(status) && startedAt ? now - startedAt : 0;
  const elapsed = useMemo(() => {
    const s = Math.floor(elapsedMs / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");

    return `${mm}:${ss}`;
  }, [elapsedMs]);
  const passRate = counters.total > 0 ? (counters.ok / counters.total) * 100 : 0;
  const fps = elapsedMs > 500 ? (counters.total / (elapsedMs / 1000)).toFixed(1) : "0.0";

  const statusTone = RunStatusType.isRunning(status)
    ? "bg-ca-ok/15 text-ca-ok border-ca-ok/40"
    : RunStatusType.isIdle(status)
      ? "bg-ca-ink-muted/15 text-ca-ink-muted border-ca-border"
      : "bg-ca-warn/15 text-ca-warn border-ca-warn/40";

  return (
    <HmiShell
      program="Program 01"
      title="Run"
      headerActions={
        <div className="flex items-center gap-hmi-3 text-hmi-body">
          {RunStatusType.isRunning(status) ? (
            <span className="font-mono tabular-nums text-ca-ink-muted" aria-label="Elapsed">
              {elapsed}
            </span>
          ) : null}
          <span
            role="status"
            aria-live="polite"
            className={`inline-flex items-center gap-hmi-2 rounded-sm border px-hmi-3 py-[2px] text-hmi-caption font-semibold uppercase tracking-wide ${statusTone}`}
          >
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${RunStatusType.isRunning(status) ? "bg-ca-ok animate-pulse" : "bg-ca-ink-muted"}`}
            />
            {formatIdentifierLabel(status)}
          </span>
        </div>
      }
      actionBarLeft={
        <div className="flex items-center gap-hmi-2">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            aria-pressed={showHistory}
            aria-label={showHistory ? "Hide run history" : "Show run history"}
            className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink rounded-md hover:bg-ca-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
          >
            History
          </button>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            aria-expanded={showSettings}
            aria-controls="run-settings-popover"
            className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink rounded-md hover:bg-ca-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
          >
            Options
          </button>
          <Link
            to="/setup"
            className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink rounded-md hover:bg-ca-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
          >
            Back to Setup
          </Link>
          <button
            type="button"
            onClick={doReset}
            disabled={RunStatusType.isRunning(status) || counters.total === 0}
            aria-label="Reset counters and event log"
            className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink rounded-md hover:bg-ca-panel-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
            title="Clear counters and event log"
          >
            Reset
          </button>
        </div>
      }
      actionBarRight={
        <div className="flex items-center gap-hmi-3">
          <button
            type="button"
            onClick={() => setShortcutsOpen((v) => !v)}
            aria-expanded={shortcutsOpen}
            aria-label="Show keyboard shortcuts"
            title="Press ? to toggle shortcut help"
            className="hidden sm:inline-flex items-center gap-hmi-1 text-hmi-caption text-ca-ink-muted hover:text-ca-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus rounded"
          >
            Press{" "}
            <kbd className="rounded border border-ca-border bg-ca-panel-2 px-hmi-1 font-mono">
              Space
            </kbd>
            <span aria-hidden>·</span>
            <kbd className="rounded border border-ca-border bg-ca-panel-2 px-hmi-1 font-mono">
              ?
            </kbd>
          </button>
          {RunStatusType.isRunning(status) ? (
            <button
              type="button"
              onClick={requestStop}
              aria-label="Stop run (Space)"
              aria-describedby="run-space-hint"
              className="inline-flex items-center min-h-10 px-hmi-5 py-hmi-2 bg-ca-ng text-ca-bg text-hmi-body font-semibold rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
            >
              Stop
            </button>
          ) : (
            <RunButton onClick={start} aria-label="Start run (Space)">
              Start
            </RunButton>
          )}
          <span id="run-space-hint" className="sr-only">
            Press Space to toggle run.
          </span>
        </div>
      }
    >
      <div className="flex flex-1 overflow-hidden">
        {!ready ? (
          <RunSkeleton />
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex flex-wrap items-center gap-hmi-3 p-hmi-3 bg-ca-panel">
              <Counter variant={CounterVariantType.Total} value={counters.total} />
              <Counter variant={CounterVariantType.Ok} value={counters.ok} />
              <Counter
                variant={CounterVariantType.Ng}
                value={counters.ng}
                title="Open NG events log"
                onClick={() => navigate({ to: "/errors" })}
              />
              <div className="ml-auto flex items-center gap-hmi-4 text-hmi-body text-ca-ink-muted">
                <div className="flex flex-col items-end">
                  <span className="text-hmi-caption uppercase tracking-wide">Pass rate</span>
                  <span className="font-mono tabular-nums text-ca-ink">{passRate.toFixed(1)}%</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-hmi-caption uppercase tracking-wide">Frames / s</span>
                  <span className="font-mono tabular-nums text-ca-ink">{fps}</span>
                </div>
              </div>
            </div>
            <Viewport>
              <MachineFrame live={RunStatusType.isRunning(status)} />
              <ViewportImageControls />
              {pickedRulesets.length > 0 ? (
                <div className="pointer-events-auto absolute left-hmi-3 top-hmi-3 z-10 max-w-md rounded-md border border-ca-border bg-ca-panel/90 p-hmi-3 shadow-hmi-panel backdrop-blur">
                  <div className="flex items-center justify-between gap-hmi-2">
                    <p className="font-display text-hmi-caption font-semibold uppercase tracking-wide text-ca-ink">
                      {project?.name ?? "Selected rule sets"}
                    </p>
                    <span className="text-hmi-caption text-ca-ink-muted">
                      {expectedImages} image{expectedImages === 1 ? "" : "s"} expected
                    </span>
                  </div>
                  <ul className="mt-hmi-2 space-y-hmi-1">
                    {pickedRulesets.map((r) => {
                      const summary = summarizeOverrideChain(resolveOverrideChain(r, rulesetsById));

                      return (
                        <li
                          key={r.id}
                          className="flex items-center gap-hmi-2 rounded-sm bg-ca-panel-2 px-hmi-2 py-hmi-1"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-hmi-body text-ca-ink">{r.name}</p>
                            <p className="truncate text-hmi-caption text-ca-ink-muted">
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
                              className="inline-flex items-center gap-hmi-1 rounded-sm border border-ca-border px-hmi-1 text-hmi-caption text-ca-ink hover:border-ca-select"
                              aria-label={`Edit ${r.name}`}
                            >
                              <Pencil aria-hidden size={12} /> Edit
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
                  <div className="rounded-md border border-ca-border bg-ca-panel/85 px-hmi-5 py-hmi-4 text-center shadow-hmi-panel backdrop-blur">
                    <p className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
                      Ready to run
                    </p>
                    <p className="mt-hmi-1 text-hmi-body text-ca-ink-muted">
                      Press{" "}
                      <kbd className="rounded border border-ca-border bg-ca-panel-2 px-hmi-1 font-mono">
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
        )}
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
      {showSettings ? (
        <div
          id="run-settings-popover"
          role="dialog"
          aria-label="Run options"
          className="fixed right-4 top-24 z-40 w-80 rounded-md border border-ca-border bg-ca-panel p-hmi-4 shadow-hmi-panel space-y-hmi-3"
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
          <label className="flex items-center justify-between gap-hmi-2 text-hmi-body text-ca-ink">
            <span>Auto-reset on start</span>
            <input
              type="checkbox"
              checked={settings.autoResetOnStart}
              onChange={(e) => setSettings({ autoResetOnStart: e.target.checked })}
              className="h-4 w-4"
            />
          </label>
          <label className="flex items-center justify-between gap-hmi-2 text-hmi-body text-ca-ink">
            <span>Sound on NG</span>
            <input
              type="checkbox"
              checked={settings.soundOnNg}
              onChange={(e) => setSettings({ soundOnNg: e.target.checked })}
              className="h-4 w-4"
            />
          </label>
          <label className="flex items-center justify-between gap-hmi-2 text-hmi-body text-ca-ink">
            <span>Target FPS</span>
            <input
              type="number"
              min={1}
              max={30}
              value={settings.targetFps}
              onChange={(e) => setSettings({ targetFps: Number(e.target.value) || 5 })}
              className="w-20 rounded border border-ca-border bg-ca-panel-2 px-hmi-2 py-1 text-right font-mono"
            />
          </label>
          <p className="text-hmi-caption text-ca-ink-muted">
            Saved automatically. Restored on refresh.
          </p>
        </div>
      ) : null}
      {shortcutsOpen ? (
        <div
          role="dialog"
          aria-label="Keyboard shortcuts"
          className="fixed bottom-24 right-4 z-40 w-72 rounded-md border border-ca-border bg-ca-panel p-hmi-4 shadow-hmi-panel"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-hmi-title font-semibold uppercase tracking-wide text-ca-ink">
              Shortcuts
            </h3>
            <button
              type="button"
              onClick={() => setShortcutsOpen(false)}
              aria-label="Close shortcuts"
              className="text-ca-ink-muted hover:text-ca-ink px-hmi-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus rounded"
            >
              ×
            </button>
          </div>
          <dl className="mt-hmi-2 space-y-hmi-1 text-hmi-body text-ca-ink">
            <div className="flex items-center justify-between">
              <dt>Start / Stop run</dt>
              <dd>
                <kbd className="rounded border border-ca-border bg-ca-panel-2 px-hmi-1 font-mono">
                  Space
                </kbd>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Toggle this help</dt>
              <dd>
                <kbd className="rounded border border-ca-border bg-ca-panel-2 px-hmi-1 font-mono">
                  ?
                </kbd>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Close dialogs</dt>
              <dd>
                <kbd className="rounded border border-ca-border bg-ca-panel-2 px-hmi-1 font-mono">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-ca-viewport/70"
          onClick={cancelStop}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-ca-panel border border-ca-border shadow-hmi-panel min-w-80 max-w-md"
          >
            <div className="px-hmi-4 py-hmi-2 bg-ca-chrome text-ca-chrome-ink text-hmi-title uppercase tracking-wide">
              <span id="confirm-stop-title">Stop run?</span>
            </div>
            <div className="p-hmi-4 space-y-hmi-2 text-hmi-body text-ca-ink">
              <p>
                Stopping halts the frame loop and releases nav-lock. Counters (
                <span className="hmi-tabular">{counters.total}</span> total,{" "}
                <span className="hmi-tabular">{counters.ng}</span> NG) remain until reset.
              </p>
            </div>
            <div className="flex justify-end gap-hmi-2 px-hmi-4 py-hmi-2 border-t border-ca-border">
              <button
                type="button"
                onClick={cancelStop}
                autoFocus
                className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink rounded-md"
              >
                Keep running
              </button>
              <button
                type="button"
                onClick={confirmStopRun}
                className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 bg-ca-ng text-ca-bg text-hmi-body font-medium rounded-md"
              >
                Stop run
              </button>
            </div>
          </div>
        </div>
      )}
    </HmiShell>
  );
}
