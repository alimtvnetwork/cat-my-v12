import { CounterVariantType } from "@/components/hmi/Counter";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HmiShell, Counter } from "@/components/hmi";
import { useRunStore } from "@/lib/stores/run-store";
import { EmptyState } from "@/components/common/EmptyState";
import { ListChecks } from "lucide-react";

// Implements spec/21-app/38-results-screen.md (v1 UI wiring, M4).
// Reads from the in-memory run store; JSONL backing lands in M6.
export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Results - Control Automation" },
      {
        name: "description",
        content: "Per-frame inspection results (OK/NG) for the active run session.",
      },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const counters = useRunStore((s) => s.counters);
  const ngEvents = useRunStore((s) => s.ngEvents);

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
      <div className="flex-1 overflow-auto p-hmi-4 space-y-hmi-4">
        <div className="flex flex-wrap items-center gap-hmi-3">
          <Counter variant={CounterVariantType.Total} value={counters.total} />
          <Counter variant={CounterVariantType.Ok} value={counters.ok} />
          <Counter variant={CounterVariantType.Ng} value={counters.ng} />
        </div>
        {counters.total === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No results yet"
            description="Start a run to populate this view. Persistent JSONL results land in M6."
            testId="results-empty"
          />
        ) : (
          <div className="border border-ca-border rounded-lg overflow-hidden bg-ca-panel">
            <table className="w-full text-hmi-body text-ca-ink border-collapse">
              <thead>
                <tr className="text-left border-b border-ca-border text-ca-ink-muted bg-ca-panel-2">
                  <th className="py-hmi-2 px-hmi-3">Frame</th>
                  <th className="py-hmi-2 px-hmi-3">Time</th>
                  <th className="py-hmi-2 px-hmi-3">Judgment</th>
                  <th className="py-hmi-2 px-hmi-3">Tool</th>
                  <th className="py-hmi-2 px-hmi-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {ngEvents.map((e) => (
                  <tr key={e.id} className="border-b border-ca-border/60 last:border-b-0">
                    <td className="py-hmi-2 px-hmi-3 hmi-tabular">{e.frame}</td>
                    <td className="py-hmi-2 px-hmi-3 hmi-tabular">{e.ts}</td>
                    <td className="py-hmi-2 px-hmi-3 text-ca-ng font-medium">NG</td>
                    <td className="py-hmi-2 px-hmi-3">{e.tool}</td>
                    <td className="py-hmi-2 px-hmi-3">{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </HmiShell>
  );
}
