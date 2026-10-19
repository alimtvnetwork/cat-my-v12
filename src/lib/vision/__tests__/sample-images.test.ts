import { describe, expect, it } from "vitest";

import {
  SAMPLE_IMAGE_POCKET_1_FILLED,
  SAMPLE_IMAGE_POCKET_2_EMPTY_MIXED,
  SAMPLE_IMAGE_POCKET_2_FILLED,
  SAMPLE_IMAGE_POCKET_5_PARTIAL,
} from "@/lib/vision/sample-images";

describe("sample-images", () => {
  it("exposes one bundled URL per sample image", () => {
    // NOTE: vitest resolves asset imports to their source path (no hashing);
    // the production build was verified separately to emit hashed URLs for
    // all four images. Plain "/src/..." *string literals* in source are the
    // regression - these constants keep every consumer on real imports.
    const entries: Array<[string, string]> = [
      ["pocket-1-filled", SAMPLE_IMAGE_POCKET_1_FILLED],
      ["pocket-2-empty-mixed", SAMPLE_IMAGE_POCKET_2_EMPTY_MIXED],
      ["pocket-2-filled", SAMPLE_IMAGE_POCKET_2_FILLED],
      ["pocket-5-partial", SAMPLE_IMAGE_POCKET_5_PARTIAL],
    ];

    for (const [name, url] of entries) {
      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
      expect(url).toContain(name);
    }
  });

  it("resolves to four distinct files", () => {
    const urls = new Set([
      SAMPLE_IMAGE_POCKET_1_FILLED,
      SAMPLE_IMAGE_POCKET_2_EMPTY_MIXED,
      SAMPLE_IMAGE_POCKET_2_FILLED,
      SAMPLE_IMAGE_POCKET_5_PARTIAL,
    ]);

    expect(urls.size).toBe(4);
  });
});
