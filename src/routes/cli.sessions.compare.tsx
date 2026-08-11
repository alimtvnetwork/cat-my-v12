/**
 * Route: `/cli/sessions/compare?a=<id>&b=<id>` - side-by-side CLI session diff.
 *
 * Plan 90 Step 145. Root cause guarded (one sentence): until this route
 * shipped, comparing two CLI runs meant opening two browser tabs against
 * `/cli/sessions/$sessionId`, screenshotting each, and eyeballing exit
 * codes / durations / level counts by hand, so regression triage on
 * "worked yesterday, fails today" pairs was slow and error-prone.
 *
 * Contract:
 *  - `a` and `b` are positive-integer `CliInvocationId` strings, validated
 *    in `validateSearch` so a copy-pasted URL with junk cannot pin the
 *    render thread (mirrors the guard on `cli.sessions.$sessionId.tsx`
 *    L92-108).
 *  - Session summary is resolved via `getObservabilitySessions` (Root-DB
 *    projection) and matched by `CliInvocationId`, matching the drill-down
 *    route's strategy at L206-219 to avoid a spec deviation until Step 121
 *    lands the targeted GET-by-id endpoint.
 *  - Log summary is computed client-side from `getObservabilitySessionLogs`
 *    (tail=2000) and reports:
 *      * total items + `IsTruncated` flag (so 2000+ is not silently equated
 *        to "identical to shorter run"),
 *      * count per canonical level bucket (error / warn / info / debug /
 *        other) - matching the level palette used by `levelClass` on the
 *        drill-down route (L190-197),
 *      * first error message + line index for at-a-glance divergence.
 *  - Field-level diff: any header row whose left/right values differ gets
 *    a `data-diff="1"` attribute + amber ring so a11y tools + screenshots
 *    can locate divergence without colour alone.
 *
 * `robots: noindex`: internal operator screen.
 */
import { useCallback, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAppQuery } from "@/hooks/use-app-query";
import { AlertTriangle, ArrowLeftRight, Loader2, Terminal } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { StatusPill, toneForExitCode } from "@/components/cli/status-pill";
import { CorrelationIdChip } from "@/components/cli/CorrelationIdChip";
import { EmptyState } from "@/components/cli/EmptyState";
import { CliRouteError } from "@/components/cli/CliRouteError";
import { CliRouteNotFound } from "@/components/cli/CliRouteNotFound";
import { cn } from "@/lib/utils";
import { ValidationStatus } from "@/lib/enums/validation";

/** Positive-integer ID string, or `undefined` for anything else. */
function parseId(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 32) return undefined;

  if (/^[1-9][0-9]*$/.test(raw) === false) return undefined;

  return raw;
}

interface CompareSearch {
  a?: string;
  b?: string;
}

