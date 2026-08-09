// Plan 86 Step 27: default registry integration test.
//
// Ratchet: `defaultDomainRegistry` covers every SEED_WRITE_ORDER slice, and
// `runSeedV2` against `bundle.v2.json` produces zero `skipped-no-facade`
// results. If a future edit drops a slice from the registry, this fails.
import { describe, expect, it, beforeEach } from "vitest";
import { defaultDomainRegistry } from "../registry";
import { runSeedV2, __resetSeedV2, SEED_WRITE_ORDER } from "@/lib/seed/orchestrator-v2";
import bundleV2 from "@/lib/seed/data/bundle.v2.json";

beforeEach(() => __resetSeedV2());

describe("defaultDomainRegistry", () => {
  it("covers every slice in SEED_WRITE_ORDER", () => {
    for (const slice of SEED_WRITE_ORDER) {
      expect(defaultDomainRegistry[slice], `missing facade for slice: ${slice}`).toBeDefined();
    }
  });

  it("runSeedV2 against the real bundle produces no skipped-no-facade results", async () => {
    const report = await runSeedV2({
      bundle: bundleV2,
      registry: defaultDomainRegistry,
      profileId: "prof-default-pcb",
      logger: { info: () => {}, warn: () => {} },
    });
    expect(report.ok).toBe(true);
    const skipped = report.results.filter((r) => r.status === "skipped-no-facade");
    expect(skipped, `unexpected skipped slices: ${skipped.map((s) => s.slice).join(",")}`).toEqual(
      [],
    );
  });

  it("second run through the shared registry is idempotent per slice", async () => {
    const opts = {
      bundle: bundleV2,
      registry: defaultDomainRegistry,
      profileId: "prof-default-pcb",
      logger: { info: () => {}, warn: () => {} },
    } as const;
    await runSeedV2(opts);
    __resetSeedV2();
    const second = await runSeedV2(opts);
    for (const r of second.results) {
      if (r.status === "written") {
        expect(r.upsert?.created ?? 0).toBe(0);
      }
    }
  });
});
