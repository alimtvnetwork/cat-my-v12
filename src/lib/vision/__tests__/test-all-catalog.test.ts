import { describe, it } from "vitest";
import { loadWorkpieceImageData, evaluateWorkpieceRuleReal } from "../workpiece-rule-analyzer";
import { VISION_TOOL_CATALOG } from "../tool-catalog";
import { EditorRuleKindType, EditorToolFamilyType, type EditorRule } from "@/lib/editor/types";

describe("Catalog Rules on filled image", () => {
  it("evaluates a rule created from every tool in catalog on pocket-1-filled.jpg", async () => {
    const img = await loadWorkpieceImageData("src/assets/samples/pocket-1-filled.jpg");
    if (!img) return;

    for (const tool of VISION_TOOL_CATALOG) {
      // Simulate handleAddToProject when user adds tool
      let roi = { x: 180, y: 120, width: 220, height: 220 };
      if (tool.code === "T102" || tool.code === "T116" || tool.name.toLowerCase().includes("pattern")) {
        roi = { x: 100, y: 70, width: 760, height: 400 };
      } else if (tool.code === "T105" || tool.code === "T117" || tool.name.toLowerCase().includes("pin 1")) {
        roi = { x: 180, y: 140, width: 140, height: 140 };
      } else if (tool.code === "T118" || tool.name.toLowerCase().includes("defect")) {
        roi = { x: 200, y: 360, width: 480, height: 160 };
      } else if (tool.code === "T110" || tool.name.toLowerCase().includes("caliper")) {
        roi = { x: 180, y: 200, width: 280, height: 120 };
      }

      const rule: EditorRule = {
        id: `rule-${tool.code}`,
        name: `Rule: ${tool.name}`,
        kind: tool.kind ?? EditorRuleKindType.R,
        family: tool.family ?? EditorToolFamilyType.Rect,
        isHidden: false,
        isLocked: false,
        x: roi.x,
        y: roi.y,
        width: roi.width,
        height: roi.height,
        params: {
          toolCode: tool.code,
          category: tool.category,
          x: roi.x,
          y: roi.y,
          width: roi.width,
          height: roi.height,
          threshold: 170,
          tolerancePx: 8,
          activeBoxCount: 0,
          totalBoxCount: 0,
          constellationJson: "[]",
          ...tool.defaultParamValues,
          ...(tool.code === "T102" || tool.code === "T116" || tool.name.toLowerCase().includes("pattern")
            ? { minMatchPercent: 50 }
            : {}),
          ...(tool.code === "T105" || tool.code === "T117"
            ? {
                tolerancePx: 35,
                thresholdLuma: 75,
                pin1ConfigJson: JSON.stringify({
                  registeredPin1: { x: 230, y: 236, radius: 18, confidence: 1.0 },
                  tolerancePx: 35,
                  thresholdLuma: 75,
                }),
              }
            : {}),
        },
      };

      const res = evaluateWorkpieceRuleReal(rule, img);
      console.log(`Tool ${tool.code} (${tool.name}) on FILLED: status=${res.status}, msg=${res.message}`);
      if (res.status !== "pass") {
        throw new Error(`Tool ${tool.code} failed on filled image!`);
      }
    }
  });

  it("evaluates a rule created from every tool in catalog on pocket-2-empty-mixed.jpg (must fail)", async () => {
    const img = await loadWorkpieceImageData("src/assets/samples/pocket-2-empty-mixed.jpg");
    if (!img) return;

    for (const tool of VISION_TOOL_CATALOG) {
      let roi = { x: 180, y: 120, width: 220, height: 220 };
      if (tool.code === "T102" || tool.code === "T116" || tool.name.toLowerCase().includes("pattern")) {
        roi = { x: 100, y: 70, width: 760, height: 400 };
      } else if (tool.code === "T105" || tool.code === "T117" || tool.name.toLowerCase().includes("pin 1")) {
        roi = { x: 180, y: 140, width: 140, height: 140 };
      } else if (tool.code === "T118" || tool.name.toLowerCase().includes("defect")) {
        roi = { x: 200, y: 360, width: 480, height: 160 };
      } else if (tool.code === "T110" || tool.name.toLowerCase().includes("caliper")) {
        roi = { x: 180, y: 200, width: 280, height: 120 };
      }

      const rule: EditorRule = {
        id: `rule-${tool.code}`,
        name: `Rule: ${tool.name}`,
        kind: tool.kind ?? EditorRuleKindType.R,
        family: tool.family ?? EditorToolFamilyType.Rect,
        isHidden: false,
        isLocked: false,
        x: roi.x,
        y: roi.y,
        width: roi.width,
        height: roi.height,
        params: {
          toolCode: tool.code,
          category: tool.category,
          x: roi.x,
          y: roi.y,
          width: roi.width,
          height: roi.height,
          threshold: 170,
          tolerancePx: 8,
          activeBoxCount: 0,
          totalBoxCount: 0,
          constellationJson: "[]",
          ...tool.defaultParamValues,
          ...(tool.code === "T102" || tool.code === "T116" || tool.name.toLowerCase().includes("pattern")
            ? { minMatchPercent: 50 }
            : {}),
          ...(tool.code === "T105" || tool.code === "T117"
            ? {
                tolerancePx: 35,
                thresholdLuma: 75,
                pin1ConfigJson: JSON.stringify({
                  registeredPin1: { x: 230, y: 236, radius: 18, confidence: 1.0 },
                  tolerancePx: 35,
                  thresholdLuma: 75,
                }),
              }
            : {}),
        },
      };

      const res = evaluateWorkpieceRuleReal(rule, img);
      console.log(`Tool ${tool.code} (${tool.name}) on EMPTY: status=${res.status}, msg=${res.message}`);
      if (res.status !== "fail") {
        throw new Error(`Tool ${tool.code} passed on empty image when it should fail!`);
      }
    }
  });
});