export const Route = createFileRoute("/cli/sessions/compare")({
  validateSearch: (search: Record<string, unknown>): CompareSearch => {
    const out: CompareSearch = {};
    const a = parseId(search.a);
    const b = parseId(search.b);

    if (a) out.a = a;

    if (b) out.b = b;

    return out;
  },
  head: () => {
    const title = "Compare CLI Sessions";
    const description =
      "Side-by-side diff of envelopes, exit codes, and per-level log summaries for two CLI invocations.";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  errorComponent: (props) => <CliRouteError {...props} title="Failed to load session comparison" />,
  notFoundComponent: () => (
    <CliRouteNotFound
      icon={Terminal}
      title="Comparison inputs invalid"
      body="Both ?a and ?b must be positive integer CliInvocationId values."
    />
  ),
  component: CliSessionsCompare,
});

// ---------- Helpers reused verbatim from the sibling drill-down. ----------

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

// ---------- Log summary ----------

export enum LevelBucketType {
  Error = "error",
  Warn = "warn",
  Info = "info",
  Debug = "debug",
  Other = "other",
}
export type LevelBucket = LevelBucketType;

interface LogSummary {
  total: number;
  truncated: boolean;
  logPath: string | null;
  runId: string | null;
  counts: Record<LevelBucket, number>;
  firstError: { index: number; message: string } | null;
}

function bucketFor(level: unknown): LevelBucket {
  const l = typeof level === "string" ? level.toLowerCase() : "";

  if (l === LevelBucketType.Error || l === "critical" || l === "fatal")

    return LevelBucketType.Error;

  if (l === ValidationStatus.Warn || l === "warning") return LevelBucketType.Warn;

  if (l === LevelBucketType.Info) return LevelBucketType.Info;

  if (l === LevelBucketType.Debug || l === "trace") return LevelBucketType.Debug;

  return LevelBucketType.Other;
}

function summarizeLogs(page: LogTailPage | undefined): LogSummary | null {
  if (!page) return null;
  const counts: Record<LevelBucket, number> = {
    error: 0,
    warn: 0,
    info: 0,
    debug: 0,
    other: 0,
  };
  let firstError: LogSummary["firstError"] = null;
  const items = page.Items as LogTailItem[];
  for (let i = 0; i < items.length; i++) {
    const row = items[i] as Record<string, unknown>;
    const b = bucketFor(row.Level ?? row.level);
    counts[b] += 1;

    if (b === "error" && firstError === null) {
      const msg =
        (typeof row.Msg === "string" && row.Msg) ||
        (typeof row.Message === "string" && row.Message) ||
        (typeof row.message === "string" && row.message) ||
        (typeof row.Event === "string" && row.Event) ||
        "(no message)";
      firstError = { index: i, message: msg };
    }
  }

  return {
    total: items.length,
    truncated: page.IsTruncated ?? false,
    logPath: page.LogPath ?? null,
    runId: page.RunId ?? null,
    counts,
    firstError,
  };
}

// ---------- Diff row primitive ----------

interface DiffRowProps {
  label: string;
  left: React.ReactNode;
  right: React.ReactNode;
  /** Raw string values used for equality; supply when the ReactNodes are
   *  formatted (e.g. `formatDuration`) so the diff detects semantic equality
   *  rather than JSX identity. */
  leftKey?: string;
  rightKey?: string;
}

function DiffRow({ label, left, right, leftKey, rightKey }: DiffRowProps) {
  const lk = leftKey ?? (typeof left === "string" ? left : String(left));
  const rk = rightKey ?? (typeof right === "string" ? right : String(right));
  const differs = lk !== rk;

  return (
    <tr
      data-diff={differs ? "1" : "0"}
      className={cn("border-t border-ca-border align-top", differs && "bg-amber-500/5")}
    >
      <th className="w-40 px-hmi-3 py-hmi-2 text-left text-hmi-caption font-medium uppercase tracking-wide text-ca-ink-muted">
        {label}
        {differs && (
          <span
            aria-label="differs"
            className="ml-hmi-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle"
          />
        )}
      </th>
      <td
        className={cn(
          "px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink",
          differs && "ring-1 ring-inset ring-amber-500/40",
        )}
      >
        {left}
      </td>
      <td
        className={cn(
          "px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink",
          differs && "ring-1 ring-inset ring-amber-500/40",
        )}
      >
        {right}
      </td>
    </tr>
  );
}

// ---------- One side of the split ----------

interface SidePane {
  id: string | undefined;
  session: ObservabilitySession | null | undefined;
  sessionLoading: boolean;
  sessionError: unknown;
  logs: LogSummary | null;
  logsLoading: boolean;
  logsError: unknown;
}

function useSide(id: string | undefined): SidePane {
  const fetchSessions = useServerFn(getObservabilitySessions);
  const fetchLogs = useServerFn(getObservabilitySessionLogs);

  const sessionQuery = useAppQuery({
    queryKey: ["cli-compare-session", id ?? "none"],
    enabled: Boolean(id),
    queryFn: async () => {
      // Mirrors the drilldown strategy (cli.sessions.$sessionId.tsx L206-219):
      // list-and-find until the targeted GET-by-id endpoint lands.
      const page = await fetchSessions({
        data: { limit: 500, sort: "StartedAt", dir: "desc" },
      });
      const match = page.items.find((s) => s.CliInvocationId === id);

      return match ?? null;
    },
    staleTime: 5_000,
  });

  const logsQuery = useAppQuery({
    queryKey: ["cli-compare-logs", id ?? "none"],
    enabled: Boolean(id),
    queryFn: () => fetchLogs({ data: { cliInvocationId: Number(id), tail: 2000 } }),
  });

  return {
    id,
    session: sessionQuery.data,
    sessionLoading: sessionQuery.isPending && Boolean(id),
    sessionError: sessionQuery.error,
    logs: useMemo(() => summarizeLogs(logsQuery.data as LogTailPage | undefined), [logsQuery.data]),
    logsLoading: logsQuery.isPending && Boolean(id),
    logsError: logsQuery.error,
  };
}

// ---------- Cell renderers ----------

function ExitCell({ session }: { session: ObservabilitySession | null | undefined }) {
  if (!session) return <span className="text-ca-ink-muted">-</span>;
  const tone = toneForExitCode(session.ExitCode, session.EndedAt);
  const label = session.EndedAt == null ? "running" : `exit ${session.ExitCode ?? "?"}`;

  return <StatusPill tone={tone} label={label} outline />;
}

function LevelCountBadge({ label, count, tone }: { label: string; count: number; tone: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-hmi-sm border px-hmi-2 py-0.5 font-mono text-hmi-caption",
        tone,
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums">{count}</span>
    </span>
  );
}

function LogSummaryCell({ side }: { side: SidePane }) {
  if (!side.id) return <span className="text-ca-ink-muted">-</span>;

  if (side.logsLoading) {
    return (
      <span className="inline-flex items-center gap-1 text-ca-ink-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> loading…
      </span>
    );
  }

  if (side.logsError) {
    return (
      <code className="text-hmi-caption text-destructive">
        {side.logsError instanceof Error ? side.logsError.message : String(side.logsError)}
      </code>
    );
  }

  const s = side.logs;

  if (!s) return <span className="text-ca-ink-muted">no data</span>;

  return (
    <div className="flex flex-col gap-hmi-1">
      <div className="flex flex-wrap gap-hmi-1">
        <LevelCountBadge
          label="err"
          count={s.counts.error}
          tone="border-red-500/40 text-red-600 dark:text-red-400"
        />
        <LevelCountBadge
          label="warn"
          count={s.counts.warn}
          tone="border-amber-500/40 text-amber-600 dark:text-amber-400"
        />
        <LevelCountBadge
          label="info"
          count={s.counts.info}
          tone="border-sky-500/40 text-sky-600 dark:text-sky-400"
        />
        <LevelCountBadge
          label="debug"
          count={s.counts.debug}
          tone="border-ca-border text-ca-ink-muted"
        />
        {s.counts.other > 0 && (
          <LevelCountBadge
            label="other"
            count={s.counts.other}
            tone="border-ca-border text-ca-ink-muted"
          />
        )}
      </div>
      <div className="text-hmi-caption text-ca-ink-muted">
        <span className="tabular-nums">{s.total}</span> rows
        {s.truncated && (
          <Badge
            variant="outline"
            className="ml-hmi-1 border-amber-500/40 text-amber-600 dark:text-amber-400"
          >
            truncated
          </Badge>
        )}
      </div>
      {s.firstError && (
        <div className="text-hmi-caption text-red-600 dark:text-red-400">
          <span className="font-mono">#{s.firstError.index + 1}</span>{" "}
          <span className="truncate">{s.firstError.message}</span>
        </div>
      )}
    </div>
  );
}

// ---------- ID picker ----------

function IdPickerBar({
  a,
  b,
  onSubmit,
  onSwap,
}: {
  a: string | undefined;
  b: string | undefined;
  onSubmit: (next: { a?: string; b?: string }) => void;
  onSwap: () => void;
}) {
  const onFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const nextA = parseId((form.elements.namedItem("a") as HTMLInputElement)?.value);
      const nextB = parseId((form.elements.namedItem("b") as HTMLInputElement)?.value);
      onSubmit({ a: nextA, b: nextB });
    },
    [onSubmit],
  );

  return (
    <form
      onSubmit={onFormSubmit}
      className="flex flex-wrap items-end gap-hmi-2 rounded-hmi-sm border border-ca-border bg-ca-surface p-hmi-3"
      data-testid="cli-compare-picker"
    >
      <label className="flex flex-col gap-1 text-hmi-caption text-ca-ink-muted">
        Session A
        <Input
          name="a"
          inputMode="numeric"
          pattern="[1-9][0-9]*"
          defaultValue={a ?? ""}
          placeholder="e.g. 42"
          className="w-32 font-mono"
        />
      </label>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onSwap}
        aria-label="Swap A and B"
        title="Swap A and B"
        disabled={!a && !b}
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
      </Button>
      <label className="flex flex-col gap-1 text-hmi-caption text-ca-ink-muted">
        Session B
        <Input
          name="b"
          inputMode="numeric"
          pattern="[1-9][0-9]*"
          defaultValue={b ?? ""}
          placeholder="e.g. 43"
          className="w-32 font-mono"
        />
      </label>
      <Button type="submit" size="sm">
        Compare
      </Button>
      <Link to="/cli/sessions" className="ml-auto text-hmi-caption text-ca-accent hover:underline">
        Back to sessions
      </Link>
    </form>
  );
}

