import { createFileRoute, Link } from "@tanstack/react-router";
import { HmiShell } from "@/components/hmi";
import { EmptyState } from "@/components/common/EmptyState";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useUiMode, UiModeType } from "@/hooks/useUiMode";
import { StandardAppShell } from "@/components/layout/StandardAppShell";
import { useTelemetryHistory, useTelemetrySummary } from "@/hooks/useTelemetry";

export const Route = createFileRoute("/errors")({
  head: () => ({
    meta: [
      { title: "NG Events - Control Automation" },
      {
        name: "description",
        content: "Review recent NG (fail) events captured during inspection runs from SQLite.",
      },
    ],
  }),
  component: ErrorsPage,
});

function ErrorsPage() {
  const { summary, refetch: refetchSummary } = useTelemetrySummary();
  const { history, isLoading, refetch: refetchHistory } = useTelemetryHistory(100);
  const { mode } = useUiMode();

  const handleRefresh = () => {
    refetchSummary();
    refetchHistory();
  };

  // Filter for failed (NG) inspections only
  const ngEvents = history.filter((item) => !item.is_pass);

  const content = (
    <div className="flex-1 overflow-auto p-hmi-4 space-y-hmi-4 bg-ca-panel">
      <div className="flex items-center justify-between pb-2 border-b border-ca-border/60">
        <div className="flex items-center gap-3">
          <span className="text-sm text-ca-ink-muted">Total NG Logged:</span>
          <span className="font-semibold text-ca-ng px-2 py-0.5 rounded bg-ca-ng/10 border border-ca-ng/30 text-sm">
            {summary.ng} NG Failures
          </span>
          <span className="text-xs text-ca-ink-muted">({ngEvents.length} displayed in buffer)</span>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-ca-border bg-ca-panel hover:bg-ca-panel-2 text-ca-ink text-sm transition-colors"
          title="Refresh NG alarm log"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {ngEvents.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No NG defect events recorded"
          description="All inspections in the current database are currently passing, or no inspections have run yet."
          testId="errors-empty"
        />
      ) : (
        <div className="border border-ca-border rounded-lg overflow-hidden bg-ca-panel shadow-sm">
          <table className="w-full text-hmi-body text-ca-ink border-collapse">
            <thead className="bg-ca-chrome text-ca-chrome-ink text-hmi-caption uppercase tracking-wide">
              <tr>
                <th className="text-left px-hmi-3 py-hmi-2">Time</th>
                <th className="text-right px-hmi-3 py-hmi-2">Frame #</th>
                <th className="text-left px-hmi-3 py-hmi-2">Defect Tool</th>
                <th className="text-left px-hmi-3 py-hmi-2">Rejection Reason</th>
                <th className="text-right px-hmi-3 py-hmi-2">Score</th>
                <th className="text-right px-hmi-3 py-hmi-2">Cycle</th>
              </tr>
            </thead>
            <tbody>
              {ngEvents.map((e) => (
                <tr
                  key={e.runSessionId}
                  className="border-b border-ca-border/60 hover:bg-ca-panel-2/50 transition-colors last:border-b-0"
                >
                  <td className="px-hmi-3 py-hmi-2 font-mono text-xs text-ca-ink-muted">
                    {new Date(e.persistedAt * 1000).toLocaleTimeString()}
                  </td>
                  <td className="px-hmi-3 py-hmi-2 text-right font-mono text-xs font-semibold text-ca-ng">
                    #{e.runSessionId}
                  </td>
                  <td className="px-hmi-3 py-hmi-2 text-xs font-medium">{e.ruleKind}</td>
                  <td className="px-hmi-3 py-hmi-2 text-xs text-ca-ink-muted">{e.reason}</td>
                  <td className="px-hmi-3 py-hmi-2 text-right font-mono text-xs text-ca-ng">
                    {e.score.toFixed(1)}%
                  </td>
                  <td className="px-hmi-3 py-hmi-2 text-right font-mono text-xs">
                    {e.durationMs}ms
                  </td>
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
        activeNav="errors"
        title="NG Alarms & Errors"
        subtitle={`${summary.ng} NG total · ${ngEvents.length} in buffer`}
      >
        {content}
      </StandardAppShell>
    );
  }

  return (
    <HmiShell
      program="Program 01"
      title="NG Events"
      headerActions={
        <span className="text-hmi-body text-ca-ink-muted hmi-tabular">
          {summary.ng} NG total · {ngEvents.length} in buffer
        </span>
      }
      actionBarLeft={
        <Link
          to="/run"
          className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink rounded-md hover:bg-ca-panel-2"
        >
          Back to Run
        </Link>
      }
    >
      {content}
    </HmiShell>
  );
}
