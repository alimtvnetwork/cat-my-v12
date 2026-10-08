import { createFileRoute } from "@tanstack/react-router";
import { PlayCircle, Loader2, Activity } from "lucide-react";
import { useRunning } from "@/hooks/useRunning";

export const Route = createFileRoute("/projects/$projectId/runs")({
  component: ProjectRunsTab,
});

function ProjectRunsTab() {
  const { projectId } = Route.useParams();
  const { ops } = useRunning();
  const runOps = ops.filter((o) => o.kind === "run");

  return (
    <section className="flex flex-col h-full bg-[#0b0c10] text-ca-ink p-6 font-sans">
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-8 border-b border-ca-border pb-4">
          <h2 className="flex items-center gap-3 text-2xl font-bold uppercase tracking-wider">
            <Activity className="h-6 w-6 text-ca-primary" aria-hidden /> 
            Live Execution Queue
          </h2>
          <div className="text-xs font-mono font-bold uppercase bg-ca-panel px-3 py-1.5 border border-ca-border rounded flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${runOps.length > 0 ? "bg-green-400" : "bg-ca-ink-muted"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${runOps.length > 0 ? "bg-green-500" : "bg-ca-ink-muted"}`}></span>
            </span>
            {runOps.length} IN-FLIGHT
          </div>
        </div>

        <div className="bg-ca-panel border border-ca-border rounded-sm overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-ca-panel-2 border-b border-ca-border flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-ca-ink-muted flex items-center gap-2">
              Active Processes
            </h3>
          </div>

          {runOps.length > 0 ? (
            <div className="divide-y divide-ca-border/50">
              {runOps.map((op) => (
                <div key={op.id} className="flex items-center justify-between px-4 py-4 bg-[#0b0c10] group hover:bg-[#12141a] transition">
                  <div className="flex items-center gap-4">
                    <Loader2 className="h-5 w-5 animate-spin text-ca-primary" aria-hidden />
                    <div>
                      <div className="text-sm font-bold uppercase text-ca-ink">{op.label}</div>
                      <div className="text-[10px] font-mono text-ca-ink-muted mt-1">ID: {op.id}</div>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-ca-ink-muted flex flex-col items-end">
                    <span className="uppercase text-[10px] tracking-wider mb-1">Started</span>
                    <span>{new Date(op.startedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 flex flex-col items-center justify-center text-ca-ink-muted border-t border-ca-border/20">
              <Activity size={32} className="opacity-20 mb-3" />
              <p className="text-sm font-bold uppercase tracking-widest">No Active Jobs</p>
              <p className="text-[10px] font-mono mt-2 opacity-70">
                Awaiting execution commands. Persisted historical metrics are pending DB migration.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
