/**
 * Route: `/cli/ipc` - IPC Inbox monitor, nested under the `/cli` layout.
 *
 * Plan 90 Step 113. Root cause guarded: without a global IPC surface,
 * operators had to open an individual session drill-down and manually
 * hit the per-session `/observability/sessions/{id}/ipc` proxy to see
 * whether a `.msg.json` was still pending on disk vs already acked to a
 * `.msg.ack.json` sidecar. That made cross-session triage of stuck
 * FrameReady / ResultReady / Heartbeat mailbox files impractical.
 *
 * Approach: this is a session-scoped view (mailboxes live under
 * `mailboxes/<runId>/<mailbox>/`, i.e. there is no cross-session global
 * directory to enumerate). To avoid pretending otherwise, the UI pairs
 * a session picker (Root-DB projection via `getObservabilitySessions`)
 * with mailbox tabs and reuses the existing per-session proxy
 * (`getObservabilitySessionIpc`, Step 77). "Include acked" toggles the
 * `include_acked` query param so both pending `.msg.json` and acked
 * `.msg.ack.json` files render side by side.
 *
 * Kind badges are derived from the item payload (`Kind` field on the
 * envelope body, per `spec/21-app/74-worker-cli.md`). Unknown kinds
 * still render as neutral outline badges so partial/legacy payloads
 * remain triageable.
 *
 * Plan 90 Step 114 additions:
 *  - `SchemaHintPanel` per Kind (FrameReady / ResultReady / Heartbeat)
 *    lists the expected top-level fields with type + presence status
 *    computed from the current row, so a missing / wrong-typed field is
 *    visible without the operator hand-diffing the raw JSON. Unknown
 *    Kinds render a "no schema registered" caption rather than pretending
 *    the payload is well-formed.
 *  - `Requeue (dev)` per-row button, gated behind `import.meta.env.DEV`,
 *    POSTs to `/api/cli/ipc/{msgId}/requeue`. The BE handler is deferred
 *    to a later Plan 90 slice, so today the FE server route returns
 *    `E_BE_NOT_IMPLEMENTED` in a Universal Envelope; the button surfaces
 *    the Code + Message + Resolution inline (never swallowed) so operators
 *    see loud failure instead of a silent no-op.
 *
 * `robots: noindex`: internal operator screen.
 */
import { pausePollOnError } from "@/lib/react-query/poll";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAppQuery } from "@/hooks/use-app-query";
import { useState, useMemo } from "react";
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  Inbox,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import {
  getObservabilitySessions,
  type ObservabilitySession,
} from "@/lib/observability/sessions.functions";
import {
  getObservabilitySessionIpc,
  type IpcMailbox,
  type IpcItem,
  type IpcPage,
} from "@/lib/observability/ipc.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/cli/EmptyState";
import { TableSkeleton } from "@/components/cli/ListSkeleton";
import { CliRouteError } from "@/components/cli/CliRouteError";
import { CliRouteNotFound } from "@/components/cli/CliRouteNotFound";

