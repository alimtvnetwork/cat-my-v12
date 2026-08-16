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

export function StatusBar() {
  const programName = useProgramStore((s) => s.name);
  const status = useRunStore((s) => s.status);
  const counters = useRunStore((s) => s.counters);
  const total = counters.total;
  const ok = counters.ok;
  const ng = counters.ng;

  return (
    <footer
      role="contentinfo"
      aria-label="Machine status"
      data-testid="hmi-status-bar"
      style={{ height: "var(--status-bar-h)" }}
      className="flex flex-shrink-0 items-center justify-between border-t border-ca-border bg-ca-chrome px-hmi-4 text-hmi-caption text-ca-chrome-ink"
    >
      <span className="hmi-tabular truncate" aria-label="Active program">
        {programName}
      </span>
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="hmi-tabular flex items-center gap-hmi-3"
      >
        <span aria-label="Run status">{RunStatusType.isRunning(status) ? "RUNNING" : "IDLE"}</span>
        <span aria-label="Run counters">
          Total {total} - OK {ok} - NG {ng}
        </span>
      </span>
    </footer>
  );
}
