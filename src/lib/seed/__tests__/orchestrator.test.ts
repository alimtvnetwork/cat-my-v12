import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetSeedOrchestrator,
  runAllSeeders,
  type SeedOrchestratorAdapters,
} from "../orchestrator";

function makeAdapters(overrides: Partial<SeedOrchestratorAdapters> = {}): SeedOrchestratorAdapters {
  return {
    seedRules: vi.fn(async () => 3),
    seedProjects: vi.fn(() => ({ createdProjectIds: ["p1", "p2"] })),
    seedCameras: vi.fn(() => undefined),
    seedMicSettings: vi.fn(async () => undefined),
    seedImageSamples: vi.fn(async () => undefined),
    seedBindings: vi.fn(async () => 0),
    ...overrides,
  };
}

function makeLogger() {
  return { info: vi.fn(), warn: vi.fn() };
}

afterEach(() => {
  __resetSeedOrchestrator();
});

describe("runAllSeeders", () => {
  it("aggregates every seeder into one report with counts and timings", async () => {
    const adapters = makeAdapters();
    const logger = makeLogger();
    let t = 0;
    const now = () => (t += 5);

    const report = await runAllSeeders({
      projects: [],
      adapters,
      now,
      logger,
    });

    expect(report.ok).toBe(true);
    expect(report.results.map((r) => r.name)).toEqual([
      "rules",
      "projects",
      "cameras",
      "mic-settings",
      "image-samples",
      "bindings",
    ]);
    expect(report.results[0]).toMatchObject({ status: "seeded", count: 3 });
    expect(report.results[1]).toMatchObject({ status: "seeded", count: 2 });
    // Every result carries a non-negative duration.
    for (const r of report.results) {
      expect(r.durationMs).toBeGreaterThanOrEqual(0);
    }
    expect(logger.info).toHaveBeenCalledWith(
      "[seed/orchestrator] report",
      expect.objectContaining({ ok: true }),
    );
  });

  it("isolates a failing seeder so downstream seeders still run", async () => {
    const boom = new Error("indexeddb unavailable");
    const adapters = makeAdapters({
      seedCameras: vi.fn(() => {
        throw boom;
      }),
    });
    const logger = makeLogger();

    const report = await runAllSeeders({
      projects: [],
      adapters,
      logger,
    });

    expect(report.ok).toBe(false);
    const cameras = report.results.find((r) => r.name === "cameras");
    expect(cameras?.status).toBe("error");
    expect(cameras?.error?.message).toBe("indexeddb unavailable");
    // Downstream seeders still executed.
    expect(adapters.seedMicSettings).toHaveBeenCalledTimes(1);
    expect(adapters.seedImageSamples).toHaveBeenCalledTimes(1);
    expect(adapters.seedBindings).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith("[seed/orchestrator] cameras failed", boom);
  });

  it("single-flights concurrent invocations", async () => {
    const adapters = makeAdapters();
    const a = runAllSeeders({ projects: [], adapters, logger: makeLogger() });
    const b = runAllSeeders({ projects: [], adapters, logger: makeLogger() });
    expect(a).toBe(b);
    await a;
    // Each seeder should have run exactly once despite two callers.
    expect(adapters.seedRules).toHaveBeenCalledTimes(1);
    expect(adapters.seedProjects).toHaveBeenCalledTimes(1);
    expect(adapters.seedCameras).toHaveBeenCalledTimes(1);
    expect(adapters.seedMicSettings).toHaveBeenCalledTimes(1);
    expect(adapters.seedImageSamples).toHaveBeenCalledTimes(1);
    expect(adapters.seedBindings).toHaveBeenCalledTimes(1);
  });

  it("reports a skipped project seeder when no rows were inserted", async () => {
    const adapters = makeAdapters({
      seedProjects: vi.fn(() => null),
    });
    const report = await runAllSeeders({
      projects: [],
      adapters,
      logger: makeLogger(),
    });
    const projects = report.results.find((r) => r.name === "projects");
    expect(projects).toMatchObject({ status: "skipped", count: 0 });
  });

  it("captures a fatal orchestrator error on the report", async () => {
    // Simulate a catastrophic failure by forcing `Promise.all` to reject
    // with a non-Error via a rejected mic-settings adapter that runs in
    // parallel with cameras/samples.
    const adapters = makeAdapters({
      seedMicSettings: vi.fn(() => {
        return Promise.reject("string-thrown");
      }),
    });
    const logger = makeLogger();
    const report = await runAllSeeders({
      projects: [],
      adapters,
      logger,
    });
    // Per-seeder guard converts the rejection into an error result,
    // so the report is not fatal but still `ok === false`.
    expect(report.ok).toBe(false);
    const mic = report.results.find((r) => r.name === "mic-settings");
    expect(mic?.status).toBe("error");
    expect(mic?.error?.message).toBe("string-thrown");
  });
});
