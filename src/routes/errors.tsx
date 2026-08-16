import { createFileRoute, Link } from "@tanstack/react-router";
import { HmiShell } from "@/components/hmi";
import { useRunStore } from "@/lib/stores/run-store";
import { EmptyState } from "@/components/common/EmptyState";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/errors")({
  head: () => ({
    meta: [
      { title: "NG Events - Control Automation" },
      {
        name: "description",
        content: "Review recent NG (fail) events captured during inspection runs.",
      },
    ],
  }),
  component: ErrorsPage,
});

function ErrorsPage() {
  const ngEvents = useRunStore((s) => s.ngEvents);
  const ngCount = useRunStore((s) => s.counters.ng);

  return (
    <HmiShell
      program="Program 01"
      title="NG Events"
      headerActions={
        <span className="text-hmi-body text-ca-ink-muted hmi-tabular">
          {ngCount} NG total · {ngEvents.length} in buffer
        </span>
      }
      actionBarLeft={
        <Link
          to="/run"
          className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink"
        >
          Back to Run
        </Link>
      }
    >
      <div className="flex-1 overflow-auto bg-ca-panel">
        {ngEvents.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No NG events yet"
            description="Start a run to populate the buffer. Failed inspections land here in real time."
            testId="errors-empty"
          />
        ) : (
          <table className="w-full text-hmi-body text-ca-ink">
            <thead className="bg-ca-chrome text-ca-chrome-ink text-hmi-caption uppercase tracking-wide">
              <tr>
                <th className="text-left px-hmi-3 py-hmi-2">Time</th>
                <th className="text-right px-hmi-3 py-hmi-2">Frame</th>
                <th className="text-left px-hmi-3 py-hmi-2">Tool</th>
                <th className="text-left px-hmi-3 py-hmi-2">Reason</th>
                <th className="text-right px-hmi-3 py-hmi-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {ngEvents.map((e) => (
                <tr key={e.id} className="border-b border-ca-border">
                  <td className="px-hmi-3 py-hmi-2 hmi-tabular">{e.ts}</td>
                  <td className="px-hmi-3 py-hmi-2 text-right hmi-tabular">#{e.frame}</td>
                  <td className="px-hmi-3 py-hmi-2">{e.tool}</td>
                  <td className="px-hmi-3 py-hmi-2">{e.reason}</td>
                  <td className="px-hmi-3 py-hmi-2 text-right hmi-tabular">{e.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </HmiShell>
  );
}
