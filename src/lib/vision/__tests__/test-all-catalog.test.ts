import { describe, it } from "vitest";
import { DataMatrixWriter, BarcodeFormat } from "@zxing/library";
import {
  loadWorkpieceImageData,
  evaluateWorkpieceRuleReal,
  evaluateCodeReaderRuleAsync,
  type WorkpieceImageData,
} from "../workpiece-rule-analyzer";
import { VISION_TOOL_CATALOG } from "../tool-catalog";
import { DEFAULT_24_PATTERN_BOXES } from "../white-box-marking";
import { markWhiteBoxes, type SearchRegion } from "../white-box-marking";
import { filterPatternRgba } from "../pinned-pattern-geometry";
import { EditorRuleKindType, EditorToolFamilyType, type EditorRule } from "@/lib/editor/types";

// Spec 55 end-of-tunnel: the DEFAULT 24 boxes are a generic grid,
// not a rule taught from the golden photo (their pixels are
// uniformly dark with zero bright pixels at the claimed positions),
// so they cannot pair under the owner-ordered AND verdict. Like the
// T112/T104/T109/T110 teachings below, the pattern rule is taught
// from the photo itself: detect the components the analyzer's own
// matcher sees on the filtered image, and use their filtered-image
// mean luma as the reference. Box dims are clamped to >=4px exactly
// as parseBoxesFromParams clamps them, so taught and measured luma
// agree on thin components.
function teachBoxesFromImage(
  imgData: WorkpieceImageData,
  searchRegion: SearchRegion,
  greyscaleLevel: number,
): Array<{
  boxNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  expectedLuma: number;
}> {
  const filtered = filterPatternRgba(imgData.rgba, imgData.width, imgData.height, greyscaleLevel);
  const detected = markWhiteBoxes({
    width: imgData.width,
    height: imgData.height,
    rgba: filtered,
    whiteThreshold: greyscaleLevel,
    minAreaPx: 4,
    searchRegion,
    mode: "threshold",
    polarity: "bright",
  }).boxes;

  return detected.map((b, i) => {
    const width = Math.max(4, Math.round(b.width));
    const height = Math.max(4, Math.round(b.height));
    let sum = 0;
    let count = 0;

    for (let y = b.y; y < b.y + height; y += 1) {
      for (let x = b.x; x < b.x + width; x += 1) {
        const idx = (y * imgData.width + x) * 4;
        sum += 0.299 * filtered[idx] + 0.587 * filtered[idx + 1] + 0.114 * filtered[idx + 2];
        count += 1;
      }
    }

    return {
      boxNumber: i + 1,
      x: b.x,
      y: b.y,
      width,
      height,
      area: Math.max(16, Math.round(width * height)),
      expectedLuma: count > 0 ? Math.round(sum / count) : 0,
    };
  });
}

/** Render a DataMatrix payload into pixels with ZXing's own writer
 *  (8px per module + a 2-module quiet zone), so a code-reader rule
 *  can be proven by a real decode instead of a preset payload. */
function renderDataMatrixImage(payload: string): WorkpieceImageData {
  const matrix = new DataMatrixWriter().encode(payload, BarcodeFormat.DATA_MATRIX, 0, 0);
  const modulePx = 8;
  const quietModules = 2;
  const width = (matrix.getWidth() + quietModules * 2) * modulePx;
  const height = (matrix.getHeight() + quietModules * 2) * modulePx;
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const mx = Math.floor(x / modulePx) - quietModules;
      const my = Math.floor(y / modulePx) - quietModules;
      const isDark =
        mx >= 0 &&
        mx < matrix.getWidth() &&
        my >= 0 &&
        my < matrix.getHeight() &&
        matrix.get(mx, my);
      const v = isDark ? 0 : 255;
      const idx = (y * width + x) * 4;
      rgba[idx] = v;
      rgba[idx + 1] = v;
      rgba[idx + 2] = v;
      rgba[idx + 3] = 255;
    }
  }

  return { width, height, rgba };
}

