import { RuleAuditExportFormatType } from "@/lib/rules/audit-export";
import { createFileRoute, Link } from "@tanstack/react-router";
import { loadMemoryDiagnostics } from "@/lib/diagnostics/memory-load";
import { useEffect, useState } from "react";
import { useMemo } from "react";
import {
  getHomeError,
  clearHomeError,
  type HomeErrorRecord,
} from "@/lib/diagnostics/home-error-log";
import {
  useRuleAuditStore,
  type RuleAuditEvent,
  type RuleAuditSource,
} from "@/lib/rules/audit-store";
import { downloadRuleAudit } from "@/lib/rules/audit-export";
import { SeedResetHistorySection } from "@/components/diagnostics/SeedResetHistorySection";
import { SeedGapCheckSection } from "@/components/diagnostics/SeedGapCheckSection";
import { toIntId } from "@/lib/rules/rule-id-alias";
import { ERROR_CODE_LABEL } from "@/types/errors/ErrorCode";

export const Route = createFileRoute("/diagnostics")({
  head: () => ({
    meta: [
      { title: "Diagnostics - Control Automation" },
      {
        name: "description",
        content: "Project memory load status, plan inventory, and spec source diagnostics.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DiagnosticsPage,
});

function DiagnosticsPage() {
  const r = loadMemoryDiagnostics();
  const [homeError, setHomeError] = useState<HomeErrorRecord | null>(null);
  useEffect(() => {
    setHomeError(getHomeError());
  }, []);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-hmi-4 p-hmi-4 text-ca-ink">
      <header className="flex items-center justify-between gap-hmi-3">
        <h1 className="text-hmi-header font-black uppercase tracking-wider">Memory Diagnostics</h1>
        <StatusPill ok={r.ok} />
      </header>
      <p className="text-hmi-caption text-ca-ink-muted">Loaded at {r.loadedAt}</p>
      {r.errors.length > 0 ? <ErrorList errors={r.errors} /> : null}
      <HomeErrorSection
        record={homeError}
        onClear={() => {
          clearHomeError();
          setHomeError(null);
        }}
      />
      <RuleAuditSection />
      <SeedResetHistorySection />
      <SeedGapCheckSection />
      <Section title={`Memory files (${r.memoryFiles.length})`}>
        {r.memoryFiles.length === 0 ? (
          <Empty label="No memory files loaded. Check .lovable/memory/*.md exists and Vite root includes it." />
        ) : (
          <ul className="grid gap-hmi-1">
            {r.memoryFiles.map((f) => (
              <li
                key={f.path}
                className="flex items-baseline justify-between border-b border-ca-border/60 py-1"
              >
                <span className="font-semibold">{f.name}</span>
                <span className="text-hmi-caption text-ca-ink-muted hmi-tabular">{f.bytes} B</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title={`Pending plans (${r.pendingPlanIds.length})`}>
        <IdList
          ids={r.pendingPlanIds}
          empty="No pending plans found under .lovable/plans/pending/."
        />
      </Section>
      <Section title={`Done plans (${r.donePlanIds.length})`}>
        <IdList ids={r.donePlanIds} empty="No completed plans found under .lovable/plans/done/." />
      </Section>
      <Section title={`Spec source (${r.specOverviewPaths.length} 00-overview.md files)`}>
        <IdList
          ids={r.specOverviewPaths}
          empty="No spec/**/00-overview.md files matched. Verify the spec/ tree."
        />
      </Section>
    </main>
  );
}

function StatusPill({ ok }: { ok: boolean }) {
  const cls = ok ? "bg-ca-ok/20 border-ca-ok text-ca-ok" : "bg-ca-ng/20 border-ca-ng text-ca-ng";

  return (
    <span
      className={`inline-flex items-center gap-hmi-1 border px-hmi-2 py-1 text-hmi-body font-bold uppercase ${cls}`}
    >
      <span aria-hidden>{ok ? "OK" : "FAIL"}</span>
      <span className="sr-only">Memory load {ok ? "succeeded" : "failed"}</span>
    </span>
  );
}

function ErrorList({ errors }: { errors: string[] }) {
  return (
    <section aria-label="Errors" className="border border-ca-ng bg-ca-ng/10 p-hmi-3">
      <h2 className="text-hmi-body font-bold text-ca-ng">Actionable errors</h2>
      <ul className="mt-hmi-2 list-disc pl-hmi-4 text-hmi-body text-ca-ink">
        {errors.map((e, i) => (
          <li key={i}>
            <code>{e}</code>
          </li>
        ))}
      </ul>
      <p className="mt-hmi-2 text-hmi-caption text-ca-ink-muted">
        Fixes: confirm the file/folder exists in the repo, that Vite has access to the project root,
        and that the glob pattern in <code>src/lib/diagnostics/memory-load.ts</code> matches.
        Restart the dev server after moving files.
      </p>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-ca-border bg-ca-panel p-hmi-3">
      <h2 className="mb-hmi-2 text-hmi-body font-bold uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}

function IdList({ ids, empty }: { ids: string[]; empty: string }) {
  if (ids.length === 0) return <Empty label={empty} />;

  return (
    <ul className="grid grid-cols-1 gap-x-hmi-3 gap-y-1 md:grid-cols-2 lg:grid-cols-3">
      {ids.map((id) => (
        <li key={id} className="truncate font-mono text-hmi-caption text-ca-ink">
          {id}
        </li>
      ))}
    </ul>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-hmi-caption text-ca-ink-muted">{label}</p>;
}

function RuleAuditSection() {
  const events = useRuleAuditStore((s) => s.events);
  const clear = useRuleAuditStore((s) => s.clear);
  const [sourceFilter, setSourceFilter] = useState<RuleAuditSource | "all">("all");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return events.filter((e) => {
      if (sourceFilter !== "all" && e.source !== sourceFilter) return false;

      if (!q) return true;

      return e.ruleName.toLowerCase().includes(q) || e.ruleId.toLowerCase().includes(q);
    });
  }, [events, sourceFilter, query]);
  const recent = filtered.slice(0, 25);
  const isFiltered = sourceFilter !== "all" || query.trim().length > 0;

  return (
    <section
      className="border border-ca-border bg-ca-panel p-hmi-3"
      aria-label="Rule audit trail"
      data-testid="diagnostics-rule-audit"
    >
      <div className="mb-hmi-2 flex items-center justify-between gap-hmi-3">
        <h2 className="text-hmi-body font-bold uppercase tracking-wide">
          Rule audit trail ({isFiltered ? `${filtered.length}/${events.length}` : events.length})
        </h2>
        {events.length > 0 ? (
          <div className="flex items-center gap-hmi-1">
            <button
              type="button"
              onClick={() => downloadRuleAudit(filtered, RuleAuditExportFormatType.Json)}
              disabled={filtered.length === 0}
              className="border border-ca-border bg-ca-panel-2 px-hmi-2 py-1 text-hmi-caption text-ca-ink hover:border-ca-focus disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="diagnostics-rule-audit-export-json"
              title={`Export ${filtered.length} event(s) as JSON`}
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => downloadRuleAudit(filtered, RuleAuditExportFormatType.Csv)}
              disabled={filtered.length === 0}
              className="border border-ca-border bg-ca-panel-2 px-hmi-2 py-1 text-hmi-caption text-ca-ink hover:border-ca-focus disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="diagnostics-rule-audit-export-csv"
              title={`Export ${filtered.length} event(s) as CSV`}
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={clear}
              className="border border-ca-border bg-ca-panel-2 px-hmi-2 py-1 text-hmi-caption text-ca-ink hover:border-ca-focus"
              data-testid="diagnostics-rule-audit-clear"
            >
              Clear
            </button>
          </div>
        ) : null}
      </div>
      {events.length > 0 ? (
        <div className="mb-hmi-2 flex flex-wrap items-center gap-hmi-2">
          <label className="flex items-center gap-hmi-1 text-hmi-caption text-ca-ink-muted">
            <span className="uppercase tracking-wide">Source</span>
            <select
              value={sourceFilter}
              onChange={(ev) => setSourceFilter(ev.target.value as RuleAuditSource | "all")}
              className="border border-ca-border bg-ca-panel-2 px-hmi-1 py-0.5 text-hmi-caption text-ca-ink focus:border-ca-focus focus:outline-none"
              data-testid="diagnostics-rule-audit-source"
            >
              <option value="all">All</option>
              <option value="single">single</option>
              <option value="bulk">bulk</option>
              <option value="bulk-undo">bulk-undo</option>
            </select>
          </label>
          <label className="flex flex-1 items-center gap-hmi-1 text-hmi-caption text-ca-ink-muted">
            <span className="uppercase tracking-wide">Search</span>
            <input
              type="search"
              value={query}
              onChange={(ev) => setQuery(ev.target.value)}
              placeholder="Rule name or id"
              className="min-w-0 flex-1 border border-ca-border bg-ca-panel-2 px-hmi-2 py-0.5 text-hmi-caption text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-focus focus:outline-none"
              data-testid="diagnostics-rule-audit-query"
            />
          </label>
          {isFiltered ? (
            <button
              type="button"
              onClick={() => {
                setSourceFilter("all");
                setQuery("");
              }}
              className="border border-ca-border bg-ca-panel-2 px-hmi-2 py-0.5 text-hmi-caption text-ca-ink hover:border-ca-focus"
              data-testid="diagnostics-rule-audit-reset"
            >
              Reset
            </button>
          ) : null}
        </div>
      ) : null}
      {events.length === 0 ? (
        <Empty label="No rule enable/disable events recorded in this browser." />
      ) : filtered.length === 0 ? (
        <Empty label="No events match the current filter." />
      ) : (
        <ul className="grid gap-hmi-1">
          {recent.map((e) => (
            <RuleAuditRow key={e.id} event={e} />
          ))}
          {filtered.length > recent.length ? (
            <li className="pt-hmi-1 text-hmi-caption text-ca-ink-muted">
              +{filtered.length - recent.length} older matching event(s) in the ring buffer.
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}

function RuleAuditRow({ event }: { event: RuleAuditEvent }) {
  const when = new Date(event.timestamp).toISOString();
  const arrow = `${event.prev ? "on" : "off"} \u2192 ${event.next ? "on" : "off"}`;
  const badgeCls = event.next ? "border-ca-ok text-ca-ok" : "border-ca-warn text-ca-warn";

  return (
    <li
      className="flex items-baseline justify-between gap-hmi-3 border-b border-ca-border/60 py-1 text-hmi-caption"
      data-testid="diagnostics-rule-audit-row"
    >
      <span className="hmi-tabular text-ca-ink-muted" title={when}>
        {when.slice(11, 19)}
      </span>
      <Link
        to="/setup/rules/$id"
        params={{ id: String(toIntId(event.ruleId)) }}
        className="min-w-0 flex-1 truncate font-semibold text-ca-ink underline decoration-dotted underline-offset-2 hover:text-ca-focus focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ca-focus"
        title={`Open rule ${event.ruleId}`}
        data-testid="diagnostics-rule-audit-row-link"
      >
        {event.ruleName}
      </Link>
      <span className={`border px-hmi-1 py-0.5 font-mono uppercase ${badgeCls}`}>{arrow}</span>
      <span className="text-ca-ink-muted">{event.source}</span>
    </li>
  );
}

function HomeErrorSection({
  record,
  onClear,
}: {
  record: HomeErrorRecord | null;
  onClear: () => void;
}) {
  if (!record) {
    return (
      <Section title="Home error boundary">
        <Empty label="No home render errors recorded in this browser." />
      </Section>
    );
  }

  return (
    <section className="border border-ca-ng bg-ca-ng/10 p-hmi-3" aria-label="Home error boundary">
      <div className="flex items-center justify-between gap-hmi-3">
        <h2 className="text-hmi-body font-bold uppercase tracking-wide text-ca-ng">
          Home error boundary
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="border border-ca-border bg-ca-panel-2 px-hmi-2 py-1 text-hmi-caption text-ca-ink hover:border-ca-focus"
        >
          Clear
        </button>
      </div>
      <dl className="mt-hmi-2 grid gap-hmi-1 text-hmi-body">
        <div className="flex gap-hmi-2">
          <dt className="w-32 text-ca-ink-muted">Captured at</dt>
          <dd className="hmi-tabular">{record.at}</dd>
        </div>
        {record.code ? (
          <div className="flex gap-hmi-2">
            <dt className="w-32 text-ca-ink-muted">Code</dt>
            <dd>
              <code className="font-mono text-hmi-caption text-ca-ng">{record.code}</code>
              <span className="ml-hmi-2 text-hmi-caption text-ca-ink-muted">
                ({ERROR_CODE_LABEL[record.code] || record.code})
              </span>
            </dd>
          </div>
        ) : null}
        <div className="flex gap-hmi-2">
          <dt className="w-32 text-ca-ink-muted">Reason</dt>
          <dd>
            <code>{record.message}</code>
          </dd>
        </div>
        <div className="flex gap-hmi-2">
          <dt className="w-32 text-ca-ink-muted">Failed plan IDs</dt>
          <dd>
            {record.failedPlanIds.length === 0 ? (
              <span className="text-ca-ink-muted">(none reported)</span>
            ) : (
              <ul className="flex flex-wrap gap-hmi-1">
                {record.failedPlanIds.map((id) => (
                  <li key={id} className="font-mono text-hmi-caption">
                    {id}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
      {record.stack ? (
        <details className="mt-hmi-2">
          <summary className="cursor-pointer text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
            Stack trace
          </summary>
          <pre className="mt-hmi-1 max-h-64 overflow-auto whitespace-pre-wrap break-words border border-ca-border bg-ca-panel p-hmi-2 text-hmi-caption text-ca-ink">
            {record.stack}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
