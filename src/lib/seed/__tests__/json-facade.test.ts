/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { JsonUiSeedFacade } from "../json-facade";
import { EMPTY_CAT_SEED_BUNDLE } from "../memory-facade";
import { UiSeedSourceType } from "../facade";
import { ZodError } from "zod";

describe("JsonUiSeedFacade (Plan 72 step 21)", () => {
  it("loads the default bundle.json payload and validates it", async () => {
    // Default loader imports src/lib/seed/data/bundle.json which step 17
    // already populated. If Zod validation drifts against types.ts this
    // load() rejects, so this test locks the shipped bundle to the schema.
    const facade = new JsonUiSeedFacade();
    const bundle = await facade.load();
    expect(facade.source).toBe(UiSeedSourceType.Json);
    expect(bundle.version).toMatch(/^\d/);
    expect(bundle.projects.length).toBeGreaterThan(0);
    expect(bundle.categories.length).toBeGreaterThan(0);
    expect(bundle.ruleTemplates.length).toBeGreaterThan(0);
    expect(bundle.toolPresets.length).toBeGreaterThan(0);
  });

  it("caches load() so a second call does not re-invoke the loader", async () => {
    const loader = vi.fn().mockResolvedValue(EMPTY_CAT_SEED_BUNDLE);
    const facade = new JsonUiSeedFacade(loader);
    await facade.load();
    await facade.load();
    await facade.getSlice("projects");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("getSlice returns the requested slice from the parsed bundle", async () => {
    const loader = vi.fn().mockResolvedValue({
      ...EMPTY_CAT_SEED_BUNDLE,
      categories: [{ name: "Label" }, { name: "Cap" }],
    });
    const facade = new JsonUiSeedFacade(loader);
    const cats = await facade.getSlice("categories");
    expect(cats).toEqual([{ name: "Label" }, { name: "Cap" }]);
  });

  it("rejects with ZodError when the payload violates the schema", async () => {
    // Non-silent failure per spec/03-error-manage §3: parse errors must
    // surface, never be swallowed into an empty bundle.
    const loader = vi.fn().mockResolvedValue({ version: 42 });
    const facade = new JsonUiSeedFacade(loader);
    await expect(facade.load()).rejects.toBeInstanceOf(ZodError);
  });

  it("propagates loader rejection unchanged (e.g. fetch failure)", async () => {
    const boom = new Error("fetch failed");
    const loader = vi.fn().mockRejectedValue(boom);
    const facade = new JsonUiSeedFacade(loader);
    await expect(facade.load()).rejects.toBe(boom);
  });
});
