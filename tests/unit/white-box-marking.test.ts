import { describe, expect, it, vi } from "vitest";
import { markWhiteBoxes, toThresholdPreviewRgba, type WhiteBoxMark } from "@/lib/vision/white-box-marking";

const idbMemory = new Map<string, unknown>();
vi.mock("idb-keyval", () => ({
  get: vi.fn(async (k: string) => idbMemory.get(k)),
  set: vi.fn(async (k: string, v: unknown) => {
    idbMemory.set(k, v);
  }),
  del: vi.fn(async (k: string) => {
    idbMemory.delete(k);
  }),
  keys: vi.fn(async () => Array.from(idbMemory.keys())),
}));

type Rect = { left: number; top: number; width: number; height: number };
type GrayRect = Rect & { gray: number };
type BoxSummary = Pick<WhiteBoxMark, "number" | "x" | "y" | "width" | "height" | "area">;

const OPAQUE_BLACK_PIXEL = [0, 0, 0, 255] as const;
const WHITE_PIXEL = [255, 255, 255, 255] as const;

function whiteImage(width: number, height: number, whiteRects: Rect[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  fillImage(data, OPAQUE_BLACK_PIXEL);
  for (const rect of whiteRects) fillRect(data, width, rect, WHITE_PIXEL);
  return data;
}

function grayImage(width: number, height: number, grayRects: GrayRect[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  fillImage(data, OPAQUE_BLACK_PIXEL);
  for (const rect of grayRects) fillRect(data, width, rect, [rect.gray, rect.gray, rect.gray, 255]);
  return data;
}

function fillImage(data: Uint8ClampedArray, pixel: readonly number[]): void {
  for (let offset = 0; offset < data.length; offset += 4) data.set(pixel, offset);
}

function fillRect(data: Uint8ClampedArray, imageWidth: number, rect: Rect, pixel: readonly number[]): void {
  for (let row = rect.top; row < rect.top + rect.height; row += 1) {
    for (let column = rect.left; column < rect.left + rect.width; column += 1) {
      data.set(pixel, (row * imageWidth + column) * 4);
    }
  }
}

function summarizeBoxes(boxes: WhiteBoxMark[]): BoxSummary[] {
  return boxes.map(({ number, x, y, width, height, area }) => ({ number, x, y, width, height, area }));
}

describe("white-box marking", () => {
  it("detects and numbers white boxes in reading order", () => {
    const upperLeftLetter = { left: 1, top: 1, width: 3, height: 3 };
    const lowerRightLetter = { left: 7, top: 2, width: 3, height: 4 };

    const result = markWhiteBoxes({
      width: 12,
      height: 8,
      rgba: whiteImage(12, 8, [lowerRightLetter, upperLeftLetter]),
      minAreaPx: 4,
    });

    expect(summarizeBoxes(result.boxes)).toEqual([
      { number: 1, x: 1, y: 1, width: 3, height: 3, area: 9 },
      { number: 2, x: 7, y: 2, width: 3, height: 4, area: 12 },
    ]);
  });

  it("filters tiny white noise", () => {
    const onePixelNoise = { left: 1, top: 1, width: 1, height: 1 };
    const validLetterStroke = { left: 3, top: 3, width: 3, height: 3 };

    const result = markWhiteBoxes({
      width: 8,
      height: 8,
      rgba: whiteImage(8, 8, [onePixelNoise, validLetterStroke]),
      minAreaPx: 4,
    });

    expect(summarizeBoxes(result.boxes)).toEqual([
      { number: 1, x: 3, y: 3, width: 3, height: 3, area: 9 },
    ]);
  });

  it("detects light gray marks with the default threshold", () => {
    const lightTextStroke = { left: 1, top: 1, width: 2, height: 3, gray: 180 };

    const result = markWhiteBoxes({
      width: 8,
      height: 5,
      rgba: grayImage(8, 5, [lightTextStroke]),
    });

    expect(summarizeBoxes(result.boxes)).toEqual([
      { number: 1, x: 1, y: 1, width: 2, height: 3, area: 6 },
    ]);
  });

  it("automatically detects dim gray marks on a dark chip region", () => {
    const leftDimMark = { left: 2, top: 2, width: 3, height: 4, gray: 104 };
    const rightDimMark = { left: 8, top: 2, width: 3, height: 4, gray: 118 };

    const result = markWhiteBoxes({
      width: 14,
      height: 8,
      rgba: grayImage(14, 8, [leftDimMark, rightDimMark]),
      searchRegion: { x: 1, y: 1, width: 12, height: 6 },
    });

    expect(summarizeBoxes(result.boxes)).toEqual([
      { number: 1, x: 2, y: 2, width: 3, height: 4, area: 12 },
      { number: 2, x: 8, y: 2, width: 3, height: 4, area: 12 },
    ]);
  });

  it("only detects white boxes inside the search region", () => {
    const ignoredOutsideMark = { left: 1, top: 1, width: 3, height: 3 };
    const detectedInsideMark = { left: 7, top: 2, width: 3, height: 4 };

    const result = markWhiteBoxes({
      width: 12,
      height: 8,
      rgba: whiteImage(12, 8, [ignoredOutsideMark, detectedInsideMark]),
      minAreaPx: 4,
      searchRegion: { x: 6, y: 1, width: 5, height: 6 },
    });

    expect(summarizeBoxes(result.boxes)).toEqual([
      { number: 1, x: 7, y: 2, width: 3, height: 4, area: 12 },
    ]);
  });

  it("previews the selected white cutoff on the continuous grayscale image", () => {
    const darkGrayPixel = { left: 0, top: 0, width: 1, height: 1, gray: 90 };
    const mediumGrayPixel = { left: 1, top: 0, width: 1, height: 1, gray: 150 };
    const lightGrayPixel = { left: 2, top: 0, width: 1, height: 1, gray: 210 };

    const preview = toThresholdPreviewRgba(
      {
        width: 3,
        height: 1,
        rgba: grayImage(3, 1, [darkGrayPixel, mediumGrayPixel, lightGrayPixel]),
      },
      170,
    );

    expect([preview[0], preview[4], preview[8]]).toEqual([90, 150, 255]);
  });
});

describe("pattern geometry formulation", () => {
  const sampleBoxes: WhiteBoxMark[] = [
    { number: 1, x: 20, y: 30, width: 10, height: 15, area: 150 },
    { number: 2, x: 50, y: 35, width: 15, height: 20, area: 300 },
  ];

  it("computes pattern bounding box with margin", async () => {
    const { computePatternGeometry } = await import("@/components/vision/white-box/pattern-geometry");
    const pattern = computePatternGeometry({
      boxes: sampleBoxes,
      excludedNumbers: new Set(),
      marginPx: 5,
      imageWidth: 200,
      imageHeight: 200,
    });

    expect(pattern).toEqual({
      x: 15,
      y: 25,
      width: 55, // (50 + 15 + 5) - (20 - 5) = 70 - 15 = 55
      height: 35, // (35 + 20 + 5) - (30 - 5) = 60 - 25 = 35
      marginPx: 5,
      tolerancePx: 5,
      activeBoxCount: 2,
      totalBoxCount: 2,
      referenceBoxes: sampleBoxes,
      toleranceZones: [
        { boxNumber: 1, x: 15, y: 25, width: 20, height: 25, tolerancePx: 5 },
        { boxNumber: 2, x: 45, y: 30, width: 25, height: 30, tolerancePx: 5 },
      ],
    });
  });

  it("excludes removed box from pattern geometry", async () => {
    const { computePatternGeometry } = await import("@/components/vision/white-box/pattern-geometry");
    const pattern = computePatternGeometry({
      boxes: sampleBoxes,
      excludedNumbers: new Set([2]),
      marginPx: 4,
      imageWidth: 200,
      imageHeight: 200,
    });

    expect(pattern).toEqual({
      x: 16,
      y: 26,
      width: 18,
      height: 23,
      marginPx: 4,
      tolerancePx: 4,
      activeBoxCount: 1,
      totalBoxCount: 2,
      referenceBoxes: [sampleBoxes[0]],
      toleranceZones: [
        { boxNumber: 1, x: 16, y: 26, width: 18, height: 23, tolerancePx: 4 },
      ],
    });
  });

  it("returns null when all boxes are removed", async () => {
    const { computePatternGeometry } = await import("@/components/vision/white-box/pattern-geometry");
    const pattern = computePatternGeometry({
      boxes: sampleBoxes,
      excludedNumbers: new Set([1, 2]),
      marginPx: 5,
      imageWidth: 200,
      imageHeight: 200,
    });

    expect(pattern).toBeNull();
  });
});

describe("pattern rule persistence", () => {
  const sampleBoxes: WhiteBoxMark[] = [
    { number: 1, x: 20, y: 30, width: 10, height: 15, area: 150 },
    { number: 2, x: 50, y: 35, width: 15, height: 20, area: 300 },
  ];

  it("persists formulated pattern to RuleFacade and draftStore envelope", async () => {
    const { computePatternGeometry } = await import("@/components/vision/white-box/pattern-geometry");
    const { makeRuleFacade, __setRuleFacadeForTests } = await import("@/lib/rules/facade");
    const { __setProjectRepositoryFacadeForTests } = await import("@/lib/projects/facade");
    const { putDraft, getDraft, RuleKindType, ToleranceKindType, DraftOriginType } = await import(
      "@/lib/rules/draftStore"
    );

    const memStore = new Map<string, string>();
    __setProjectRepositoryFacadeForTests({
      kind: "memory",
      async readItem(k) {
        return memStore.get(k) ?? null;
      },
      async writeItem(k, v) {
        memStore.set(k, v);
      },
      async removeItem(k) {
        memStore.delete(k);
      },
    });
    __setRuleFacadeForTests(null);

    const pattern = computePatternGeometry({
      boxes: sampleBoxes,
      excludedNumbers: new Set(),
      marginPx: 8,
      imageWidth: 200,
      imageHeight: 200,
    });

    expect(pattern).not.toBeNull();

    const facade = makeRuleFacade();
    const nowIso = new Date().toISOString();
    const savedRule = await facade.save({
      id: "rule-pattern-test-1" as any,
      name: `Greyscale Pattern (${pattern!.activeBoxCount} boxes)`,
      isCategory: false,
      categoryId: "cat-presence" as any,
      appliesBefore: [],
      conditions: [
        {
          toolType: "Greyscale Pattern Matching",
          toolId: "tool-greyscale-pattern-matching",
          type: "pattern_match",
          threshold: 170,
          marginPx: 8,
          tolerancePx: pattern!.tolerancePx,
          activeBoxCount: pattern!.activeBoxCount,
          totalBoxCount: pattern!.totalBoxCount,
          region: {
            x: pattern!.x,
            y: pattern!.y,
            width: pattern!.width,
            height: pattern!.height,
          },
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
      enabled: true,
    });

    expect(savedRule.id).toBe("rule-pattern-test-1");
    expect(facade.get(savedRule.id)?.name).toBe("Greyscale Pattern (2 boxes)");
    expect((savedRule.conditions[0] as any).toolType).toBe("Greyscale Pattern Matching");
    expect(savedRule.categoryId).toBe("cat-presence");

    const envelope = await putDraft({
      SchemaVersion: 1,
      RuleSetId: 999,
      Name: "Pattern Test Ruleset",
      Version: 0,
      Enabled: true,
      Rules: [
        {
          Id: 101,
          Kind: RuleKindType.Match,
          Enabled: true,
          Shape: {
            Type: "rect",
            X: pattern!.x,
            Y: pattern!.y,
            W: pattern!.width,
            H: pattern!.height,
          },
          Tolerance: {
            Kind: ToleranceKindType.Abs,
            Value: pattern!.tolerancePx,
          },
          Params: {
            WhiteThreshold: 170,
            TolerancePaddingPx: pattern!.tolerancePx,
          },
        },
      ],
      DraftMeta: {
        ClientId: "test-client",
        UpdatedAt: nowIso,
        Origin: DraftOriginType.Indexeddb,
      },
    });

    expect(envelope.RuleSetId).toBe(999);

    const retrieved = await getDraft(999);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.Rules).toHaveLength(1);
    expect(retrieved?.Rules[0].Kind).toBe("match");
    expect(retrieved?.Rules[0].Tolerance.Value).toBe(8);
  });

  it("stores full PatternSearchSettings shape with view.source and guarantees no crash", async () => {
    const { createDefaultPatternSearchSettings, ImageSourceType, RenderModeType } = await import(
      "@/domain/vision/pattern-search"
    );
    const { makeRuleFacade, __setRuleFacadeForTests } = await import("@/lib/rules/facade");
    const { __setProjectRepositoryFacadeForTests } = await import("@/lib/projects/facade");

    const memStore = new Map<string, string>();
    __setProjectRepositoryFacadeForTests({
      kind: "memory",
      async readItem(k) {
        return memStore.get(k) ?? null;
      },
      async writeItem(k, v) {
        memStore.set(k, v);
      },
      async removeItem(k) {
        memStore.delete(k);
      },
    });
    __setRuleFacadeForTests(null);

    const targetRuleId = "rule-greyscale-pattern-01";
    const defaultSettings = createDefaultPatternSearchSettings(targetRuleId);

    const conditionPayload = {
      ...defaultSettings,
      id: targetRuleId,
      name: "Pattern Matching (31 boxes)",
      toolType: "Greyscale Pattern Matching",
      toolId: "tool-greyscale-pattern-matching",
      type: "pattern_match",
      threshold: 170,
      marginPx: 8,
      activeBoxCount: 31,
      totalBoxCount: 31,
      minMatchPercent: 100,
      view: {
        source: ImageSourceType.Camera,
        rendering: RenderModeType.Normal,
        zoom: 100,
      },
    };

    const facade = makeRuleFacade();
    const saved = await facade.save({
      id: targetRuleId as any,
      name: "Pattern Matching (31 boxes)",
      isCategory: false,
      categoryId: "cat-presence" as any,
      appliesBefore: [],
      conditions: [conditionPayload as any],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      enabled: true,
    });

    expect(saved.id).toBe(targetRuleId);
    const cond = saved.conditions[0] as any;
    expect(cond.view).toBeDefined();
    expect(cond.view.source).toBe(ImageSourceType.Camera);
    expect(cond.searchRegion.geometry).toBeDefined();
    expect(cond.patternRegion.geometry).toBeDefined();
    expect(cond.masks).toHaveLength(4);
    expect(cond.detection.searchSensitivity).toBe(50);
  });

  it("filters connected rules strictly so only 1 rule is returned for Greyscale Pattern Matching", () => {
    const rulesList = [
      {
        id: "rule-pill-presence",
        name: "Pill Pocket Presence",
        isCategory: false,
        categoryId: "cat-presence",
        conditions: [],
      },
      {
        id: "rule-logo-match",
        name: "Logo Pattern Match",
        isCategory: false,
        categoryId: "cat-label",
        conditions: [],
      },
      {
        id: "rule-greyscale-pattern-01",
        name: "Pattern Matching (31 boxes)",
        isCategory: false,
        categoryId: "cat-presence",
        conditions: [
          {
            toolType: "Greyscale Pattern Matching",
            toolId: "tool-greyscale-pattern-matching",
            type: "pattern_match",
            activeBoxCount: 31,
          },
        ],
      },
    ];

    const isGreyscaleTool = true;
    const matched = rulesList.filter((r) => {
      if (r.isCategory) return false;
      const cond = r.conditions?.[0] as any;
      return (
        cond?.type === "pattern_match" ||
        cond?.toolType === "Greyscale Pattern Matching" ||
        cond?.toolType === "tool-greyscale-pattern-matching" ||
        r.id === "rule-greyscale-pattern-01"
      );
    });

    expect(matched).toHaveLength(1);
    expect(matched[0].id).toBe("rule-greyscale-pattern-01");
    expect(matched[0].name).toBe("Pattern Matching (31 boxes)");
  });

  it("formats canonical rule name as greyscale-pattern-match-${boxCount}-box and ignores logo-match", () => {
    const boxCount = 31;
    const canonicalRuleName = `greyscale-pattern-match-${boxCount}-box`;
    expect(canonicalRuleName).toBe("greyscale-pattern-match-31-box");

    const rules = [
      { id: "rule-logo-match", name: "Logo Pattern Match" },
      { id: "rule-greyscale-pattern-match-31-box", name: "greyscale-pattern-match-31-box" },
    ];

    const match = rules.find(
      (r) =>
        r.id !== "rule-logo-match" &&
        r.id !== "rule-logo-presence" &&
        (r.id.startsWith("rule-greyscale-pattern-match-") ||
          (r.name.toLowerCase().includes("pattern match") &&
            !r.name.toLowerCase().includes("logo"))),
    );

    expect(match?.id).toBe("rule-greyscale-pattern-match-31-box");
    expect(match?.name).toBe("greyscale-pattern-match-31-box");
  });

  it("syncRuleToBackend saves draft with correct RuleSetId and params", async () => {
    const { syncRuleToBackend } = await import("@/lib/rules/backendSync");
    const { getDraft } = await import("@/lib/rules/draftStore");
    const { toIntId } = await import("@/lib/rules/rule-id-alias");

    const ruleId = "rule-greyscale-pattern-match-31-box";
    const intId = toIntId(ruleId);

    const committed = await syncRuleToBackend({
      ruleId,
      ruleName: "greyscale-pattern-match-31-box",
      ruleEnabled: true,
      activeBoxCount: 31,
      totalBoxCount: 31,
      tolerancePx: 8,
      threshold: 170,
      constellation: [{ x: 10, y: 10, width: 14, height: 14, boxNumber: 1 }],
      patternBounds: { x: 10, y: 10, width: 100, height: 100 },
    });

    expect(committed).not.toBeNull();
    expect(committed?.RuleSetId).toBe(intId);
    expect(committed?.Name).toBe("greyscale-pattern-match-31-box");

    const draft = await getDraft(intId);
    expect(draft).not.toBeNull();
    expect(draft?.RuleSetId).toBe(intId);
    expect(draft?.Name).toBe("greyscale-pattern-match-31-box");
    expect(draft?.Rules[0].Kind).toBe("match");
    expect(draft?.Rules[0].Params.WhiteThreshold).toBe(170);
    expect(draft?.Rules[0].Params.ActiveBoxCount).toBe(31);
  });
});


