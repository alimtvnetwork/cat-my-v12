/**
 * Route: `/observability/sessions/{cliInvocationId}/ipc` — IpcMonitor.
 *
 * Plan 90 Step 77. Third FE surface for CLI observability. Binds to
 * `getObservabilitySessionIpc` (proxying BE `GET /observability/sessions/
 * {id}/ipc`, Step 74). Completes the CLI observability triage set:
 * SessionList (Step 75) -> LogTailViewer (Step 76) -> IpcMonitor (this).
 *
 * Root cause guarded (one sentence): Steps 75-76 exposed sessions and
 * per-session logs but the FrameReady/ResultReady/Heartbeat traffic that
 * crosses worker->processing->main is still invisible, forcing operators
 * to shell into `<APP_IPC_ROOT>` and `cat` `*.msg.json` files by hand
 * to diagnose IPC-tier bugs (missing acks, RunId leakage, poison drops).
 *
 * Design:
 *  - Mailbox picker (worker-out / processing-in / processing-out / main-in);
 *    the BE derives a default from `CliInvocation.CliName` when omitted.
 *  - Cursor paging via `afterMsgId = NextAfterMsgId` so history is never
 *    re-fetched; "Load more" appends the next page.
 *  - `includeAcked` toggle mirrors the BE param.
 *  - Loud-failure: poison items (`_ParseError`) render in red with the
 *    underlying `_Raw` path so corruption is visible, not swallowed
 *    (per `spec/03-error-manage/`).
 *  - `robots: noindex` (internal operator screen).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, ChevronDown, Loader2, RefreshCw } from "lucide-react";

import {
  getObservabilitySessionIpc,
  type IpcItem,
  type IpcMailbox,
  type IpcPage,
} from "@/lib/observability/ipc.functions";

export const Route = createFileRoute("/observability/sessions/$cliInvocationId/ipc")({
  head: () => ({
    meta: [
      { title: "CLI IPC Monitor, Observability" },
      {
        name: "description",
        content:
          "Tail per-session IPC mailbox traffic (FrameReady, ResultReady, Heartbeat, Error).",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { mailbox?: IpcMailbox } => {
    return {
      mailbox: typeof search.mailbox === "string" ? (search.mailbox as IpcMailbox) : undefined,
    };
  },
  component: IpcMonitorPage,
});

const MAILBOXES: IpcMailbox[] = ["worker-out", "processing-in", "processing-out", "main-in"];

function kindClass(kind: unknown): string {
  const k = typeof kind === "string" ? kind : "";

  if (k === "Error") return "bg-red-500/20 text-red-300";

  if (k === "FrameReady") return "bg-sky-500/20 text-sky-300";

  if (k === "ResultReady") return "bg-emerald-500/20 text-emerald-300";

  if (k === "Heartbeat") return "bg-white/10 text-ca-ink/70";

  return "bg-white/10 text-ca-ink/80";
}

function renderItem(item: IpcItem, idx: number) {
  const isPoison = typeof item._ParseError === "string" && typeof item._Raw !== "undefined";

  if (isPoison) {
    return (
      <div
        key={idx}
        className="border-l-2 border-red-500/60 bg-red-500/5 px-2 py-2 font-mono text-xs"
      >
        <div className="text-red-300">poison message: {String(item._ParseError)}</div>
        <div className="mt-0.5 break-all opacity-70">{String(item._Raw)}</div>
        <div className="mt-0.5 opacity-50">IsAcked: {String(item.IsAcked ?? false)}</div>
      </div>
    );
  }

  const kind = item.Kind;
  const ts = item.CreatedAt;
  const msgId = item.MsgId;
  const from = item.Sender;
  const to = item.Recipient;
  const seq = item.Seq;
  const isAcked = Boolean(item.IsAcked);
  const payload = item.Payload;

  return (
    <div key={idx} className="border-b border-ca-border/5 px-2 py-2 font-mono text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${kindClass(kind)}`}>
          {String(kind ?? "?")}
        </span>
        {isAcked ? (
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
            acked
          </span>
        ) : (
          <span className="rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] text-yellow-300">
            pending
          </span>
        )}
        <span className="text-ca-ink/40">{String(ts ?? "")}</span>
        <span className="text-ca-ink/60">
          {String(from ?? "?")} → {String(to ?? "?")}
        </span>
        {seq !== undefined ? <span className="text-ca-ink/40">seq={String(seq)}</span> : null}
        <span className="ml-auto text-ca-ink/40">{String(msgId ?? "")}</span>
      </div>
      {payload !== undefined ? (
        <pre className="mt-1 whitespace-pre-wrap break-all text-[11px] text-ca-ink/60">
          {JSON.stringify(payload)}
        </pre>
      ) : null}
    </div>
  );
}

function IpcMonitorPage() {
  const { cliInvocationId } = Route.useParams();
  const search = Route.useSearch();
  const idNum = Number(cliInvocationId);
  const call = useServerFn(getObservabilitySessionIpc);

  const [mailbox, setMailbox] = useState<IpcMailbox | "">(search.mailbox ?? "");
  const [includeAcked, setIncludeAcked] = useState(false);
  const [limit, setLimit] = useState(100);

  const [page, setPage] = useState<IpcPage | null>(null);
  const [items, setItems] = useState<IpcItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = (await call({
        data: {
          cliInvocationId: idNum,
          limit,
          includeAcked,
          ...(mailbox ? { mailbox } : {}),
        },
      })) as IpcPage;
      setPage(p);
      setItems(p.items);
      setCursor(p.NextAfterMsgId ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [call, idNum, limit, includeAcked, mailbox]);

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    setLoadingMore(true);
    setError(null);
    try {
      const p = (await call({
        data: {
          cliInvocationId: idNum,
          limit,
          includeAcked,
          afterMsgId: cursor,
          ...(mailbox ? { mailbox } : {}),
        },
      })) as IpcPage;

      if (p.items.length > 0) {
        setItems((prev) => [...prev, ...p.items]);
      }

      setPage(p);
      setCursor(p.NextAfterMsgId ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingMore(false);
    }
  }, [call, idNum, limit, includeAcked, mailbox, cursor]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

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
            IPC Monitor <span className="font-mono text-sm opacity-70">#{cliInvocationId}</span>
          </h1>
          {page ? (
            <p className="text-xs opacity-60">
              RunId: <span className="font-mono">{page.RunId ?? "—"}</span>
              {" · "}
              Mailbox: <span className="font-mono">{page.mailbox}</span>
              {" · "}
              <span className="font-mono">{page.MailboxPath}</span>
              {page.IsTruncated ? (
                <span className="ml-2 rounded bg-yellow-500/20 px-1.5 py-0.5 text-yellow-300">
                  more available
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
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
      </header>

      <section className="mb-4 flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="opacity-70">Mailbox</span>
          <select
            value={mailbox}
            onChange={(e) => setMailbox(e.target.value as IpcMailbox | "")}
            className="rounded border border-ca-border/10 bg-transparent px-2 py-1"
          >
            <option value="">auto (from CliName)</option>
            {MAILBOXES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="opacity-70">Limit</span>
          <input
            type="number"
            min={1}
            max={500}
            value={limit}
            onChange={(e) => setLimit(Math.max(1, Math.min(500, Number(e.target.value) || 100)))}
            className="w-20 rounded border border-ca-border/10 bg-transparent px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeAcked}
            onChange={(e) => setIncludeAcked(e.target.checked)}
          />
          <span className="opacity-70">Include acked</span>
        </label>
      </section>

      {error ? (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">IPC tail failed</div>
            <div className="opacity-80">{error}</div>
          </div>
        </div>
      ) : null}

      <div className="max-h-[70vh] overflow-y-auto rounded border border-ca-border/10 bg-ca-bg/30">
        {items.length === 0 && !loading ? (
          <div className="px-3 py-8 text-center text-sm opacity-60">
            No IPC messages for this session in this mailbox.
          </div>
        ) : (
          items.map((it, i) => renderItem(it, i))
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs opacity-70">
        <div>
          Showing {items.length} message{items.length === 1 ? "" : "s"}
          {page ? ` (page ${page.Count})` : null}
        </div>
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={!cursor || loadingMore || !page?.IsTruncated}
          className="inline-flex items-center gap-1 rounded border border-ca-border/10 px-2 py-1 hover:bg-white/5 disabled:opacity-40"
        >
          {loadingMore ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          Load more
        </button>
      </div>
    </main>
  );
}
