import { describe, it, expect, vi } from "vitest";
import { dryRunSeedV2 } from "../dry-run-v2";
import bundle from "../data/bundle.v2.json";

const makeLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

describe("dryRunSeedV2", () => {
  it("returns ok=true for the shipped bundle without touching any facade", () => {
    const logger = makeLogger();
    const report = dryRunSeedV2({
      bundle,
      profileId: "prof-default-pcb",
      logger,
      now: () => 0,
    });
    expect(report.ok).toBe(true);
    expect(report.fatalError).toBeUndefined();
    expect(report.results.length).toBeGreaterThan(0);
    for (const r of report.results) {
      expect(r.candidateRows).toBeLessThanOrEqual(r.totalRows);
    }
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
  });

  it("surfaces validation failures with structured issue list and error logs, without writing", () => {
    const logger = makeLogger();
    const broken = {
      ...(bundle as object),
      samples: [{ id: "smp-nope", projectId: "proj-does-not-exist" }],
    };
    const report = dryRunSeedV2({
      bundle: broken,
      profileId: "prof-default-pcb",
      logger,
    });
    expect(report.ok).toBe(false);
    expect(report.fatalError).toBeDefined();
    expect(report.fatalError?.issues?.length).toBeGreaterThan(0);
    expect(
      report.fatalError?.issues?.some(
        (i) => i.path === "samples[0].projectId" && i.kind === "reference",
      ),
    ).toBe(true);
    expect(logger.error).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
    expect(report.results).toEqual([]);
  });

  it("surfaces duplicate id integrity issues via fatalError.issues", () => {
    const logger = makeLogger();
    const b = JSON.parse(JSON.stringify(bundle)) as {
      rules: Array<Record<string, unknown> & { id: string }>;
    };
    b.rules.push({ ...b.rules[0] });
    const report = dryRunSeedV2({
      bundle: b,
      profileId: "prof-default-pcb",
      logger,
    });
    expect(report.ok).toBe(false);
    expect(
      report.fatalError?.issues?.some(
        (i) => i.kind === "integrity" && i.message.startsWith("duplicate id"),
      ),
    ).toBe(true);
  });

  it("filters candidate rows per profile using the same rule as the orchestrator", () => {
    const known = dryRunSeedV2({
      bundle,
      profileId: "prof-default-pcb",
      logger: makeLogger(),
    });
    const unknown = dryRunSeedV2({
      bundle,
      profileId: "prof-nonexistent-xyz",
      logger: makeLogger(),
    });
    const knownProjects = known.results.find((r) => r.slice === "projects");
    const unknownProjects = unknown.results.find((r) => r.slice === "projects");
    expect(knownProjects?.candidateRows).toBeGreaterThan(0);
    expect(unknownProjects?.candidateRows).toBe(0);
    // master-data (no profileId on rows) passes through in both cases
    const knownSamples = known.results.find((r) => r.slice === "samples");
    const unknownSamples = unknown.results.find((r) => r.slice === "samples");
    expect(knownSamples?.candidateRows).toBe(knownSamples?.totalRows);
    expect(unknownSamples?.candidateRows).toBe(unknownSamples?.totalRows);
  });

  it("per-slice results are ordered by SEED_WRITE_ORDER", () => {
    const report = dryRunSeedV2({
      bundle,
      profileId: "prof-default-pcb",
      logger: makeLogger(),
    });
    const slices = report.results.map((r) => r.slice);
    expect(slices[0]).toBe("categories");
    expect(slices[slices.length - 1]).toBe("errorScenarios");
    expect(slices).toContain("rules");
  });
});
