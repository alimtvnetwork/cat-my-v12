/**
 * Route: `/observability/sessions/{cliInvocationId}/logs` — LogTailViewer.
 *
 * Plan 90 Step 76. Second FE surface for CLI observability. Binds to
 * `getObservabilitySessionLogs` (proxying BE `GET /observability/sessions/
 * {id}/logs`, Step 73). Completes the primary triage loop started by
 * Step 75's SessionList: click a row -> read the JSONL for that run.
 *
 * Root cause guarded (one sentence): Step 75 exposed `CliInvocationId`
 * per row but had no downstream viewer, so any `E_CLI_*` failure still
 * surfaced as "session X failed exit 42" with zero context (operators
 * had to shell into the host and `cat` the JSONL by hand).
 *
 * Design:
 *  - First render: tail last 200 lines (BE default).
 *  - Auto-follow: opt-in polling every 2s using `afterOffset = NextOffset`
 *    so we NEVER re-read history. When paused, the viewer stays static.
 *  - Loud-failure: poison lines (`_Raw` + `_ParseError`) render in red
 *    with the parse error inline instead of being silently dropped.
 *  - `robots: noindex` (internal operator screen).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Loader2, Pause, Play, RefreshCw } from "lucide-react";

import {
  getObservabilitySessionLogs,
  type LogTailItem,
  type LogTailPage,
} from "@/lib/observability/logs.functions";
import { ValidationStatusType } from "@/lib/enums/validation";

export const Route = createFileRoute("/observability/sessions/$cliInvocationId/logs")({
  head: () => ({
    meta: [
      { title: "CLI Log Tail, Observability" },
      {
        name: "description",
        content:
          "Tail and follow the JSONL log for a single worker-cli or processing-cli invocation.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LogTailPage,
});

const POLL_MS = 2000;

function levelClass(level: unknown): string {
  const l = typeof level === "string" ? level.toLowerCase() : "";

  if (l === "error" || l === "critical" || l === "fatal") {
    return "text-red-300";
  }

  if (l === "warning" || l === ValidationStatusType.Warn) return "text-yellow-300";

  if (l === "info") return "text-sky-300";

  if (l === "debug") return "text-ca-ink/50";

  return "text-ca-ink/80";
}

function renderItem(item: LogTailItem, idx: number) {
  const isPoison = typeof item._ParseError === "string" && typeof item._Raw !== "undefined";

  if (isPoison) {
    return (
      <div
        key={idx}
        className="border-l-2 border-red-500/60 bg-red-500/5 px-2 py-1 font-mono text-xs"
      >
        <div className="text-red-300">poison line: {String(item._ParseError)}</div>
        <div className="whitespace-pre-wrap break-all opacity-70">{String(item._Raw)}</div>
      </div>
    );
  }

  const ts =
    typeof item.timestamp === "string"
      ? item.timestamp
      : typeof item.Timestamp === "string"
        ? item.Timestamp
        : "";
  const level =
    typeof item.level === "string" ? item.level : typeof item.Level === "string" ? item.Level : "";
  const msg =
    typeof item.message === "string"
      ? item.message
      : typeof item.Message === "string"
        ? item.Message
        : "";
  const rest = { ...item } as Record<string, unknown>;
  for (const k of ["timestamp", "Timestamp", "level", "Level", "message", "Message"]) {
    delete rest[k];
  }

  const hasRest = Object.keys(rest).length > 0;

  return (
    <div key={idx} className="border-b border-ca-border/5 px-2 py-1 font-mono text-xs">
      <div className="flex flex-wrap gap-2">
        {ts ? <span className="text-ca-ink/40">{ts}</span> : null}
        {level ? <span className={`uppercase ${levelClass(level)}`}>{level}</span> : null}
        <span className="text-ca-ink/90">{msg || "(no message)"}</span>
      </div>
      {hasRest ? (
        <pre className="mt-1 whitespace-pre-wrap break-all text-[11px] text-ca-ink/50">
          {JSON.stringify(rest)}
        </pre>
      ) : null}
    </div>
  );
}

function LogTailPage() {
  const { cliInvocationId } = Route.useParams();
  const idNum = Number(cliInvocationId);
  const call = useServerFn(getObservabilitySessionLogs);

  const [page, setPage] = useState<LogTailPage | null>(null);
  const [items, setItems] = useState<LogTailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [follow, setFollow] = useState(false);
  const offsetRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = (await call({ data: { cliInvocationId: idNum, tail: 500 } })) as LogTailPage;
      setPage(p);
      setItems(p.Items ?? p.Lines ?? []);
      offsetRef.current = p.NextOffset ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [call, idNum]);

  const pollOnce = useCallback(async () => {
    const off = offsetRef.current;

    if (off == null) return;
    try {
      const p = (await call({
        data: { cliInvocationId: idNum, afterOffset: off },
      })) as LogTailPage;

      const newItems = p.Items ?? p.Lines ?? [];
      if (newItems.length > 0) {
        setItems((prev) => [...prev, ...newItems]);
      }

      setPage(p);
      offsetRef.current = p.NextOffset ?? null;
      setError(null);
    } catch (e) {
      // Loud-failure per spec/03-error-manage: surface, don't swallow.
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [call, idNum]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const isUnfollowed = !follow;

  useEffect(() => {
    if (isUnfollowed) return;
    const h = setInterval(() => {
      void pollOnce();
    }, POLL_MS);

    return () => clearInterval(h);
  }, [follow, pollOnce]);

  useEffect(() => {
    if (follow && bottomRef.current) {
      bottomRef.current.scrollIntoView({ block: "end" });
    }
  }, [items, follow]);

  return (
    <main className="min-h-screen bg-[var(--hmi-bg,#0b0d10)] p-6 text-[var(--hmi-fg,#e6e6e6)]">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/observability/sessions"
            className="mb-1 inline-flex items-center gap-1 text-xs opacity-70 hover:opacity-100"
          >
            <ArrowLeft className="h-3 w-3" /> Sessions
          </Link>
          <h1 className="text-xl font-semibold">
            Log Tail <span className="font-mono text-sm opacity-70">#{cliInvocationId}</span>
          </h1>
          {page ? (
            <p className="text-xs opacity-60">
              RunId: <span className="font-mono">{page.RunId ?? "—"}</span>
              {" · "}
              LogPath: <span className="font-mono">{page.LogPath}</span>
              {" · "}
              NextOffset: <span className="font-mono">{page.NextOffset}</span>
              {page.IsTruncated ? (
                <span className="ml-2 rounded bg-yellow-500/20 px-1.5 py-0.5 text-yellow-300">
                  truncated
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFollow((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md border border-ca-border/10 px-3 py-2 text-sm hover:bg-white/5"
            aria-pressed={follow}
          >
            {follow ? (
              <>
                <Pause className="h-4 w-4" /> Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Follow
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => void loadInitial()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-ca-border/10 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Reload
          </button>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Log tail failed</div>
            <div className="opacity-80">{error}</div>
          </div>
        </div>
      ) : null}

      <div className="max-h-[70vh] overflow-y-auto rounded border border-ca-border/10 bg-ca-bg/30">
        {items.length === 0 && !loading ? (
          <div className="px-3 py-8 text-center text-sm opacity-60">No log lines yet.</div>
        ) : (
          items.map((it, i) => renderItem(it, i))
        )}
        <div ref={bottomRef} />
      </div>

      <p className="mt-2 text-xs opacity-50">
        Poll every {POLL_MS}ms when following. Resume uses byte offset; history is never re-read.
      </p>
    </main>
  );
}
