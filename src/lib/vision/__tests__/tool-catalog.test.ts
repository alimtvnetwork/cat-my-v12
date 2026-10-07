import { describe, it, expect } from "vitest";
import {
  VISION_TOOL_CATALOG,
  InspectionCategoryType,
  getVisionToolsByCategory,
  findVisionTool,
} from "../tool-catalog";

describe("vision tool catalog", () => {
  it("contains tools for all 5 inspection categories", () => {
    const categories = Object.values(InspectionCategoryType);
    for (const cat of categories) {
      const tools = getVisionToolsByCategory(cat);
      expect(tools.length).toBeGreaterThan(0);
    }
  });

  it("finds tool by ID or code", () => {
    const t102 = findVisionTool("T102");
    expect(t102).toBeDefined();
    expect(t102?.name).toBe("Greyscale Pattern Matching");
    expect(t102?.defaultParamValues.minMatchPercent).toBe(80);
    expect(t102?.defaultParamValues.greyscaleLevel).toBe(170);

    const t109 = findVisionTool("T109");
    expect(t109).toBeDefined();
    expect(t109?.name).toContain("Binary Blob");
    expect(t109?.defaultParamValues.minDefectAreaPx).toBe(15);
  });

  it("every tool has valid optical defaults and parameters", () => {
    for (const tool of VISION_TOOL_CATALOG) {
      expect(tool.defaultExposureMs).toBeGreaterThan(0);
      expect(tool.defaultLightPct).toBeGreaterThan(0);
      expect(tool.defaultChannels.length).toBeGreaterThan(0);
      expect(tool.params.length).toBeGreaterThan(0);
      expect(tool.targetFeature.length).toBeGreaterThan(5);
    }
  });
});
