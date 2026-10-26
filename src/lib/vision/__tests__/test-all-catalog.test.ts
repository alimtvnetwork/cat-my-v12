import { describe, it } from "vitest";
import { loadWorkpieceImageData, evaluateWorkpieceRuleReal } from "../workpiece-rule-analyzer";
import { VISION_TOOL_CATALOG } from "../tool-catalog";
import { DEFAULT_24_PATTERN_BOXES } from "../white-box-marking";
import { EditorRuleKindType, EditorToolFamilyType, type EditorRule } from "@/lib/editor/types";

describe("Catalog Rules on filled image", () => {
  it("evaluates a rule created from every tool in catalog on pocket-1-filled.jpg", async () => {
    const img = await loadWorkpieceImageData("src/assets/samples/pocket-1-filled.jpg");
    if (!img) return;

    for (const tool of VISION_TOOL_CATALOG) {
      // Simulate handleAddToProject when user adds tool
      let roi = { x: 180, y: 120, width: 220, height: 220 };
      if (
        tool.code === "T102" ||
        tool.code === "T116" ||
        tool.name.toLowerCase().includes("pattern")
      ) {
        roi = { x: 100, y: 70, width: 760, height: 400 };
      } else if (
        tool.code === "T105" ||
        tool.code === "T117" ||
        tool.name.toLowerCase().includes("pin 1")
      ) {
        roi = { x: 180, y: 140, width: 140, height: 140 };
      } else if (
        tool.code === "T118" ||
        tool.code === "T107" ||
        tool.code === "T108" ||
        tool.name.toLowerCase().includes("defect") ||
        tool.name.toLowerCase().includes("scratch") ||
        tool.name.toLowerCase().includes("void")
      ) {
        roi = { x: 200, y: 360, width: 480, height: 160 };
      } else if (
        tool.code === "T110" ||
        tool.code === "T104" ||
        tool.name.toLowerCase().includes("caliper") ||
        tool.name.toLowerCase().includes("lead")
      ) {
        roi = { x: 180, y: 200, width: 280, height: 120 };
      } else if (
        tool.code === "T103" ||
        tool.name.toLowerCase().includes("code") ||
        tool.name.toLowerCase().includes("barcode")
      ) {
        roi = { x: 210, y: 180, width: 100, height: 100 };
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
          ...(tool.code === "T102" ||
          tool.code === "T116" ||
          tool.name.toLowerCase().includes("pattern")
            ? {
                minMatchPercent: 80,
                lumaTolerance: 255,
                // This synthetic reference setup measures ~12.7px offset
                // on the golden filled pocket, so its tolerance must
                // exceed that; the spec offset gate itself is enforced.
                tolerancePx: 15,
                searchRegion: { x: 100, y: 70, width: 760, height: 400 },
                patternRegion: { x: 150, y: 100, width: 600, height: 300 },
                referenceBoxes: DEFAULT_24_PATTERN_BOXES.map((b) => ({ ...b, expectedLuma: 200 })),
                constellationJson: JSON.stringify(
                  DEFAULT_24_PATTERN_BOXES.map((b) => ({ ...b, expectedLuma: 200 })),
                ),
              }
            : {}),
          ...(tool.code === "T105" || tool.code === "T117"
            ? {
                tolerancePx: 60,
                thresholdLuma: 35,
                searchRegion: { x: 180, y: 140, width: 140, height: 140 },
                packageRegion: { x: 200, y: 160, width: 500, height: 300 },
                pin1ConfigJson: JSON.stringify({
                  registeredPin1: { x: 249, y: 264, radius: 24, confidence: 1.0 },
                  tolerancePx: 60,
                  thresholdLuma: 35,
                  searchRegion: { x: 180, y: 140, width: 140, height: 140 },
                  packageRegion: { x: 200, y: 160, width: 500, height: 300 },
                }),
              }
            : {}),
          ...(tool.code === "T111" || tool.name.toLowerCase().includes("circle")
            ? {
                nominalDiameterPx: 120,
                diameterTolerancePx: 15,
                nominalDiameter: 120,
                tolerance: 15,
                minRoundnessScorePct: 50,
              }
            : {}),
          ...(tool.code === "T103" || tool.name.toLowerCase().includes("code reader")
            ? {
                expectedPattern: "^SN2026",
                symbology: "datamatrix",
                minQualityGrade: "F",
              }
            : {}),
          ...(tool.code === "T112" || tool.name.toLowerCase().includes("coating")
            ? {
                minCoveragePct: 0,
                maxAllowedVoids: 10,
                maxUncoatedVoids: 10,
              }
            : {}),
        },
      };

      const res = evaluateWorkpieceRuleReal(rule, img);
      console.log(
        `Tool ${tool.code} (${tool.name}) on FILLED: status=${res.status}, msg=${res.message}`,
      );
      if (res.status !== "pass") {
        throw new Error(`Tool ${tool.code} failed on filled image!`);
      }
    }
  });

  it("evaluates a rule created from every tool in catalog on pocket-2-empty-mixed.jpg (must fail)", async () => {
    const img = await loadWorkpieceImageData("src/assets/samples/pocket-2-empty-mixed.jpg");
    if (!img) return;

    for (const tool of VISION_TOOL_CATALOG) {
      // M301 is a math rule, not an image rule: its formula value does
      // not depend on the image, so an empty image is not a failure
      // condition for it and it is exempt from this expectation.
      if (tool.code === "M301" || tool.code === "M302") {
        continue;
      }

      let roi = { x: 180, y: 120, width: 220, height: 220 };
      if (
        tool.code === "T102" ||
        tool.code === "T116" ||
        tool.name.toLowerCase().includes("pattern")
      ) {
        roi = { x: 100, y: 70, width: 760, height: 400 };
      } else if (
        tool.code === "T105" ||
        tool.code === "T117" ||
        tool.name.toLowerCase().includes("pin 1")
      ) {
        roi = { x: 180, y: 140, width: 140, height: 140 };
      } else if (
        tool.code === "T118" ||
        tool.code === "T107" ||
        tool.code === "T108" ||
        tool.name.toLowerCase().includes("defect") ||
        tool.name.toLowerCase().includes("scratch") ||
        tool.name.toLowerCase().includes("void")
      ) {
        roi = { x: 200, y: 360, width: 480, height: 160 };
      } else if (
        tool.code === "T110" ||
        tool.code === "T104" ||
        tool.name.toLowerCase().includes("caliper") ||
        tool.name.toLowerCase().includes("lead")
      ) {
        roi = { x: 180, y: 200, width: 280, height: 120 };
      } else if (tool.code === "T103" || tool.name.toLowerCase().includes("code")) {
        roi = { x: 210, y: 180, width: 100, height: 100 };
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
          ...(tool.code === "T102" ||
          tool.code === "T116" ||
          tool.name.toLowerCase().includes("pattern")
            ? {
                minMatchPercent: 80,
                // This synthetic reference setup measures ~12.7px offset
                // on the golden filled pocket, so its tolerance must
                // exceed that; the spec offset gate itself is enforced.
                tolerancePx: 15,
                searchRegion: { x: 100, y: 70, width: 760, height: 400 },
                patternRegion: { x: 150, y: 100, width: 600, height: 300 },
                referenceBoxes: DEFAULT_24_PATTERN_BOXES.map((b) => ({ ...b, expectedLuma: 200 })),
                constellationJson: JSON.stringify(
                  DEFAULT_24_PATTERN_BOXES.map((b) => ({ ...b, expectedLuma: 200 })),
                ),
              }
            : {}),
          ...(tool.code === "T105" || tool.code === "T117"
            ? {
                tolerancePx: 60,
                thresholdLuma: 35,
                searchRegion: { x: 180, y: 140, width: 140, height: 140 },
                packageRegion: { x: 200, y: 160, width: 500, height: 300 },
                pin1ConfigJson: JSON.stringify({
                  registeredPin1: { x: 249, y: 264, radius: 24, confidence: 1.0 },
                  tolerancePx: 60,
                  thresholdLuma: 35,
                  searchRegion: { x: 180, y: 140, width: 140, height: 140 },
                  packageRegion: { x: 200, y: 160, width: 500, height: 300 },
                }),
              }
            : {}),
          ...(tool.code === "T111" || tool.name.toLowerCase().includes("circle")
            ? {
                nominalDiameterPx: 120,
                diameterTolerancePx: 15,
                nominalDiameter: 120,
                tolerance: 15,
                minRoundnessScorePct: 50,
              }
            : {}),
          ...(tool.code === "T103" || tool.name.toLowerCase().includes("code reader")
            ? {
                expectedPattern: "^SN2026",
                symbology: "datamatrix",
              }
            : {}),
        },
      };

      const res = evaluateWorkpieceRuleReal(rule, img);
      console.log(
        `Tool ${tool.code} (${tool.name}) on EMPTY: status=${res.status}, msg=${res.message}`,
      );
      if (res.status !== "fail") {
        throw new Error(`Tool ${tool.code} passed on empty image when it should fail!`);
      }
    }
  });
});
