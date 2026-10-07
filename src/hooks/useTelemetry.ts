import { useEffect, useState, useCallback } from "react";
import { fetchBackend } from "@/lib/backend/http";
import { HttpMethod } from "@/lib/constants";

export interface TelemetrySummaryData {
  total: number;
  ok: number;
  ng: number;
  yieldPct: number;
  avgDurationMs: number;
  status: string;
}

export interface TelemetryHistoryItem {
  runSessionId: number;
  runId: string;
  verdict: string;
  is_pass: boolean;
  imageFilePath: string;
  persistedAt: number;
  score: number;
  durationMs: number;
  ruleKind: string;
  reason: string;
}

export interface UseTelemetryOptions {
  pollingIntervalMs?: number;
  isPollingEnabled?: boolean;
}

const DEFAULT_SUMMARY: TelemetrySummaryData = {
  total: 0,
  ok: 0,
  ng: 0,
  yieldPct: 100.0,
  avgDurationMs: 15.0,
  status: "idle",
};

export function useTelemetrySummary(options?: UseTelemetryOptions) {
  const [summary, setSummary] = useState<TelemetrySummaryData>(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isPolling = options?.isPollingEnabled ?? true;
  const intervalMs = options?.pollingIntervalMs ?? 3000;

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetchBackend<TelemetrySummaryData>("telemetry/summary", {
        method: HttpMethod.Get,
        headers: { "X-Suppress-Toast": "true" },
      });

      if (res.Results && res.Results.length > 0) {
        setSummary(res.Results[0]);
      }
    } catch {
      // Graceful fallback to default
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();

    if (!isPolling) {
      return;
    }

    const timer = setInterval(fetchSummary, intervalMs);

    return () => clearInterval(timer);
  }, [fetchSummary, isPolling, intervalMs]);

  return { summary, isLoading, refetch: fetchSummary };
}

export function useTelemetryHistory(limit: number = 50, options?: UseTelemetryOptions) {
  const [history, setHistory] = useState<TelemetryHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isPolling = options?.isPollingEnabled ?? true;
  const intervalMs = options?.pollingIntervalMs ?? 3000;

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetchBackend<TelemetryHistoryItem>(`telemetry/history?limit=${limit}`, {
        method: HttpMethod.Get,
        headers: { "X-Suppress-Toast": "true" },
      });

      if (res.Results) {
        setHistory(res.Results);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchHistory();

    if (!isPolling) {
      return;
    }

    const timer = setInterval(fetchHistory, intervalMs);

    return () => clearInterval(timer);
  }, [fetchHistory, isPolling, intervalMs]);

  return { history, isLoading, refetch: fetchHistory };
}
