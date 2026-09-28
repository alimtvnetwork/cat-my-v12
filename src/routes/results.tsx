import { CounterVariantType } from "@/components/hmi/Counter";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HmiShell, Counter } from "@/components/hmi";
import { EmptyState } from "@/components/common/EmptyState";
import { ListChecks, RefreshCw } from "lucide-react";
import { useUiMode, UiModeType } from "@/hooks/useUiMode";
import { StandardAppShell } from "@/components/layout/StandardAppShell";
import { useTelemetrySummary, useTelemetryHistory } from "@/hooks/useTelemetry";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Results - Control Automation" },
      {
        name: "description",
        content: "Per-frame inspection results (OK/NG) and persistent SQLite history.",
      },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const { summary, refetch: refetchSummary } = useTelemetrySummary();
  const { history, isLoading, refetch: refetchHistory } = useTelemetryHistory(100);
  const { mode } = useUiMode();

  const handleRefresh = () => {
    refetchSummary();
    refetchHistory();
  };

  const content = (
    <div className="flex-1 overflow-auto p-hmi-4 space-y-hmi-4">
      <div className="flex flex-wrap items-center justify-between gap-hmi-3">
        <div className="flex flex-wrap items-center gap-hmi-3">
          <Counter variant={CounterVariantType.Total} value={summary.total} />
          <Counter variant={CounterVariantType.Ok} value={summary.ok} />
          <Counter variant={CounterVariantType.Ng} value={summary.ng} />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-ca-border bg-ca-panel text-ca-ink text-sm">
            <span className="text-ca-ink-muted">Yield:</span>
            <span className="font-semibold text-ca-ok">{summary.yieldPct}%</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-ca-border bg-ca-panel text-ca-ink text-sm">
            <span className="text-ca-ink-muted">Avg Cycle:</span>
            <span className="font-mono">{summary.avgDurationMs}ms</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-ca-border bg-ca-panel hover:bg-ca-panel-2 text-ca-ink text-sm transition-colors"
          title="Refresh inspection records"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {history.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No inspection records yet"
          description="Trigger an inspection on the Run screen to populate this persistent SQLite log."
          testId="results-empty"
        />
      ) : (
        <div className="border border-ca-border rounded-lg overflow-hidden bg-ca-panel shadow-sm">
          <table className="w-full text-hmi-body text-ca-ink border-collapse">
            <thead>
              <tr className="text-left border-b border-ca-border text-ca-ink-muted bg-ca-panel-2 text-xs uppercase tracking-wider">
                <th className="py-hmi-2 px-hmi-3">Frame #</th>
                <th className="py-hmi-2 px-hmi-3">Time</th>
                <th className="py-hmi-2 px-hmi-3">Judgment</th>
                <th className="py-hmi-2 px-hmi-3">Score</th>
                <th className="py-hmi-2 px-hmi-3">Cycle</th>
                <th className="py-hmi-2 px-hmi-3">Tool</th>
                <th className="py-hmi-2 px-hmi-3">Reason / Details</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr
                  key={item.runSessionId}
                  className="border-b border-ca-border/60 hover:bg-ca-panel-2/50 transition-colors last:border-b-0"
                >
                  <td className="py-hmi-2 px-hmi-3 font-mono text-xs">#{item.runSessionId}</td>
                  <td className="py-hmi-2 px-hmi-3 text-xs text-ca-ink-muted font-mono">
                    {new Date(item.persistedAt * 1000).toLocaleTimeString()}
                  </td>
                  <td className="py-hmi-2 px-hmi-3">
                    {item.is_pass ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-ca-ok/10 text-ca-ok border border-ca-ok/30">
                        PASS
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-ca-ng/10 text-ca-ng border border-ca-ng/30">
                        FAIL (NG)
                      </span>
                    )}
                  </td>
                  <td className="py-hmi-2 px-hmi-3 font-mono text-xs">{item.score.toFixed(1)}%</td>
                  <td className="py-hmi-2 px-hmi-3 font-mono text-xs">{item.durationMs}ms</td>
                  <td className="py-hmi-2 px-hmi-3 text-xs font-medium text-ca-ink">
                    {item.ruleKind}
                  </td>
                  <td className="py-hmi-2 px-hmi-3 text-xs text-ca-ink-muted">{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (mode === UiModeType.Standard) {
    return (
      <StandardAppShell
        activeNav="results"
        title="Inspection Results History"
        subtitle={`Total: ${summary.total} · OK: ${summary.ok} · NG: ${summary.ng} · Yield: ${summary.yieldPct}%`}
      >
        {content}
      </StandardAppShell>
    );
  }

  return (
    <HmiShell
      program="Program 01"
      title="Results"
      actionBarLeft={
        <Link
          to="/run"
          className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink rounded-md hover:bg-ca-panel-2"
        >
          Back to Run
        </Link>
      }
      actionBarRight={
        <Link
          to="/errors"
          className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink rounded-md hover:bg-ca-panel-2"
        >
          NG Events
        </Link>
      }
    >
      {content}
    </HmiShell>
  );
}
