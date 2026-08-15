import { useMemo } from "react";
import { ListChecks, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ProjectRunSummary } from "@/lib/projects/run";

export function verdictBadge(
  v: ProjectRunSummary["verdict"] | ProjectRunSummary["rules"][number]["verdict"],
) {
  if (v === "PASS") return { Icon: CheckCircle2, tone: "text-ca-ok", label: "PASS" } as const;

  if (v === "FAIL") return { Icon: XCircle, tone: "text-ca-ng", label: "FAIL" } as const;

  return { Icon: MinusCircle, tone: "text-ca-ink-muted", label: "SKIP" } as const;
}

export function ProjectResultSection({
  summary,
  selectedSampleName,
}: {
  summary: ProjectRunSummary | null;
  selectedSampleName: string | null;
}) {
  const grouped = useMemo(() => {
    if (!summary)

      return [] as Array<{
        rulesetId: string;
        rulesetName: string;
        rows: ProjectRunSummary["rules"];
      }>;
    const out = new Map<
      string,
      { rulesetId: string; rulesetName: string; rows: ProjectRunSummary["rules"] }
    >();
    for (const r of summary.rules) {
      const cur = out.get(r.rulesetId);

      if (cur) cur.rows.push(r);
      else out.set(r.rulesetId, { rulesetId: r.rulesetId, rulesetName: r.rulesetName, rows: [r] });
    }

    return Array.from(out.values());
  }, [summary]);

  return (
    <section
      aria-label="Result"
      className="rounded-lg border border-ca-border bg-ca-panel p-hmi-4"
      data-testid="project-editor-result"
    >
      <div className="flex items-center justify-between gap-hmi-3">
        <div className="flex items-center gap-hmi-2">
          <ListChecks aria-hidden size={18} className="text-ca-ink-muted" />
          <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            Result
          </h2>
          {summary ? <VerdictPill verdict={summary.verdict} /> : null}
          {selectedSampleName ? (
            <span
              className="truncate font-mono text-[13px] tabular-nums text-ca-ink-muted"
              title={`Evaluated against sample: ${selectedSampleName}`}
              data-testid="result-selected-sample"
            >
              · {selectedSampleName}
            </span>
          ) : null}
        </div>
        {summary ? (
          <span className="font-mono text-[13px] tabular-nums text-ca-ink-muted">
            {new Date(summary.ranAt).toLocaleTimeString()}
          </span>
        ) : null}
      </div>
      {!summary ? (
        <p className="mt-hmi-3 rounded-md border border-dashed border-ca-border bg-ca-panel-2 p-hmi-3 text-hmi-body text-ca-ink-muted">
          No results yet. Press "Run project" above.
        </p>
      ) : summary.rules.length === 0 ? (
        <p className="mt-hmi-3 rounded-md border border-dashed border-ca-border bg-ca-panel-2 p-hmi-3 text-hmi-body text-ca-ink-muted">
          This project has no rules to evaluate.
        </p>
      ) : (
        <div className="mt-hmi-3 space-y-hmi-3">
          {grouped.map((g) => (
            <div key={g.rulesetId} className="rounded-md border border-ca-border bg-ca-panel-2">
              <div className="flex items-center justify-between border-b border-ca-border px-hmi-3 py-hmi-2">
                <span className="truncate font-display text-hmi-body font-semibold text-ca-ink">
                  {g.rulesetName}
                </span>
                <span className="font-mono text-[13px] tabular-nums text-ca-ink-muted">
                  {g.rows.filter((r) => r.verdict === "PASS").length}/{g.rows.length} pass
                </span>
              </div>
              <ul>
                {g.rows.map((r) => {
                  const b = verdictBadge(r.verdict);

                  return (
                    <li
                      key={`${r.rulesetId}:${r.ruleId}`}
                      className="flex items-center gap-hmi-2 border-b border-ca-border/60 px-hmi-3 py-hmi-2 last:border-b-0"
                      data-testid="result-row"
                    >
                      <b.Icon aria-hidden size={16} className={b.tone} />
                      <span className={`w-12 font-mono text-[13px] tabular-nums ${b.tone}`}>
                        {b.label}
                      </span>
                      <Link
                        to="/setup/rules/$id"
                        params={{ id: r.ruleId }}
                        className="min-w-0 flex-1 truncate text-hmi-body text-ca-ink hover:text-ca-select"
                      >
                        {r.ruleName}
                      </Link>
                      <span className="hidden font-mono text-[13px] tabular-nums text-ca-ink-muted sm:inline">
                        {r.reason}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function VerdictPill({ verdict }: { verdict: ProjectRunSummary["verdict"] }) {
  const b = verdictBadge(verdict);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-ca-border bg-ca-panel px-hmi-2 py-0.5 font-mono text-[13px] tabular-nums ${b.tone}`}
      data-testid="result-verdict"
    >
      <b.Icon aria-hidden size={14} />
      {b.label}
    </span>
  );
}
