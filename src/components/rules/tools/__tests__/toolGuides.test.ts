// Invariants for the per-tool extended guides shown by ToolGuideDialog.

import { describe, it, expect } from "vitest";
import { TOOL_ORDER } from "../toolTooltipMap";
import { TOOL_GUIDES } from "../toolGuides";

describe("tool guides", () => {
  it("has an entry for every ordered tool", () => {
    for (const id of TOOL_ORDER) {
      expect(TOOL_GUIDES[id], `missing guide for ${id}`).toBeDefined();
    }
  });

  it("gives each guide a non-empty summary and at least one section", () => {
    for (const id of TOOL_ORDER) {
      const g = TOOL_GUIDES[id];
      expect(g.summary.length).toBeGreaterThan(20);
      expect(g.sections.length).toBeGreaterThanOrEqual(2);
      for (const s of g.sections) {
        expect(s.heading.length).toBeGreaterThan(0);
        const hasBody =
          (s.paragraphs && s.paragraphs.length > 0) || (s.bullets && s.bullets.length > 0);
        expect(hasBody, `section "${s.heading}" in ${id} needs body`).toBe(true);
        for (const p of s.paragraphs ?? []) expect(p.length).toBeGreaterThan(0);
        for (const b of s.bullets ?? []) expect(b.length).toBeGreaterThan(0);
      }
    }
  });

  it("covers every flyout variant group in its guide bullets", () => {
    for (const id of ["rectangle", "circle", "polygon", "textTools"] as const) {
      const g = TOOL_GUIDES[id];
      const variantSection = g.sections.find((s) => /variant|flyout/i.test(s.heading));
      expect(variantSection, `${id} guide should have a Variants section`).toBeDefined();
      expect(variantSection!.bullets && variantSection!.bullets.length).toBeGreaterThanOrEqual(2);
    }
  });
});
