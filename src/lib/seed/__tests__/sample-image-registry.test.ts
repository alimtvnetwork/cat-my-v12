// Plan 85 Step 4: sample image registry overlay
import { describe, it, expect } from "vitest";
import { resolveSampleImageUrl, SAMPLE_IMAGE_URLS } from "@/lib/seed/sample-image-registry";

describe("sample-image-registry", () => {
  it("resolves seeded samples to uploaded pocket image URLs", () => {
    expect(resolveSampleImageUrl("smp-pcb-refdes-01")).toMatch(/pocket-.*\.jpg/);
    expect(resolveSampleImageUrl("smp-blister-pill-01")).toMatch(/pocket-.*\.jpg/);
    expect(resolveSampleImageUrl("smp-connector-barcode-01")).toMatch(/pocket-.*\.jpg/);
  });

  it("returns null for unknown sample ids", () => {
    expect(resolveSampleImageUrl("smp-does-not-exist")).toBeNull();
  });

  it("covers every seeded sample id from bundle.v2.json samples slice", async () => {
    const bundle = (await import("@/lib/seed/data/bundle.v2.json")).default as {
      samples: Array<{ id: string }>;
    };
    const bundleIds = new Set(bundle.samples.map((s) => s.id));
    const covered = Object.keys(SAMPLE_IMAGE_URLS);
    for (const id of covered) expect(bundleIds.has(id)).toBe(true);
    for (const id of bundleIds)
      if (SAMPLE_IMAGE_URLS[id]) expect(SAMPLE_IMAGE_URLS[id]).toMatch(/pocket-.*\.jpg/);
  });
});
