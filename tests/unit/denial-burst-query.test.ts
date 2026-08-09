// Plan 51 slice-1: percentile helper unit tests.
import { describe, expect, it } from "vitest";
import { computeBurstPercentiles } from "@/lib/denial-burst-query";

describe("computeBurstPercentiles", () => {
  it("returns zero percentiles on empty input", () => {
    const out = computeBurstPercentiles([]);
    expect(out).toHaveLength(3);
    for (const w of out) {
      expect(w.buckets).toBe(0);
      expect(w.p50).toBe(0);
      expect(w.p95).toBe(0);
      expect(w.p99).toBe(0);
    }
  });

  it("computes per-window bucket counts", () => {
    const t0 = 1_750_000_000_000;
    const rows = [
      { ts: new Date(t0).toISOString() },
      { ts: new Date(t0 + 10_000).toISOString() }, // same 1m bucket
      { ts: new Date(t0 + 65_000).toISOString() }, // next 1m bucket
      { ts: new Date(t0 + 130_000).toISOString() }, // 3rd 1m bucket
    ];
    const out = computeBurstPercentiles(rows);
    const w1m = out.find((w) => w.windowSeconds === 60)!;
    expect(w1m.buckets).toBe(3);
    // sorted counts: [1, 1, 2]; p95 with floor((0.95)*3)=2 -> index 2 -> 2
    expect(w1m.p95).toBe(2);
    const w15m = out.find((w) => w.windowSeconds === 900)!;
    expect(w15m.buckets).toBe(1);
  });

  it("skips rows with invalid ts", () => {
    const out = computeBurstPercentiles([{ ts: "not-a-date" }, { ts: "" }]);
    for (const w of out) expect(w.buckets).toBe(0);
  });
});
