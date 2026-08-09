/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { ZodError } from "zod";
import { EMPTY_CAT_SEED_BUNDLE, MemoryUiSeedFacade } from "../memory-facade";
import { UiSeedSourceType } from "../facade";
import type { CatSeedBundle } from "../types";

// Memory facade must honor the same UiSeedFacade contract as the JSON
// backing: validate on ingest, expose stable slice reads, never silently
// swallow bad data (spec/03-error-manage §3). Tests here mirror the JSON
// facade suite plus the memory-only subscribe/setBundle surface.

const SAMPLE_BUNDLE: CatSeedBundle = {
  ...EMPTY_CAT_SEED_BUNDLE,
  version: "1.0.0-test",
  categories: [{ name: "Label", description: "front label" }, { name: "Cap" }],
  toolPresets: [{ id: "t-rect", label: "Rect", toolId: "kind:R" }],
};

describe("MemoryUiSeedFacade", () => {
  it("reports source = 'memory' and loads the initial bundle", async () => {
    const facade = new MemoryUiSeedFacade(SAMPLE_BUNDLE);
    expect(facade.source).toBe(UiSeedSourceType.Memory);
    const bundle = await facade.load();
    expect(bundle.categories).toHaveLength(2);
    expect(bundle.version).toBe("1.0.0-test");
  });

  it("defaults to an empty (but valid) bundle when no seed is provided", async () => {
    const facade = new MemoryUiSeedFacade();
    const bundle = await facade.load();
    expect(bundle).toEqual(EMPTY_CAT_SEED_BUNDLE);
  });

  it("getSlice returns the requested slice from the parsed bundle", async () => {
    const facade = new MemoryUiSeedFacade(SAMPLE_BUNDLE);
    const cats = await facade.getSlice("categories");
    expect(cats).toEqual(SAMPLE_BUNDLE.categories);
    const presets = await facade.getSlice("toolPresets");
    expect(presets).toEqual(SAMPLE_BUNDLE.toolPresets);
  });

  it("rejects construction when the initial payload violates the schema", () => {
    // Same non-silent failure mode as JsonUiSeedFacade: bad data throws.
    expect(() => new MemoryUiSeedFacade({ version: 42 } as unknown)).toThrow(ZodError);
  });

  it("setBundle re-validates and rejects invalid payloads", () => {
    const facade = new MemoryUiSeedFacade(SAMPLE_BUNDLE);
    expect(() => facade.setBundle({ ...SAMPLE_BUNDLE, projects: "nope" } as unknown)).toThrow(
      ZodError,
    );
  });

  it("subscribe notifies listeners on setBundle and returns an unsubscribe", async () => {
    const facade = new MemoryUiSeedFacade(SAMPLE_BUNDLE);
    const listener = vi.fn();
    const off = facade.subscribe(listener);

    const next: CatSeedBundle = {
      ...SAMPLE_BUNDLE,
      categories: [{ name: "Fill Level" }],
    };
    facade.setBundle(next);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].categories).toEqual([{ name: "Fill Level" }]);
    expect(await facade.getSlice("categories")).toEqual([{ name: "Fill Level" }]);

    off();
    facade.setBundle(SAMPLE_BUNDLE);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
