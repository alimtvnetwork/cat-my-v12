import { ClientLogger } from "@/lib/observability/client-logger";
import { EmptyStateActionVariantType } from "@/components/common/EmptyState";
/**
 * Plan 90 Step 76 - `LogTailViewer` UI component.
 *
 * Root cause guarded (one sentence): Steps 74-75 wired the SSE hook and
 * auto-reconnect policy, but no UI consumer existed, so operators still
 * have no in-app way to watch a `worker-cli` run and drift (reconnects,
 * give-up) fails silently instead of being surfaced.
 *
 * Behaviour:
 *  - Streams `/api/cli/sessions/{runId}/log?follow=true` via
 *    `useSessionLogTailAutoReconnect` (Step 75).
 *  - Renders raw JSONL frames in a monospace, scroll-pinned pane;
 *    auto-scrolls to bottom when the user is already at the bottom,
 *    respects manual scroll otherwise.
 *  - Surfaces drift as sonner toasts (never silent):
 *      * one warning toast per new `consecutiveFailures` bump
 *      * one error toast when `gaveUp` flips true
 *      * one success toast when the stream cleanly ends
 *  - Status pill: connecting / live / ended / retrying(n) / gave-up.
 *  - Manual "Reconnect" button re-arms the underlying EventSource.
 *
 * Loud-failure: every UI-visible state transition also `console.info`s
 * with runId context so support can correlate with BE JSONL.
 */
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { useSessionLogTailAutoReconnect } from "@/lib/observability/useSessionLogTailAutoReconnect";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface LogTailViewerProps {
  runId: string | null | undefined;
  follow?: boolean;
  sinceLine?: number;
  maxLines?: number;
  heightClass?: string;
}

export function LogTailViewer({
  runId,
  follow = true,
  sinceLine,
  maxLines,
  heightClass = "h-80",
}: LogTailViewerProps) {
  const {
    status,
    lines,
    end,
    errorMessage,
    reconnect,
    reconnectCount,
    consecutiveFailures,
    gaveUp,
  } = useSessionLogTailAutoReconnect({
    runId,
    follow,
    sinceLine,
    maxLines,
    enabled: Boolean(runId),
  });

  const paneRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const lastFailureNotified = useRef(0);
  const gaveUpNotified = useRef(false);
  const endedNotified = useRef(false);

  // Auto-scroll when pinned to bottom.
  useEffect(() => {
    const el = paneRef.current;

    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  // Drift toasts: consecutive failures.
  const isNonRunId = !runId;

  useEffect(() => {
    if (isNonRunId) return;

    if (consecutiveFailures > 0 && consecutiveFailures !== lastFailureNotified.current) {
      lastFailureNotified.current = consecutiveFailures;
      ClientLogger.info("[LogTailViewer] retry", { runId, consecutiveFailures });
      toast.warning(`Log stream retry ${consecutiveFailures} for run ${runId.slice(0, 8)}`);
    }

    if (consecutiveFailures === 0) {
      lastFailureNotified.current = 0;
    }
  }, [consecutiveFailures, runId]);

  // Drift toast: gave up.
  useEffect(() => {
    if (gaveUp && !gaveUpNotified.current && runId) {
      gaveUpNotified.current = true;
      ClientLogger.info("[LogTailViewer] gave up", { runId });
      toast.error(`Log stream gave up for run ${runId.slice(0, 8)}. Use Reconnect to retry.`);
    }

    if (!gaveUp) gaveUpNotified.current = false;
  }, [gaveUp, runId]);

  // Success toast: clean end.
  useEffect(() => {
    if (status === "ended" && !endedNotified.current && runId) {
      endedNotified.current = true;
      ClientLogger.info("[LogTailViewer] ended", { runId, end });
      toast.success(`Run ${runId.slice(0, 8)} finished (${end?.LineCount ?? lines.length} lines)`);
    }

    if (status !== "ended") endedNotified.current = false;
  }, [status, runId, end, lines.length]);

  const pill = useMemo(() => {
    if (!runId) return { label: "no run", variant: "outline" as const };

    if (gaveUp) return { label: "gave up", variant: "destructive" as const };

    if (status === "error" || consecutiveFailures > 0) {
      return {
        label: `retrying (${consecutiveFailures})`,
        variant: EmptyStateActionVariantType.Secondary as const,
      };
    }

    if (status === "open") return { label: "live", variant: "default" as const };

    if (status === "ended") return { label: "ended", variant: "outline" as const };

    if (status === "connecting")
      return { label: "connecting", variant: EmptyStateActionVariantType.Secondary as const };

    return { label: status, variant: "outline" as const };
  }, [status, gaveUp, consecutiveFailures, runId]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={pill.variant}>{pill.label}</Badge>
          <span className="text-xs text-muted-foreground">
            {lines.length} lines
            {reconnectCount > 0 ? ` · ${reconnectCount} reconnects` : ""}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            ClientLogger.info("[LogTailViewer] manual reconnect", { runId });
            reconnect();
          }}
          disabled={!runId}
        >
          Reconnect
        </Button>
      </div>
      <div
        ref={paneRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 16;
          stickToBottomRef.current = atBottom;
        }}
        className={`${heightClass} overflow-auto rounded-md border bg-muted/30 p-2 font-mono text-xs`}
        role="log"
        aria-live="polite"
        aria-label="Session log tail"
      >
        {lines.length === 0 ? (
          <div className="text-muted-foreground">
            {runId ? "Waiting for log frames…" : "Select a run to tail its log."}
          </div>
        ) : (
          lines.map((line) => (
            <div key={line.Id} className="whitespace-pre-wrap break-all">
              <span className="mr-2 text-muted-foreground">{line.Id}</span>
              {line.Data}
            </div>
          ))
        )}
        {errorMessage ? <div className="mt-2 text-destructive">error: {errorMessage}</div> : null}
      </div>
    </div>
  );
}
