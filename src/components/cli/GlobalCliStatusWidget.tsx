import { ClientLogger } from "@/lib/observability/client-logger";
/**
 * Plan 90 Step 123 - Global CLI status widget in `__root` header.
 * Refactored in Step 124 to consume the shared `StatusPill` so tone
 * mapping stays centralized (ExitCode -> tone lives in `status-pill.tsx`).
 *
 * Polls `GET /api/cli/status` every 5s and pauses when the tab is
 * hidden (via `document.visibilitychange`). Errors from the poll degrade
 * to a muted "unavailable" state; they are logged to `console.warn` but
 * never surfaced through the global error modal because a background
 * health probe must not hijack the UI.
 */
import { useEffect, useMemo, useState } from "react";
import { useAppQuery } from "@/lib/wrappers/use-app-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { getCliStatus, type CliStatus } from "../../lib/observability/status.functions";
import { StatusPill, toneForExitCode } from "./status-pill";
import { WorkerStateType, StatusToneType } from "@/lib/enums/ui";
import { cn } from "../../lib/utils";
import { pausePollOnError } from "../../lib/react-query/poll";
import { useDataSource, DataSourceType, useBackendBaseUrl } from "../../lib/data-source/store";

const POLL_INTERVAL_MS = 5000;

function deriveWorkerState(worker: CliStatus["Worker"]): WorkerStateType {
  if (!worker) return WorkerStateType.Unknown;

  if (worker.ExitCode === null) return WorkerStateType.Running;

  if (worker.ExitCode === 0) return WorkerStateType.Idle;

  return WorkerStateType.Error;
}

const STATE_LABEL: Record<WorkerStateType, string> = {
  [WorkerStateType.Unknown]: "Unknown",
  [WorkerStateType.Idle]: "Idle",
  [WorkerStateType.Running]: "Running",
  [WorkerStateType.Error]: "Error",
};

/**
 * Derive the shared StatusPill tone from a worker snapshot. Reuses
 * `toneForExitCode` so the widget cannot drift from the sessions
 * list/drilldown mapping (Plan 90 Step 124 contract).
 */
function toneForWorker(worker: CliStatus["Worker"]): StatusToneType {
  const isUnknown = !worker;

  if (isUnknown) return StatusToneType.Muted;

  return toneForExitCode(worker.ExitCode, worker.ExitCode === null ? null : 1);
}

function useTabVisibility(): boolean {
  const [visible, setVisible] = useState<boolean>(() =>
    typeof document === "undefined" ? true : !document.hidden,
  );
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handler = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);

    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return visible;
}

export function GlobalCliStatusWidget(): React.JSX.Element | null {
  const dataSource = useDataSource();
  const baseUrl = useBackendBaseUrl();
  const tabVisible = useTabVisibility();
  const fetchStatus = useServerFn(getCliStatus);

  if (dataSource !== DataSourceType.Backend || !baseUrl) {
    return null;
  }

  const query = useAppQuery<CliStatus, Error>({
    queryKey: ["cli", "status"],
    queryFn: () => fetchStatus({ data: {} }),
    refetchInterval: tabVisible ? pausePollOnError(POLL_INTERVAL_MS) : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    throwOnError: false,
    retry: 0,
    staleTime: 2000,
    meta: { hasVisibility: false },
  });

  useEffect(() => {
    if (query.error) {
      ClientLogger.warn("[GlobalCliStatusWidget] status poll failed:", query.error.message);
    }
  }, [query.error]);

  const status = query.data;
  const workerState: WorkerStateType = useMemo(
    () => (status ? deriveWorkerState(status.Worker) : WorkerStateType.Unknown),
    [status],
  );
  const workerTone: StatusToneType = useMemo(
    () => (status ? toneForWorker(status.Worker) : StatusToneType.Muted),
    [status],
  );
  const ipcPending = status?.Ipc.Pending ?? 0;
  const ipcTruncated = status?.Ipc.Truncated ?? false;
  const lastError = status?.LastErrorCode ?? null;
  const unavailable = !status && !query.isPending;

  if (unavailable || workerState === WorkerStateType.Unknown) {
    return null;
  }

  const title = `Worker: ${STATE_LABEL[workerState]}. IPC pending: ${ipcPending}${ipcTruncated ? "+" : ""}. ${
    lastError ? `Last error: ${lastError}.` : "No recent errors."
  }`;

  return (
    <div
      className="fixed top-2 right-2 z-40 pointer-events-auto flex items-center gap-1"
      data-testid="global-cli-status-widget"
    >
      <Link
        to="/cli/sessions"
        title={title}
        aria-label={title}
        className={cn(
          "inline-flex items-center gap-1 rounded-full",
          "hover:bg-accent/50 transition-colors",
        )}
      >
        <StatusPill
          tone={workerTone}
          label={`CLI: ${STATE_LABEL[workerState]}`}
          dot
          data-testid="cli-worker-pill"
        />
        {ipcPending > 0 && (
          <StatusPill
            tone={ipcPending > 100 ? StatusToneType.Destructive : StatusToneType.Info}
            label={`IPC ${ipcPending}${ipcTruncated ? "+" : ""}`}
            data-testid="cli-ipc-backlog"
          />
        )}
        {lastError && (
          <StatusPill
            tone={StatusToneType.Destructive}
            label={lastError}
            data-testid="cli-last-error"
          />
        )}
      </Link>
    </div>
  );
}