// ---------- Route component ----------

function CliSessionsCompare() {
  const { a, b } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const left = useSide(a);
  const right = useSide(b);

  const submit = useCallback(
    (next: { a?: string; b?: string }) => {
      navigate({ search: () => next, replace: true });
    },
    [navigate],
  );

  const swap = useCallback(() => {
    navigate({ search: () => ({ a: b, b: a }), replace: true });
  }, [a, b, navigate]);

  const both = Boolean(a && b);

  return (
    <section className="flex flex-col gap-hmi-3" data-testid="cli-compare-root">
      <header className="flex flex-col gap-hmi-1">
        <h1 className="text-hmi-h2 font-semibold text-ca-ink">Compare CLI Sessions</h1>
        <p className="text-hmi-caption text-ca-ink-muted">
          Side-by-side diff of the Root-DB envelope and JSONL log summary for two CLI invocations.
          Amber rings mark diverging fields.
        </p>
      </header>

      <IdPickerBar a={a} b={b} onSubmit={submit} onSwap={swap} />

      {!both ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Pick two sessions to compare"
          body={
            <>
              Enter two <code className="font-mono">CliInvocationId</code> values above, or open a
              session and use the compare link from its drill-down header.
            </>
          }
          testId="cli-compare-empty"
        />
      ) : left.sessionError || right.sessionError ? (
        <div
          role="alert"
          className="flex items-start gap-hmi-2 rounded-hmi-sm border border-destructive/40 bg-destructive/5 p-hmi-3 text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Failed to load one or both sessions</div>
            {left.sessionError instanceof Error && (
              <code className="block text-hmi-caption opacity-80">
                A: {left.sessionError.message}
              </code>
            )}
            {right.sessionError instanceof Error && (
              <code className="block text-hmi-caption opacity-80">
                B: {right.sessionError.message}
              </code>
            )}
          </div>
        </div>
      ) : left.sessionLoading || right.sessionLoading ? (
        <div className="flex items-center gap-hmi-2 text-ca-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions…
        </div>
      ) : !left.session || !right.session ? (
        <EmptyState
          icon={Terminal}
          title="Session(s) not found"
          body={
            <>
              {!left.session && (
                <>
                  A ({a}) is not in the current Root-DB projection window.
                  <br />
                </>
              )}
              {!right.session && <>B ({b}) is not in the current Root-DB projection window.</>}
            </>
          }
          testId="cli-compare-not-found"
        />
      ) : (
        <ComparisonTable left={left} right={right} />
      )}
    </section>
  );
}

