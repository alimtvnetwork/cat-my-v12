import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Activity } from "lucide-react";
import { useRunning } from "@/hooks/useRunning";

export const Route = createFileRoute("/projects/$projectId/runs")({
  component: ProjectRunsTab,
});

function ProjectRunsTab() {
  const { projectId } = Route.useParams();
  const { ops } = useRunning();
  const runOps = ops.filter((o) => o.kind === "run");

  return (
    <section className="flex flex-col h-full bg-[#06080d] text-ca-ink p-8 font-sans overflow-y-auto">
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-8 border-b border-white/[0.08] pb-5">
          <h2 className="flex items-center gap-3 text-2xl font-bold uppercase tracking-wider text-white">
            <span className="h-3 w-3 rounded-full bg-ca-primary shadow-[0_0_12px_var(--ca-primary)] animate-pulse" />
            Live Execution Queue
          </h2>
          <div className="text-xs font-mono font-bold uppercase bg-white/[0.04] px-3.5 py-1.5 border border-white/10 rounded-full flex items-center gap-2.5 text-white/70 shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${runOps.length > 0 ? "bg-emerald-400" : "bg-white/40"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${runOps.length > 0 ? "bg-emerald-500" : "bg-white/40"}`}></span>
            </span>
            {runOps.length} IN-FLIGHT
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/40 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl overflow-hidden">
          <div className="px-5 py-3.5 bg-black/50 border-b border-white/[0.08] flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/90 flex items-center gap-2">
              Active Processes
            </h3>
          </div>

          {runOps.length > 0 ? (
            <div className="divide-y divide-white/[0.06]">
              {runOps.map((op) => (
                <div key={op.id} className="flex items-center justify-between px-5 py-4 bg-black/30 group hover:bg-white/[0.04] transition">
                  <div className="flex items-center gap-4">
                    <Loader2 className="h-5 w-5 animate-spin text-ca-primary" aria-hidden />
                    <div>
                      <div className="text-sm font-bold uppercase text-white">{op.label}</div>
                      <div className="text-[10px] font-mono text-white/40 mt-1">ID: {op.id}</div>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-white/50 flex flex-col items-end">
                    <span className="uppercase text-[10px] tracking-wider mb-1">Started</span>
                    <span>{new Date(op.startedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-white/40 border-t border-white/[0.06]">
              <Activity size={36} className="text-white/20 mb-3" />
              <p className="text-sm font-bold uppercase tracking-widest text-white/70">No Active Jobs</p>
              <p className="text-xs font-mono mt-1 text-white/40">
                Awaiting execution commands. Real-time vision pipeline idle.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
