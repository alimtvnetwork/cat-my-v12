import { FatalReseedModeType } from "@/lib/seed/telemetry-store";
import { FatalReseedCauseType } from "@/lib/seed/telemetry-store";
import { SeederStatusType } from "@/lib/seed/orchestrator";
import { SeederNameType } from "@/lib/seed/orchestrator";
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetSeedOrchestrator,
  resetSeedFlags,
  runAllSeeders,
  SEED_FLAG_KEYS,
  type SeedOrchestratorAdapters,
} from "../orchestrator";
import { logFatalReseed, useSeedTelemetryStore } from "../telemetry-store";
import { useErrorStore, __resetErrorStoreForTest } from "@/lib/errors/errorStore";

function makeAdapters(overrides: Partial<SeedOrchestratorAdapters> = {}): SeedOrchestratorAdapters {
  return {
    seedRules: vi.fn(async () => 2),
    seedProjects: vi.fn(() => ({ createdProjectIds: ["p1"] })),
    seedCameras: vi.fn(() => undefined),
    seedMicSettings: vi.fn(async () => undefined),
    seedImageSamples: vi.fn(async () => undefined),
    seedBindings: vi.fn(async () => 0),
    ...overrides,
  };
}

beforeEach(() => {
  useSeedTelemetryStore.getState().__reset();
  __resetErrorStoreForTest();
  for (const k of SEED_FLAG_KEYS) window.localStorage.setItem(k, "1");
});

afterEach(() => {
  __resetSeedOrchestrator();
  for (const k of SEED_FLAG_KEYS) window.localStorage.removeItem(k);
});

describe("seed telemetry", () => {
  it("publishes the last report and appends to history", async () => {
    await runAllSeeders({ projects: [], adapters: makeAdapters() });
    const state = useSeedTelemetryStore.getState();
    expect(state.lastReport?.ok).toBe(true);
    expect(state.history).toHaveLength(1);
  });

  it("captures errored seeders into the Global Error store", async () => {
    const adapters = makeAdapters({
      seedRules: vi.fn(async () => {
        throw new Error("boom");
      }),
    });
    await runAllSeeders({ projects: [], adapters });
    const errors = useErrorStore.getState().history;
    expect(errors[0]?.code).toBe("E_SEED_FAILURE");
    expect(errors[0]?.message).toContain("boom");
  });
});

describe("logFatalReseed", () => {
  it("emits a fatal event, increments counters, and captures E_SEED_FATAL", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const event = logFatalReseed({
      mode: FatalReseedModeType.Reset,
      cause: FatalReseedCauseType.OrchestratorThrow,
      report: {
        ok: false,
        totalMs: 42,
        results: [
          {
            name: SeederNameType.Rules,
            status: SeederStatusType.Error,
            count: null,
            durationMs: 10,
            error: { message: "boom" },
          },
          {
            name: SeederNameType.Projects,
            status: SeederStatusType.Seeded,
            count: 3,
            durationMs: 5,
          },
        ],
        fatalError: { message: "orchestrator threw" },
      },
      error: { message: "orchestrator threw", name: "SeedFatal" },
    });

    expect(event.mode).toBe("reset");
    expect(event.cause).toBe("orchestrator-throw");
    expect(event.failedSeeders).toEqual(["rules"]);
    expect(event.totalMs).toBe(42);
    expect(event.correlationId).toBeDefined();

    const state = useSeedTelemetryStore.getState();
    expect(state.fatalHistory).toHaveLength(1);
    expect(state.fatalCounters.total).toBe(1);
    expect(state.fatalCounters.byMode.reset).toBe(1);
    expect(state.fatalCounters.byCause["orchestrator-throw"]).toBe(1);
    expect(state.fatalCounters.bySeeder.rules).toBe(1);

    const captured = useErrorStore.getState().history[0];
    expect(captured?.code).toBe("E_SEED_FATAL");
    expect(captured?.correlationId).toBe(event.correlationId);

    expect(warn).toHaveBeenCalledWith(
      "[seed/telemetry] fatal",
      expect.objectContaining({ cause: "orchestrator-throw", mode: "reset" }),
    );
    warn.mockRestore();
  });

  it("tallies fatal events by cause and seeder across runs", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    logFatalReseed({
      mode: FatalReseedModeType.Auto,
      cause: FatalReseedCauseType.SeederError,
      report: {
        ok: false,
        totalMs: 8,
        results: [
          {
            name: SeederNameType.ImageSamples,
            status: SeederStatusType.Error,
            count: null,
            durationMs: 3,
            error: { message: "idb closed" },
          },
        ],
      },
      error: { message: "image-samples: idb closed" },
    });
    logFatalReseed({
      mode: FatalReseedModeType.Reset,
      cause: FatalReseedCauseType.ResetFlags,
      error: { message: "quota" },
    });
    const c = useSeedTelemetryStore.getState().fatalCounters;
    expect(c.total).toBe(2);
    expect(c.byMode).toEqual({ auto: 1, reset: 1 });
    expect(c.byCause["seeder-error"]).toBe(1);
    expect(c.byCause["reset-flags"]).toBe(1);
    expect(c.bySeeder["image-samples"]).toBe(1);
    warn.mockRestore();
  });
});

describe("resetSeedFlags", () => {
  it("clears every known autoseed localStorage flag", () => {
    for (const k of SEED_FLAG_KEYS) window.localStorage.setItem(k, "1");
    const result = resetSeedFlags({ info: vi.fn(), warn: vi.fn() });
    expect(result.hadStorage).toBe(true);
    expect(result.failed).toEqual([]);
    expect([...result.cleared]).toEqual([...SEED_FLAG_KEYS]);
    for (const k of SEED_FLAG_KEYS) {
      expect(window.localStorage.getItem(k)).toBeNull();
    }
  });

  it("reports per-key failures without throwing", () => {
    const warn = vi.fn();
    const original = window.localStorage.removeItem.bind(window.localStorage);
    const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation((key: string) => {
      if (key === SEED_FLAG_KEYS[0]) throw new Error("quota");

      return original(key);
    });
    const result = resetSeedFlags({ info: vi.fn(), warn });
    expect(result.hadStorage).toBe(true);
    expect(result.failed).toEqual([{ key: SEED_FLAG_KEYS[0], message: "quota" }]);
    expect(result.cleared).toEqual(SEED_FLAG_KEYS.slice(1));
    expect(warn).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("returns hadStorage=false when accessing window.localStorage throws", () => {
    const warn = vi.fn();
    const spy = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const result = resetSeedFlags({ info: vi.fn(), warn });
    expect(result.hadStorage).toBe(false);
    expect(result.cleared).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(warn).toHaveBeenCalled();
    spy.mockRestore();
  });
});