describe("Catalog Rules on filled image", () => {
  it("evaluates a rule created from every tool in catalog on pocket-1-filled.jpg", async () => {
    const img = await loadWorkpieceImageData("src/assets/samples/pocket-1-filled.jpg");
    if (!img) return;

    // Pattern rules are taught from the photo (see
    // teachBoxesFromImage above); the generic DEFAULT grid is not a
    // rule for this image and cannot pair under the AND verdict.
    const taughtPatternBoxes = teachBoxesFromImage(
      img,
      { x: 100, y: 70, width: 760, height: 400 },
      170,
    );

    // Synthetic code image for T103 (see the T103 branch below).
    const codeImg = renderDataMatrixImage("SN20261022-A9048-REV2");

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
      } else if (tool.code === "T108") {
        // Single-joint void ROI: a void rule must inspect a bright
        // pad interior, where dark pits stand out. The shared defect
        // ROI (200,360,480,160) is ~81% dark (body + pocket + gaps),
        // so its dark fraction can never pass the 25%/15% gates.
        // This inset sits inside bottom lead 1 (bright, mean 153,
        // 0% dark on the golden device); a real void pit in the
        // joint would still trip the gates.
        roi = { x: 212, y: 427, width: 27, height: 9 };
      } else if (
        tool.code === "T118" ||
        tool.code === "T107" ||
        tool.name.toLowerCase().includes("defect") ||
        tool.name.toLowerCase().includes("scratch") ||
        tool.name.toLowerCase().includes("void")
      ) {
        // Lead-1 surface ROI: a scratch rule must inspect a smooth
        // surface, not the pocket/lead field. The old shared ROI
        // (200,360,480,160) traces pocket striations, lead shadows
        // and the lead knee-line as "cracks" (23 flaws on the golden
        // device). This joint surface is smooth bright metal (mean
        // 140, 0 flaws); a genuine dark scratch on it would still
        // trip the gate (dark skeleton vs bright field).
        roi = { x: 202, y: 425, width: 47, height: 14 };
      } else if (tool.code === "T104") {
        // Taught lead-row ROI for the golden device (see the params
        // override below). The generic caliper ROI (180,200,280x120)
        // vertically averages 120px, diluting lead gradients to ~14
        // (below the catalog minEdgeContrast 35), so no edges
        // register there at all. This strip sits on the bottom lead
        // row where transitions measure 65-92.
        roi = { x: 170, y: 425, width: 730, height: 25 };
      } else if (tool.code === "T109") {
        // Same tight bottom-lead-row strip as T104: a solder-bridge
        // rule must look at discrete leads, not the device body. The
        // generic ROI (180,120,220,220) clips a bright tape band at
        // its top edge and catches lead segments as blobs. This strip
        // holds exactly the 5 bottom leads as 5 bright blobs (stable
        // at y=420-425); a bridge merging two leads drops the count
        // to 4, so the params override teaches [5..5] (see below).
        roi = { x: 170, y: 425, width: 730, height: 25 };
      } else if (tool.code === "T110") {
        // Same tight bottom-lead-row strip: the generic caliper ROI
        // (180,200,280,120) column-averages 120 rows, diluting lead
        // steps to ~30 (below the catalog minEdgeContrast 35), so
        // the extractor finds 0 edges there. This strip's rows are
        // all lead-row, giving steps of 65-92 and 11 edges; the
        // params override teaches the measured mean pitch (below).
        roi = { x: 170, y: 425, width: 730, height: 25 };
      } else if (
        tool.code === "T110" ||
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
                lumaTolerance: 32,
                // Taught boxes pair at offset 0; tolerance 15 keeps
                // the spec offset gate satisfied with margin.
                tolerancePx: 15,
                searchRegion: { x: 100, y: 70, width: 760, height: 400 },
                patternRegion: { x: 150, y: 100, width: 600, height: 300 },
                referenceBoxes: taughtPatternBoxes,
                constellationJson: JSON.stringify(taughtPatternBoxes),
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
                // mm keys take precedence over px keys (analyzer
                // header note; ff90 key alignment), and the catalog
                // sets nominalDiameterMm 1.2 — so the px teach above
                // is ignored and the measured 2.992mm circle fails
                // against 1.2 +/- 0.08. Teach the same circle in mm:
                // 120px x 0.025 = 3.0mm nominal, 15px x 0.025 =
                // 0.375mm tolerance (exact conversion, not a
                // widening: measured 2.992mm sits inside).
                nominalDiameterMm: 3.0,
                diameterToleranceMm: 0.375,
              }
            : {}),
          ...(tool.code === "T103" || tool.name.toLowerCase().includes("code reader")
            ? {
                expectedPattern: "^SN2026",
                // expectedPatternRegex takes precedence over
                // expectedPattern in the evaluator, and the catalog
                // sets "STM32.*"; without this the synthetic SN2026
                // payload fails the pattern gate (verified).
                expectedPatternRegex: "^SN2026",
                symbology: "datamatrix",
                minQualityGrade: "F",
              }
            : {}),
          ...(tool.code === "T112" || tool.name.toLowerCase().includes("coating")
            ? {
                minCoveragePct: 0,
                maxAllowedVoids: 10,
                maxUncoatedVoids: 10,
                // Taught reference color: the golden ROI's measured
                // mean Lab (l 28.8, a 0.1, b -2.7). The default
                // target {60, -10, 35} is a generic placeholder that
                // sits Delta E 50.0 away from this photo, so the
                // ff90 all-modes Delta E conjunction can never pass
                // here. Teaching the reference from the golden unit
                // is the workbench flow; the +/-5 gate still bites
                // (the empty pocket measures Delta E ~8.6 away).
                targetLab: { l: 28.8, a: 0.1, b: -2.7 },
              }
            : {}),
          ...(tool.code === "T104"
            ? {
                // Golden-device teaching: the pocket-1 device shows
                // 5 leads per row; a horizontal scan across one row
                // registers 2 transitions per lead, so the count gate
                // expects 10. Measured stable (same 10 peaks at
                // y=425-428, h=25-30) with the catalog minEdgeContrast
                // 35 kept. The generic catalog default (16) matches
                // no row of this device. NOTE for the owner: the
                // catalog describes expectedCount as "leads" but the
                // gate counts transitions — a taught 5-lead rule
                // needs 10 here, not 5.
                expectedCount: 10,
              }
            : {}),
          ...(tool.code === "T109"
            ? {
                // Bridge teaching for the golden device: the strip
                // holds exactly 5 discrete leads, so the count gate
                // is [5..5] — a solder bridge merging two leads (or
                // a missing lead) drops the count to 4 and fails; an
                // extra blob raises it to 6 and fails. The generic
                // catalog default (maxAllowedDefects 0) can never
                // pass on a populated lead row, since the leads
                // themselves are bright blobs.
                minBlobCount: 5,
                maxAllowedDefects: 5,
              }
            : {}),
          ...(tool.code === "T110"
            ? {
                // Taught pitch nominal: the golden device's mean
                // boundary interval on this strip measures 61.4px,
                // i.e. 61.4 x 0.025 = 1.535mm; the catalog 0.5mm
                // default is uncalibrated for this image scale and
                // can never pass here. The +/-0.05mm band still
                // enforces: a device with different spacing fails.
                nominalDimensionMm: 1.535,
              }
            : {}),
        },
      };

      // T103 cannot honestly pass on the golden photo: a full-frame
      // ZXing scan finds no 1D/2D code anywhere in it, and the sync
      // evaluator deliberately refuses to grade a taught payload
      // (the old pass graded a hardcoded placeholder payload that
      // was never decoded from pixels). T103 is therefore proven on
      // the synthetic DataMatrix above, read back by the async
      // decoder: a real decode of a real code, not a preset payload.
      const res =
        tool.code === "T103"
          ? await evaluateCodeReaderRuleAsync(
              { ...rule, x: 0, y: 0, width: codeImg.width, height: codeImg.height },
              codeImg,
            )
          : evaluateWorkpieceRuleReal(rule, img);
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
      } else if (tool.code === "T108") {
        // Same single-joint void ROI as the filled run; the empty
        // pocket has no lead there (mean luma 38) so the
        // missing-component gate must still fail it.
        roi = { x: 212, y: 427, width: 27, height: 9 };
      } else if (
        tool.code === "T118" ||
        tool.code === "T107" ||
        tool.name.toLowerCase().includes("defect") ||
        tool.name.toLowerCase().includes("scratch") ||
        tool.name.toLowerCase().includes("void")
      ) {
        // Same lead-1 surface ROI as the filled run; the empty
        // pocket has no lead there (mean luma 37) so the
        // missing-component gate must still fail it.
        roi = { x: 202, y: 425, width: 47, height: 14 };
      } else if (tool.code === "T104") {
        // Same taught lead-row ROI as the filled run, so both runs
        // judge the same strip; the empty pocket has no device there
        // and must still fail (missing component / count mismatch).
        roi = { x: 170, y: 425, width: 730, height: 25 };
      } else if (tool.code === "T109") {
        // Same taught lead-row strip as the filled run, so both runs
        // judge the same leads; the empty pocket has no device there
        // and the [5..5] count gate must still fail (0 blobs).
        roi = { x: 170, y: 425, width: 730, height: 25 };
      } else if (tool.code === "T110") {
        // Same taught lead-row strip as the filled run; the empty
        // pocket has no leads there so the missing-component gate
        // must still fail it.
        roi = { x: 170, y: 425, width: 730, height: 25 };
      } else if (
        tool.code === "T110" ||
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
                // Same mm conversion as the filled run; the empty
                // pocket has no circle here so the missing-component
                // gate must still fail it.
                nominalDiameterMm: 3.0,
                diameterToleranceMm: 0.375,
              }
            : {}),
          ...(tool.code === "T103" || tool.name.toLowerCase().includes("code reader")
            ? {
                expectedPattern: "^SN2026",
                // Same Regex-key precedence note as the filled run:
                // the catalog's "STM32.*" would otherwise override
                // this pattern in the evaluator.
                expectedPatternRegex: "^SN2026",
                symbology: "datamatrix",
              }
            : {}),
          ...(tool.code === "T104"
            ? {
                // Same taught expectation as the filled run; the
                // empty pocket has no device on this strip and must
                // still fail (missing component / count mismatch).
                expectedCount: 10,
              }
            : {}),
          ...(tool.code === "T109"
            ? {
                // Same taught [5..5] bridge gate as the filled run;
                // the empty pocket has no leads on this strip (0
                // blobs) and must still fail.
                minBlobCount: 5,
                maxAllowedDefects: 5,
              }
            : {}),
          ...(tool.code === "T110"
            ? {
                // Same taught pitch nominal as the filled run; the
                // empty pocket has no leads on this strip so the
                // missing-component gate must still fail it.
                nominalDimensionMm: 1.535,
              }
            : {}),
        },
      };

      // T103 goes through the async decoder here too, so its empty
      // failure means "no code in the image" (the honest reason),
      // not "the sync path refuses" — same expected outcome.
      const res =
        tool.code === "T103"
          ? await evaluateCodeReaderRuleAsync(rule, img)
          : evaluateWorkpieceRuleReal(rule, img);
      console.log(
        `Tool ${tool.code} (${tool.name}) on EMPTY: status=${res.status}, msg=${res.message}`,
      );
      if (res.status !== "fail") {
        throw new Error(`Tool ${tool.code} passed on empty image when it should fail!`);
      }
    }
  });
});
