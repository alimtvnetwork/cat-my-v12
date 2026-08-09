// Plan 51 slice: query-options helper for the denial-burst dashboard.
// Extracted so the route file, tests, and future nav previews can share the
// same key/serializer without duplication.

import { queryOptions } from "@tanstack/react-query";
import {
  getDenialBurstWindow,
  type GetDenialBurstWindowResult,
} from "@/lib/security-telemetry.functions";

export interface DenialBurstQueryInput {
  hours?: number;
}

export function denialBurstWindowQueryOptions(input: DenialBurstQueryInput = {}) {
  const hours = input.hours ?? 24;

  return queryOptions<GetDenialBurstWindowResult>({
    queryKey: ["denial-burst-window", hours],
    queryFn: () => getDenialBurstWindow({ data: { hours } }),
    staleTime: 30_000,
    retry: 1,
  });
}

// Percentile helper. Buckets counts into (1m, 5m, 15m) windows, then computes
// p50/p95/p99 over the per-bucket counts. Deterministic and pure so both the
// route and unit tests can call it.
export interface BucketPercentiles {
  windowSeconds: number;
  buckets: number;
  p50: number;
  p95: number;
  p99: number;
}

const WINDOW_SECONDS = [60, 300, 900] as const;

export function computeBurstPercentiles(rows: ReadonlyArray<{ ts: string }>): BucketPercentiles[] {
  return WINDOW_SECONDS.map((windowSeconds) => {
    const bucketCounts = new Map<number, number>();
    for (const row of rows) {
      const t = Date.parse(row.ts);

      if (Number.isFinite(t) === false) continue;
      const bucket = Math.floor(t / 1000 / windowSeconds);
      bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
    }

    const counts = Array.from(bucketCounts.values()).sort((a, b) => a - b);

    return {
      windowSeconds,
      buckets: counts.length,
      p50: percentile(counts, 0.5),
      p95: percentile(counts, 0.95),
      p99: percentile(counts, 0.99),
    };
  });
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));

  return sorted[idx];
}
