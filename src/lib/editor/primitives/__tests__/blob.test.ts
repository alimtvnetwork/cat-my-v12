import { BlobPolarityType } from "@/lib/editor/primitives/blob";
import { describe, it, expect } from "vitest";
import {
  BLOB_DEFAULTS,
  detectBlobs,
  evaluateBlob,
  validateBlobParams,
  type BlobParams,
} from "../blob";

// Build a ROI where 0 = dark blob, 255 = background.
function buildRoi(rows: string[]) {
  const height = rows.length;
  const width = rows[0].length;
  const px = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      px[y * width + x] = rows[y][x] === "#" ? 0 : 255;
    }
  }

  return { pixels: px, width, height };
}

describe("validateBlobParams", () => {
  it("accepts defaults", () => {
    expect(validateBlobParams(BLOB_DEFAULTS)).toEqual([]);
  });

  it("rejects out-of-range threshold", () => {
    expect(validateBlobParams({ ...BLOB_DEFAULTS, threshold: -1 }).map((e) => e.code)).toContain(
      "blob.threshold.range",
    );
    expect(validateBlobParams({ ...BLOB_DEFAULTS, threshold: 300 }).map((e) => e.code)).toContain(
      "blob.threshold.range",
    );
  });

  it("rejects unknown polarity", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errs = validateBlobParams({ ...BLOB_DEFAULTS, polarity: "mixed" as any });
    expect(errs.map((e) => e.code)).toContain("blob.polarity.unknown");
  });

  it("rejects area order", () => {
    const errs = validateBlobParams({ ...BLOB_DEFAULTS, minArea: 100, maxArea: 10 });
    expect(errs.map((e) => e.code)).toContain("blob.area.order");
  });

  it("rejects count order", () => {
    const errs = validateBlobParams({ ...BLOB_DEFAULTS, minCount: 5, maxCount: 2 });
    expect(errs.map((e) => e.code)).toContain("blob.count.order");
  });

  it("allows maxCount = Infinity", () => {
    expect(validateBlobParams(BLOB_DEFAULTS)).toEqual([]);
  });
});

describe("detectBlobs", () => {
  it("finds two 4-connected components", () => {
    const roi = buildRoi([".....", ".##..", ".##..", "....#", "....#"]);
    const regions = detectBlobs(roi, { ...BLOB_DEFAULTS, minArea: 1 });
    expect(regions).toHaveLength(2);
    const areas = regions.map((r) => r.area).sort((a, b) => a - b);
    expect(areas).toEqual([2, 4]);
  });

  it("diagonal touch counts as SEPARATE components under 4-connectivity", () => {
    const roi = buildRoi(["#...", ".#..", "..#."]);
    const regions = detectBlobs(roi, { ...BLOB_DEFAULTS, minArea: 1 });
    expect(regions).toHaveLength(3);
  });

  it("filters out components outside [minArea, maxArea]", () => {
    const roi = buildRoi(["#....", "###..", "###..", "....#"]);
    const regions = detectBlobs(roi, { ...BLOB_DEFAULTS, minArea: 2, maxArea: 100 });
    // singleton "#" at (0,0) has area 1 -> filtered; big blob area 7 -> kept; singleton at (4,3) area 1 -> filtered
    expect(regions).toHaveLength(1);
    expect(regions[0].area).toBe(7);
  });

  it("light-on-dark polarity inverts selection", () => {
    const roi = buildRoi(["##.##", "##.##"]);
    const p: BlobParams = { ...BLOB_DEFAULTS, polarity: BlobPolarityType.LightOnDark, minArea: 1 };
    const regions = detectBlobs(roi, p);
    // the "." column is the only light region on dark background
    expect(regions).toHaveLength(1);
    expect(regions[0].area).toBe(2);
  });

  it("returns empty on degenerate or mis-sized input", () => {
    expect(detectBlobs({ pixels: new Uint8Array(0), width: 0, height: 0 }, BLOB_DEFAULTS)).toEqual(
      [],
    );
    expect(detectBlobs({ pixels: new Uint8Array(3), width: 4, height: 4 }, BLOB_DEFAULTS)).toEqual(
      [],
    );
  });

  it("bbox and centroid match the component", () => {
    const roi = buildRoi([".....", ".##..", ".##..", "....."]);
    const [r] = detectBlobs(roi, { ...BLOB_DEFAULTS, minArea: 1 });
    expect(r.bbox).toEqual({ x: 1, y: 1, width: 2, height: 2 });
    expect(r.centroid.x).toBeCloseTo(1.5);
    expect(r.centroid.y).toBeCloseTo(1.5);
  });
});

describe("evaluateBlob", () => {
  const roi = buildRoi(["##..##", "##..##"]);

  it("passes when count is in [minCount, maxCount]", () => {
    const r = evaluateBlob(roi, { ...BLOB_DEFAULTS, minArea: 1, minCount: 1, maxCount: 5 });
    expect(r.pass).toBe(true);
    expect(r.count).toBe(2);
  });

  it("fails too-few", () => {
    const r = evaluateBlob(roi, { ...BLOB_DEFAULTS, minArea: 1, minCount: 5, maxCount: 10 });
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("too-few");
  });

  it("fails too-many", () => {
    const r = evaluateBlob(roi, { ...BLOB_DEFAULTS, minArea: 1, minCount: 0, maxCount: 1 });
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("too-many");
  });
});
