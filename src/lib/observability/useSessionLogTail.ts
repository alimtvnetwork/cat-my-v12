import { ClientLogger } from "@/lib/observability/client-logger";
/**
 * Plan 90 Step 74 - `useSessionLogTail` browser hook.
 *
 * Root cause guarded (one sentence): Step 73 shipped the same-origin SSE
 * proxy to the BE disk-tail endpoint, but no React consumer existed, so
 * the streaming path was reachable but still unusable from the app.
 *
 * Contract:
 *  - Input: `{ runId, follow?, sinceLine?, maxLines?, enabled? }`.
 *  - Opens `EventSource("/api/cli/sessions/{runId}/log?...")`, listens for:
 *      * default `message` events -> pushed onto `lines[]` with `{Id, Data}`
 *        (Id from EventSource.lastEventId, Data is the raw string frame).
 *      * `end` event -> parses `{RunId, LineCount, NextSinceLine, Truncated}`,
 *        sets `status="ended"`, and closes the source.
 *      * `error` event -> logs and sets `status="error"` (does NOT reopen;
 *        callers decide reconnect policy via the returned `reconnect()`).
 *  - SSR-safe: everything happens inside `useEffect`; the module has zero
 *    top-level browser globals.
 *  - Loud-failure: every close reason and every parse failure is
 *    surfaced via `ClientLogger.warn("[useSessionLogTail]", ...)` with runId
 *    context. Never swallows.
 *
 * Deliberately out of scope: auto-reconnect + backoff (Step 75), sonner
 * drift toasts (Step 76). Callers wire those on top of `reconnect`.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export enum LogTailStatusType {
  Idle = "idle",
  Connecting = "connecting",
  Open = "open",
  Ended = "ended",
  Error = "error",
}
export type LogTailStatus = LogTailStatusType;

export interface LogTailLine {
  /** EventSource.lastEventId; monotonic line number from BE cursor. */
  Id: string;
  /** Raw `data:` payload (single-line JSON as emitted by the BE writer). */
  Data: string;
}

export interface LogTailEnd {
  RunId: string;
  LineCount: number;
  NextSinceLine: number;
  Truncated: boolean;
}

export interface UseSessionLogTailArgs {
  runId: string | null | undefined;
  follow?: boolean;
  sinceLine?: number;
  maxLines?: number;
  enabled?: boolean;
}

export interface UseSessionLogTailResult {
  status: LogTailStatus;
  lines: LogTailLine[];
  end: LogTailEnd | null;
  errorMessage: string | null;
  /** Force-close current stream and open a fresh one with current args. */
  reconnect: () => void;
}

function buildUrl(args: UseSessionLogTailArgs): string {
  const params = new URLSearchParams();

  if (args.follow) params.set("follow", "true");

  if (typeof args.sinceLine === "number" && args.sinceLine >= 0) {
    params.set("since_line", String(args.sinceLine));
  }

  if (typeof args.maxLines === "number" && args.maxLines > 0) {
    params.set("max_lines", String(args.maxLines));
  }

  const qs = params.toString();
  const runId = encodeURIComponent(args.runId ?? "");

  return `/api/cli/sessions/${runId}/log${qs ? `?${qs}` : ""}`;
}

/** Injectable factory so tests can swap in a fake EventSource. */
export type EventSourceFactory = (url: string) => EventSource;

const defaultFactory: EventSourceFactory = (url) => new EventSource(url);

export function useSessionLogTail(
  args: UseSessionLogTailArgs,
  factory: EventSourceFactory = defaultFactory,
): UseSessionLogTailResult {
  const { runId, follow, sinceLine, maxLines, enabled = true } = args;
  const [status, setStatus] = useState<LogTailStatus>(LogTailStatusType.Idle);
  const [lines, setLines] = useState<LogTailLine[]>([]);
  const [end, setEnd] = useState<LogTailEnd | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const sourceRef = useRef<EventSource | null>(null);

  const reconnect = useCallback(() => {
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !runId) {
      setStatus(LogTailStatusType.Idle);

      return;
    }
    // Reset per-connection state; if the caller wants to keep prior lines
    // they should retain them in their own store keyed by `Id`.
    setLines([]);
    setEnd(null);
    setErrorMessage(null);
    setStatus(LogTailStatusType.Connecting);

    const url = buildUrl({ runId, follow, sinceLine, maxLines });
    let isClosed = false;
    let es: EventSource;
    try {
      es = factory(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      ClientLogger.warn("[useSessionLogTail] factory threw", { runId, msg });
      setErrorMessage(msg);
      setStatus(LogTailStatusType.Error);

      return;
    }

    sourceRef.current = es;

    es.onopen = () => {
      if (isClosed) return;
      setStatus(LogTailStatusType.Open);
    };
    es.onmessage = (ev: MessageEvent<string>) => {
      if (isClosed) return;
      setLines((prev) => [...prev, { Id: ev.lastEventId, Data: ev.data }]);
    };
    es.addEventListener("end", (ev) => {
      if (isClosed) return;
      const raw = (ev as MessageEvent<string>).data ?? "";
      try {
        const parsed = JSON.parse(raw) as LogTailEnd;
        setEnd(parsed);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        ClientLogger.warn("[useSessionLogTail] end frame parse failed", {
          runId,
          raw: raw.slice(0, 200),
          msg,
        });
        setErrorMessage(`end frame parse failed: ${msg}`);
      } finally {
        setStatus(LogTailStatusType.Ended);
        isClosed = true;
        es.close();
      }
    });
    es.addEventListener("error", (ev) => {
      if (isClosed) return;
      // SSE-transport error: EventSource dispatches a bare `error` when
      // the stream cannot open / reconnects. Also fired by BE if it
      // emits a named `error` frame from the tail generator.
      const raw = (ev as MessageEvent<string>).data ?? "";
      ClientLogger.warn("[useSessionLogTail] stream error", {
        runId,
        readyState: es.readyState,
        payloadPreview: raw.slice(0, 200),
      });
      setErrorMessage(raw || "SSE transport error");
      setStatus(LogTailStatusType.Error);
      isClosed = true;
      es.close();
    });

    return () => {
      isClosed = true;
      es.close();
      sourceRef.current = null;
    };
  }, [runId, follow, sinceLine, maxLines, enabled, factory, nonce]);

  return { status, lines, end, errorMessage, reconnect };
}
