import { describe, expect, it } from "vitest";
import {
  evaluateShapeTraxRule,
  evaluateWorkpieceRuleReal,
  loadWorkpieceImageData,
  type WorkpieceImageData,
} from "../workpiece-rule-analyzer";
import { extractContourPoints } from "../algorithms/shapetrax";
import { EditorRuleKindType, EditorToolFamilyType, type EditorRule } from "@/lib/editor/types";
import { ValidationStatusType } from "@/lib/editor/validation-store";

async function loadFilled(): Promise<WorkpieceImageData> {
  const img = await loadWorkpieceImageData("src/assets/samples/pocket-1-filled.jpg");

  expect(img).not.toBeNull();

  return img as WorkpieceImageData;
}

function baseRule(overrides: Partial<EditorRule>): EditorRule {
  return {
    id: "rule-roundtrip-01",
    name: "Roundtrip Rule",
    kind: EditorRuleKindType.R,
    family: EditorToolFamilyType.Rect,
    isHidden: false,
    isLocked: false,
    x: 180,
    y: 120,
    width: 220,
    height: 220,
    params: {},
    ...overrides,
  } as EditorRule;
}

describe("Rule creation round-trip: analyzer uses only the saved rule", () => {
  it("(a) an area rule built from workbench Apply params passes, and the same rule with a changed limit fails", async () => {
    const img = await loadFilled();
    const passing = baseRule({
      name: "Area Gate",
      params: {
        toolCode: "T101",
        intensityThreshold: 128,
        presencePolarity: "brightOnDark",
        areaMode: "pixels",
        minAreaPx: 4000,
        maxAreaPx: 30000,
      },
    });
    const passingRes = evaluateWorkpieceRuleReal(passing, img);

    expect(passingRes.status).toBe(ValidationStatusType.Pass);

    const failing = baseRule({
      name: "Area Gate",
      params: {
        toolCode: "T101",
        intensityThreshold: 128,
        presencePolarity: "brightOnDark",
        areaMode: "pixels",
        minAreaPx: 999999,
        maxAreaPx: 30000,
      },
    });

    expect(evaluateWorkpieceRuleReal(failing, img).status).toBe(ValidationStatusType.Fail);
  });

  it("(b) preview judgments cannot force a pass or a fail", async () => {
    const img = await loadFilled();
    // Preview said PASS (isPass=true, measuredScore=99) but the rule
    // limits cannot pass: analyzer must still FAIL.
    const previewPassButFailing = baseRule({
      name: "Area Gate",
      params: {
        toolCode: "T101",
        intensityThreshold: 128,
        presencePolarity: "brightOnDark",
        areaMode: "pixels",
        minAreaPx: 999999,
        maxAreaPx: 30000,
        isPass: true,
        measuredScore: 99,
        measuredValue: 999999,
      },
    });

    expect(evaluateWorkpieceRuleReal(previewPassButFailing, img).status).toBe(
      ValidationStatusType.Fail,
    );

    // Preview judgmentItems would fail this rule, but the measured
    // area is within teach limits: analyzer must still PASS.
    const previewFailButPassing = baseRule({
      name: "Area Gate",
      params: {
        toolCode: "T101",
        intensityThreshold: 128,
        presencePolarity: "brightOnDark",
        areaMode: "pixels",
        minAreaPx: 4000,
        maxAreaPx: 30000,
        isPass: false,
        judgmentItems: [{ lowerLimit: 999999, upperLimit: 9999999, name: "Area" }],
      },
    });

    expect(evaluateWorkpieceRuleReal(previewFailButPassing, img).status).toBe(
      ValidationStatusType.Pass,
    );
  });

  it("(c) a rule with no taught reference FAILs unconfigured, never PASSes", async () => {
    const img = await loadFilled();

    const shapetraxNoModel = baseRule({
      name: "ShapeTrax3",
      params: { toolCode: "SHAPETRAX3", minMatchPercent: 75, contrastThreshold: 30 },
    });
    const shapetraxRes = evaluateShapeTraxRule(shapetraxNoModel, img);

    expect(shapetraxRes.status).toBe(ValidationStatusType.Fail);
    expect(shapetraxRes.message).toContain("no reference model");

    const codeNoTeach = baseRule({
      name: "Code Reader",
      params: { toolCode: "T103", symbology: "datamatrix" },
    });
    const codeRes = evaluateWorkpieceRuleReal(codeNoTeach, img);

    expect(codeRes.status).toBe(ValidationStatusType.Fail);
    expect(codeRes.message).toContain("unconfigured");
  });

  it("(c2) a taught code payload is an expectation, not a test result: sync evaluation must not grade it as a pass", async () => {
    const img = await loadFilled();
    const taught = baseRule({
      name: "Code Reader",
      params: {
        toolCode: "T103",
        symbology: "datamatrix",
        decodedPayload: "SN20261022-A9048-REV2",
        expectedPatternRegex: "STM32.*",
      },
    });
    const res = evaluateWorkpieceRuleReal(taught, img);

    // Must NOT pass on the taught payload alone; the test image must
    // be decoded (async tape-strip path). A sync pass here would be
    // the old fake-pass bug.
    expect(res.status).toBe(ValidationStatusType.Fail);
  });

  it("(a2) a ShapeTrax rule taught on an image analyzes that same image against its stored model", async () => {
    const img = await loadFilled();
    const roi = { x: 180, y: 120, width: 220, height: 220 };
    const model = extractContourPoints({ imageData: img, roi, contrastThreshold: 30 });

    expect(model.length).toBeGreaterThanOrEqual(3);

    const rule = baseRule({
      name: "ShapeTrax3",
      params: {
        toolCode: "SHAPETRAX3",
        minMatchPercent: 75,
        contrastThreshold: 30,
        angleRangeDeg: 180,
        scaleRangeMin: 90,
        scaleRangeMax: 110,
        modelPoints: model,
        modelPointCount: model.length,
      },
    });
    const res = evaluateShapeTraxRule(rule, img);

    expect(res.status).toBe(ValidationStatusType.Pass);
    expect((res.debug as any)?.modelPointCount).toBe(model.length);
  });
});