export const Route = createFileRoute("/cli/ipc")({
  validateSearch: (raw: Record<string, unknown>) => {
    const rawSession =
      typeof raw.session === "string" || typeof raw.session === "number"
        ? Number(raw.session)
        : undefined;
    const mailboxAllowed: readonly IpcMailbox[] = [
      "worker-out",
      "processing-in",
      "processing-out",
      "main-in",
    ];
    const mailbox =
      typeof raw.mailbox === "string" && (mailboxAllowed as readonly string[]).includes(raw.mailbox)
        ? (raw.mailbox as IpcMailbox)
        : undefined;
    const session = typeof raw.session === "string" ? raw.session : undefined;

    return {
      session,
      mailbox,
      acked: raw.acked === true || raw.acked === "true" ? true : false,
    };
  },
  head: () => ({
    meta: [
      { title: "CLI IPC Inbox" },
      {
        name: "description",
        content:
          "Pending .msg.json and acked .msg.ack.json files across worker-cli / processing-cli mailboxes, grouped by session.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "CLI IPC Inbox" },
      {
        property: "og:description",
        content: "Pending and acked IPC mailbox files across CLI runs, badged by Kind.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CliIpcRoute,
  errorComponent: (props) => <CliRouteError {...props} title="Failed to load CLI IPC inbox" />,
  notFoundComponent: () => (
    <CliRouteNotFound
      icon={Inbox}
      title="IPC mailbox not found"
      body="Valid mailboxes are worker-out, processing-in, processing-out, and main-in. Check the URL or pick one from the sidebar."
    />
  ),
});

const MAILBOXES: readonly IpcMailbox[] = [
  "worker-out",
  "processing-in",
  "processing-out",
  "main-in",
];

function kindOf(item: IpcItem): string {
  const kind = (item as { Kind?: unknown }).Kind;

  return typeof kind === "string" && kind.length > 0 ? kind : "unknown";
}

function msgIdOf(item: IpcItem): string {
  const v =
    (item as { MsgId?: unknown; msg_id?: unknown }).MsgId ?? (item as { msg_id?: unknown }).msg_id;

  return typeof v === "string" ? v : "-";
}

function ackedOf(item: IpcItem): boolean {
  const v =
    (item as { IsAcked?: unknown; Acked?: unknown }).IsAcked ?? (item as { Acked?: unknown }).Acked;

  return v === true;
}

function KindBadge({ kind }: { kind: string }) {
  switch (kind) {
    case "FrameReady":
      return (
        <Badge variant="outline" className="border-sky-500/40 text-sky-600 dark:text-sky-400">
          {kind}
        </Badge>
      );
    case "ResultReady":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
        >
          {kind}
        </Badge>
      );
    case "Heartbeat":
      return (
        <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
          {kind}
        </Badge>
      );
    default:
      return <Badge variant="outline">{kind}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Plan 90 Step 114: schema hint per Kind + requeue action.
// ---------------------------------------------------------------------------

type FieldExpect = {
  name: string;
  type: "string" | "number" | "object" | "boolean";
  required: boolean;
};

const SCHEMA_HINTS: Record<string, FieldExpect[]> = {
  FrameReady: [
    { name: "Kind", type: "string", required: true },
    { name: "MsgId", type: "string", required: true },
    { name: "RunId", type: "string", required: true },
    { name: "FrameId", type: "string", required: true },
    { name: "SamplePath", type: "string", required: true },
    { name: "CapturedAt", type: "number", required: true },
  ],
  ResultReady: [
    { name: "Kind", type: "string", required: true },
    { name: "MsgId", type: "string", required: true },
    { name: "RunId", type: "string", required: true },
    { name: "FrameId", type: "string", required: true },
    { name: "Verdict", type: "string", required: true },
    { name: "DurationMs", type: "number", required: true },
    { name: "Details", type: "object", required: false },
  ],
  Heartbeat: [
    { name: "Kind", type: "string", required: true },
    { name: "MsgId", type: "string", required: true },
    { name: "RunId", type: "string", required: true },
    { name: "EmittedAt", type: "number", required: true },
    { name: "Pid", type: "number", required: false },
  ],
};

function typeOfField(v: unknown): FieldExpect["type"] | "missing" | "other" {
  if (v === undefined) return "missing";

  if (v === null) return "other";
  const t = typeof v;

  if (t === "string" || t === "number" || t === "boolean") return t;

  if (t === "object") return "object";

  return "other";
}

function SchemaHintPanel({ item }: { item: IpcItem }) {
  const kind = kindOf(item);
  const spec = SCHEMA_HINTS[kind];

  if (!spec) {
    return (
      <div className="rounded-hmi-sm border border-dashed border-ca-border bg-ca-surface p-hmi-2 text-hmi-caption text-ca-ink-muted">
        No schema registered for Kind <code>{kind}</code>. Payload rendered verbatim below.
      </div>
    );
  }

  return (
    <div className="rounded-hmi-sm border border-ca-border bg-ca-surface p-hmi-2">
      <div className="pb-hmi-1 text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
        Schema hint: {kind}
      </div>
      <table className="w-full text-hmi-caption">
        <thead className="text-ca-ink-muted">
          <tr>
            <th className="px-hmi-2 py-1 text-left">Field</th>
            <th className="px-hmi-2 py-1 text-left">Expected</th>
            <th className="px-hmi-2 py-1 text-left">Actual</th>
            <th className="px-hmi-2 py-1 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {spec.map((f) => {
            const actual = typeOfField((item as Record<string, unknown>)[f.name]);
            const ok = actual === f.type;
            const missingRequired = actual === "missing" && f.required;

            return (
              <tr key={f.name} className="border-t border-ca-border">
                <td className="px-hmi-2 py-1 font-mono text-ca-ink">{f.name}</td>
                <td className="px-hmi-2 py-1 font-mono text-ca-ink-muted">
                  {f.type}
                  {f.required ? "" : "?"}
                </td>
                <td className="px-hmi-2 py-1 font-mono text-ca-ink-muted">{actual}</td>
                <td className="px-hmi-2 py-1">
                  {missingRequired ? (
                    <Badge variant="destructive">missing</Badge>
                  ) : ok ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                    >
                      ok
                    </Badge>
                  ) : actual === "missing" ? (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-amber-600 dark:text-amber-400"
                    >
                      absent
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-amber-600 dark:text-amber-400"
                    >
                      type
                    </Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import { beFetch, EnvelopeError } from "@/lib/be-fetch";

type RequeueOutcome =
  | { isSuccess: true; isFail: false; message: string }
  | { isSuccess: false; isFail: true; code: string; message: string; resolution?: string };

async function requeueMsg(msgId: string): Promise<RequeueOutcome> {
  try {
    await beFetch(`/api/cli/ipc/${encodeURIComponent(msgId)}/requeue`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    return { isSuccess: true, isFail: false, message: "Requeued" };
  } catch (err) {
    if (err instanceof EnvelopeError) {
      return {
        isSuccess: false,
        isFail: true,
        code: err.code,
        message: err.backendMessage,
      };
    }
    console.error("[cli.ipc.requeue] transport failure", { msgId, err });

    return {
      isSuccess: false,
      isFail: true,
      code: "E_FE_TRANSPORT",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

function CliIpcRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const fetchSessions = useServerFn(getObservabilitySessions);
  const fetchIpc = useServerFn(getObservabilitySessionIpc);

  const sessionsQuery = useAppQuery({
    queryKey: ["cli-ipc-sessions", { limit: 50 }],
    queryFn: () =>
      fetchSessions({
        data: { limit: 50, sort: "StartedAt" as const, dir: "desc" as const },
      }),
    refetchInterval: pausePollOnError(10_000),
    meta: { hasVisibility: false },
  });

  const sessions: ObservabilitySession[] = sessionsQuery.data?.items ?? [];

  const selectedSession = useMemo(() => {
    if (search.session) return sessions.find((s) => s.CliInvocationId === search.session);

    return sessions[0];
  }, [sessions, search.session]);

  const selectedId = selectedSession?.CliInvocationId ?? null;
  const selectedMailbox: IpcMailbox | undefined = search.mailbox;

  const ipcQuery = useAppQuery({
    queryKey: [
      "cli-ipc-page",
      { id: selectedId, mailbox: selectedMailbox ?? "auto", acked: search.acked },
    ],
    enabled: selectedId != null,
    queryFn: () =>
      fetchIpc({
        data: {
          cliInvocationId: Number(selectedId),
          mailbox: selectedMailbox,
          includeAcked: search.acked,
          limit: 100,
        },
      }),
    refetchInterval: pausePollOnError(5000),
    refetchIntervalInBackground: false,
    meta: { hasVisibility: false },
  });

  const pageData = ipcQuery.data as IpcPage | undefined;
  const items: IpcItem[] = pageData?.items ?? [];
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [requeueState, setRequeueState] = useState<
    Record<string, { pending: boolean; outcome?: RequeueOutcome }>
  >({});
  const isDev = import.meta.env.DEV;

  const onRequeue = async (msgId: string, rowKey: string) => {
    setRequeueState((prev) => ({ ...prev, [rowKey]: { pending: true } }));
    const outcome = await requeueMsg(msgId);
    setRequeueState((prev) => ({ ...prev, [rowKey]: { pending: false, outcome } }));
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);

      if (next.has(key)) next.delete(key);
      else next.add(key);

      return next;
    });
  };

  const copyJson = async (item: IpcItem, key: string) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(item, null, 2));
      setCopyStatus(`Copied ${key}`);
    } catch {
      setCopyStatus(`Copy failed for ${key}`);
    }

    window.setTimeout(() => setCopyStatus(null), 1500);
  };

  return (
    <section className="flex flex-col gap-hmi-3">
      <header className="flex items-center justify-between gap-hmi-2">
        <div className="flex flex-col">
          <h1 className="text-hmi-h2 font-semibold text-ca-ink">CLI IPC Inbox</h1>
          <p className="text-hmi-caption text-ca-ink-muted">
            Pending <code>.msg.json</code> and acked <code>.msg.ack.json</code> mailbox files per
            session. Auto-refresh 5 s.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => ipcQuery.refetch()}
          disabled={ipcQuery.isFetching || selectedId == null}
        >
          {ipcQuery.isFetching ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </header>

      {/* Session picker */}
      <div className="flex flex-col gap-hmi-2 rounded-hmi-sm border border-ca-border bg-ca-surface p-hmi-3">
        <label
          className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted"
          htmlFor="cli-ipc-session"
        >
          Session
        </label>
        <select
          id="cli-ipc-session"
          className="min-h-10 rounded-hmi-sm border border-ca-border bg-ca-surface-alt px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink"
          value={selectedId ?? ""}
          onChange={(e) => {
            const id = e.target.value;
            navigate({
              search: (prev) => ({ ...prev, session: id || undefined }),
              replace: true,
            });
          }}
          disabled={sessionsQuery.isPending || sessions.length === 0}
        >
          {sessions.length === 0 && <option value="">No sessions available</option>}
          {sessions.map((s) => (
            <option key={s.CliInvocationId} value={s.CliInvocationId}>
              #{s.CliInvocationId} · {s.CliName} · {s.Subcommand ?? "-"} ·{" "}
              {s.RunId?.slice(0, 8) ?? "-"}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap items-center gap-hmi-2 pt-hmi-2">
          <span className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
            Mailbox
          </span>
          <button
            type="button"
            className={cn(
              "rounded-hmi-sm border px-hmi-2 py-1 text-hmi-caption",
              selectedMailbox === undefined
                ? "border-ca-accent bg-ca-accent-soft text-ca-accent"
                : "border-ca-border text-ca-ink hover:bg-ca-surface-alt",
            )}
            onClick={() =>
              navigate({ search: (prev) => ({ ...prev, mailbox: undefined }), replace: true })
            }
          >
            auto
          </button>
          {MAILBOXES.map((m) => (
            <button
              key={m}
              type="button"
              className={cn(
                "rounded-hmi-sm border px-hmi-2 py-1 text-hmi-caption",
                selectedMailbox === m
                  ? "border-ca-accent bg-ca-accent-soft text-ca-accent"
                  : "border-ca-border text-ca-ink hover:bg-ca-surface-alt",
              )}
              onClick={() =>
                navigate({ search: (prev) => ({ ...prev, mailbox: m }), replace: true })
              }
            >
              {m}
            </button>
          ))}

          <label className="ml-auto inline-flex items-center gap-2 text-hmi-caption text-ca-ink">
            <input
              type="checkbox"
              checked={search.acked}
              onChange={(e) =>
                navigate({
                  search: (prev) => ({ ...prev, acked: e.target.checked }),
                  replace: true,
                })
              }
            />
            Include acked
          </label>
        </div>

        {pageData && (
          <div className="text-hmi-caption text-ca-ink-muted">
            <code>{pageData.MailboxPath}</code> · {pageData.Count} item(s)
            {pageData.IsTruncated && " · truncated"}
          </div>
        )}
      </div>

      {ipcQuery.isFail && (
        <div
          role="alert"
          className="flex items-start gap-hmi-2 rounded-hmi-sm border border-destructive/40 bg-destructive/5 p-hmi-3 text-hmi-body text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Failed to load IPC page</div>
            <code className="text-hmi-caption opacity-80">
              {ipcQuery.error instanceof Error ? ipcQuery.error.message : String(ipcQuery.error)}
            </code>
          </div>
        </div>
      )}

      {selectedId == null ? (
        <p className="text-hmi-body text-ca-ink-muted">
          No CLI session available. Run <code>worker-cli</code> or <code>processing-cli</code>{" "}
          first, then check{" "}
          <Link to="/cli/sessions" className="text-ca-accent underline-offset-2 hover:underline">
            /cli/sessions
          </Link>
          .
        </p>
      ) : ipcQuery.isPending ? (
        <TableSkeleton columns={6} rows={5} testId="cli-ipc-skeleton" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Mailbox is empty"
          body={
            !search.acked
              ? "Toggle 'Include acked' above to show acked sidecars, or wait for the worker to publish a new message."
              : "No messages in this mailbox for the selected session."
          }
          testId="cli-ipc-empty"
        />
      ) : (
        <div className="overflow-x-auto rounded-hmi-sm border border-ca-border bg-ca-surface">
          <table className="w-full text-hmi-body">
            <thead className="bg-ca-surface-alt text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
              <tr>
                <th className="px-hmi-3 py-hmi-2 text-left">Kind</th>
                <th className="px-hmi-3 py-hmi-2 text-left">MsgId</th>
                <th className="hidden px-hmi-3 py-hmi-2 text-left md:table-cell">Acked</th>
                <th className="px-hmi-3 py-hmi-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const key = `${msgIdOf(it)}::${i}`;
                const isOpen = expanded.has(key);

                return (
                  <>
                    <tr key={key} className="border-t border-ca-border">
                      <td className="px-hmi-3 py-hmi-2">
                        <KindBadge kind={kindOf(it)} />
                      </td>
                      <td className="px-hmi-3 py-hmi-2 font-mono text-hmi-caption text-ca-ink">
                        {msgIdOf(it)}
                      </td>
                      <td className="hidden px-hmi-3 py-hmi-2 md:table-cell">
                        {ackedOf(it) ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                          >
                            acked
                          </Badge>
                        ) : (
                          <Badge variant="outline">pending</Badge>
                        )}
                      </td>
                      <td className="px-hmi-3 py-hmi-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => toggleExpand(key)}>
                          {isOpen ? "Hide" : "Inspect"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => copyJson(it, msgIdOf(it))}>
                          Copy JSON
                        </Button>
                        {isDev && msgIdOf(it) !== "-" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onRequeue(msgIdOf(it), key)}
                            disabled={requeueState[key]?.pending}
                            title="Dev-only: POST /api/cli/ipc/{msgId}/requeue"
                          >
                            {requeueState[key]?.pending ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="mr-1 h-3.5 w-3.5" />
                            )}
                            Requeue
                          </Button>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr
                        key={`${key}::body`}
                        className="border-t border-ca-border bg-ca-surface-alt"
                      >
                        <td colSpan={4} className="px-hmi-3 py-hmi-2">
                          <div className="flex flex-col gap-hmi-2">
                            <SchemaHintPanel item={it} />
                            {requeueState[key]?.outcome && (
                              <div
                                role="status"
                                className={cn(
                                  "flex items-start gap-hmi-2 rounded-hmi-sm border p-hmi-2 text-hmi-caption",
                                  requeueState[key]!.outcome!.isSuccess
                                    ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                                    : "border-destructive/40 text-destructive",
                                )}
                              >
                                {requeueState[key]!.outcome!.isSuccess ? (
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                ) : (
                                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                )}
                                <div className="flex flex-col gap-1">
                                  <div className="font-medium">
                                    {requeueState[key]!.outcome!.isSuccess
                                      ? (requeueState[key]!.outcome as { message: string }).message
                                      : `${(requeueState[key]!.outcome as { code: string }).code}: ${(requeueState[key]!.outcome as { message: string }).message}`}
                                  </div>
                                  {requeueState[key]!.outcome!.isFail &&
                                    (requeueState[key]!.outcome as { resolution?: string })
                                      .resolution && (
                                      <div className="text-ca-ink-muted">
                                        {
                                          (requeueState[key]!.outcome as { resolution?: string })
                                            .resolution
                                        }
                                      </div>
                                    )}
                                </div>
                              </div>
                            )}
                            <pre className="max-h-96 overflow-auto rounded-hmi-sm bg-ca-surface p-hmi-2 font-mono text-hmi-caption text-ca-ink">
                              {JSON.stringify(it, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {copyStatus && (
        <div role="status" className="text-hmi-caption text-ca-ink-muted">
          {copyStatus}
        </div>
      )}
    </section>
  );
}
