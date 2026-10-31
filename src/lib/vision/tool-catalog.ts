import { EditorRuleKindType, EditorToolFamilyType } from "@/lib/editor/types";

export enum InspectionCategoryType {
  PresenceAbsence = "Presence / Absence",
  FlawDetection = "Flaw Detection",
  CountMeasure = "Count & Measure",
  IdOcr = "ID / OCR",
  ColorCoating = "Color & Coating",
}

export interface ToolParamDescriptor {
  key: string;
  label: string;
  type: "number" | "text" | "select" | "boolean";
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  defaultValue: string | number | boolean;
  description: string;
}

export interface VisionToolDefinition {
  id: string;
  code: string;
  name: string;
  category: InspectionCategoryType;
  kind: EditorRuleKindType;
  family: EditorToolFamilyType;
  description: string;
  targetFeature: string;
  defaultExposureMs: number;
  defaultGainDb: number;
  defaultLightPct: number;
  defaultChannels: number[];
  defaultStrobeUs: number;
  params: ToolParamDescriptor[];
  defaultParamValues: Record<string, string | number | boolean | undefined>;
}

export const VISION_TOOL_CATALOG: readonly VisionToolDefinition[] = Object.freeze([
  // --- Category 1: Presence / Absence ---
  // Canonical-key note (applies to every entry below): "canonical" means
  // the key the analyzer reads FIRST for that tool. Legacy workbench keys
  // listed in each entry's comment are fallbacks the analyzer already
  // accepts (catalog key wins); they are documented, not duplicated into
  // defaultParamValues, so a catalog rule cannot carry two conflicting
  // values for one gate. Teach-only fields (taught boxes, registered
  // Pin 1, decoded payloads, reference models, keep-out masks) are
  // deliberately ABSENT from defaultParamValues: a catalog rule is
  // creatable without them, but it correctly FAILs as unconfigured
  // until the workbench teaches them. No fake teach data is defaulted.
  //
  // Tools with NO catalog entry (workbench-only): ShapeTrax3 and T118.
  // - ShapeTrax3 canonical keys: minMatchPercent (75), contrastThreshold
  //   (30), angleRangeDeg (180; legacy alias angleRange), scaleRangeMin
  //   (90), scaleRangeMax (110); teach-only model field, any one of
  //   modelPoints / templatePoints / referenceContour / modelContour /
  //   referencePoints / templateContour / referenceModel — absence
  //   FAILs (no model, no match). Workbench-only keys the analyzer
  //   ignores: roughSearchLevel, detailSearchLevel.
  // - T118 canonical keys: identical to T107 (gradientThreshold 45,
  //   minCrackLengthPx 12, maxAllowedDefects 0); the analyzer routes
  //   T118 through the same scratch/crack branch as T107. A T118
  //   catalog entry, if ever wanted, is a verbatim clone of T107.
  {
    // T102 canonical keys (analyzer evaluatePatternRule, catalog first):
    // minMatchPercent, minPresenceLuma, tolerancePx, lumaTolerance,
    // threshold, angleRangeDeg. Teach-only (absent until taught, and
    // their absence FAILs as "not configured"): searchRegion,
    // patternRegion / patternBounds, maskRegions, and the reference
    // boxes (constellationJson / referenceBoxes) with per-box
    // expectedLuma. greyscaleLevel is NOT read by the analyzer: it is
    // the UI source that AddRulePanel copies into threshold on
    // creation, so both are carried here at 170 to keep the preset
    // path and the panel path identical. activeBoxCount is a
    // teach-derived count (descriptor only, no default: the panel
    // writes 0 at creation and the workbench overwrites it when boxes
    // are taught); the analyzer counts parsed boxes, not this field.
    // scoreMetric / hasPolarityInverted are catalog/UI-only; the
    // analyzer always uses constellation matching.
    id: "T102",
    code: "T102",
    name: "Greyscale Pattern Matching",
    category: InspectionCategoryType.PresenceAbsence,
    kind: EditorRuleKindType.C,
    family: EditorToolFamilyType.Rect,
    description:
      "2-bit greyscale constellation pattern matching with numbered white boxes to verify component presence, orientation, and laser marking.",
    targetFeature:
      "IC body orientation, pin 1 polarity, chip laser marking, connector latch seated state",
    defaultExposureMs: 12.5,
    defaultGainDb: 0.0,
    defaultLightPct: 85,
    defaultChannels: [1, 2],
    defaultStrobeUs: 350,
    defaultParamValues: {
      toolCode: "T102",
      greyscaleLevel: 170,
      // Analyzer constellation threshold (AddRulePanel synthesizes this
      // same value from greyscaleLevel for panel-created rules; carrying
      // it here makes preset-created rules identical). The analyzer
      // only uses it when 30 <= threshold <= pattern-region mean + 25,
      // otherwise it falls back to an adaptive threshold.
      threshold: 170,
      minMatchPercent: 80,
      minPresenceLuma: 45,
      lumaTolerance: 32,
      // Calibrated default: the verified golden filled pocket measures
      // 8.5px constellation offset, so the spec table's 8px default
      // would fail a known-good device. Users can still set 8px
      // explicitly for a strict spec gate (range unchanged, 1-50px).
      tolerancePx: 10,
      angleRangeDeg: 15,
      scoreMetric: "constellation",
      hasPolarityInverted: false,
    },
    params: [
      {
        key: "greyscaleLevel",
        label: "Greyscale Level (Threshold)",
        type: "number",
        min: 10,
        max: 250,
        step: 5,
        defaultValue: 170,
        description:
          "2-bit binarization threshold separating reflective pattern markings from substrate.",
      },
      {
        key: "minMatchPercent",
        label: "Min Match %",
        type: "number",
        unit: "%",
        min: 50,
        max: 100,
        step: 1,
        defaultValue: 80,
        description:
          "Minimum correlation / box match percentage required to declare inspection PASS.",
      },
      {
        key: "minPresenceLuma",
        label: "Min Presence Luma",
        type: "number",
        min: 0,
        max: 255,
        step: 1,
        defaultValue: 45,
        description:
          "Mean luma below this value means the workpiece is missing or the cavity is empty.",
      },
      {
        key: "threshold",
        label: "Constellation Threshold",
        type: "number",
        min: 30,
        max: 255,
        step: 1,
        defaultValue: 170,
        description:
          "Binarization threshold for constellation matching (the analyzer-effective threshold; kept equal to Greyscale Level so panel- and preset-created rules agree).",
      },
      {
        key: "lumaTolerance",
        label: "Luma Tolerance",
        type: "number",
        min: 5,
        max: 80,
        step: 1,
        defaultValue: 32,
        description: "Allowable luminance deviation per individual pattern box.",
      },
      {
        key: "tolerancePx",
        label: "Position Tolerance",
        type: "number",
        unit: "px",
        min: 1,
        max: 50,
        step: 1,
        defaultValue: 10,
        description:
          "Allowable physical position deviation for detected pattern elements. Default 10px (spec table 8px) because the verified golden filled pocket measures 8.5px offset.",
      },
      {
        key: "activeBoxCount",
        label: "Reference Box Count",
        type: "number",
        min: 1,
        max: 64,
        step: 1,
        defaultValue: 24,
        description:
          "Number of white constellation boxes formulating the reference golden template.",
      },
      {
        key: "angleRangeDeg",
        label: "Search Angle Range",
        type: "select",
        unit: "deg",
        options: [
          { value: "0", label: "0° (Fixed)" },
          { value: "5", label: "±5° (Tight)" },
          { value: "15", label: "±15° (Standard SMT)" },
          { value: "45", label: "±45° (Wide)" },
          { value: "180", label: "±180° (Full 360°)" },
        ],
        defaultValue: "15",
        description: "Angular rotation tolerance search window.",
      },
      {
        key: "scoreMetric",
        label: "Matching Algorithm",
        type: "select",
        options: [
          { value: "constellation", label: "2-Bit Constellation Box Matching" },
          { value: "ncc", label: "Normalized Cross Correlation (NCC)" },
          { value: "edge", label: "Edge Gradient Correlation" },
        ],
        defaultValue: "constellation",
        description: "Core computer vision pattern matching and verification algorithm.",
      },
    ],
  },
  {
    // T116 canonical keys (analyzer evaluatePatternRule, catalog first):
    // minMatchPercent, minPresenceLuma, tolerancePx, lumaTolerance,
    // threshold, angleRangeDeg.
    id: "T116",
    code: "T116",
    name: "Pattern Search",
    category: InspectionCategoryType.PresenceAbsence,
    kind: EditorRuleKindType.C,
    family: EditorToolFamilyType.Rect,
    description:
      "Geometric pattern search and normalized cross-correlation (NCC) to locate, align, and verify workpiece features with rotational invariance.",
    targetFeature:
      "Fiducial marks, alignment targets, package outlines, orientation symbols, component footprints",
    defaultExposureMs: 12.5,
    defaultGainDb: 0.0,
    defaultLightPct: 85,
    defaultChannels: [1, 2],
    defaultStrobeUs: 350,
    defaultParamValues: {
      toolCode: "T116",
      greyscaleLevel: 170,
      threshold: 170,
      minMatchPercent: 80,
      minPresenceLuma: 45,
      lumaTolerance: 32,
      tolerancePx: 10,
      angleRangeDeg: 30,
      detectionCount: 1,
      searchSensitivity: 50,
      accuracy: 50,
      scoreMetric: "ncc",
      hasPolarityInverted: false,
    },
    params: [
      {
        key: "greyscaleLevel",
        label: "Greyscale Level (Threshold)",
        type: "number",
        min: 10,
        max: 250,
        step: 5,
        defaultValue: 170,
        description:
          "2-bit binarization threshold separating reflective pattern markings from substrate.",
      },
      {
        key: "minMatchPercent",
        label: "Min Match %",
        type: "number",
        unit: "%",
        min: 10,
        max: 100,
        step: 1,
        defaultValue: 80,
        description:
          "Minimum correlation percentage required to declare inspection PASS.",
      },
      {
        key: "angleRangeDeg",
        label: "Search Angle Range",
        type: "select",
        unit: "deg",
        options: [
          { value: "0", label: "0° (Fixed)" },
          { value: "5", label: "±5° (Tight)" },
          { value: "15", label: "±15° (Standard SMT)" },
          { value: "30", label: "±30° (Standard Wide)" },
          { value: "45", label: "±45° (Wide)" },
          { value: "180", label: "±180° (Full 360°)" },
        ],
        defaultValue: "30",
        description: "Angular rotation tolerance search window.",
      },
      {
        key: "searchSensitivity",
        label: "Search Sensitivity",
        type: "number",
        min: 1,
        max: 100,
        step: 1,
        defaultValue: 50,
        description: "Sensitivity for edge and correlation feature detection.",
      },
      {
        key: "accuracy",
        label: "Accuracy Level",
        type: "number",
        min: 1,
        max: 100,
        step: 1,
        defaultValue: 50,
        description: "Refinement steps and sub-pixel accuracy resolution.",
      },
      {
        key: "detectionCount",
        label: "Detection Count",
        type: "number",
        min: 1,
        max: 16,
        step: 1,
        defaultValue: 1,
        description: "Maximum number of pattern candidates to locate in the search region.",
      },
      {
        key: "tolerancePx",
        label: "Position Tolerance",
        type: "number",
        unit: "px",
        min: 1,
        max: 50,
        step: 1,
        defaultValue: 10,
        description:
          "Allowable physical position deviation for detected pattern elements.",
      },
      {
        key: "threshold",
        label: "Correlation Threshold",
        type: "number",
        min: 30,
        max: 255,
        step: 1,
        defaultValue: 170,
        description:
          "Binarization threshold for pattern feature correlation matching.",
      },
      {
        key: "minPresenceLuma",
        label: "Min Presence Luma",
        type: "number",
        min: 0,
        max: 255,
        step: 1,
        defaultValue: 45,
        description:
          "Mean luma below this value means the workpiece is missing or the cavity is empty.",
      },
      {
        key: "lumaTolerance",
        label: "Luma Tolerance",
        type: "number",
        min: 5,
        max: 80,
        step: 1,
        defaultValue: 32,
        description: "Allowable luminance deviation per individual pattern box.",
      },
      {
        key: "scoreMetric",
        label: "Matching Algorithm",
        type: "select",
        options: [
          { value: "ncc", label: "Normalized Cross Correlation (NCC)" },
          { value: "constellation", label: "2-Bit Constellation Box Matching" },
          { value: "edge", label: "Edge Gradient Correlation" },
        ],
        defaultValue: "ncc",
        description: "Core computer vision pattern matching and verification algorithm.",
      },
    ],
  },
  {
    // T105 canonical keys (analyzer evaluatePin1Rule, catalog first):
    // thresholdLuma, tolerancePx, expectedDiameterPx, nominalAngleDeg,
    // angleToleranceDeg. minCircularityPct is an editable descriptor
    // ONLY — it is deliberately NOT in defaultParamValues, because the
    // analyzer gates circularity only when explicitly present and this
    // detector measures the golden Pin 1 mark at 51%, not the spec 75%
    // (a defaulted 75% would fail a correct device). Teach-only
    // (absent until taught, absence FAILs as "not configured"):
    // pin1Config / pin1ConfigJson with registeredPin1, searchRegion,
    // packageRegion, centerX/centerY. Analyzer aliases: pin1Config.*
    // fallbacks for tolerancePx / thresholdLuma / nominalAngleDeg /
    // angleToleranceDeg / expectedDiameterPx, and rule.params
    // minCircularityPercent as a fallback for minCircularityPct
    // (pin1Config.minCircularityPercent is also read by the analyzer).
    // thresholdLuma default is 35, unified on the spec table value
    // and the user's standing golden value; the old catalog default
    // of 75 made catalog-created rules differ by creation path.
    id: "T105",
    code: "T105",
    name: "Pin 1 Orientation Config",
    category: InspectionCategoryType.PresenceAbsence,
    kind: EditorRuleKindType.C,
    family: EditorToolFamilyType.Rect,
    description:
      "Detects physical circular hole or laser polarity dimple on IC packages to guarantee correct orientation.",
    targetFeature: "Pin 1 polarity dimple, circular fiducial dot, chamfer notch",
    defaultExposureMs: 10.0,
    defaultGainDb: 0.0,
    defaultLightPct: 80,
    defaultChannels: [1, 2],
    defaultStrobeUs: 300,
    defaultParamValues: {
      toolCode: "T105",
      thresholdLuma: 35,
      tolerancePx: 25,
      expectedDiameterPx: 24,
      // minCircularityPct is deliberately NOT in the defaults: this
      // detector's circularity scale measures the golden Pin 1 mark at
      // 51%, so a defaulted 75% spec gate would fail a correct device.
      // The parameter stays editable (default 75 in its descriptor)
      // for users who set it explicitly.
      nominalAngleDeg: -151.6,
      angleToleranceDeg: 10.0,
    },
    params: [
      {
        key: "thresholdLuma",
        label: "Luminance Threshold",
        type: "number",
        min: 20,
        max: 240,
        step: 5,
        defaultValue: 35,
        description: "Greyscale threshold separating Pin 1 dimple from IC body.",
      },
      {
        key: "tolerancePx",
        label: "Position Tolerance",
        type: "number",
        unit: "px",
        min: 1,
        max: 80,
        step: 1,
        defaultValue: 25,
        description: "Distance tolerance from expected Pin 1 coordinate.",
      },
      {
        key: "expectedDiameterPx",
        label: "Expected Hole Diameter",
        type: "number",
        unit: "px",
        min: 5,
        max: 100,
        step: 1,
        defaultValue: 24,
        description: "Expected circular hole diameter in image pixels.",
      },
      {
        key: "minCircularityPct",
        label: "Min Circularity %",
        type: "number",
        unit: "%",
        min: 60,
        max: 100,
        step: 1,
        defaultValue: 75,
        description: "Roundness metric ensuring detected feature is a true circular dimple.",
      },
      {
        key: "nominalAngleDeg",
        label: "Nominal Angle",
        type: "number",
        unit: "deg",
        min: -180,
        max: 180,
        step: 0.1,
        defaultValue: -151.6,
        description: "Polar angle from package centroid to Pin 1.",
      },
      {
        key: "angleToleranceDeg",
        label: "Angle Tolerance",
        type: "number",
        unit: "deg",
        min: 1,
        max: 45,
        step: 0.1,
        defaultValue: 10.0,
        description: "Allowable angular rotation tolerance cone.",
      },
    ],
  },
  {
    // T101 canonical keys (analyzer evaluateAreaGateRule, catalog first):
    // intensityThreshold, areaMode, presencePolarity, minAreaPx,
    // maxAreaPx, umPerPixel. Analyzer aliases: threshold (fallback for
    // intensityThreshold), targetPolarity ("bright"/"dark"/"both", read
    // BEFORE presencePolarity — so it is deliberately NOT duplicated
    // into catalog defaults, or the two polarity keys could disagree),
    // minArea / minPixelCount (fallbacks for minAreaPx),
    // maxArea / maxPixelCount (fallbacks for maxAreaPx),
    // masks / maskRegions (optional exclusion masks). coveragePct and
    // physicalAreaMm2 are analyzer OUTPUTS, not inputs. umPerPixel
    // fallback is 10 when absent or invalid.
    id: "T101",
    code: "T101",
    name: "Area Gate (Pixel Intensity)",
    category: InspectionCategoryType.PresenceAbsence,
    kind: EditorRuleKindType.R,
    family: EditorToolFamilyType.Rect,
    description:
      "Calculates foreground pixel density to confirm solder fillet presence and passive placement.",
    targetFeature: "SMD 0402 / 0201 capacitors, resistors, solder paste deposits",
    defaultExposureMs: 8.0,
    defaultGainDb: 1.2,
    defaultLightPct: 90,
    defaultChannels: [1],
    defaultStrobeUs: 250,
    defaultParamValues: {
      toolCode: "T101",
      intensityThreshold: 128,
      minAreaPx: 4000,
      maxAreaPx: 30000,
      presencePolarity: "brightOnDark",
      areaMode: "pixels",
      umPerPixel: 10.0,
    },
    params: [
      {
        key: "intensityThreshold",
        label: "Intensity Threshold",
        type: "number",
        min: 0,
        max: 255,
        step: 1,
        defaultValue: 128,
        description: "Grayscale cutoff dividing foreground from substrate background.",
      },
      {
        key: "minAreaPx",
        label: "Min Pixel Area",
        type: "number",
        unit: "px",
        min: 1,
        max: 50000,
        step: 10,
        defaultValue: 4000,
        description: "Minimum threshold pixels required for presence confirmation.",
      },
      {
        key: "maxAreaPx",
        label: "Max Pixel Area",
        type: "number",
        unit: "px",
        min: 1,
        max: 100000,
        step: 10,
        defaultValue: 30000,
        description: "Maximum threshold pixels allowed before flagging foreign contamination.",
      },
      {
        key: "presencePolarity",
        label: "Target Polarity",
        type: "select",
        options: [
          { value: "brightOnDark", label: "Bright on Dark (Solder / Silver pad)" },
          { value: "darkOnBright", label: "Dark on Bright (Black IC / Chip body)" },
          { value: "both", label: "Both (Bright or Dark)" },
        ],
        defaultValue: "brightOnDark",
        description: "Foreground contrast polarity relative to background.",
      },
      {
        key: "areaMode",
        label: "Area Mode",
        type: "select",
        options: [
          { value: "pixels", label: "Pixels" },
          { value: "percentage", label: "Percentage (%)" },
          { value: "physical", label: "Physical (mm²)" },
        ],
        defaultValue: "pixels",
        description: "Measurement unit for acceptance gating.",
      },
      {
        key: "umPerPixel",
        label: "µm per Pixel",
        type: "number",
        unit: "µm/px",
        min: 0.1,
        max: 100,
        step: 0.1,
        defaultValue: 10.0,
        description: "Metric conversion factor for physical area (mm²).",
      },
    ],
  },
  {
    // T104 canonical keys (analyzer evaluateCaliperRule, catalog first):
    // scanDirection, edgePolarity, minEdgeContrast, filterWidth,
    // expectedCount, measurementMode, hasSubPixelInterpolation.
    // The count gate is unconditional for T104: edgeCount must equal
    // expectedCount whenever expectedCount is present, with no flag
    // needed. Analyzer aliases / workbench keys NOT duplicated here:
    // nominalPositionPx + tolerancePx (Edge Position workbench writes
    // them, but the caliper evaluator never reads nominalPositionPx —
    // position-vs-nominal is not a caliper gate, coordinator-owned),
    // expectedLeadCount (never aliased to expectedCount by the
    // analyzer), contrastThreshold (never aliased to minEdgeContrast),
    // hasLeadCountCheck / isLeadCountEnabled (only needed to gate the
    // count check for non-T104 caliper tools). tolerancePx is
    // intentionally left out of defaults: it only feeds the px-mode
    // nominalWidth check, which needs nominalWidthPx that T104 does
    // not carry (analyzer fallback 15, panel synthesis 8 — neither
    // gates a T104 rule).
    id: "T104",
    code: "T104",
    name: "Edge Count & Lead Presence",
    category: InspectionCategoryType.PresenceAbsence,
    kind: EditorRuleKindType.R,
    family: EditorToolFamilyType.Rect,
    description:
      "Counts spatial edge transitions along a linear profile to verify all IC leads are present.",
    targetFeature: "QFP / SOIC / Connector terminal lead count and bent pin detection",
    defaultExposureMs: 10.0,
    defaultGainDb: 0.5,
    defaultLightPct: 80,
    defaultChannels: [2, 3],
    defaultStrobeUs: 300,
    defaultParamValues: {
      toolCode: "T104",
      expectedCount: 16,
      minEdgeContrast: 35,
      scanDirection: "horizontal",
      edgePolarity: "both",
      filterWidth: 3,
      measurementMode: "width",
      hasSubPixelInterpolation: true,
    },
    params: [
      {
        key: "expectedCount",
        label: "Expected Lead Count",
        type: "number",
        min: 1,
        max: 256,
        step: 1,
        defaultValue: 16,
        description: "Exact number of physical leads expected across the inspection line.",
      },
      {
        key: "minEdgeContrast",
        label: "Min Edge Contrast",
        type: "number",
        min: 5,
        max: 150,
        step: 5,
        defaultValue: 35,
        description: "Minimum grayscale gradient step to register a valid pin boundary.",
      },
      {
        key: "scanDirection",
        label: "Scan Direction",
        type: "select",
        options: [
          { value: "horizontal", label: "Horizontal" },
          { value: "vertical", label: "Vertical" },
        ],
        defaultValue: "horizontal",
        description: "Direction of the projection scan line.",
      },
      {
        key: "edgePolarity",
        label: "Edge Polarity",
        type: "select",
        options: [
          { value: "light-to-dark", label: "Light to Dark" },
          { value: "dark-to-light", label: "Dark to Light" },
          { value: "both", label: "Both" },
        ],
        defaultValue: "both",
        description: "Transition direction of interest.",
      },
      {
        key: "filterWidth",
        label: "Filter Width",
        type: "number",
        unit: "px",
        min: 1,
        max: 15,
        step: 1,
        defaultValue: 3,
        description: "Gaussian smoothing kernel size.",
      },
      {
        key: "measurementMode",
        label: "Measurement Mode",
        type: "select",
        options: [
          { value: "width", label: "Width" },
          { value: "pitch", label: "Pitch" },
        ],
        defaultValue: "width",
        description:
          "Caliper measurement mode (matches the analyzer's name-derived default for this tool; the T104 count gate applies in either mode).",
      },
      {
        key: "hasSubPixelInterpolation",
        label: "Sub-Pixel Interpolation",
        type: "boolean",
        defaultValue: true,
        description: "Refine edge positions to sub-pixel accuracy.",
      },
    ],
  },

  // --- Category 2: Flaw Detection ---
  {
    // T109 canonical keys (analyzer evaluateBlobRule, catalog first):
    // binarizeThreshold, minDefectAreaPx, maxAllowedDefects,
    // targetPolarity, maxBlobArea, hasHoleFilling. Analyzer aliases:
    // binaryThreshold (fallback for binarizeThreshold),
    // minBlobArea (fallback for minDefectAreaPx),
    // maxBlobCount (fallback for maxAllowedDefects).
    // minBlobCount is DELIBERATELY ABSENT from defaultParamValues:
    // the analyzer skips its empty-cavity guard when minBlobCount is
    // explicitly present, so defaulting it to 0 would let an empty
    // cavity pass (0 blobs <= 0 allowed). Workbench rules that set
    // minBlobCount keep a range gate [minBlobCount..maxBlobCount]
    // instead. defectType is catalog-only; the analyzer does not read
    // it. judgmentItems, when present, add extra count/area gates.
    id: "T109",
    code: "T109",
    name: "Binary Blob (Solder Bridge Detector)",
    category: InspectionCategoryType.FlawDetection,
    kind: EditorRuleKindType.K,
    family: EditorToolFamilyType.Rect,
    description:
      "Morphological connected component analysis detecting metallic bridges and solder shorts.",
    targetFeature: "Solder bridging between QFP / SOP leads, solder balls, tin whiskers",
    defaultExposureMs: 5.0,
    defaultGainDb: 2.0,
    defaultLightPct: 100,
    defaultChannels: [1, 3],
    defaultStrobeUs: 400,
    defaultParamValues: {
      toolCode: "T109",
      binarizeThreshold: 140,
      minDefectAreaPx: 15,
      maxAllowedDefects: 0,
      targetPolarity: "bright",
      maxBlobArea: 500000,
      hasHoleFilling: false,
      defectType: "solderBridge",
    },
    params: [
      {
        key: "binarizeThreshold",
        label: "Binarization Threshold",
        type: "number",
        min: 10,
        max: 250,
        step: 5,
        defaultValue: 140,
        description: "Threshold separating reflective solder bridges from PCB mask.",
      },
      {
        key: "minDefectAreaPx",
        label: "Min Defect Area",
        type: "number",
        unit: "px",
        min: 3,
        max: 1000,
        step: 1,
        defaultValue: 15,
        description: "Blob area in pixels required to trigger a bridge rejection.",
      },
      {
        key: "maxAllowedDefects",
        label: "Defect Acceptance Limit",
        type: "number",
        min: 0,
        max: 5,
        step: 1,
        defaultValue: 0,
        description:
          "Maximum allowable defects before flagging entire board as NG (0 = Zero Tolerance).",
      },
      {
        key: "targetPolarity",
        label: "Target Polarity",
        type: "select",
        options: [
          { value: "bright", label: "Bright" },
          { value: "dark", label: "Dark" },
          { value: "both", label: "Both" },
        ],
        defaultValue: "bright",
        description: "Blob polarity to detect (bright solder on dark mask, or the reverse).",
      },
      {
        key: "maxBlobArea",
        label: "Max Blob Area",
        type: "number",
        unit: "px",
        min: 1,
        max: 1000000,
        step: 1,
        defaultValue: 500000,
        description: "Upper blob-area cap; blobs larger than this are ignored.",
      },
      {
        key: "hasHoleFilling",
        label: "Hole Filling",
        type: "boolean",
        defaultValue: false,
        description: "Fill enclosed holes inside detected blobs before measuring them.",
      },
    ],
  },
  {
    // T108 canonical keys (analyzer evaluateDefectRule void branch,
    // catalog first): voidThreshold, minVoidAreaPx, maxTotalVoidPct,
    // maxSingleVoidPct. PASS is the conjunction totalVoidPct <=
    // maxTotalVoidPct AND maxSingleVoidPct <= maxSingleVoidPct.
    // sensitivityMode is catalog-only; the analyzer does not read it.
    // Workbench keys the void branch does NOT read: voidSensitivity,
    // minVoidDiameterPx, maxPorosityPercent (the workbench itself
    // copies it into maxTotalVoidPct/maxSingleVoidPct on Apply),
    // maxAllowedVoids (the void branch gates on percentages, not on
    // void count). minVoidAreaPx here is the analyzer-effective
    // floor; the workbench derives it from minVoidDiameterPx.
    id: "T108",
    code: "T108",
    name: "Void & Porosity Detector",
    category: InspectionCategoryType.FlawDetection,
    kind: EditorRuleKindType.K,
    family: EditorToolFamilyType.Rect,
    description:
      "Computes total area percentage of internal voids in thermal pads and solder ball joints.",
    targetFeature: "QFN ground pad solder voids, BGA ball porosity (IPC-A-610 standards)",
    defaultExposureMs: 7.5,
    defaultGainDb: 1.0,
    defaultLightPct: 95,
    defaultChannels: [1, 2],
    defaultStrobeUs: 300,
    defaultParamValues: {
      toolCode: "T108",
      voidThreshold: 100,
      maxTotalVoidPct: 25,
      maxSingleVoidPct: 15,
      minVoidAreaPx: 5,
      sensitivityMode: "standard",
    },
    params: [
      {
        key: "maxTotalVoidPct",
        label: "Max Total Void %",
        type: "number",
        unit: "%",
        min: 5,
        max: 50,
        step: 1,
        defaultValue: 25,
        description: "Maximum allowable cumulative void area per IPC-A-610 Class 3.",
      },
      {
        key: "maxSingleVoidPct",
        label: "Max Single Void %",
        type: "number",
        unit: "%",
        min: 3,
        max: 30,
        step: 1,
        defaultValue: 15,
        description: "Maximum allowable area for any single contiguous void bubble.",
      },
      {
        key: "minVoidAreaPx",
        label: "Min Void Area",
        type: "number",
        unit: "px",
        min: 2,
        max: 50,
        step: 1,
        defaultValue: 5,
        description: "Noise floor ignoring microscopic grain structure.",
      },
      {
        key: "voidThreshold",
        label: "Void Threshold",
        type: "number",
        min: 0,
        max: 255,
        step: 1,
        defaultValue: 100,
        description:
          "Luma below this value counts as void (mid-grey between a dark void and a bright pad).",
      },
    ],
  },
  {
    // T107 canonical keys (analyzer evaluateDefectRule scratch branch,
    // catalog first): gradientThreshold, minCrackLengthPx,
    // maxAllowedDefects. T118 shares exactly these keys and the same
    // analyzer branch (it has no catalog entry of its own).
    // filterKernel is catalog-only metadata; the analyzer always uses
    // its fixed Sobel + thinning pipeline and does not read it.
    // Workbench keys the scratch branch does NOT read: defectSensitivity,
    // defectTarget, minDefectArea (those feed the generic defect
    // branch, which a T107/T118 rule never reaches).
    id: "T107",
    code: "T107",
    name: "Scratch & Crack Detector",
    category: InspectionCategoryType.FlawDetection,
    kind: EditorRuleKindType.K,
    family: EditorToolFamilyType.Rect,
    description:
      "High-pass spatial frequency filtering detecting micro-cracks on silicon dies and mask scratches.",
    targetFeature:
      "Silicon die edge chips, surface scratch on passivation, PCB trace hair fractures",
    defaultExposureMs: 6.0,
    defaultGainDb: 2.5,
    defaultLightPct: 90,
    defaultChannels: [3, 4],
    defaultStrobeUs: 350,
    defaultParamValues: {
      toolCode: "T107",
      gradientThreshold: 45,
      minCrackLengthPx: 12,
      maxAllowedDefects: 0,
      filterKernel: "sobel",
    },
    params: [
      {
        key: "gradientThreshold",
        label: "Edge Gradient Threshold",
        type: "number",
        min: 10,
        max: 150,
        step: 5,
        defaultValue: 45,
        description: "Derivative threshold for detecting abrupt surface elevation discontinuities.",
      },
      {
        key: "minCrackLengthPx",
        label: "Min Crack Length",
        type: "number",
        unit: "px",
        min: 5,
        max: 200,
        step: 1,
        defaultValue: 12,
        description: "Minimum contiguous crack length required to reject.",
      },
      {
        key: "maxAllowedDefects",
        label: "Max Allowed Defects",
        type: "number",
        min: 0,
        max: 5,
        step: 1,
        defaultValue: 0,
        description: "Maximum allowable cracks before flagging as NG (0 = Zero Tolerance).",
      },
    ],
  },

  // --- Category 3: Count & Measure ---
  {
    // T110 canonical keys (analyzer evaluateCaliperRule, mm mode):
    // nominalDimensionMm, lowerToleranceMm, upperToleranceMm,
    // pxToMetricRatio, measurementMode, scanDirection, edgePolarity,
    // minEdgeContrast, filterWidth, hasSubPixelInterpolation.
    // mm mode is entered only when nominalDimensionMm is present;
    // without it (and without nominalWidthPx) a T110 rule FAILs as
    // unconfigured — the analyzer never invents an ROI nominal.
    // Analyzer aliases: nominalWidthPx (px mode only),
    // expectedCount (count gate only when hasLeadCountCheck /
    // isLeadCountEnabled is also set — T110 keeps the flag-gated
    // behaviour, unlike T104). Workbench keys the analyzer does NOT
    // read: edgeTransition (this entry keeps it as legacy metadata;
    // edgePolarity is the effective key — note the workbench default
    // "any" is not a valid caliper polarity and matches NO edge, so
    // catalog rules use "both"), measurementAxis (scanDirection is
    // the effective key), contrastThreshold (never aliased to
    // minEdgeContrast), tolerance (never aliased to tolerancePx),
    // expectedLeadCount (never aliased to expectedCount).
    // tolerancePx is intentionally left out of defaults: in mm mode
    // the analyzer ignores it (analyzer fallback 15, panel synthesis
    // 8); it only feeds the px-mode nominalWidth check. The spec
    // worst-case pitch deviation (Δmax <= Tol_max) has no catalog key
    // and is not enforced by the analyzer — only the mean band gate
    // is (jitter is reported in debug).
    id: "T110",
    code: "T110",
    name: "Caliper & Edge (Lead Pitch / Width)",
    category: InspectionCategoryType.CountMeasure,
    kind: EditorRuleKindType.E,
    family: EditorToolFamilyType.Rect,
    description:
      "Sub-pixel metrology measuring pin pitch, terminal width, and co-planarity alignment.",
    targetFeature: "QFP / SOIC terminal pitch (e.g. 0.50mm / 0.65mm), lead width, tip straightness",
    defaultExposureMs: 10.0,
    defaultGainDb: 0.0,
    defaultLightPct: 75,
    defaultChannels: [2, 4],
    defaultStrobeUs: 300,
    defaultParamValues: {
      toolCode: "T110",
      nominalDimensionMm: 0.5,
      lowerToleranceMm: -0.05,
      upperToleranceMm: 0.05,
      pxToMetricRatio: 0.025,
      measurementMode: "pitch",
      scanDirection: "horizontal",
      edgePolarity: "both",
      minEdgeContrast: 35,
      filterWidth: 1,
      hasSubPixelInterpolation: true,
      edgeTransition: "any",
      measurementAxis: "horizontal",
    },
    params: [
      {
        key: "nominalDimensionMm",
        label: "Nominal Dimension",
        type: "number",
        unit: "mm",
        min: 0.01,
        max: 50.0,
        step: 0.01,
        defaultValue: 0.5,
        description: "Target design pitch or lead width from CAD drawing.",
      },
      {
        key: "lowerToleranceMm",
        label: "Lower Tolerance (-Tol)",
        type: "number",
        unit: "mm",
        min: -1.0,
        max: 0.0,
        step: 0.01,
        defaultValue: -0.05,
        description: "Maximum allowable negative dimensional deviation.",
      },
      {
        key: "upperToleranceMm",
        label: "Upper Tolerance (+Tol)",
        type: "number",
        unit: "mm",
        min: 0.0,
        max: 1.0,
        step: 0.01,
        defaultValue: 0.05,
        description: "Maximum allowable positive dimensional deviation.",
      },
      {
        key: "measurementAxis",
        label: "Measurement Axis",
        type: "select",
        options: [
          { value: "horizontal", label: "Horizontal (X-Axis)" },
          { value: "vertical", label: "Vertical (Y-Axis)" },
        ],
        defaultValue: "horizontal",
        description: "Spatial orientation of caliper search lines.",
      },
      {
        key: "pxToMetricRatio",
        label: "mm per Pixel",
        type: "number",
        unit: "mm/px",
        min: 0.001,
        max: 1,
        step: 0.001,
        defaultValue: 0.025,
        description: "Conversion from measured pixels to millimetres for the mm gate.",
      },
      {
        key: "measurementMode",
        label: "Measurement Mode",
        type: "select",
        options: [
          { value: "pitch", label: "Pitch (lead pitch mean)" },
          { value: "width", label: "Width (span)" },
        ],
        defaultValue: "pitch",
        description:
          "What the mm gate judges: mean lead pitch in pitch mode, span in width mode (matches the analyzer's name-derived default for this tool).",
      },
      {
        key: "scanDirection",
        label: "Scan Direction",
        type: "select",
        options: [
          { value: "horizontal", label: "Horizontal" },
          { value: "vertical", label: "Vertical" },
        ],
        defaultValue: "horizontal",
        description: "Direction of the caliper edge scan.",
      },
      {
        key: "edgePolarity",
        label: "Edge Polarity",
        type: "select",
        options: [
          { value: "light-to-dark", label: "Light to Dark" },
          { value: "dark-to-light", label: "Dark to Light" },
          { value: "both", label: "Both" },
        ],
        defaultValue: "both",
        description:
          'Transition direction of interest (must be one of these three; the workbench spelling "any" matches no edge).',
      },
      {
        key: "minEdgeContrast",
        label: "Min Edge Contrast",
        type: "number",
        min: 5,
        max: 150,
        step: 5,
        defaultValue: 35,
        description: "Minimum grayscale gradient step to register a valid edge.",
      },
      {
        key: "filterWidth",
        label: "Filter Width",
        type: "number",
        unit: "px",
        min: 1,
        max: 15,
        step: 1,
        defaultValue: 1,
        description: "Gaussian smoothing kernel size for the edge scan.",
      },
      {
        key: "hasSubPixelInterpolation",
        label: "Sub-Pixel Interpolation",
        type: "boolean",
        defaultValue: true,
        description: "Refine edge positions to sub-pixel accuracy.",
      },
    ],
  },
  {
    // T111 canonical keys (analyzer evaluateCircleGaugeRule, catalog
    // first): nominalDiameterMm, diameterToleranceMm, pxToMetricRatio,
    // minRoundnessScorePct, edgePolarity, minEdgeContrast, rayCount,
    // filterWidth. mm mode is entered only when nominalDiameterMm is
    // present (then the ratio default is 0.025); without it, px keys
    // apply and the ratio default is 1; a T111 rule with neither mm
    // nor px nominal FAILs as unconfigured — the analyzer never
    // invents an ROI nominal. Analyzer aliases (px mode only):
    // nominalDiameterPx / nominalDiameter, diameterTolerancePx /
    // tolerance, metricUnit (label-only; the mm message is driven by
    // nominalDiameterMm, not by metricUnit). The circle-fit engine
    // also accepts minEdgeContrast/filterWidth defaults of 20/3,
    // matching the values carried here.
    id: "T111",
    code: "T111",
    name: "Circle & Via Gauge",
    category: InspectionCategoryType.CountMeasure,
    kind: EditorRuleKindType.E,
    family: EditorToolFamilyType.Rect,
    description:
      "RANSAC circle fitting measuring drill hole diameter, via annular ring, and fiducial roundness.",
    targetFeature: "Mounting holes, plated through-holes (PTH), optical fiducial dots",
    defaultExposureMs: 9.0,
    defaultGainDb: 0.0,
    defaultLightPct: 80,
    defaultChannels: [1, 2],
    defaultStrobeUs: 280,
    defaultParamValues: {
      toolCode: "T111",
      nominalDiameterMm: 1.2,
      diameterToleranceMm: 0.08,
      pxToMetricRatio: 0.025,
      rayCount: 64,
      edgePolarity: "dark-to-light",
      minEdgeContrast: 20,
      filterWidth: 3,
      minRoundnessScorePct: 85,
    },
    params: [
      {
        key: "nominalDiameterMm",
        label: "Nominal Diameter",
        type: "number",
        unit: "mm",
        min: 0.1,
        max: 20.0,
        step: 0.05,
        defaultValue: 1.2,
        description: "Nominal hole or circle diameter in millimeters.",
      },
      {
        key: "diameterToleranceMm",
        label: "Tolerance (±)",
        type: "number",
        unit: "mm",
        min: 0.01,
        max: 1.0,
        step: 0.01,
        defaultValue: 0.08,
        description: "Bilateral diameter tolerance margin.",
      },
      {
        key: "rayCount",
        label: "Ray Count",
        type: "number",
        unit: "rays",
        min: 16,
        max: 128,
        step: 1,
        defaultValue: 64,
        description: "Number of radial projection rays.",
      },
      {
        key: "edgePolarity",
        label: "Edge Polarity",
        type: "select",
        options: [
          { value: "dark-to-light", label: "Dark to Light" },
          { value: "light-to-dark", label: "Light to Dark" },
          { value: "both", label: "Both" },
        ],
        defaultValue: "dark-to-light",
        description: "Transition across feature edge.",
      },
      {
        key: "minRoundnessScorePct",
        label: "Min Roundness Score %",
        type: "number",
        unit: "%",
        min: 50,
        max: 100,
        step: 1,
        defaultValue: 85,
        description: "Minimum circularity score.",
      },
      {
        key: "pxToMetricRatio",
        label: "mm per Pixel",
        type: "number",
        unit: "mm/px",
        min: 0.001,
        max: 1,
        step: 0.001,
        defaultValue: 0.025,
        description: "Conversion from measured pixels to millimetres for the mm gate.",
      },
      {
        key: "minEdgeContrast",
        label: "Min Edge Contrast",
        type: "number",
        min: 5,
        max: 150,
        step: 5,
        defaultValue: 20,
        description: "Minimum radial gradient step to register a valid circle edge.",
      },
      {
        key: "filterWidth",
        label: "Filter Width",
        type: "number",
        unit: "px",
        min: 1,
        max: 15,
        step: 1,
        defaultValue: 3,
        description: "Smoothing kernel size for the radial profile.",
      },
    ],
  },

  // --- Category 4: ID / OCR ---
  {
    // T103 canonical keys (analyzer evaluateCodeReaderRule, catalog
    // first): symbology, expectedPatternRegex, minQualityGrade.
    // Analyzer aliases: expectedPattern (workbench spelling) for
    // expectedPatternRegex; symbology is normalized (dataMatrix ->
    // datamatrix, qrCode -> qr, microQr -> qr — the engine has no
    // microQr symbology). Teach-only and DELIBERATELY ABSENT: no
    // decodedPayload default is carried — there is no real decoder
    // yet, so a catalog rule with no taught payload FAILs (no code
    // detected) instead of passing on invented data. The workbench
    // writes decodedPayload / detectedSymbology / printQualityGrade
    // from its own preview; those are taught/measured values, never
    // catalog defaults.
    id: "T103",
    code: "T103",
    name: "2D DataMatrix & QR Code Reader",
    category: InspectionCategoryType.IdOcr,
    kind: EditorRuleKindType.E,
    family: EditorToolFamilyType.Rect,
    description:
      "Decodes laser-etched ECC200 DataMatrix, wafer 2D codes, and high-density PCB serial markers.",
    targetFeature: "PCB serial number DataMatrix, wafer identification code, package QR",
    defaultExposureMs: 15.0,
    defaultGainDb: 1.0,
    defaultLightPct: 80,
    defaultChannels: [1, 2],
    defaultStrobeUs: 350,
    defaultParamValues: {
      toolCode: "T103",
      symbology: "dataMatrix",
      expectedPatternRegex: "STM32.*",
      minQualityGrade: "B",
    },
    params: [
      {
        key: "symbology",
        label: "Symbology Type",
        type: "select",
        options: [
          { value: "dataMatrix", label: "ECC200 DataMatrix" },
          { value: "qrCode", label: "QR Code" },
          { value: "microQr", label: "Micro QR" },
          { value: "code128", label: "Code 128" },
        ],
        defaultValue: "dataMatrix",
        description: "2D barcode standard encoding scheme.",
      },
      {
        key: "expectedPatternRegex",
        label: "Expected Pattern (Regex)",
        type: "text",
        defaultValue: "STM32.*",
        description:
          "Regular expression verifying the decoded serial format matches expected lot format.",
      },
      {
        key: "minQualityGrade",
        label: "Min Quality Grade",
        type: "select",
        options: [
          { value: "A", label: "Grade A" },
          { value: "B", label: "Grade B" },
          { value: "C", label: "Grade C" },
          { value: "D", label: "Grade D" },
        ],
        defaultValue: "B",
        description: "Minimum acceptable ISO overall grade.",
      },
    ],
  },
  {
    // T106 canonical keys (analyzer ocrJudgmentCriteria, catalog
    // first): expectedString, fontType, minConfidencePct.
    // expectedString is what activates the spec Levenshtein==0 judge
    // path; without it the legacy regex path applies. Analyzer
    // aliases (legacy, read after the catalog keys): expectedText +
    // matchMode (a non-regex expectedText also feeds the exact-string
    // path), expectedFormat, minConfidence, passThreshold (x100),
    // expectedCharacterCount / characterCount. fontType is read and
    // reported but does not switch any engine dictionary — the
    // Tesseract engine has no font switch for it. JUDGMENT CALL,
    // flagged for the coordinator: the pre-existing catalog default
    // expectedString "STM32F4" is KEPT (it is the spec example
    // marking, not an invented payload). If the coordinator decides
    // catalog T106 rules must ship with an empty expected string,
    // delete it from defaultParamValues only — the descriptor stays
    // so the user can still set it at configuration time.
    id: "T106",
    code: "T106",
    name: "Laser Marking OCR",
    category: InspectionCategoryType.IdOcr,
    kind: EditorRuleKindType.S,
    family: EditorToolFamilyType.Rect,
    description:
      "Deep OCR character recognition reading laser-marked part numbers, lot codes, and date codes.",
    targetFeature: "Laser-etched IC top marking, silicon revision text (e.g. STM32F407VGT6)",
    defaultExposureMs: 14.0,
    defaultGainDb: 1.5,
    defaultLightPct: 85,
    defaultChannels: [2, 3],
    defaultStrobeUs: 320,
    defaultParamValues: {
      toolCode: "T106",
      expectedString: "STM32F4",
      fontType: "laserEtched",
      minConfidencePct: 80,
    },
    params: [
      {
        key: "expectedString",
        label: "Expected Text / Prefix",
        type: "text",
        defaultValue: "STM32F4",
        description: "Expected text string required to pass inspection.",
      },
      {
        key: "fontType",
        label: "Font Type",
        type: "select",
        options: [
          { value: "laserEtched", label: "Laser Etched" },
          { value: "dotMatrix", label: "Dot Matrix" },
          { value: "standard", label: "Standard" },
        ],
        defaultValue: "laserEtched",
        description: "Character dictionary model.",
      },
      {
        key: "minConfidencePct",
        label: "Min Confidence",
        type: "number",
        unit: "%",
        min: 50,
        max: 99,
        step: 1,
        defaultValue: 80,
        description: "Minimum neural OCR confidence per character.",
      },
    ],
  },

  // --- Category 5: Color & Coating ---
  {
    // T112 canonical keys (analyzer evaluateConformalCoatingRule,
    // catalog first): inspectionMode, uvChannel, fluorescenceThreshold,
    // minCoveragePct, maxDeltaE, maxAllowedVoids. Spec pass is the
    // conjunction coverage >= min AND voids <= max AND deltaE <= max
    // AND keep-out breaches == 0 (in keep-out-zone mode, breaches == 0
    // alone). uvColorChannel is a DEAD catalog legacy key: the
    // analyzer reads uvChannel only, so it is kept in defaults for
    // backward compatibility with already-saved rules but uvChannel
    // is the effective key (both carried at the same uv-blue channel).
    // targetLab cannot be carried here: the descriptor type and the
    // defaultParamValues type are scalar-only, and the analyzer and
    // workbench already agree on { l: 60, a: -10, b: 35 } as the
    // fallback — coordinator-owned if an editable Lab target is
    // wanted. keepOutRegions / keepOutZone / kozRegions are teach-only
    // masks; absence means 0 breaches by definition, never a
    // measured pass, so they stay absent.
    id: "T112",
    code: "T112",
    name: "Conformal Coating UV Fluorescence",
    category: InspectionCategoryType.ColorCoating,
    kind: EditorRuleKindType.R,
    family: EditorToolFamilyType.Rect,
    description:
      "Evaluates UV fluorescent tracer dye illumination to verify complete conformal coating coverage.",
    targetFeature: "Silicone / Acrylic conformal coating coverage, shadow area voids, edge wet-out",
    defaultExposureMs: 25.0,
    defaultGainDb: 3.0,
    defaultLightPct: 100,
    defaultChannels: [1, 2, 3, 4],
    defaultStrobeUs: 500,
    defaultParamValues: {
      toolCode: "T112",
      minCoveragePct: 95,
      fluorescenceThreshold: 110,
      maxDeltaE: 5.0,
      inspectionMode: "uv-fluorescence",
      maxAllowedVoids: 0,
      uvChannel: "uv-blue",
      uvColorChannel: "uvBlue",
    },
    params: [
      {
        key: "minCoveragePct",
        label: "Min Coverage %",
        type: "number",
        unit: "%",
        min: 80,
        max: 100,
        step: 1,
        defaultValue: 95,
        description: "Percentage of target surface area that must emit UV fluorescence.",
      },
      {
        key: "fluorescenceThreshold",
        label: "UV Glow Threshold",
        type: "number",
        min: 30,
        max: 230,
        step: 5,
        defaultValue: 110,
        description: "Intensity threshold identifying coated vs uncoated bare substrate.",
      },
      {
        key: "maxDeltaE",
        label: "Max Delta E",
        type: "number",
        unit: "ΔE",
        min: 0.5,
        max: 20,
        step: 0.1,
        defaultValue: 5.0,
        description: "Maximum allowable perceptual color distance.",
      },
      {
        key: "inspectionMode",
        label: "Inspection Mode",
        type: "select",
        options: [
          { value: "uv-fluorescence", label: "UV Fluorescence" },
          { value: "keep-out-zone", label: "Keep-Out Zone" },
          { value: "cie-lab-color", label: "CIE Lab Color" },
        ],
        defaultValue: "uv-fluorescence",
        description: "Inspection mode.",
      },
      {
        key: "maxAllowedVoids",
        label: "Max Allowed Voids",
        type: "number",
        min: 0,
        max: 5,
        step: 1,
        defaultValue: 0,
        description: "Permissible uncoated void count.",
      },
      {
        key: "uvChannel",
        label: "UV Channel",
        type: "select",
        options: [
          { value: "uv-blue", label: "UV Blue" },
          { value: "uv-green", label: "UV Green" },
          { value: "luminance", label: "Luminance" },
        ],
        defaultValue: "uv-blue",
        description:
          "UV tracer channel used for the fluorescence signal (the analyzer-effective channel key).",
      },
    ],
  },

  // --- Math Sandbox & DAG Execution Gating ---
  {
    // M301 canonical keys (analyzer evaluateMathSandboxRule + DAG
    // planner, catalog first): expression, operator, minLimit,
    // maxLimit, dependsOnRuleId, skipIfParentFailed, nominal,
    // tolerance. Analyzer aliases: mathExpression / formula for
    // expression; comparisonOperator for operator; limits.min /
    // limits.max / limits.nominal / limits.tolerance (the workbench
    // writes a limits object AND the flat keys); gatingParentRuleId
    // and dependencies[] for dependsOnRuleId (DAG planner). nominal /
    // tolerance only apply to the equals operator (analyzer fallbacks
    // 0 / 0.01); between uses minLimit/maxLimit. customVariables is
    // an object map the analyzer merges over upstream variables and
    // cannot be carried in the scalar-only catalog types, so it stays
    // workbench-set. dependsOnRuleId is empty by default: no parent
    // gate until the user names a parent rule (the DAG planner treats
    // an empty/whitespace value as no dependency; skipIfParentFailed
    // defaults to true in the planner when absent).
    id: "M301",
    code: "M301",
    name: "Math Sandbox & DAG Execution Gating",
    category: InspectionCategoryType.CountMeasure,
    kind: EditorRuleKindType.C,
    family: EditorToolFamilyType.Rect,
    description:
      "Evaluates multi-variable mathematical expressions derived from upstream inspection outputs and enforces DAG short-circuit skipping.",
    targetFeature: "Compound tolerances, conditional branch aborts, inter-rule logic",
    defaultExposureMs: 10.0,
    defaultGainDb: 0.0,
    defaultLightPct: 80,
    defaultChannels: [1],
    defaultStrobeUs: 300,
    defaultParamValues: {
      toolCode: "M301",
      expression: "1.0",
      operator: "between",
      minLimit: 0.0,
      maxLimit: 1.0,
      dependsOnRuleId: "",
      skipIfParentFailed: true,
      nominal: 0,
      tolerance: 0.01,
    },
    params: [
      {
        key: "expression",
        label: "Expression",
        type: "text",
        defaultValue: "1.0",
        description: "Math expression evaluated from upstream inspection outputs.",
      },
      {
        key: "operator",
        label: "Operator",
        type: "select",
        options: [
          { value: "between", label: "Between" },
          { value: "lessThan", label: "Less Than" },
          { value: "greaterThan", label: "Greater Than" },
          { value: "equals", label: "Equals" },
        ],
        defaultValue: "between",
        description: "Comparison operator applied to the evaluated expression.",
      },
      {
        key: "minLimit",
        label: "Min Limit",
        type: "number",
        step: 0.01,
        defaultValue: 0.0,
        description: "Minimum acceptable numerical limit.",
      },
      {
        key: "maxLimit",
        label: "Max Limit",
        type: "number",
        step: 0.01,
        defaultValue: 1.0,
        description: "Maximum acceptable numerical limit.",
      },
      {
        key: "dependsOnRuleId",
        label: "Depends On Rule ID",
        type: "text",
        defaultValue: "",
        description:
          "ID of the upstream rule this rule gates on (empty = no parent gate; the DAG planner skips the rule when the parent fails and skipIfParentFailed is on).",
      },
      {
        key: "skipIfParentFailed",
        label: "Skip If Parent Failed",
        type: "boolean",
        defaultValue: true,
        description: "When on, this rule is Skipped (not evaluated) if its parent rule fails.",
      },
      {
        key: "nominal",
        label: "Nominal (Equals Operator)",
        type: "number",
        step: 0.01,
        defaultValue: 0,
        description:
          "Target value for the equals operator (ignored by between / lessThan / greaterThan).",
      },
      {
        key: "tolerance",
        label: "Tolerance (Equals Operator)",
        type: "number",
        step: 0.01,
        defaultValue: 0.01,
        description: "Allowed deviation around nominal for the equals operator.",
      },
    ],
  },
]);

export function getVisionToolsByCategory(category: InspectionCategoryType): VisionToolDefinition[] {
  return VISION_TOOL_CATALOG.filter((t) => t.category === category);
}

/**
 * Tools actually implemented in the app today. Every other catalog tool
 * is shown with a "*" prefix (see getVisionToolDisplayName) to mark it
 * as not implemented, rather than silently presenting it as available.
 */
export const IMPLEMENTED_VISION_TOOL_CODES: readonly string[] = Object.freeze(["T102", "T105"]);

export function isVisionToolImplemented(tool: VisionToolDefinition): boolean {
  return IMPLEMENTED_VISION_TOOL_CODES.includes(tool.code);
}

export function getVisionToolDisplayName(tool: VisionToolDefinition): string {
  if (isVisionToolImplemented(tool)) {
    return tool.name;
  }

  return `* ${tool.name}`;
}

export function findVisionTool(id: string): VisionToolDefinition | undefined {
  return VISION_TOOL_CATALOG.find((t) => t.id === id || t.code === id);
}
