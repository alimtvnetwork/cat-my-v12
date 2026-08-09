// Plan 79 step 27/28. Invariants for the tools tooltip map.

import { describe, it, expect } from "vitest";
import { TOOL_ORDER, TOOL_TOOLTIPS } from "../toolTooltipMap";

describe("tools tooltip map", () => {
  it("has an entry for every ordered tool with title, hotkey, body, steps, and when-to-use", () => {
    for (const id of TOOL_ORDER) {
      const tip = TOOL_TOOLTIPS[id];
      expect(tip, `missing tooltip for ${id}`).toBeDefined();
      expect(tip.title.length).toBeGreaterThan(0);
      expect(tip.body.length).toBeGreaterThan(0);
      // Single lowercase key; the palette pins single-character hotkeys.
      expect(tip.hotkey).toMatch(/^[a-z]$/);
      // Rich content requirements introduced in Plan 79 step 28.
      expect(tip.steps.length).toBeGreaterThan(0);
      for (const step of tip.steps) expect(step.length).toBeGreaterThan(0);
      expect(tip.whenToUse.length).toBeGreaterThan(0);
      if (tip.tips) {
        expect(tip.tips.length).toBeGreaterThan(0);
        for (const t of tip.tips) expect(t.length).toBeGreaterThan(0);
      }
    }
  });

  it("assigns unique hotkeys across all tools", () => {
    const keys = TOOL_ORDER.map((id) => TOOL_TOOLTIPS[id].hotkey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("marks shape tools and the grouped text slot as long-press flyout hosts", () => {
    const withFlyout = TOOL_ORDER.filter((id) => TOOL_TOOLTIPS[id].hasFlyout);
    expect(withFlyout.sort()).toEqual(["circle", "polygon", "rectangle", "textTools"]);
  });

  it("gives every flyout tool at least two variants with unique ids and non-empty copy", () => {
    for (const id of TOOL_ORDER) {
      const tip = TOOL_TOOLTIPS[id];
      if (!tip.hasFlyout) {
        expect(tip.variants).toBeUndefined();
        continue;
      }
      expect(tip.variants, `${id} must have variants`).toBeDefined();
      const variants = tip.variants!;
      expect(variants.length).toBeGreaterThanOrEqual(2);
      const ids = variants.map((v) => v.id);
      expect(new Set(ids).size, `${id} variant ids must be unique`).toBe(ids.length);
      for (const v of variants) {
        expect(v.id.startsWith(`${id}.`)).toBe(true);
        expect(v.label.length).toBeGreaterThan(0);
        expect(v.description.length).toBeGreaterThan(0);
      }
    }
  });
});
