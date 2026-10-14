// Persistent status bar rendered under the main content of every screen.
// Shows the active program, run status, and OK/NG counters so operators
// always see machine state, not just when Live Run is open.
//
// Plan 88 Step 2: promoted to a semantic <footer role="contentinfo">
// landmark keyed off the `--status-bar-h` token. Only the run status +
// counters live inside an inner role="status" region so screen readers
// announce state changes, not the whole footer on every render (the old
// footer-wide aria-live was chatty and drowned out real updates).
import { RunStatusType } from "@/types/run/RunStatus";
import { useProgramStore } from "@/lib/stores/program-store";
import { useRunStore } from "@/lib/stores/run-store";

export function StatusBar(): React.JSX.Element | null {
  const programName = useProgramStore((s) => s.name);
  const status = useRunStore((s) => s.status);
  const counters = useRunStore((s) => s.counters);
  const total = counters.total;
  const ok = counters.ok;
  const ng = counters.ng;
  const isRunning = RunStatusType.isRunning(status);

  return (
    <footer
      role="contentinfo"
      aria-label="Machine status"
      data-testid="hmi-status-bar"
      style={{ height: "var(--status-bar-h)" }}
      className="flex flex-shrink-0 items-center justify-between border-t border-ca-border/80 bg-ca-chrome/95 px-hmi-4 text-hmi-caption text-ca-chrome-ink backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_-2px_12px_-2px_rgba(0,0,0,0.3)]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 rounded-md border border-ca-border/60 bg-ca-panel/50 px-2.5 py-0.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <span className="relative flex h-2 w-2 items-center justify-center shrink-0">
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${
                isRunning ? "bg-ca-ok animate-pulse shadow-[0_0_8px_var(--ca-ok)]" : "bg-ca-ink-muted/50"
              }`}
            />
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-ca-ink-muted">PRG</span>
          <span
            className="hmi-tabular truncate font-mono text-[11px] font-semibold text-ca-ink"
            aria-label="Active program"
          >
            {programName}
          </span>
        </div>
      </div>

      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="hmi-tabular flex items-center gap-3 font-mono text-[11px]"
      >
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm ${
            isRunning
              ? "border border-ca-ok/50 bg-ca-ok/15 text-ca-ok shadow-[0_0_10px_color-mix(in_oklab,var(--ca-ok)_30%,transparent)]"
              : "border border-ca-border/80 bg-ca-panel/80 text-ca-ink-muted"
          }`}
          aria-label="Run status"
        >
          {isRunning ? "RUNNING" : "IDLE"}
        </span>

        <span
          aria-label="Run counters"
          className="flex items-center gap-2.5 rounded-md border border-ca-border/70 bg-ca-bg/90 px-3 py-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
        >
          <span className="text-ca-ink-muted">TOTAL <strong className="font-semibold text-ca-ink ml-1">{total.toLocaleString()}</strong></span>
          <span className="text-ca-border/60">│</span>
          <span className="text-ca-ok font-semibold">OK <strong className="ml-1">{ok.toLocaleString()}</strong></span>
          <span className="text-ca-border/60">│</span>
          <span className={ng > 0 ? "text-ca-ng font-bold shadow-[0_0_8px_color-mix(in_oklab,var(--ca-ng)_40%,transparent)]" : "text-ca-ink-muted"}>
            NG <strong className="ml-1">{ng.toLocaleString()}</strong>
          </span>
        </span>
      </span>
    </footer>
  );
}
