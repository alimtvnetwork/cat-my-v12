// Plan 86 Step 26: prove `runSeedV2` writes the categories slice
// end-to-end via the shared `defaultDomainRegistry`. Also proves the
// singleton is reusable across runs (idempotency) and profile-scoped
// resets.
import { describe, expect, it, beforeEach } from "vitest";
import { runSeedV2, __resetSeedV2 } from "@/lib/seed/orchestrator-v2";
import { defaultDomainRegistry } from "../registry";
import { categoriesFacade } from "../categories-facade";
import bundleV2 from "@/lib/seed/data/bundle.v2.json";

async function clearCategories() {
  // Explicit teardown: memory facade is a module singleton, so tests must
  // reset it between runs or state leaks. Uses only the facade's public
  // surface (no reaching into internals).
  const all = await categoriesFacade.list();
  for (const row of all) await categoriesFacade.remove(row.id);
}

beforeEach(async () => {
  __resetSeedV2();
  await clearCategories();
});

describe("categoriesFacade + defaultDomainRegistry via runSeedV2", () => {
  it("writes every bundle category row for the default profile", async () => {
    const report = await runSeedV2({
      bundle: bundleV2,
      registry: defaultDomainRegistry,
      profileId: "prof-default-pcb",
      logger: { info: () => {}, warn: () => {} },
    });
    const catResult = report.results.find((r) => r.slice === "categories");
    expect(catResult?.status).toBe("written");
    expect(catResult?.upsert?.created).toBeGreaterThan(0);

    const rows = await categoriesFacade.list();
    // Bundle categories are master-data (no profileId), so `list()` with
    // no filter returns every seeded row. Every id must start with `cat-`.
    expect(rows.length).toBe(catResult?.upsert?.created);
    for (const r of rows) expect(r.id.startsWith("cat-")).toBe(true);
  });

  it("second run creates zero new rows (idempotent)", async () => {
    const opts = {
      bundle: bundleV2,
      registry: defaultDomainRegistry,
      profileId: "prof-default-pcb",
      logger: { info: () => {}, warn: () => {} },
    } as const;
    await runSeedV2(opts);
    __resetSeedV2();
    const second = await runSeedV2(opts);
    const cats = second.results.find((r) => r.slice === "categories");
    expect(cats?.upsert?.created).toBe(0);
    expect((cats?.upsert?.updated ?? 0) + (cats?.upsert?.skipped ?? 0)).toBeGreaterThan(0);
  });

  it("resetProfile removes seeded rows for that profile only", async () => {
    await runSeedV2({
      bundle: bundleV2,
      registry: defaultDomainRegistry,
      profileId: "prof-default-pcb",
      logger: { info: () => {}, warn: () => {} },
    });
    const before = (await categoriesFacade.list()).length;
    const { removed } = await categoriesFacade.resetProfile("prof-default-pcb");
    const after = (await categoriesFacade.list()).length;
    expect(removed).toBe(before);
    expect(after).toBe(0);
  });
});