function ComparisonTable({ left, right }: { left: SidePane; right: SidePane }) {
  const A = left.session as ObservabilitySession;
  const B = right.session as ObservabilitySession;

  return (
    <div className="overflow-x-auto rounded-hmi-sm border border-ca-border bg-ca-surface">
      <table className="w-full border-collapse text-hmi-body" data-testid="cli-compare-table">
        <thead className="bg-ca-surface-alt text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
          <tr>
            <th className="w-40 px-hmi-3 py-hmi-2 text-left">Field</th>
            <th className="px-hmi-3 py-hmi-2 text-left">
              <div className="flex items-center gap-hmi-1">
                <Badge variant="outline">A</Badge>
                <Link
                  to="/cli/sessions/$sessionId"
                  params={{ sessionId: A.CliInvocationId }}
                  className="font-mono text-hmi-caption text-ca-accent hover:underline"
                >
                  #{A.CliInvocationId}
                </Link>
              </div>
            </th>
            <th className="px-hmi-3 py-hmi-2 text-left">
              <div className="flex items-center gap-hmi-1">
                <Badge variant="outline">B</Badge>
                <Link
                  to="/cli/sessions/$sessionId"
                  params={{ sessionId: B.CliInvocationId }}
                  className="font-mono text-hmi-caption text-ca-accent hover:underline"
                >
                  #{B.CliInvocationId}
                </Link>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <DiffRow
            label="CLI"
            left={<Badge>{A.CliName}</Badge>}
            right={<Badge>{B.CliName}</Badge>}
            leftKey={A.CliName}
            rightKey={B.CliName}
          />
          <DiffRow
            label="Subcommand"
            left={<span className="font-mono text-hmi-caption">{A.Subcommand ?? "-"}</span>}
            right={<span className="font-mono text-hmi-caption">{B.Subcommand ?? "-"}</span>}
            leftKey={A.Subcommand ?? ""}
            rightKey={B.Subcommand ?? ""}
          />
          <DiffRow
            label="Exit"
            left={<ExitCell session={A} />}
            right={<ExitCell session={B} />}
            leftKey={`${A.ExitCode ?? "null"}/${A.EndedAt == null ? "running" : "done"}`}
            rightKey={`${B.ExitCode ?? "null"}/${B.EndedAt == null ? "running" : "done"}`}
          />
          <DiffRow
            label="Duration"
            left={<span className="font-mono">{formatDuration(A.DurationMs, A.EndedAt)}</span>}
            right={<span className="font-mono">{formatDuration(B.DurationMs, B.EndedAt)}</span>}
            leftKey={String(A.DurationMs ?? "")}
            rightKey={String(B.DurationMs ?? "")}
          />
          <DiffRow
            label="Started At"
            left={<span className="font-mono text-hmi-caption">{formatTs(A.StartedAt)}</span>}
            right={<span className="font-mono text-hmi-caption">{formatTs(B.StartedAt)}</span>}
            leftKey={String(A.StartedAt ?? "")}
            rightKey={String(B.StartedAt ?? "")}
          />
          <DiffRow
            label="Ended At"
            left={<span className="font-mono text-hmi-caption">{formatTs(A.EndedAt)}</span>}
            right={<span className="font-mono text-hmi-caption">{formatTs(B.EndedAt)}</span>}
            leftKey={String(A.EndedAt ?? "")}
            rightKey={String(B.EndedAt ?? "")}
          />
          <DiffRow
            label="Host"
            left={<span className="font-mono text-hmi-caption">{A.HostName ?? "-"}</span>}
            right={<span className="font-mono text-hmi-caption">{B.HostName ?? "-"}</span>}
            leftKey={A.HostName ?? ""}
            rightKey={B.HostName ?? ""}
          />
          <DiffRow
            label="PID"
            left={<span className="font-mono text-hmi-caption">{A.Pid ?? "-"}</span>}
            right={<span className="font-mono text-hmi-caption">{B.Pid ?? "-"}</span>}
            leftKey={String(A.Pid ?? "")}
            rightKey={String(B.Pid ?? "")}
          />
          <DiffRow
            label="RunId"
            left={
              A.RunId ? (
                <CorrelationIdChip value={A.RunId} label="run" />
              ) : (
                <span className="text-ca-ink-muted">-</span>
              )
            }
            right={
              B.RunId ? (
                <CorrelationIdChip value={B.RunId} label="run" />
              ) : (
                <span className="text-ca-ink-muted">-</span>
              )
            }
            leftKey={A.RunId ?? ""}
            rightKey={B.RunId ?? ""}
          />
          <DiffRow
            label="Log Path"
            left={<code className="break-all text-hmi-caption">{A.LogPath ?? "-"}</code>}
            right={<code className="break-all text-hmi-caption">{B.LogPath ?? "-"}</code>}
            leftKey={A.LogPath ?? ""}
            rightKey={B.LogPath ?? ""}
          />
          <DiffRow
            label="Log Summary"
            left={<LogSummaryCell side={left} />}
            right={<LogSummaryCell side={right} />}
            leftKey={logKey(left.logs)}
            rightKey={logKey(right.logs)}
          />
        </tbody>
      </table>
    </div>
  );
}

/** Stable equality key for a log summary. `null` means "no summary yet" and
 *  never equals another `null` so a still-loading side is not falsely
 *  marked as identical to a loaded one. */
function logKey(s: LogSummary | null): string {
  if (!s) return `_pending_${Math.random()}`;

  return [
    s.total,
    s.truncated ? 1 : 0,
    s.counts.error,
    s.counts.warn,
    s.counts.info,
    s.counts.debug,
    s.counts.other,
    s.firstError?.message ?? "",
  ].join("|");
}