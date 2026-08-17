import { RunStatusType } from "@/types/run/RunStatus";
import { useRunStore, type RunHistoryEntry } from "@/lib/stores/run-store";

function fmtDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");

  return `${mm}:${ss}`;
}

function fmtTs(ts: number) {
  const d = new Date(ts);

  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

export function RunHistorySidebar({ onClose }: { onClose: () => void }): React.JSX.Element | null {
  const history = useRunStore((s) => s.history);
  const rerun = useRunStore((s) => s.rerun);
  const clearHistory = useRunStore((s) => s.clearHistory);
  const status = useRunStore((s) => s.status);

  return (
    <aside
      aria-label="Run history"
      className="flex flex-col w-72 shrink-0 border-r border-ca-border bg-ca-panel"
    >
      <header className="flex items-center justify-between px-hmi-3 py-hmi-2 border-b border-ca-border">
        <h2 className="text-hmi-title font-semibold uppercase tracking-wide text-ca-ink">
          History
        </h2>
        <div className="flex items-center gap-hmi-1">
          <button
            type="button"
            onClick={clearHistory}
            disabled={history.length === 0}
            aria-label="Clear run history"
            className="text-hmi-caption text-ca-ink-muted hover:text-ca-ink px-hmi-2 py-1 rounded disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close run history"
            className="text-ca-ink-muted hover:text-ca-ink px-hmi-2 py-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
          >
            ×
          </button>
        </div>
      </header>
      <ul className="flex-1 overflow-y-auto divide-y divide-ca-border" role="list">
        {history.length === 0 ? (
          <li className="p-hmi-4 text-hmi-caption text-ca-ink-muted text-center">
            No past runs yet.
          </li>
        ) : (
          history.map((h: RunHistoryEntry) => {
            const dur = fmtDuration(h.endedAt - h.startedAt);
            const pass = h.counters.total > 0 ? (h.counters.ok / h.counters.total) * 100 : 0;

            return (
              <li key={h.id} className="p-hmi-3 hover:bg-ca-panel-2">
                <div className="flex items-baseline justify-between gap-hmi-2">
                  <span className="text-hmi-body text-ca-ink font-mono tabular-nums">{dur}</span>
                  <span className="text-hmi-caption text-ca-ink-muted">{fmtTs(h.startedAt)}</span>
                </div>
                <div className="mt-1 flex items-center gap-hmi-2 text-hmi-caption text-ca-ink-muted">
                  <span>Total {h.counters.total}</span>
                  <span className="text-ca-ok">OK {h.counters.ok}</span>
                  <span className="text-ca-ng">NG {h.counters.ng}</span>
                  <span className="ml-auto">{pass.toFixed(0)}%</span>
                </div>
                <button
                  type="button"
                  onClick={() => rerun(h.id)}
                  disabled={RunStatusType.isRunning(status)}
                  aria-label={`Re-run configuration from ${fmtTs(h.startedAt)}`}
                  className="mt-hmi-2 inline-flex items-center min-h-9 px-hmi-3 border border-ca-border rounded-md text-hmi-caption text-ca-ink hover:bg-ca-panel-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
                >
                  Re-run
                </button>
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
}
