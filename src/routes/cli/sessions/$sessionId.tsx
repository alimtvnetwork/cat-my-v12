/**
 * Route: `/cli/sessions/$sessionId` - per-session drill-down.
 *
 * Plan 90 Step 108. Nested-child of the `/cli` layout shell (Step 106) and
 * downstream of the `/cli/sessions` list (Step 107). Renders:
 *  1. The Root-DB session envelope (StartedAt, CLI, Command, Exit, Duration,
 *     RunId, LogPath) resolved from `getObservabilitySessions` by matching
 *     `CliInvocationId === sessionId`.
 *  2. The full JSONL log via `getObservabilitySessionLogs` (BE Step 73) with
 *     a virtualized list backed by `@tanstack/react-virtual` so runs with
 *     thousands of records stay responsive.
 *
 * Root cause guarded: without a nested drill-down, Step 109's live-tail
 * toggle and Step 110's row expander have nowhere to mount, and the flat
 * `/cli-sessions/$runId` view keys off `RunId` (nullable when the first
 * JSONL line is unreadable) instead of the guaranteed `CliInvocationId`.
 *
 * Live-tail (SSE) lands in Step 109 as a toggle over this same view. Row
 * expander (syntax-highlighted `Ctx`) lands in Step 110. This step ships
 * the static viewer + virtualization substrate only.
 *
 * `robots: noindex`: internal operator screen.
 */
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAppQuery } from "@/lib/wrappers/use-app-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowDownToLine,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Radio,
  Search,
  X,
} from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";

import {
  getObservabilitySessions,
  type ObservabilitySession,
} from "@/lib/observability/sessions.functions";
import {
  getObservabilitySessionLogs,
  type LogTailItem,
  type LogTailPage,
} from "@/lib/observability/logs.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExitEnvelopeDrawer } from "@/components/cli/ExitEnvelopeDrawer";
import { ExportSessionButton } from "@/components/cli/ExportSessionButton";
import { StatusPill, toneForExitCode } from "@/components/cli/status-pill";
import { CorrelationIdChip } from "@/components/cli/CorrelationIdChip";
import { ValidationStatus } from "@/lib/enums/validation";

/**
 * Plan 90 Step 109 - live-tail state. `LiveRow` extends the JSONL row with
 * `__liveId` (SSE `id:` cursor = 1-based file line) so `since_line` on the
 * next reconnect skips already-delivered lines and no row can double-fire.
 */
type LiveRow = LogTailItem & { __liveId: number };
const LIVE_MAX_ROWS = 2000;
const AUTOSCROLL_EPSILON_PX = 40;

/**
 * Plan 90 Step 111 - level filter chips + free-text search persisted in URL.
 * Levels are canonicalized to the 4 buckets the JSONL writer emits (`error`,
 * `warning`, `info`, `debug`); `critical`/`fatal` fold into `error` and
 * `warn` folds into `warning` so operator intent (chip label) matches the
 * writer's actual level strings.
 */
const LEVEL_CHIPS = ["error", "warning", "info", "debug"] as const;
type LevelChip = (typeof LEVEL_CHIPS)[number];
type SessionSearch = { levels?: string; q?: string };
function canonLevel(raw: unknown): LevelChip | null {
  const l = typeof raw === "string" ? raw.toLowerCase() : "";

  if (l === "error" || l === "critical" || l === "fatal") return "error";

  if (l === "warning" || l === ValidationStatus.Warn) return "warning";

  if (l === "info") return "info";

  if (l === "debug") return "debug";

  return null;
}

function parseLevelsCsv(csv: string | undefined): Set<LevelChip> {
  if (!csv) return new Set();
  const out = new Set<LevelChip>();
  for (const part of csv.split(",")) {
    const t = part.trim().toLowerCase();

    if ((LEVEL_CHIPS as readonly string[]).includes(t)) out.add(t as LevelChip);
  }

  return out;
}

