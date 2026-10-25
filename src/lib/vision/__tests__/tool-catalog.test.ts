import { describe, it, expect } from "vitest";
import {
  VISION_TOOL_CATALOG,
  InspectionCategoryType,
  getVisionToolsByCategory,
  getVisionToolDisplayName,
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

  it("marks every tool except Pin 1 and Greyscale with a * prefix", () => {
    const implemented = new Set(["T102", "T105"]);

    for (const tool of VISION_TOOL_CATALOG) {
      if (implemented.has(tool.code)) {
        expect(getVisionToolDisplayName(tool)).toBe(tool.name);
      } else {
        expect(getVisionToolDisplayName(tool)).toBe(`* ${tool.name}`);
      }
    }

    expect(getVisionToolDisplayName(findVisionTool("T102")!)).toBe("Greyscale Pattern Matching");
    expect(getVisionToolDisplayName(findVisionTool("T105")!)).toBe("Pin 1 Orientation Config");
    expect(getVisionToolDisplayName(findVisionTool("T101")!)).toBe("* Area Gate (Pixel Intensity)");
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
