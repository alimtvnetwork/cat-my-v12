// AI testing history: compare runs across time and jump back to a rerun
// with the same rule set preselected. Dataset images live only in memory,
// so "rerun" reopens the AI testing page with the ruleset seeded via search
// params. Compare mode selects two summaries and shows per-rule deltas.
import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { selectProject, selectRulesetsForProject, useProjectStore } from "@/lib/projects/store";
import {
  useAiTestingStore,
  type AiTestingAggregateSummary,
  type AiTestingRuleMetric,
} from "@/lib/ai-testing/aggregate";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export const Route = createFileRoute("/projects/$projectId/ai-testing-history")({
  component: AiTestingHistoryPage,
  errorComponent: AiTestingHistoryError,
  notFoundComponent: AiTestingHistoryNotFound,
});

function AiTestingHistoryPage() {
  const { projectId } = Route.useParams();
  const project = useProjectStore((s) => selectProject(s, projectId));
  const rulesets = useProjectStore((s) => selectRulesetsForProject(s, projectId));
  const historyByRuleset = useAiTestingStore((s) => s.historyByRuleset);
  const clearRuleset = useAiTestingStore((s) => s.clearRuleset);

  const [rulesetFilter, setRulesetFilter] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!project) {
    console.warn("[ai-testing-history] project not found", { projectId });

    throw notFound();
  }

  const rulesetNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const rs of rulesets) map.set(rs.id, rs.name);

    return map;
  }, [rulesets]);

  const rows = useMemo<AiTestingAggregateSummary[]>(() => {
    const projectRulesetIds = new Set(rulesets.map((r) => r.id));
    const all: AiTestingAggregateSummary[] = [];
    for (const [rsId, list] of Object.entries(historyByRuleset)) {
      if (projectRulesetIds.has(rsId) === false) continue;

      if (rulesetFilter && rsId !== rulesetFilter) continue;
      for (const s of list) all.push(s);
    }

    all.sort((a, b) => b.createdAt - a.createdAt);

    return all;
  }, [historyByRuleset, rulesets, rulesetFilter]);

  useEffect(() => {
    // Drop selections no longer visible in the filtered list.
    const visible = new Set(rows.map((r) => r.id));
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [rows]);

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;

        // Keep at most two, drop the oldest to make room.
        return prev.length < 2 ? [...prev, id] : [prev[1], id];
      }

      return prev.filter((x) => x !== id);
    });
  }

  const compareA = rows.find((r) => r.id === selectedIds[0]);
  const compareB = rows.find((r) => r.id === selectedIds[1]);

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-auto">
      <div className="p-hmi-6">
        <div className="mx-auto w-full max-w-7xl">
          <header className="mb-hmi-5 flex flex-wrap items-end justify-between gap-hmi-3">
            <div>
              <p className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
                {project.name}
              </p>
              <h1 className="mt-hmi-1 font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
                AI testing history
              </h1>
              <p className="mt-hmi-1 text-hmi-body text-ca-ink-muted">
                Compare runs, see how metrics change over time, and rerun with the same rule set.
              </p>
            </div>
            <Link
              to="/projects/$projectId/ai-testing"
              params={{ projectId }}
              search={{ rulesetId: undefined }}
              className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink hover:border-ca-select"
            >
              Back to AI testing
            </Link>
          </header>

          <section className="mb-hmi-4 flex flex-wrap items-center gap-hmi-3 rounded-lg border border-ca-border bg-ca-panel p-hmi-3">
            <label className="flex items-center gap-hmi-2 text-hmi-body text-ca-ink">
              Rule set
              <select
                value={rulesetFilter}
                onChange={(e) => setRulesetFilter(e.currentTarget.value)}
                className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-1 text-hmi-body text-ca-ink focus:border-ca-select focus:outline-none"
              >
                <option value="">All rule sets</option>
                {rulesets.map((rs) => (
                  <option key={rs.id} value={rs.id}>
                    {rs.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="text-hmi-caption text-ca-ink-muted">
              {rows.length} run{rows.length === 1 ? "" : "s"} · select up to 2 to compare
            </div>
            {rulesetFilter ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Clear stored history for this rule set?")) {
                    clearRuleset(rulesetFilter);
                    setSelectedIds([]);
                  }
                }}
                className="ml-auto rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-1 text-hmi-caption text-ca-ink-muted hover:border-ca-ng hover:text-ca-ng"
              >
                Clear history
              </button>
            ) : null}
          </section>

          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ca-border bg-ca-panel p-hmi-6 text-center text-hmi-body text-ca-ink-muted">
              No AI testing runs recorded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-hmi-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <section className="overflow-hidden rounded-lg border border-ca-border bg-ca-panel">
                <header className="border-b border-ca-border px-hmi-3 py-hmi-2 text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
                  Runs
                </header>
                <ul className="divide-y divide-ca-border">
                  {rows.map((s) => (
                    <RunRow
                      key={s.id}
                      summary={s}
                      rulesetName={rulesetNameById.get(s.rulesetId) ?? "(deleted rule set)"}
                      projectId={projectId}
                      selected={selectedIds.includes(s.id)}
                      onToggle={(checked) => toggleSelected(s.id, checked)}
                    />
                  ))}
                </ul>
              </section>

              <section className="rounded-lg border border-ca-border bg-ca-panel p-hmi-3">
                <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
                  Compare
                </h2>
                {compareA && compareB ? (
                  <ComparePanel a={compareA} b={compareB} rulesetNameById={rulesetNameById} />
                ) : (
                  <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">
                    Select two runs on the left to see per-rule differences.
                  </p>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface RunRowProps {
  summary: AiTestingAggregateSummary;
  rulesetName: string;
  projectId: string;
  selected: boolean;
  onToggle: (checked: boolean) => void;
}

function RunRow({ summary, rulesetName, projectId, selected, onToggle }: RunRowProps) {
  return (
    <li className="flex flex-wrap items-center gap-hmi-3 p-hmi-3">
      <input
        type="checkbox"
        aria-label={`Select run from ${new Date(summary.createdAt).toLocaleString()}`}
        checked={selected}
        onChange={(e) => onToggle(e.currentTarget.checked)}
        className="h-4 w-4 accent-ca-select"
      />
      <StatusPill verdict={summary.verdict} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-hmi-body font-semibold text-ca-ink">{rulesetName}</p>
        <p className="text-hmi-caption text-ca-ink-muted">
          {new Date(summary.createdAt).toLocaleString()} · {summary.imageCount} images ·{" "}
          {summary.ruleCount} rules · {Math.round(summary.passRate * 100)}% pass
        </p>
      </div>
      <Link
        to="/projects/$projectId/ai-testing"
        params={{ projectId }}
        search={{ rulesetId: summary.rulesetId }}
        className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-1 text-hmi-caption text-ca-ink hover:border-ca-select"
        title="Reopen AI testing with this rule set preselected"
      >
        Rerun
      </Link>
    </li>
  );
}

interface ComparePanelProps {
  a: AiTestingAggregateSummary;
  b: AiTestingAggregateSummary;
  rulesetNameById: Map<string, string>;
}

function ComparePanel({ a, b, rulesetNameById }: ComparePanelProps) {
  // Order chronologically so deltas read as "later minus earlier".
  const [earlier, later] = a.createdAt <= b.createdAt ? [a, b] : [b, a];
  const perRule = useMemo(() => buildPerRuleDiff(earlier.perRule, later.perRule), [earlier, later]);
  const passDelta = later.passRate - earlier.passRate;

  return (
    <div className="mt-hmi-3 flex flex-col gap-hmi-3">
      <div className="grid grid-cols-2 gap-hmi-3">
        <CompareHeader
          label="Earlier"
          summary={earlier}
          name={rulesetNameById.get(earlier.rulesetId) ?? "(deleted)"}
        />
        <CompareHeader
          label="Later"
          summary={later}
          name={rulesetNameById.get(later.rulesetId) ?? "(deleted)"}
        />
      </div>

      <div className="rounded-sm border border-ca-border bg-ca-panel-2 p-hmi-3">
        <p className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
          Pass rate change
        </p>
        <p
          className={`mt-hmi-1 font-display text-hmi-header font-extrabold ${passDelta >= 0 ? "text-ca-ok" : "text-ca-ng"}`}
        >
          {passDelta >= 0 ? "+" : ""}
          {Math.round(passDelta * 100)}%
        </p>
      </div>

      <div className="overflow-hidden rounded-sm border border-ca-border">
        <div className="grid grid-cols-[minmax(0,1fr)_80px_80px_80px] bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
          <span>Rule</span>
          <span>Earlier</span>
          <span>Later</span>
          <span>Δ</span>
        </div>
        {perRule.length === 0 ? (
          <p className="px-hmi-3 py-hmi-3 text-hmi-body text-ca-ink-muted">No comparable rules.</p>
        ) : (
          <ul className="divide-y divide-ca-border">
            {perRule.map((r) => (
              <li
                key={r.ruleId}
                className="grid grid-cols-[minmax(0,1fr)_80px_80px_80px] px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink"
              >
                <span className="truncate">{r.ruleName}</span>
                <span>{r.earlier === null ? "—" : `${Math.round(r.earlier * 100)}%`}</span>
                <span>{r.later === null ? "—" : `${Math.round(r.later * 100)}%`}</span>
                <span
                  className={
                    r.delta === null
                      ? "text-ca-ink-muted"
                      : r.delta >= 0
                        ? "text-ca-ok"
                        : "text-ca-ng"
                  }
                >
                  {r.delta === null
                    ? "—"
                    : `${r.delta >= 0 ? "+" : ""}${Math.round(r.delta * 100)}%`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CompareHeader({
  label,
  summary,
  name,
}: {
  label: string;
  summary: AiTestingAggregateSummary;
  name: string;
}) {
  return (
    <div className="rounded-sm border border-ca-border bg-ca-panel-2 p-hmi-3">
      <p className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">{label}</p>
      <p className="mt-hmi-1 truncate text-hmi-body font-semibold text-ca-ink">{name}</p>
      <p className="text-hmi-caption text-ca-ink-muted">
        {new Date(summary.createdAt).toLocaleString()}
      </p>
      <div className="mt-hmi-2 flex items-center gap-hmi-2">
        <StatusPill verdict={summary.verdict} />
        <span className="text-hmi-caption text-ca-ink-muted">
          {Math.round(summary.passRate * 100)}% · {summary.imageCount} imgs
        </span>
      </div>
    </div>
  );
}

interface PerRuleDiffRow {
  ruleId: string;
  ruleName: string;
  earlier: number | null;
  later: number | null;
  delta: number | null;
}

function buildPerRuleDiff(
  earlier: readonly AiTestingRuleMetric[],
  later: readonly AiTestingRuleMetric[],
): PerRuleDiffRow[] {
  const map = new Map<string, PerRuleDiffRow>();
  for (const r of earlier) {
    map.set(r.ruleId, {
      ruleId: r.ruleId,
      ruleName: r.ruleName,
      earlier: r.passRate,
      later: null,
      delta: null,
    });
  }

  for (const r of later) {
    const existing = map.get(r.ruleId);

    if (existing) {
      existing.later = r.passRate;
      existing.delta = existing.earlier === null ? null : r.passRate - existing.earlier;
    } else {
      map.set(r.ruleId, {
        ruleId: r.ruleId,
        ruleName: r.ruleName,
        earlier: null,
        later: r.passRate,
        delta: null,
      });
    }
  }

  const rows = Array.from(map.values());
  rows.sort((a, b) => {
    const da = a.delta === null ? -Infinity : Math.abs(a.delta);
    const db = b.delta === null ? -Infinity : Math.abs(b.delta);

    return db - da;
  });

  return rows;
}

function StatusPill({ verdict }: { verdict: "OK" | "NG" }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-hmi-2 py-hmi-1 text-hmi-caption font-semibold ${verdict === "OK" ? "bg-ca-ok/10 text-ca-ok" : "bg-ca-ng/10 text-ca-ng"}`}
    >
      {verdict}
    </span>
  );
}

function AiTestingHistoryError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error("[ai-testing-history] error boundary", error);
    reportLovableError(error, {
      boundary: "projects_$projectId_ai_testing_history_error_component",
    });
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
      <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
        History didn't load
      </h1>
      <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">{error.message}</p>
      <button
        type="button"
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className="mt-hmi-4 rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110"
      >
        Try again
      </button>
    </div>
  );
}

function AiTestingHistoryNotFound() {
  const { projectId } = Route.useParams();

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
      <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
        Project not found
      </h1>
      <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">
        No project matches <span className="font-mono">{projectId}</span>.
      </p>
      <Link
        to="/projects"
        className="mt-hmi-4 rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110"
      >
        All projects
      </Link>
    </div>
  );
}