export const Route = createFileRoute("/cli/sessions/$sessionId")({
  parseParams: (raw) => {
    const n = Number(raw.sessionId);

    if (Number.isInteger(n) === false || n < 1) {
      throw notFound();
    }

    return { sessionId: raw.sessionId };
  },
  validateSearch: (search: Record<string, unknown>): SessionSearch => {
    // Reject anything that is not a short string so a copy-pasted URL with
    // gigabyte-sized junk in `q` cannot pin the render thread. The URL is
    // the authoritative source for filter state - the component reads it
    // on every render and writes back via `navigate({ search, replace })`.
    const out: SessionSearch = {};
    const rawLevels = typeof search.levels === "string" ? search.levels : undefined;

    if (rawLevels) {
      const parsed = parseLevelsCsv(rawLevels);

      if (parsed.size > 0 && parsed.size < LEVEL_CHIPS.length) {
        // Normalize (sort + dedupe) so the URL is canonical.
        out.levels = LEVEL_CHIPS.filter((l) => parsed.has(l)).join(",");
      }
    }

    const rawQ = typeof search.q === "string" ? search.q.slice(0, 200).trim() : "";

    if (rawQ) out.q = rawQ;

    return out;
  },
  head: ({ params }) => ({
    meta: [
      { title: `CLI Session #${params.sessionId}` },
      {
        name: "description",
        content: `Envelope and JSONL log for CLI invocation ${params.sessionId}.`,
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: `CLI Session #${params.sessionId}` },
      {
        property: "og:description",
        content: `Envelope and JSONL log for CLI invocation ${params.sessionId}.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  notFoundComponent: SessionNotFound,
  errorComponent: SessionError,
  component: CliSessionDrilldown,
});

function SessionNotFound() {
  return (
    <div className="rounded-hmi-sm border border-ca-border bg-ca-surface p-hmi-4">
      <h1 className="text-hmi-h2 font-semibold text-ca-ink">Session not found</h1>
      <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">
        The requested CLI session id is not a positive integer or is not in the current Root-DB
        projection window.
      </p>
      <Link to="/cli/sessions" className="mt-hmi-3 inline-block text-ca-accent hover:underline">
        <ArrowLeft className="mr-1 inline h-3.5 w-3.5" />
        Back to sessions
      </Link>
    </div>
  );
}

function SessionError({ error }: { error: Error }) {
  return (
    <div
      role="alert"
      className="rounded-hmi-sm border border-destructive/40 bg-destructive/5 p-hmi-4 text-destructive"
    >
      <div className="flex items-center gap-hmi-2">
        <AlertTriangle className="h-4 w-4" />
        <h1 className="text-hmi-h2 font-semibold">Session drill-down failed</h1>
      </div>
      <code className="mt-hmi-2 block text-hmi-caption opacity-80">{error.message}</code>
    </div>
  );
}

function formatTs(ts: number | null): string {
  if (ts == null) return "-";
  try {
    return new Date(ts * 1000).toISOString().replace("T", " ").slice(0, 19);
  } catch {
    return String(ts);
  }
}

function formatDuration(ms: number | null, endedAt: number | null): string {
  if (ms == null) return endedAt == null ? "running..." : "-";

  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;

  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s - m * 60);

  return `${m}m ${rem}s`;
}

function ExitBadge({ code, endedAt }: { code: number | null; endedAt: number | null }) {
  // Plan 90 Step 124: delegate to shared StatusPill. Label keeps the
  // "exit N" prefix used on the drilldown header (list uses just the number).
  const tone = toneForExitCode(code, endedAt);
  const label = endedAt == null ? "running" : `exit ${code ?? "?"}`;

  return <StatusPill tone={tone} label={label} outline />;
}

function levelClass(level: unknown): string {
  const l = typeof level === "string" ? level.toLowerCase() : "";

  if (l === "error" || l === "critical" || l === "fatal") return "text-red-500";

  if (l === "warning" || l === ValidationStatus.Warn) return "text-amber-500";

  if (l === "info") return "text-sky-500";

  if (l === "debug") return "text-ca-ink-muted";

  return "text-ca-ink";
}

function CliSessionDrilldown() {
  const params = Route.useParams();
  const sessionIdNum = Number(params.sessionId);

  const fetchSessions = useServerFn(getObservabilitySessions);
  const fetchLogs = useServerFn(getObservabilitySessionLogs);

  const sessionQuery = useAppQuery({
    queryKey: ["cli-session-drilldown-summary", sessionIdNum],
    queryFn: async () => {
      // Root-DB projection: pull a page large enough to include recent
      // sessions and match by CliInvocationId. Step 121 will replace this
      // with a targeted `GET /observability/sessions/{id}` once the BE
      // endpoint lands; using the list endpoint keeps the drill-down
      // functional without introducing a spec deviation.
      const page = await fetchSessions({ data: { limit: 500, sort: "StartedAt", dir: "desc" } });
      const match = page.items.find(
        (s) =>
          s.CliInvocationId === String(sessionIdNum) ||
          s.CliInvocationId === (sessionIdNum as unknown as string),
      );

      return match ?? null;
    },
    staleTime: 5_000,
  });

  const logsQuery = useAppQuery({
    queryKey: ["cli-session-drilldown-logs", sessionIdNum],
    queryFn: () => fetchLogs({ data: { cliInvocationId: sessionIdNum, tail: 2000 } }),
  });

  const items: LogTailItem[] = useMemo(
    () => (logsQuery.data as LogTailPage | undefined)?.Items ?? [],
    [logsQuery.data],
  );
  const session: ObservabilitySession | null | undefined = sessionQuery.data;

  // ---------- Plan 90 Step 111: URL-persisted level filter chips + search ----------
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const activeLevels = useMemo(() => parseLevelsCsv(search.levels), [search.levels]);
  const qLower = (search.q ?? "").toLowerCase();
  // Debounce user typing so we do not spam `router.navigate` on every
  // keystroke (each nav rebuilds the URL and rerenders the tree).
  const [qDraft, setQDraft] = useState<string>(search.q ?? "");
  useEffect(() => {
    setQDraft(search.q ?? "");
  }, [search.q]);
  useEffect(() => {
    const target = qDraft.trim().slice(0, 200);

    if (target === (search.q ?? "")) return;
    const t = setTimeout(() => {
      navigate({
        search: (prev: SessionSearch) => ({ ...prev, q: target || undefined }),
        replace: true,
      });
    }, 200);

    return () => clearTimeout(t);
  }, [qDraft, search.q, navigate]);
  const toggleLevel = useCallback(
    (chip: LevelChip) => {
      navigate({
        search: (prev: SessionSearch) => {
          const cur = parseLevelsCsv(prev.levels);

          if (cur.has(chip)) cur.delete(chip);
          else cur.add(chip);
          // Empty or full set == no filter; drop the key so the URL stays clean.
          const csv =
            cur.size === 0 || cur.size === LEVEL_CHIPS.length
              ? undefined
              : LEVEL_CHIPS.filter((l) => cur.has(l)).join(",");

          return { ...prev, levels: csv };
        },
        replace: true,
      });
    },
    [navigate],
  );
  const clearFilters = useCallback(() => {
    setQDraft("");
    navigate({ search: () => ({}), replace: true });
  }, [navigate]);

  // Predicate applied to every row before virtualization. Poison rows
  // (`_ParseError`) always show so the operator never loses evidence of
  // corruption to a filter.
  const rowMatches = useCallback(
    (raw: Record<string, unknown>): boolean => {
      if (raw._ParseError) return true;

      if (activeLevels.size > 0) {
        const lvl = canonLevel(raw.Level ?? raw.level);

        if (!lvl || activeLevels.has(lvl) === false) return false;
      }

      if (qLower) {
        const msg = typeof raw.Message === "string" ? raw.Message.toLowerCase() : "";
        const kind = typeof raw.Kind === "string" ? raw.Kind.toLowerCase() : "";
        const code =
          typeof raw.Code === "string"
            ? raw.Code.toLowerCase()
            : typeof (raw as { Ctx?: Record<string, unknown> }).Ctx?.Code === "string"
              ? ((raw as { Ctx: { Code: string } }).Ctx.Code as string).toLowerCase()
              : "";

        if (
          msg.includes(qLower) === false &&
          kind.includes(qLower) === false &&
          code.includes(qLower) === false
        ) {
          return false;
        }
      }

      return true;
    },
    [activeLevels, qLower],
  );

  // ---------- Plan 90 Step 109: live-tail (SSE) ----------
  const runId = session?.RunId ?? null;
  const [liveOn, setLiveOn] = useState(false);
  const [liveRows, setLiveRows] = useState<LiveRow[]>([]);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [autoscroll, setAutoscroll] = useState(true);
  const cursorRef = useRef<number>(0);

  // Reset the cursor + buffer whenever the user toggles live off or the
  // session changes; otherwise `since_line` would leak across sessions and
  // silently drop the first N frames of a different log.
  const isOffline = !liveOn;

  useEffect(() => {
    if (isOffline) {
      cursorRef.current = 0;
      setLiveRows([]);
      setLiveError(null);
      setLiveConnected(false);
    }
  }, [liveOn, sessionIdNum]);

  useEffect(() => {
    if (!liveOn || !runId) return;
    let isCancelled = false;
    let es: EventSource | null = null;

    // Loop across BE follow deadlines (time-boxed at 30s server-side) so the
    // UI stays live until the operator toggles off.
    const connect = () => {
      if (isCancelled) return;
      const url = `/api/cli/sessions/${encodeURIComponent(runId)}/log?follow=true&since_line=${cursorRef.current}&max_lines=1000`;
      es = new EventSource(url);
      setLiveConnected(false);
      es.onopen = () => {
        if (isCancelled) return;
        setLiveConnected(true);
        setLiveError(null);
      };
      es.onmessage = (ev) => {
        if (isCancelled) return;
        const lineId = Number(ev.lastEventId);

        if (Number.isFinite(lineId) && lineId > cursorRef.current) {
          cursorRef.current = lineId;
        }

        let parsed: LogTailItem;
        try {
          parsed = JSON.parse(ev.data) as LogTailItem;
        } catch (err) {
          parsed = {
            _ParseError: err instanceof Error ? err.message : String(err),
            _Raw: ev.data,
          } as unknown as LogTailItem;
        }

        setLiveRows((prev) => {
          const next = prev.concat({ ...parsed, __liveId: lineId });

          return next.length > LIVE_MAX_ROWS ? next.slice(next.length - LIVE_MAX_ROWS) : next;
        });
      };
      es.addEventListener("end", () => {
        if (isCancelled) return;
        // BE closed the follow window at its deadline; reopen from the
        // current cursor so the tail keeps advancing without re-delivering
        // rows the browser already rendered.
        es?.close();
        es = null;
        connect();
      });
      es.addEventListener("error", (ev) => {
        // Surface as a warning frame in the UI (no swallowing per
        // spec/03-error-manage). Then let the browser's EventSource
        // auto-retry - if that fails permanently, `onerror` will re-fire.
        // eslint-disable-next-line no-console
        console.warn("[cli-session-live-tail] SSE error", { runId, ev });
        setLiveConnected(false);
        setLiveError("Live tail stream error (auto-retrying)");
      });
    };
    connect();

    return () => {
      isCancelled = true;
      es?.close();
      es = null;
    };
  }, [liveOn, runId]);

  // ---------- Autoscroll (unpin when user scrolls up) ----------
  const parentRef = useRef<HTMLDivElement | null>(null);
  const onScroll = useCallback(() => {
    const el = parentRef.current;

    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= AUTOSCROLL_EPSILON_PX;
    setAutoscroll(atBottom);
  }, []);

  // Materialize the flat row list the virtualizer walks. `origKey` preserves
  // the pre-filter identity so the Step 110 expand-state (`H:{origIdx}` /
  // `L:{__liveId}`) survives filter toggles across re-renders.
  type Rendered = { row: Record<string, unknown>; isLive: boolean; origKey: string };
  const rendered: Rendered[] = useMemo(() => {
    const out: Rendered[] = [];
    for (let i = 0; i < items.length; i++) {
      const r = items[i] as unknown as Record<string, unknown>;

      if (rowMatches(r)) out.push({ row: r, isLive: false, origKey: `H:${i}` });
    }

    for (const lr of liveRows) {
      const r = lr as unknown as Record<string, unknown>;

      if (rowMatches(r)) out.push({ row: r, isLive: true, origKey: `L:${lr.__liveId}` });
    }

    return out;
  }, [items, liveRows, rowMatches]);
  const filterActive = activeLevels.size > 0 || !!qLower;
  const totalRows = items.length + liveRows.length;

  const virtualizer = useVirtualizer({
    count: rendered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 12,
  });

  // Snap to the bottom whenever a new live row lands and the user has not
  // scrolled up. `useLayoutEffect` runs before paint so the operator never
  // sees a mid-scroll flicker while frames land.
  useLayoutEffect(() => {
    if (!autoscroll) return;
    const el = parentRef.current;

    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [rendered.length, autoscroll]);

  const jumpToBottom = () => {
    const el = parentRef.current;

    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setAutoscroll(true);
  };

  // ---------- Plan 90 Step 110: row expander + copy-to-clipboard ----------
  // Keyed by row identity so historical (`H:{index}`) and live (`L:{lineId}`)
  // rows never collide when they share visual position in the virtualizer.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const toggleExpanded = useCallback(
    (key: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);

        if (next.has(key)) next.delete(key);
        else next.add(key);

        return next;
      });
      // Force the virtualizer to remeasure after the row grows/shrinks so
      // subsequent rows do not overlap or leave a gap.
      requestAnimationFrame(() => virtualizer.measure());
    },
    [virtualizer],
  );
  const copyRow = useCallback(async (key: string, raw: Record<string, unknown>) => {
    // Omit UI-only `__liveId`; operators should see the wire row verbatim.
    const { __liveId: _omit, ...rest } = raw as Record<string, unknown> & { __liveId?: number };
    void _omit;
    const text = JSON.stringify(rest, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
    } catch (err) {
      // Do not swallow: per spec/03-error-manage this is a UI-degraded state
      // (typically insecure context / missing permission), not a wire error,
      // so log it and surface an inline "copy failed" pill.
      // eslint-disable-next-line no-console
      console.warn("[cli-session-row-copy] clipboard write failed", { key, err });
      setCopiedKey(`err:${key}`);
    }

    setTimeout(
      () => setCopiedKey((cur) => (cur === key || cur === `err:${key}` ? null : cur)),
      1500,
    );
  }, []);

  return (
    <section className="flex flex-col gap-hmi-3">
      <Link
        to="/cli/sessions"
        className="inline-flex items-center gap-1 text-hmi-caption text-ca-ink-muted hover:text-ca-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All sessions
      </Link>

      <header className="rounded-hmi-sm border border-ca-border bg-ca-surface p-hmi-3">
        {sessionQuery.isPending ? (
          <div className="flex items-center gap-hmi-2 text-hmi-body text-ca-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading session envelope...
          </div>
        ) : !session ? (
          <div className="text-hmi-body text-ca-ink-muted">
            Session #{params.sessionId} not present in the current Root-DB projection window (last
            500). It may have been rotated out.
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-hmi-3">
            <h1 className="text-hmi-h2 font-semibold text-ca-ink">Session #{params.sessionId}</h1>
            <Badge variant={session.CliName === "worker-cli" ? "default" : "secondary"}>
              {session.CliName}
            </Badge>
            <ExitBadge code={session.ExitCode} endedAt={session.EndedAt} />
            <span className="font-mono text-hmi-caption text-ca-ink-muted">
              {formatTs(session.StartedAt)}
            </span>
            <span className="font-mono text-hmi-caption text-ca-ink-muted">
              {formatDuration(session.DurationMs, session.EndedAt)}
            </span>
            {session.Subcommand && (
              <span className="font-mono text-hmi-caption text-ca-ink">{session.Subcommand}</span>
            )}
            {session.RunId && <CorrelationIdChip value={session.RunId} label="run" />}
            <div className="ml-auto flex items-center gap-hmi-1">
              <ExportSessionButton runId={session.RunId} compact />
              <ExitEnvelopeDrawer session={session} items={items} />
            </div>
          </div>
        )}
      </header>

      <div className="flex flex-wrap items-center justify-between gap-hmi-2">
        <div className="flex items-center gap-hmi-2">
          <h2 className="text-hmi-h3 font-medium text-ca-ink">JSONL Log</h2>
          {liveOn && (
            <Badge
              variant="outline"
              className={
                liveConnected
                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                  : "border-amber-500/40 text-amber-600 dark:text-amber-400"
              }
            >
              <Radio className={`mr-1 h-3 w-3 ${liveConnected ? "animate-pulse" : ""}`} />
              {liveConnected ? "LIVE" : "connecting..."}
            </Badge>
          )}
          {liveOn && liveRows.length > 0 && (
            <span className="font-mono text-hmi-caption text-ca-ink-muted">
              +{liveRows.length} live
            </span>
          )}
        </div>
        <div className="flex items-center gap-hmi-2">
          {!autoscroll && liveOn && (
            <Button size="sm" variant="ghost" onClick={jumpToBottom}>
              <ArrowDownToLine className="mr-1 h-3.5 w-3.5" />
              Jump to bottom
            </Button>
          )}
          <Button
            size="sm"
            variant={liveOn ? "default" : "outline"}
            onClick={() => setLiveOn((v) => !v)}
            disabled={!runId}
            title={runId ? undefined : "RunId not yet available in Root-DB projection"}
          >
            {liveOn ? (
              <>
                <Pause className="mr-1 h-3.5 w-3.5" />
                Stop live tail
              </>
            ) : (
              <>
                <Play className="mr-1 h-3.5 w-3.5" />
                Live tail
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => logsQuery.refetch()}
            disabled={logsQuery.isFetching || liveOn}
          >
            {logsQuery.isFetching ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
            )}
            Reload
          </Button>
        </div>
      </div>

      {/* Plan 90 Step 111 - level filter chips + free-text search (URL-persisted). */}
      <div className="flex flex-wrap items-center gap-hmi-2 rounded-hmi-sm border border-ca-border bg-ca-surface p-hmi-2">
        <div className="flex items-center gap-1" role="group" aria-label="Filter by log level">
          {LEVEL_CHIPS.map((chip) => {
            const active = activeLevels.has(chip);

            return (
              <button
                key={chip}
                type="button"
                onClick={() => toggleLevel(chip)}
                aria-pressed={active}
                className={`rounded-hmi-sm border px-2 py-0.5 text-hmi-caption uppercase transition-colors ${
                  active
                    ? chip === "error"
                      ? "border-red-500/60 bg-red-500/10 text-red-600 dark:text-red-400"
                      : chip === "warning"
                        ? "border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : chip === "info"
                          ? "border-sky-500/60 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                          : "border-ca-border bg-ca-surface-2 text-ca-ink"
                    : "border-ca-border text-ca-ink-muted hover:text-ca-ink"
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ca-ink-muted" />
          <input
            type="search"
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Search Message, Kind, or Code..."
            aria-label="Search log rows"
            maxLength={200}
            className="w-full rounded-hmi-sm border border-ca-border bg-ca-surface pl-7 pr-2 py-1 font-mono text-hmi-caption text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-select focus:outline-none"
          />
        </div>
        <span className="font-mono text-hmi-caption text-ca-ink-muted">
          {filterActive ? `${rendered.length} of ${totalRows} rows` : `${totalRows} rows`}
        </span>
        {filterActive && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            <X className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {liveError && (
        <div
          role="status"
          className="rounded-hmi-sm border border-amber-500/40 bg-amber-500/5 p-hmi-2 text-hmi-caption text-amber-700 dark:text-amber-400"
        >
          {liveError}
        </div>
      )}

      {logsQuery.isFail && (
        <div
          role="alert"
          className="flex items-start gap-hmi-2 rounded-hmi-sm border border-destructive/40 bg-destructive/5 p-hmi-3 text-hmi-body text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <code className="text-hmi-caption opacity-80">
            {logsQuery.error instanceof Error ? logsQuery.error.message : String(logsQuery.error)}
          </code>
        </div>
      )}

      {logsQuery.isPending ? (
        <div className="flex items-center gap-hmi-2 text-hmi-body text-ca-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading log...
        </div>
      ) : totalRows === 0 ? (
        <p className="text-hmi-body text-ca-ink-muted">Log file is empty.</p>
      ) : rendered.length === 0 ? (
        <p className="text-hmi-body text-ca-ink-muted">
          No rows match the active filter.{" "}
          <button type="button" onClick={clearFilters} className="text-ca-accent hover:underline">
            Clear filter
          </button>
          .
        </p>
      ) : (
        <div
          ref={parentRef}
          onScroll={onScroll}
          className="h-[560px] overflow-auto rounded-hmi-sm border border-ca-border bg-ca-surface font-mono text-hmi-caption"
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((v) => {
              const r = rendered[v.index];

              if (!r) return null;
              const { row, isLive, origKey: rowKey } = r;
              const ts = typeof row.Timestamp === "string" ? row.Timestamp : "";
              const level = row.Level ?? row.level ?? "";
              const kind = row.Kind ?? row.event ?? "";
              const msg = row.Message ?? row.msg ?? "";
              const parseErr = row._ParseError;
              const isOpen = expanded.has(rowKey);
              const copyState =
                copiedKey === rowKey ? "ok" : copiedKey === `err:${rowKey}` ? "err" : "idle";
              // Wire-verbatim JSON (strip UI-only `__liveId`).
              const { __liveId: _omitLid, ...wireRow } = row as Record<string, unknown> & {
                __liveId?: number;
              };
              void _omitLid;
              const json = JSON.stringify(wireRow, null, 2);

              return (
                <div
                  key={v.key}
                  data-index={v.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${v.start}px)`,
                  }}
                  className={`border-b border-ca-border/40 ${
                    isLive ? "animate-in fade-in slide-in-from-bottom-1 duration-200" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpanded(rowKey)}
                    aria-expanded={isOpen}
                    aria-controls={`row-json-${rowKey}`}
                    className="flex w-full items-start gap-hmi-2 px-hmi-3 py-1 text-left hover:bg-ca-surface-2/60 focus:bg-ca-surface-2/60 focus:outline-none"
                  >
                    <span className="mt-[3px] shrink-0 text-ca-ink-muted">
                      {isOpen ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </span>
                    <span className="w-40 shrink-0 text-ca-ink-muted">{String(ts)}</span>
                    <span className={`w-16 shrink-0 uppercase ${levelClass(level)}`}>
                      {String(level)}
                    </span>
                    <span className="w-40 shrink-0 truncate text-ca-ink">{String(kind)}</span>
                    <span
                      className={`flex-1 truncate ${parseErr ? "text-red-500" : "text-ca-ink"}`}
                    >
                      {parseErr ? `parse-error: ${String(parseErr)}` : String(msg)}
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      id={`row-json-${rowKey}`}
                      className="border-t border-ca-border/40 bg-ca-surface-2/40 px-hmi-3 py-hmi-2"
                    >
                      <div className="mb-1 flex items-center justify-between gap-hmi-2">
                        <span className="text-hmi-caption text-ca-ink-muted">
                          Row payload (wire-verbatim JSON)
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void copyRow(rowKey, row);
                          }}
                          className={`inline-flex items-center gap-1 rounded-hmi-sm border px-2 py-0.5 text-hmi-caption ${
                            copyState === "ok"
                              ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                              : copyState === "err"
                                ? "border-destructive/40 text-destructive"
                                : "border-ca-border text-ca-ink-muted hover:text-ca-ink"
                          }`}
                          aria-label="Copy row JSON to clipboard"
                        >
                          {copyState === "ok" ? (
                            <>
                              <Check className="h-3 w-3" /> Copied
                            </>
                          ) : copyState === "err" ? (
                            <>
                              <AlertTriangle className="h-3 w-3" /> Copy failed
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> Copy JSON
                            </>
                          )}
                        </button>
                      </div>
                      <Highlight code={json} language="json" theme={themes.vsDark}>
                        {({ className, style, tokens, getLineProps, getTokenProps }) => (
                          <pre
                            className={`${className} overflow-x-auto rounded-hmi-sm p-hmi-2 text-hmi-caption`}
                            style={style}
                          >
                            {tokens.map((line, i) => {
                              const { key: _lk, ...lineProps } = getLineProps({ line });
                              void _lk;

                              return (
                                <div key={i} {...lineProps}>
                                  {line.map((token, j) => {
                                    const { key: _tk, ...tokenProps } = getTokenProps({ token });
                                    void _tk;

                                    return <span key={j} {...tokenProps} />;
                                  })}
                                </div>
                              );
                            })}
                          </pre>
                        )}
                      </Highlight>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
