/**
 * Route: `/observability/sessions` — SessionList view.
 *
 * Plan 90 Step 75. First FE surface for CLI observability. Binds to
 * `getObservabilitySessions` (proxying BE `GET /observability/sessions`,
 * Step 72). This screen is the anchor for the deep-link contract used by
 * Steps 76 (LogTailViewer) and 77 (IpcMonitor): each row exposes the
 * `CliInvocationId` a downstream viewer keys off.
 *
 * Root cause guarded: Step 74 exposed IPC over HTTP but there was no FE
 * surface at all — operators still had to `curl` or open SQLite by hand
 * to see recent CLI runs. This route is the first pane.
 *
 * `robots: noindex` because this is an internal operator screen.
 */
import {
  createFileRoute,
  Link,
  useNavigate,
  stripSearchParams,
  retainSearchParams,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Link2,
  Bookmark,
  X,
} from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { toast } from "sonner";
import { z } from "zod";

import {
  getObservabilitySessions,
  type ObservabilitySession,
} from "@/lib/observability/sessions.functions";
import {
  listSavedViews,
  addSavedView,
  removeSavedView,
  type SavedView,
} from "@/lib/observability/savedViews";

export enum CliFilterType {
  Empty = "",
  WorkerCli = "worker-cli",
  ProcessingCli = "processing-cli",
}
export type CliFilter = CliFilterType;
export enum StatusFilterType {
  Empty = "",
  Active = "active",
  Success = "success",
  Failure = "failure",
}
export type StatusFilter = StatusFilterType;

const CLI_VALUES = ["worker-cli", "processing-cli"] as const;
const STATUS_VALUES = ["active", "success", "failure"] as const;
const SORT_VALUES = ["StartedAt", "CliName", "Status", "DurationMs"] as const;
const DIR_VALUES = ["asc", "desc"] as const;

const SEARCH_DEFAULTS = {
  cli: "",
  status: "",
  limit: 50,
  sort: "StartedAt",
  dir: "desc",
  autoRefresh: true,
} as const;

