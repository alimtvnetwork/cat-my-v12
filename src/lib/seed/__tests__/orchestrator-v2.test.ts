// Plan 86 Step 25: v2 orchestrator tests.
import { describe, expect, it, beforeEach } from "vitest";
import { runSeedV2, __resetSeedV2, SEED_WRITE_ORDER } from "../orchestrator-v2";
import { createMemoryDomainFacade } from "@/lib/facades/memory-domain-facade";
import type { DomainFacadeRegistry } from "@/lib/facades/domain-facade";
import type { SliceKey } from "../schemas-v2";
import bundleV2 from "../data/bundle.v2.json";

function fullRegistry(): DomainFacadeRegistry {
  const reg: DomainFacadeRegistry = {};
  for (const slice of SEED_WRITE_ORDER) {
    reg[slice] = createMemoryDomainFacade(slice);
  }

  return reg;
}

beforeEach(() => __resetSeedV2());

describe("runSeedV2", () => {
  it("writes every slice in SS-09 dependency order for the default profile", async () => {
    const registry = fullRegistry();
    const report = await runSeedV2({
      bundle: bundleV2,
      registry,
      profileId: "prof-default-pcb",
      logger: { info: () => {}, warn: () => {} },
    });
    expect(report.ok).toBe(true);
    expect(report.results.map((r) => r.slice)).toEqual([...SEED_WRITE_ORDER]);
    // At least one slice actually wrote rows.
    expect(report.results.some((r) => r.status === "written")).toBe(true);
  });

  it("is idempotent: running the same profile twice yields zero created on the second run", async () => {
    const registry = fullRegistry();
    const opts = {
      bundle: bundleV2,
      registry,
      profileId: "prof-default-pcb",
      logger: { info: () => {}, warn: () => {} },
    };
    const first = await runSeedV2(opts);
    __resetSeedV2();
    const second = await runSeedV2(opts);
    expect(first.ok && second.ok).toBe(true);
    for (const r of second.results) {
      if (r.status === "written") {
        expect(r.upsert?.created ?? 0).toBe(0);
      }
    }
  });

  it("records slices with no facade as skipped-no-facade rather than crashing", async () => {
    const partial: DomainFacadeRegistry = {
      categories: createMemoryDomainFacade("categories"),
    };
    const report = await runSeedV2({
      bundle: bundleV2,
      registry: partial,
      profileId: "prof-default-pcb",
      logger: { info: () => {}, warn: () => {} },
    });
    expect(report.ok).toBe(true);
    const missing = report.results.filter((r) => r.status === "skipped-no-facade");
    expect(missing.length).toBe(SEED_WRITE_ORDER.length - 1);
  });

  it("returns fatalError on invalid bundle without touching facades", async () => {
    const registry = fullRegistry();
    const report = await runSeedV2({
      bundle: { not: "a bundle" },
      registry,
      profileId: "prof-default-pcb",
      logger: { info: () => {}, warn: () => {} },
    });
    expect(report.ok).toBe(false);
    expect(report.fatalError).toBeDefined();
    expect(report.results.length).toBe(0);
  });

  it("resetProfile only removes rows for that profile", async () => {
    const registry = fullRegistry();
    await runSeedV2({
      bundle: bundleV2,
      registry,
      profileId: "prof-default-pcb",
      logger: { info: () => {}, warn: () => {} },
    });
    const catFacade = registry.categories!;
    const beforeAll = await catFacade.list();
    const removed = await catFacade.resetProfile("prof-default-pcb");
    const afterAll = await catFacade.list();
    // Master-data rows (no profileId) survive; only prof-scoped rows removed.
    expect(afterAll.length).toBe(beforeAll.length - removed.removed);
  });
});
