import { describe, it, expect } from "vitest";
import {
  EDGE_PITCH_DEFAULTS,
  EDGE_WIDTH_DEFAULTS,
  LINE_TOOL_DEFAULTS,
  boxBlur1D,
  evaluateEdgePitch,
  evaluateEdgeWidth,
  findEdges,
  validateLineToolParams,
} from "../line-tool";

describe("validateLineToolParams", () => {
  it("accepts defaults", () => {
    expect(validateLineToolParams(LINE_TOOL_DEFAULTS)).toEqual([]);
  });

  it("rejects even smoothWindow", () => {
    expect(
      validateLineToolParams({ ...LINE_TOOL_DEFAULTS, smoothWindow: 4 }).map((e) => e.code),
    ).toContain("line.smoothWindow.parity");
  });

  it("rejects out-of-range edgeThreshold and polarity and minSeparation", () => {
    const errs = validateLineToolParams({
      ...LINE_TOOL_DEFAULTS,
      edgeThreshold: 300,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      polarity: "sideways" as any,
      minSeparation: 0,
    });
    const codes = errs.map((e) => e.code);
    expect(codes).toContain("line.edgeThreshold.range");
    expect(codes).toContain("line.polarity.unknown");
    expect(codes).toContain("line.minSeparation.range");
  });
});

describe("boxBlur1D", () => {
  it("passes through when window is 1", () => {
    expect(boxBlur1D([1, 2, 3, 4], 1)).toEqual([1, 2, 3, 4]);
  });
  it("averages 3-window", () => {
    const out = boxBlur1D([0, 0, 30, 0, 0], 3);
    expect(out[2]).toBeCloseTo(10);
  });
});

describe("findEdges", () => {
  // Bright bar between dark background: dark, then rise, plateau, fall, dark.
  const bar = [0, 0, 0, 0, 200, 200, 200, 200, 0, 0, 0, 0];

  it("finds one rising and one falling edge on a bright bar (both polarity)", () => {
    const edges = findEdges(bar, { ...LINE_TOOL_DEFAULTS, edgeThreshold: 20 });
    const polarities = edges.map((e) => e.polarity);
    expect(polarities).toContain("rising");
    expect(polarities).toContain("falling");
  });

  it("respects rising-only polarity", () => {
    const edges = findEdges(bar, { ...LINE_TOOL_DEFAULTS, edgeThreshold: 20, polarity: "rising" });
    expect(edges.every((e) => e.polarity === "rising")).toBe(true);
    expect(edges.length).toBeGreaterThan(0);
  });

  it("returns empty on flat input", () => {
    const flat = new Array<number>(16).fill(120);
    expect(findEdges(flat, LINE_TOOL_DEFAULTS)).toEqual([]);
  });

  it("returns empty on very short input", () => {
    expect(findEdges([1, 2], LINE_TOOL_DEFAULTS)).toEqual([]);
  });
});

describe("evaluateEdgeWidth", () => {
  // Bright bar of width 4 samples (indices 4-7 are 200).
  const bar = [0, 0, 0, 0, 200, 200, 200, 200, 0, 0, 0, 0];

  it("computes width between the rising and falling edge and passes when in-band", () => {
    const r = evaluateEdgeWidth(bar, {
      ...EDGE_WIDTH_DEFAULTS,
      minWidth: 2,
      maxWidth: 10,
      pairing: "rise-to-fall",
    });
    expect(r.pass).toBe(true);
    expect(r.width).toBeGreaterThan(0);
    expect(r.reason).toBe("ok");
  });

  it("fails no-pair when only a single polarity is present", () => {
    const monotonic = [0, 0, 0, 50, 100, 150, 200, 250];
    const r = evaluateEdgeWidth(monotonic, EDGE_WIDTH_DEFAULTS);
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("no-pair");
  });

  it("fails too-narrow", () => {
    const r = evaluateEdgeWidth(bar, {
      ...EDGE_WIDTH_DEFAULTS,
      minWidth: 50,
      maxWidth: 100,
      pairing: "rise-to-fall",
    });
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("too-narrow");
  });

  it("fails too-wide", () => {
    const r = evaluateEdgeWidth(bar, {
      ...EDGE_WIDTH_DEFAULTS,
      minWidth: 1,
      maxWidth: 2,
      pairing: "rise-to-fall",
    });
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("too-wide");
  });
});

describe("evaluateEdgePitch", () => {
  // Three bright bars separated by dark gaps of equal spacing.
  // 4 samples per stripe, so rising edges roughly every 8 samples.
  const stripes = [
    0, 0, 0, 0, 200, 200, 200, 200, 0, 0, 0, 0, 200, 200, 200, 200, 0, 0, 0, 0, 200, 200, 200, 200,
    0, 0, 0, 0,
  ];

  it("passes when all pitches are within band", () => {
    const r = evaluateEdgePitch(stripes, {
      ...EDGE_PITCH_DEFAULTS,
      minPitch: 4,
      maxPitch: 12,
    });
    expect(r.pass).toBe(true);
    expect(r.reason).toBe("ok");
    expect(r.pitches.length).toBeGreaterThanOrEqual(2);
  });

  it("fails no-edges on flat input", () => {
    const r = evaluateEdgePitch(new Array<number>(24).fill(100), EDGE_PITCH_DEFAULTS);
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("no-edges");
  });

  it("fails pitch-out-of-band when band excludes actual spacing", () => {
    const r = evaluateEdgePitch(stripes, {
      ...EDGE_PITCH_DEFAULTS,
      minPitch: 100,
      maxPitch: 200,
    });
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("pitch-out-of-band");
  });

  it("fails count-mismatch when expectedCount is set and off by more than tolerance", () => {
    const r = evaluateEdgePitch(stripes, {
      ...EDGE_PITCH_DEFAULTS,
      minPitch: 4,
      maxPitch: 12,
      expectedCount: 20,
      countTolerance: 0,
    });
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("count-mismatch");
  });
});
