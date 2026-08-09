// Plan 75 step 11 (Issue 11): registry defaults contract.
//
// Root cause the earlier fix targeted: layers and properties entries had
// no `defaultFloatSize`, so tearing them out landed on the generic
// 320x240 chrome with a large blank area. This test locks the new
// float sizes and confirms both panels still register with `right` as
// the default dock so the Photoshop-style split stays predictable.
import { describe, expect, it } from "vitest";
import { getPanel, PANELS } from "../panel-registry";

describe("workspace panel-registry (Plan 75 step 11)", () => {
  it("exposes a defaultFloatSize for the layers panel", () => {
    const p = getPanel("layers");
    expect(p).toBeDefined();
    expect(p?.defaultFloatSize).toEqual({ width: 300, height: 420 });
    expect(p?.defaultDock).toBe("right");
  });

  it("exposes a taller defaultFloatSize for the properties (inspector) panel", () => {
    const p = getPanel("properties");
    expect(p).toBeDefined();
    expect(p?.defaultFloatSize).toEqual({ width: 420, height: 380 });
    expect(p?.defaultDock).toBe("right");
  });

  it("keeps layers and properties as distinct registry entries", () => {
    const ids = PANELS.map((p) => p.id);
    expect(ids).toContain("layers");
    expect(ids).toContain("properties");
    expect(ids.filter((id) => id === "layers" || id === "properties")).toHaveLength(2);
  });
});
