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

  if (!project) {
    if (typeof window === "undefined") {
      return null;
    }

    console.warn("[ai-testing-history] project not found", { projectId });

    return <AiTestingHistoryNotFound />;
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-auto bg-[#06080d] text-slate-100 font-sans antialiased">
      <div className="p-6">
        <div className="mx-auto w-full max-w-7xl">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">
                {project.name} // AUDIT LOG
              </p>
              <h1 className="mt-1 text-base font-bold uppercase tracking-widest text-slate-100 font-mono">
                AI Testing History & Delta Analysis
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Compare runs, verify metrics changes over time, and rerun with identical recipe parameters.
              </p>
            </div>
            <Link
              to="/projects/$projectId/ai-testing"
              params={{ projectId }}
              search={{ rulesetId: undefined }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] hover:border-cyan-400/50 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-200 hover:text-white transition-all shadow-sm"
            >
              Back to AI testing
            </Link>
          </header>

          <section className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0a0d14]/85 p-3.5 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <label className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-300">
              Rule set
              <select
                value={rulesetFilter}
                onChange={(e) => setRulesetFilter(e.currentTarget.value)}
                className="rounded-lg border border-white/[0.1] bg-[#07090e] px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
              >
                <option value="">All rule sets</option>
                {rulesets.map((rs) => (
                  <option key={rs.id} value={rs.id}>
                    {rs.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="text-[10px] font-mono uppercase text-slate-400">
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
                className="ml-auto inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all"
              >
                Clear history
              </button>
            ) : null}
          </section>

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.1] bg-[#0a0d14]/50 p-12 text-center text-xs text-slate-400 font-mono">
              No AI testing runs recorded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <section className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#0a0d14]/85 overflow-hidden backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_12px_32px_-8px_rgba(0,0,0,0.6)]">
                <header className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
                  Execution Records
                </header>
                <ul className="divide-y divide-white/[0.06]">
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

              <section className="rounded-2xl border border-white/[0.08] bg-[#0a0d14]/85 p-5 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_12px_32px_-8px_rgba(0,0,0,0.6)]">
                <h2 className="mb-2 text-xs font-mono font-bold uppercase tracking-widest text-slate-200">
                  Comparative Analysis
                </h2>
                {compareA && compareB ? (
                  <ComparePanel a={compareA} b={compareB} rulesetNameById={rulesetNameById} />
                ) : (
                  <p className="text-xs font-mono text-slate-400">
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
    <li className="flex flex-wrap items-center gap-4 p-4 hover:bg-white/[0.03] transition-colors">
      <input
        type="checkbox"
        aria-label={`Select run from ${new Date(summary.createdAt).toLocaleString()}`}
        checked={selected}
        onChange={(e) => onToggle(e.currentTarget.checked)}
        className="h-4 w-4 rounded border-white/[0.2] bg-[#07090e] accent-cyan-400 cursor-pointer"
      />
      <StatusPill verdict={summary.verdict} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-slate-200">{rulesetName}</p>
        <p className="text-[10px] font-mono uppercase text-slate-400">
          {new Date(summary.createdAt).toLocaleString()} · {summary.imageCount} images ·{" "}
          {summary.ruleCount} rules · {Math.round(summary.passRate * 100)}% pass
        </p>
      </div>
      <Link
        to="/projects/$projectId/ai-testing"
        params={{ projectId }}
        search={{ rulesetId: summary.rulesetId }}
        className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-200 transition hover:border-cyan-400/50 hover:text-white"
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
    <div className="mt-4 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <CompareHeader
          label="Earlier Baseline"
          summary={earlier}
          name={rulesetNameById.get(earlier.rulesetId) ?? "(deleted)"}
        />
        <CompareHeader
          label="Later Evaluation"
          summary={later}
          name={rulesetNameById.get(later.rulesetId) ?? "(deleted)"}
        />
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#07090e] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
          Pass Rate Variance (Δ)
        </p>
        <p
          className={`mt-1 font-mono text-2xl font-black ${
            passDelta >= 0 ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
          }`}
        >
          {passDelta >= 0 ? "+" : ""}
          {Math.round(passDelta * 100)}%
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.08]">
        <div className="grid grid-cols-[minmax(0,1fr)_80px_80px_80px] bg-white/[0.03] px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
          <span>Rule</span>
          <span>Earlier</span>
          <span>Later</span>
          <span>Δ</span>
        </div>
        {perRule.length === 0 ? (
          <p className="px-3 py-3 text-xs font-mono text-slate-400">No comparable rules.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {perRule.map((r) => (
              <li
                key={r.ruleId}
                className="grid grid-cols-[minmax(0,1fr)_80px_80px_80px] px-3 py-2 text-xs font-mono text-slate-200 hover:bg-white/[0.02] transition-colors"
              >
                <span className="truncate">{r.ruleName}</span>
                <span>{r.earlier === null ? "—" : `${Math.round(r.earlier * 100)}%`}</span>
                <span>{r.later === null ? "—" : `${Math.round(r.later * 100)}%`}</span>
                <span
                  className={
                    r.delta === null
                      ? "text-slate-500"
                      : r.delta >= 0
                        ? "text-emerald-400 font-bold"
                        : "text-rose-400 font-bold"
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
    <div className="rounded-xl border border-white/[0.08] bg-[#07090e] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
      <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">{label}</p>
      <p className="mt-1 truncate text-xs font-mono font-bold text-slate-200">{name}</p>
      <p className="text-[10px] font-mono uppercase text-slate-400">
        {new Date(summary.createdAt).toLocaleString()}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <StatusPill verdict={summary.verdict} />
        <span className="text-[10px] font-mono uppercase text-slate-400">
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
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider ${
        verdict === "OK"
          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
          : "bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.25)]"
      }`}
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
      <p className="text-xs text-ca-ink-muted">{error.message}</p>
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
      <p className="text-xs text-ca-ink-muted">
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