// Plan 90 Step 87: guideline-compliant search validation.
// Root cause fixed here: Step 86 used closed `z.enum([...])` and
// `.min/.max` inside `validateSearch`, which the tanstack-search-params
// guideline explicitly forbids — an out-of-range URL value (`?limit=9999`,
// `?cli=bogus`) throws under raw Zod and takes the route down instead of
// degrading. This schema uses open primitives + adapter `fallback()`; a
// bad URL now falls back to the default rather than crashing, and the
// `stripSearchParams` middleware keeps default values out of the URL so
// no per-setter "delete when default" bookkeeping is needed.
const searchSchema = z.object({
  cli: fallback(z.string(), SEARCH_DEFAULTS.cli).default(SEARCH_DEFAULTS.cli),
  status: fallback(z.string(), SEARCH_DEFAULTS.status).default(SEARCH_DEFAULTS.status),
  limit: fallback(z.number(), SEARCH_DEFAULTS.limit).default(SEARCH_DEFAULTS.limit),
  sort: fallback(z.string(), SEARCH_DEFAULTS.sort).default(SEARCH_DEFAULTS.sort),
  dir: fallback(z.string(), SEARCH_DEFAULTS.dir).default(SEARCH_DEFAULTS.dir),
  autoRefresh: fallback(z.boolean(), SEARCH_DEFAULTS.autoRefresh).default(
    SEARCH_DEFAULTS.autoRefresh,
  ),
  // Step 88: opt-in troubleshooting flag; unvalidated string so operators
  // can pass any tag ("net", "sql", "run-42"). Retained across navigation
  // by the `retainSearchParams` middleware below.
  debug: fallback(z.string(), "").default(""),
});
type SearchState = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/observability/sessions")({
  validateSearch: zodValidator(searchSchema),
  search: {
    // Order matters: retain first (so `debug` survives), then strip
    // defaults (so `debug=""` doesn't clutter shared URLs).
    middlewares: [retainSearchParams(["debug"]), stripSearchParams(SEARCH_DEFAULTS)],
  },

  head: () => ({
    meta: [
      { title: "CLI Sessions, Observability" },
      {
        name: "description",
        content: "Recent worker-cli and processing-cli invocations with exit codes and durations.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SessionListPage,
});

function formatTs(ts: number | null): string {
  if (ts == null) return "—";
  try {
    return new Date(ts * 1000).toISOString().replace("T", " ").slice(0, 19);
  } catch {
    return String(ts);
  }
}

function formatDuration(ms: number | null, endedAt: number | null): string {
  if (ms == null) return endedAt == null ? "running…" : "—";

  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;

  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s - m * 60);

  return `${m}m ${rem}s`;
}

function statusLabel(row: ObservabilitySession): {
  text: string;
  cls: string;
} {
  if (row.EndedAt == null) {
    return { text: "active", cls: "bg-yellow-500/20 text-yellow-300" };
  }

  const ok =
    row.IsSuccess === true || row.IsSuccess === 1 || (row.ExitCode !== null && row.ExitCode === 0);

  return ok
    ? { text: "success", cls: "bg-emerald-500/20 text-emerald-300" }
    : { text: `failure(${row.ExitCode ?? "?"})`, cls: "bg-red-500/20 text-red-300" };
}

export enum SortKeyType {
  StartedAt = "StartedAt",
  CliName = "CliName",
  Status = "Status",
  DurationMs = "DurationMs",
}
export type SortKey = SortKeyType;
export enum SortDirType {
  Asc = "asc",
  Desc = "desc",
}
export type SortDir = SortDirType;

function SessionListPage() {
  const call = useServerFn(getObservabilitySessions);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  // Derive UI state from URL search (source of truth). Because the schema
  // uses open primitives (`z.string()`, `z.number()`), any junk URL value
  // survives `validateSearch`; whitelist/clamp here so BE gets a valid
  // request and the dropdowns show a coherent selection.
  const rawCli = search.cli;
  const cli: CliFilter =
    rawCli === CliFilterType.WorkerCli || rawCli === CliFilterType.ProcessingCli
      ? rawCli
      : CliFilterType.Empty;
  const rawStatus = search.status;
  const status: StatusFilter =
    rawStatus === StatusFilterType.Active ||
    rawStatus === StatusFilterType.Success ||
    rawStatus === StatusFilterType.Failure
      ? rawStatus
      : StatusFilterType.Empty;
  const limit = Math.max(1, Math.min(500, Math.trunc(search.limit) || 50));
  const sortKey: SortKey = (
    (SORT_VALUES as readonly string[]).includes(search.sort) ? search.sort : SortKeyType.StartedAt
  ) as SortKey;
  const sortDir: SortDir = (
    (DIR_VALUES as readonly string[]).includes(search.dir) ? search.dir : SortDirType.Desc
  ) as SortDir;
  const autoRefresh = search.autoRefresh;
  void CLI_VALUES;
  void STATUS_VALUES;

  // `stripSearchParams(SEARCH_DEFAULTS)` on the route removes defaulted
  // fields from the URL, so this callback just merges and navigates —
  // no per-field "delete when default" bookkeeping needed.
  const patch = useCallback(
    (next: Partial<SearchState>) => {
      void navigate({
        search: (prev: SearchState) => ({ ...prev, ...next }),
        replace: true,
      });
    },
    [navigate],
  );

  const [rows, setRows] = useState<ObservabilitySession[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 89: saved views. `savedViews` state is seeded lazily inside a
  // `useEffect` so the initial SSR render matches the client (localStorage
  // is browser-only). `savingName` drives the inline "Save current" input.
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [savingName, setSavingName] = useState("");
  useEffect(() => {
    setSavedViews(listSavedViews());
  }, []);

  const handleSaveView = useCallback(() => {
    // Snapshot the currently-active search (post `stripSearchParams`) so
    // the saved view stays canonical and never re-persists defaults.
    const snapshot: Record<string, unknown> = { ...search };
    const result = addSavedView(savingName, snapshot);

    if (result.ok === false) {
      console.warn("[observability.sessions] save view rejected", {
        reason: result.reason,
        name: savingName,
      });
      toast.error("Save view failed", { description: result.reason });

      return;
    }

    setSavedViews(listSavedViews());
    setSavingName("");
    toast.success("View saved", { description: result.view.name });
  }, [savingName, search]);

  const handleApplyView = useCallback(
    (view: SavedView) => {
      // Replace search wholesale so defaults not present in the saved
      // snapshot revert to schema defaults via `validateSearch` + fallback.
      void navigate({
        search: view.search as SearchState,
        replace: true,
      });
    },
    [navigate],
  );

  const handleDeleteView = useCallback((view: SavedView) => {
    if (removeSavedView(view.id) === false) {
      toast.error("Delete view failed", { description: "Storage write failed" });

      return;
    }

    setSavedViews(listSavedViews());
    toast.success("View deleted", { description: view.name });
  }, []);

  // Initial load / reload (resets cursor + rows). Any filter/sort/limit
  // change re-runs this via the effect below; cursor is intentionally
  // absent from deps because Load more advances it without a full reload.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await call({
        data: {
          limit,
          sort: sortKey,
          dir: sortDir,
          ...(cli ? { cli } : {}),
          ...(status ? { status } : {}),
        },
      });
      setRows(data.items);
      setNextCursor(data.nextCursor ?? null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[observability.sessions] load failed", { error: msg });
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [call, cli, status, limit, sortKey, sortDir]);

  // Load next page by appending; keeps existing rows visible. Filter/sort
  // must not change between pages (BE cursor is bound to them); the reload
  // effect resets cursor when they do.
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const data = await call({
        data: {
          limit,
          sort: sortKey,
          dir: sortDir,
          cursor: nextCursor,
          ...(cli ? { cli } : {}),
          ...(status ? { status } : {}),
        },
      });
      setRows((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor ?? null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[observability.sessions] load-more failed", {
        error: msg,
        cursor: nextCursor,
      });
      setError(msg);
    } finally {
      setLoadingMore(false);
    }
  }, [call, nextCursor, loadingMore, limit, sortKey, sortDir, cli, status]);

  useEffect(() => {
    void load();
  }, [load]);

  // Auto-refresh every 5s while any row is still active. Stops as soon as
  // the visible page has no active rows to avoid pointless polling.
  const hasActive = rows.some((r) => r.EndedAt == null);
  useEffect(() => {
    if (!autoRefresh || !hasActive) return;
    const id = window.setInterval(() => {
      void load();
    }, 5000);

    return () => window.clearInterval(id);
  }, [autoRefresh, hasActive, load]);

  // BE authoritatively sorts (Step 82) and paginates (Step 84); rows arrive
  // pre-sorted and get appended in order on Load more.
  const sortedRows = rows;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      patch({ dir: sortDir === "asc" ? "desc" : "asc" });
    } else {
      patch({
        sort: key,
        dir: key === "StartedAt" || key === "DurationMs" ? "desc" : "asc",
      });
    }
  };

  const SortableTh = ({ label, k }: { label: string; k: SortKey }) => {
    const active = sortKey === k;

    return (
      <th className="px-3 py-2">
        <button
          type="button"
          onClick={() => toggleSort(k)}
          className={`inline-flex items-center gap-1 uppercase ${active ? "text-sky-300" : "hover:text-sky-200"}`}
          aria-label={`Sort by ${label} ${active && sortDir === "asc" ? "descending" : "ascending"}`}
          aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
        >
          {label}
          {active ? (
            sortDir === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : null}
        </button>
      </th>
    );
  };

  return (
    <main className="min-h-screen bg-[var(--hmi-bg,#0b0d10)] p-6 text-[var(--hmi-fg,#e6e6e6)]">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">CLI Sessions</h1>
          <p className="text-sm opacity-70">Recent invocations from `CliInvocation` (Root-DB).</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => patch({ autoRefresh: e.target.checked })}
              className="h-4 w-4 accent-sky-400"
              aria-label="Auto-refresh while any session is active"
            />
            <span className="opacity-70">
              Auto-refresh {hasActive && autoRefresh ? "(5s, active)" : "(idle)"}
            </span>
          </label>
          <button
            type="button"
            onClick={async () => {
              // Read the live URL so it reflects `stripSearchParams` +
              // `retainSearchParams` exactly as a bookmarker would see it.
              const url = typeof window !== "undefined" ? window.location.href : "";
              try {
                await navigator.clipboard.writeText(url);
                toast.success("View URL copied", { description: url });
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                console.warn("[observability.sessions] copy failed", { error: msg, url });
                toast.error("Copy failed", { description: msg });
              }
            }}
            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
            aria-label="Copy shareable URL for this view"
            title="Copy shareable URL for this filtered/sorted view"
          >
            <Link2 className="h-4 w-4" />
            Copy view URL
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
            aria-label="Refresh sessions"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>
      </header>

      <section className="mb-4 flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="opacity-70">CLI</span>
          <select
            value={cli}
            onChange={(e) => patch({ cli: (e.target.value || undefined) as SearchState["cli"] })}
            className="rounded border border-white/10 bg-transparent px-2 py-1"
          >
            <option value="">any</option>
            <option value="worker-cli">worker-cli</option>
            <option value="processing-cli">processing-cli</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="opacity-70">Status</span>
          <select
            value={status}
            onChange={(e) =>
              patch({ status: (e.target.value || undefined) as SearchState["status"] })
            }
            className="rounded border border-white/10 bg-transparent px-2 py-1"
          >
            <option value="">any</option>
            <option value="active">active</option>
            <option value="success">success</option>
            <option value="failure">failure</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="opacity-70">Limit</span>
          <input
            type="number"
            min={1}
            max={500}
            value={limit}
            onChange={(e) =>
              patch({ limit: Math.max(1, Math.min(500, Number(e.target.value) || 50)) })
            }
            className="w-20 rounded border border-white/10 bg-transparent px-2 py-1"
          />
        </label>
      </section>

      <section className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <div className="flex items-center gap-1 opacity-70">
          <Bookmark className="h-4 w-4" />
          <span>Saved views:</span>
        </div>
        {savedViews.length === 0 ? (
          <span className="opacity-50">none yet</span>
        ) : (
          savedViews.map((v) => (
            <span
              key={v.id}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 pl-3 pr-1 py-0.5"
            >
              <button
                type="button"
                onClick={() => handleApplyView(v)}
                className="hover:text-sky-300"
                aria-label={`Apply saved view ${v.name}`}
                title={JSON.stringify(v.search)}
              >
                {v.name}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteView(v)}
                className="rounded-full p-0.5 opacity-60 hover:bg-white/10 hover:opacity-100"
                aria-label={`Delete saved view ${v.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
        <form
          className="ml-auto flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveView();
          }}
        >
          <input
            type="text"
            value={savingName}
            onChange={(e) => setSavingName(e.target.value)}
            placeholder="Name this view…"
            maxLength={64}
            className="w-44 rounded border border-white/10 bg-transparent px-2 py-1"
            aria-label="Name for a new saved view"
          />
          <button
            type="submit"
            disabled={savingName.trim().length === 0}
            className="rounded-md border border-white/10 px-3 py-1 hover:bg-white/5 disabled:opacity-40"
          >
            Save
          </button>
        </form>
      </section>

      {error ? (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Failed to load sessions</div>
            <div className="opacity-80">{error}</div>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase opacity-70">
            <tr>
              <SortableTh label="Started" k={SortKeyType.StartedAt as SortKeyType} />
              <SortableTh label="CLI" k={SortKeyType.CliName as SortKeyType} />
              <th className="px-3 py-2">Subcommand</th>
              <SortableTh label="Status" k={SortKeyType.Status as SortKeyType} />
              <SortableTh label="Duration" k={SortKeyType.DurationMs as SortKeyType} />
              <th className="px-3 py-2">Host / PID</th>
              <th className="px-3 py-2">Invocation ID</th>
              <th className="px-3 py-2">Live tail</th>
              <th className="px-3 py-2">IPC</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center opacity-60">
                  No sessions match these filters.
                </td>
              </tr>
            ) : null}
            {sortedRows.map((r) => {
              const s = statusLabel(r);

              return (
                <tr
                  key={r.CliInvocationId}
                  className={`border-t border-white/5 ${r.EndedAt == null ? "bg-yellow-500/5" : ""}`}
                >
                  <td className="px-3 py-2 font-mono text-xs">{formatTs(r.StartedAt)}</td>
                  <td className="px-3 py-2">{r.CliName}</td>
                  <td className="px-3 py-2">{r.Subcommand ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${s.cls}`}>{s.text}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {formatDuration(r.DurationMs, r.EndedAt)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {(r.HostName ?? "—") + " / " + (r.Pid ?? "—")}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs" title={r.CliInvocationId}>
                    {r.CliInvocationId.slice(0, 12)}…
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.RunId ? (
                      <Link
                        to="/observability/runs/$runId"
                        params={{ runId: r.RunId }}
                        className="text-sky-300 underline-offset-2 hover:underline"
                        aria-label={`Open live tail for run ${r.RunId}`}
                      >
                        Open tail →
                      </Link>
                    ) : (
                      <span className="opacity-50">no run id</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <Link
                      to="/observability/sessions/$cliInvocationId/ipc"
                      params={{ cliInvocationId: r.CliInvocationId }}
                      className="text-sky-300 underline-offset-2 hover:underline"
                      aria-label={`Open IPC monitor for invocation ${r.CliInvocationId}`}
                    >
                      Open IPC →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="opacity-60">
          Showing {rows.length} {rows.length === 1 ? "session" : "sessions"}
          {nextCursor ? " (more available)" : ""}
        </span>
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={!nextCursor || loadingMore || loading}
          className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={nextCursor ? "Load next page of sessions" : "No more sessions to load"}
        >
          {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {nextCursor ? "Load more" : "End of list"}
        </button>
      </div>
    </main>
  );
}
