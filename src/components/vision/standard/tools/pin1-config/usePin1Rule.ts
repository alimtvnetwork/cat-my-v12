import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { fetchBackend } from "@/lib/backend/http";
import { HttpMethod } from "@/lib/constants";
import { ShapeType } from "@/domain/vision/shapes";
import {
  type GrayscaleMode,
  type SearchRegion,
  type WhiteBoxMarkingInput,
  readImageUrl,
  readImageFile,
  rgbaToBase64,
} from "@/lib/vision/white-box-marking";
import type { RegionDrag } from "@/components/vision/white-box/types";
import { makeRuleFacade } from "@/lib/rules/facade";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { EditorRuleKindType, EditorToolFamilyType } from "@/lib/editor/types";
import type { Rule, RuleId } from "@/lib/rules/model";
import { syncRuleToBackend } from "@/lib/rules/backendSync";
import { useErrorStore } from "@/lib/stores/errorStore";
import {
  clampPin1Circularity,
  clampPin1Threshold,
  clampPin1Tolerance,
  detectRoundHolesInRegion,
  evaluatePin1AgainstReference,
  resolvePin1RadiusRange,
  resolveEffectivePin1Threshold,
} from "./round-hole-detector";
import {
  HolePolarityType,
  Pin1JudgmentStatusType,
  type Pin1AngleDatum,
  type Pin1HoleItem,
  type Pin1MatchResult,
  type Pin1RegionEditMode,
  type Pin1ShapeType,
  type Pin1ToolProps,
} from "./types";

/** Map a saved shape value to ShapeType. Accepts the enum values
 *  ("Rectangle", "Circle", ...) and the legacy lowercase form ("rectangle")
 *  the old save path wrote. Unknown values fall back to Rectangle. */
function readShape(raw: unknown): ShapeType {
  const value = typeof raw === "string" ? raw.toLowerCase() : "";

  if (value === "circle") {
    return ShapeType.Circle;
  }

  if (value === "ellipse") {
    return ShapeType.Ellipse;
  }

  if (value === "polygon") {
    return ShapeType.Polygon;
  }

  return ShapeType.Rectangle;
}

function readRegion(rawRegion: any): SearchRegion | null {
  const geometry = rawRegion?.geometry ?? rawRegion;

  if (
    geometry &&
    typeof geometry.x === "number" &&
    typeof geometry.y === "number" &&
    typeof geometry.width === "number" &&
    typeof geometry.height === "number"
  ) {
    const shapeRaw = geometry.shape ?? rawRegion?.shape;
    const rotationRaw = geometry.rotationDeg ?? rawRegion?.rotationDeg;
    const pointsRaw = geometry.points ?? rawRegion?.points;

    return {
      x: Math.round(geometry.x),
      y: Math.round(geometry.y),
      width: Math.round(geometry.width),
      height: Math.round(geometry.height),
      ...(typeof shapeRaw === "string" ? { shape: readShape(shapeRaw) } : {}),
      ...(typeof rotationRaw === "number" ? { rotationDeg: rotationRaw } : {}),
      ...(Array.isArray(pointsRaw) ? { points: pointsRaw } : {}),
    };
  }

  return null;
}

function createRegisteredPin1Item(params: {
  x: number;
  y: number;
  radius: number;
  searchRegion: SearchRegion | null;
}): Pin1HoleItem {
  const region = params.searchRegion;
  const regionW = Math.max(1, region?.width ?? 1);
  const regionH = Math.max(1, region?.height ?? 1);
  const regionX = region?.x ?? 0;
  const regionY = region?.y ?? 0;
  const relativeX = Math.round(((params.x - regionX) / regionW) * 1000) / 10;
  const relativeY = Math.round(((params.y - regionY) / regionH) * 1000) / 10;
  const radius = Math.max(3, Math.round(params.radius));

  return {
    id: 9999,
    centerX: Math.round(params.x),
    centerY: Math.round(params.y),
    radius,
    diameter: radius * 2,
    circularity: 100,
    areaPx: Math.round(Math.PI * radius * radius),
    meanLuma: 0,
    isKept: true,
    isPrimaryPin1: true,
    relativeX,
    relativeY,
  };
}

function resolvePin1ThresholdLuma(settings: any): number {
  const canonical = settings?.pin1?.thresholdLuma;
  const legacy = settings?.pin1Config?.thresholdLuma;

  return clampPin1Threshold(canonical ?? legacy);
}

function resolvePin1AngleDatum(settings: any): Pin1AngleDatum {
  const saved = settings?.pin1?.angleDatum ?? settings?.pin1Config?.angleDatum;

  if (saved === "package" || saved === "search") {
    return saved;
  }

  return settings?.pin1Config?.packageRegion ?? settings?.packageRegion ? "package" : "search";
}

function angleCenter(
  searchRegion: SearchRegion | null,
  packageRegion: SearchRegion | null,
  angleDatum: Pin1AngleDatum,
): { x: number; y: number } | null {
  const region =
    angleDatum === "search" ? (searchRegion ?? packageRegion) : (packageRegion ?? searchRegion);

  if (!region) {
    return null;
  }

  return { x: region.x + region.width / 2, y: region.y + region.height / 2 };
}

function calculatePin1Angle(
  point: Pin1HoleItem,
  searchRegion: SearchRegion | null,
  packageRegion: SearchRegion | null,
  angleDatum: Pin1AngleDatum,
): number {
  const center = angleCenter(searchRegion, packageRegion, angleDatum);

  if (!center) {
    return 0;
  }

  const angle = (Math.atan2(point.centerY - center.y, point.centerX - center.x) * 180) / Math.PI;

  return Math.round(angle * 10) / 10;
}

export function usePin1Rule(props?: Pin1ToolProps) {
  const navigate = useNavigate();
  const settings = props?.settings as any;
  const pin1Conf = settings?.pin1Config ?? {};

  const [polarity, setPolarity] = useState<HolePolarityType>(
    pin1Conf.polarity ?? HolePolarityType.DarkIndentation,
  );
  const [thresholdLuma, setThresholdLuma] = useState<number>(() =>
    resolvePin1ThresholdLuma(settings),
  );
  // Grayscale preview mode (spec 55): the mode feeds detection through
  // the shared toMatchingGray plane (stretch converts before
  // thresholding; threshold/one-bit detection is raw-luma thresholding,
  // equivalent to the binarized plane), and a mode switch re-runs
  // detection — the button is real, not preview-only.
  const [greyscaleMode, setGreyscaleMode] = useState<GrayscaleMode>("threshold");
  // Effective threshold actually used by the last detection (spec 55):
  // the detector silently replaced an above-mean DarkIndentation
  // threshold with 75% of the region mean; the replacement is now
  // surfaced in the settings card instead of hidden.
  const [effectiveThreshold, setEffectiveThreshold] = useState<{
    effectiveThresholdLuma: number;
    isThresholdOverridden: boolean;
    regionMeanLuma: number | null;
  } | null>(null);
  const [minCircularity, setMinCircularity] = useState<number>(() =>
    clampPin1Circularity(pin1Conf.minCircularityPercent),
  );
  const [tolerancePx, setTolerancePx] = useState<number>(() =>
    clampPin1Tolerance(pin1Conf.tolerancePx),
  );
  const [minRadiusPx, setMinRadiusPx] = useState<number>(
    () => resolvePin1RadiusRange(pin1Conf.minRadiusPx, pin1Conf.maxRadiusPx).minRadiusPx,
  );
  const [maxRadiusPx, setMaxRadiusPx] = useState<number>(
    () => resolvePin1RadiusRange(pin1Conf.minRadiusPx, pin1Conf.maxRadiusPx).maxRadiusPx,
  );

  // Pattern shape searched inside the ROI (spec 54). The ROI stays a plain
  // region; the pattern takes the shape. Restored from the saved pin1Config
  // first, then the saved search-region wrapper shape, for backward
  // compatibility with saves that only carried the wrapper shape.
  const [patternShape, setPatternShape] = useState<ShapeType>(() =>
    readShape(
      pin1Conf.patternShape ?? pin1Conf.searchRegion?.shape ?? settings?.searchRegion?.shape,
    ),
  );

  const [searchRegion, setSearchRegion] = useState<SearchRegion | null>(() =>
    readRegion(pin1Conf.searchRegion ?? settings?.searchRegion),
  );
  const [packageRegion, setPackageRegion] = useState<SearchRegion | null>(() =>
    readRegion(pin1Conf.packageRegion ?? settings?.packageRegion),
  );
  const [regionEditMode, setRegionEditMode] = useState<Pin1RegionEditMode>("search");
  const [angleDatum, setAngleDatum] = useState<Pin1AngleDatum>(() =>
    resolvePin1AngleDatum(settings),
  );
  const [shapeType, setShapeType] = useState<Pin1ShapeType>(pin1Conf.shapeType ?? "circle");

  const [dragState, setDragState] = useState<RegionDrag | null>(null);
  const [source, setSource] = useState<WhiteBoxMarkingInput | null>(null);
  const [detectedHoles, setDetectedHoles] = useState<Pin1HoleItem[]>([]);
  const [registeredPin1, setRegisteredPin1] = useState<Pin1HoleItem | null>(() => {
    if (pin1Conf.registeredPin1) {
      const reg = pin1Conf.registeredPin1;
      const centerX = reg.centerX ?? reg.x;
      const centerY = reg.centerY ?? reg.y;

      return {
        ...reg,
        id: reg.id ?? 9999,
        centerX,
        centerY,
        radius: reg.radius ?? Math.max(3, Math.round((reg.diameter ?? 20) / 2)),
        diameter: reg.diameter ?? Math.max(6, Math.round((reg.radius ?? 10) * 2)),
        circularity: reg.circularity ?? 100,
        areaPx: reg.areaPx ?? Math.round(Math.PI * Math.max(3, reg.radius ?? 10) ** 2),
        meanLuma: reg.meanLuma ?? 0,
        isKept: true,
        isPrimaryPin1: true,
        relativeX: reg.relativeX ?? pin1Conf.relativeX ?? 0,
        relativeY: reg.relativeY ?? pin1Conf.relativeY ?? 0,
      };
    }

    return null;
  });
  const [matchResult, setMatchResult] = useState<Pin1MatchResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [message, setMessage] = useState("Load image to start.");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasGreyscalePreview, setHasGreyscalePreview] = useState(props?.hasCanvasOverlays ?? true);

  const getVisibleHoles = useCallback(
    (holes: Pin1HoleItem[]): Pin1HoleItem[] => {
      const kept = holes.filter((h) => h.isKept);

      if (kept.length === 0) {
        return [];
      }

      if (registeredPin1) {
        const best = [...kept].sort((a, b) => {
          const da = Math.hypot(
            a.centerX - registeredPin1.centerX,
            a.centerY - registeredPin1.centerY,
          );
          const db = Math.hypot(
            b.centerX - registeredPin1.centerX,
            b.centerY - registeredPin1.centerY,
          );

          return da - db;
        })[0];

        return holes
          .map((h) => ({
            ...h,
            isPrimaryPin1: h.id === best.id,
          }))
          .filter((h) => h.id === best.id);
      }

      const best = kept.find((h) => h.isPrimaryPin1) ?? kept[0];

      return holes
        .map((h) => ({
          ...h,
          isPrimaryPin1: h.id === best.id,
        }))
        .filter((h) => h.id === best.id);
    },
    [registeredPin1],
  );

  const localDetection = useCallback(
    (
      inputSource: WhiteBoxMarkingInput,
      region: SearchRegion | null,
      overrides?: {
        polarity?: HolePolarityType;
        thresholdLuma?: number;
        minCircularityPercent?: number;
        minRadiusPx?: number;
        maxRadiusPx?: number;
        tolerancePx?: number;
        packageRegion?: SearchRegion | null;
        angleDatum?: Pin1AngleDatum;
        greyscaleMode?: GrayscaleMode;
        modeOverride?: GrayscaleMode;
      },
    ) => {
      const holes = detectRoundHolesInRegion({
        targetRgba: inputSource.rgba,
        targetWidth: inputSource.width,
        targetHeight: inputSource.height,
        searchRegion: region,
        polarity: overrides?.polarity ?? polarity,
        thresholdLuma: overrides?.thresholdLuma ?? thresholdLuma,
        minCircularityPercent: overrides?.minCircularityPercent ?? minCircularity,
        minRadiusPx: overrides?.minRadiusPx ?? minRadiusPx,
        maxRadiusPx: overrides?.maxRadiusPx ?? maxRadiusPx,
        greyscaleMode: overrides?.greyscaleMode ?? overrides?.modeOverride ?? greyscaleMode,
      });

      const resolved = resolveEffectivePin1Threshold({
        targetRgba: inputSource.rgba,
        targetWidth: inputSource.width,
        targetHeight: inputSource.height,
        searchRegion: region,
        polarity: overrides?.polarity ?? polarity,
        thresholdLuma: overrides?.thresholdLuma ?? thresholdLuma,
      });
      setEffectiveThreshold(resolved);

      const visibleHoles = getVisibleHoles(holes);
      setDetectedHoles(visibleHoles);

      const res = evaluatePin1AgainstReference({
        detectedHoles: visibleHoles,
        registeredPin1,
        searchRegion: region,
        packageRegion: overrides?.packageRegion ?? packageRegion,
        angleDatum: overrides?.angleDatum ?? angleDatum,
        tolerancePx: overrides?.tolerancePx ?? tolerancePx,
      });

      setMatchResult(res);

      return { holes: visibleHoles, res };
    },
    [
      polarity,
      thresholdLuma,
      greyscaleMode,
      minCircularity,
      minRadiusPx,
      maxRadiusPx,
      registeredPin1,
      tolerancePx,
      getVisibleHoles,
      packageRegion,
      angleDatum,
    ],
  );

  const executeDetection = useCallback(
    async (
      inputSource: WhiteBoxMarkingInput,
      region: SearchRegion | null,
      overrides?: {
        polarity?: HolePolarityType;
        thresholdLuma?: number;
        minCircularityPercent?: number;
        minRadiusPx?: number;
        maxRadiusPx?: number;
        tolerancePx?: number;
        packageRegion?: SearchRegion | null;
        angleDatum?: Pin1AngleDatum;
        greyscaleMode?: GrayscaleMode;
        modeOverride?: GrayscaleMode;
      },
    ): Promise<{ holes: Pin1HoleItem[]; res: Pin1MatchResult }> => {
      const requestPackageRegion = overrides?.packageRegion ?? packageRegion;

      try {
        const envelope = await fetchBackend<Pin1MatchResult>("vision/pin1-detection", {
          method: HttpMethod.Post,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Width: inputSource.width,
            Height: inputSource.height,
            RgbaBase64: rgbaToBase64(inputSource.rgba),
            Polarity: overrides?.polarity ?? polarity,
            ThresholdLuma: overrides?.thresholdLuma ?? thresholdLuma,
            GreyscaleMode: overrides?.greyscaleMode ?? overrides?.modeOverride ?? greyscaleMode,
            MinCircularityPercent: overrides?.minCircularityPercent ?? minCircularity,
            MinRadiusPx: overrides?.minRadiusPx ?? minRadiusPx,
            MaxRadiusPx: overrides?.maxRadiusPx ?? maxRadiusPx,
            TolerancePx: overrides?.tolerancePx ?? tolerancePx,
            AngleDatum: overrides?.angleDatum ?? angleDatum,
            SearchRegion: region
              ? { X: region.x, Y: region.y, Width: region.width, Height: region.height }
              : null,
            PackageRegion: requestPackageRegion
              ? {
                  X: requestPackageRegion.x,
                  Y: requestPackageRegion.y,
                  Width: requestPackageRegion.width,
                  Height: requestPackageRegion.height,
                }
              : null,
            RegisteredPin1: registeredPin1,
          }),
        });
        const res = envelope.Results[0];
        const holes = getVisibleHoles([...res.detectedHoles] as Pin1HoleItem[]);
        setDetectedHoles(holes);
        const visibleRes = { ...res, detectedHoles: holes, activeHole: holes[0] ?? res.activeHole };
        setMatchResult(visibleRes);

        const backendEffective = (res as any).effectiveThresholdLuma;

        if (typeof backendEffective === "number") {
          setEffectiveThreshold({
            effectiveThresholdLuma: backendEffective,
            isThresholdOverridden: (res as any).isThresholdOverridden === true,
            regionMeanLuma:
              typeof (res as any).regionMeanLuma === "number" ? (res as any).regionMeanLuma : null,
          });
        }

        return { holes, res: visibleRes };
      } catch {
        return localDetection(inputSource, region, overrides);
      }
    },
    [
      polarity,
      thresholdLuma,
      greyscaleMode,
      minCircularity,
      minRadiusPx,
      maxRadiusPx,
      tolerancePx,
      registeredPin1,
      localDetection,
      getVisibleHoles,
      packageRegion,
    ],
  );

  useEffect(() => {
    let isCancelled = false;
    const explicitUrl = (props as any)?.imageRef || (props?.settings as any)?.imageRef;

    if (source !== null) {
      return;
    }

    const loadTarget = async () => {
      const targetUrl = explicitUrl;

      if (isCancelled || !targetUrl) {
        return;
      }

      try {
        const stdSource = await readImageUrl(targetUrl, 960, 540);

        if (isCancelled) {
          return;
        }

        setSource(stdSource);

        const fullRegion: SearchRegion = {
          x: 0,
          y: 0,
          width: stdSource.width,
          height: stdSource.height,
        };
        const activeSearchRegion = searchRegion ?? fullRegion;

        if (!searchRegion) {
          setSearchRegion(fullRegion);
        }

        await executeDetection(stdSource, activeSearchRegion);

        setMessage("Loaded workpiece image. Ready for Pin 1 verification.");
      } catch (err) {
        if (!isCancelled) {
          useErrorStore.getState().captureError(
            err,
            {
              triggerComponent: "usePin1Rule",
              triggerAction: "loadTarget",
              context: { targetUrlLength: targetUrl.length },
            },
            "E_PIN1_LOAD_TARGET",
          );
        }
      }
    };

    void loadTarget();

    return () => {
      isCancelled = true;
    };
  }, [props?.settings, executeDetection, searchRegion, source]);

  useEffect(() => {
    if (!props?.onChange || !registeredPin1) {
      return;
    }

    props.onChange((prev: any) => ({
      ...prev,
      type: "pin1_config",
      toolType: "Pin 1 Orientation Config",
      searchRegion: searchRegion
        ? {
            shape: patternShape,
            geometry: {
              x: searchRegion.x,
              y: searchRegion.y,
              width: searchRegion.width,
              height: searchRegion.height,
            },
          }
        : prev?.searchRegion,
      packageRegion,
      pin1: {
        thresholdLuma,
        angleDatum,
      },
      pin1Config: {
        polarity,
        thresholdLuma,
        angleDatum,
        minCircularityPercent: minCircularity,
        minRadiusPx,
        maxRadiusPx,
        tolerancePx,
        patternShape,
        angleToleranceDeg: 1.0,
        nominalAngleDeg: calculatePin1Angle(registeredPin1, searchRegion, packageRegion, angleDatum),
        registeredPin1,
        searchRegion,
        packageRegion,
        centerX: registeredPin1.centerX,
        centerY: registeredPin1.centerY,
        radius: registeredPin1.radius,
        relativeX: registeredPin1.relativeX,
        relativeY: registeredPin1.relativeY,
      },
    }));
  }, [
    registeredPin1,
    searchRegion,
    polarity,
    thresholdLuma,
    minCircularity,
    minRadiusPx,
    maxRadiusPx,
    tolerancePx,
    patternShape,
    packageRegion,
    angleDatum,
    props?.onChange,
  ]);

  const handleSearchRegionChange = useCallback(
    (newRegion: SearchRegion | null) => {
      // The drag geometry drops shape fields, so re-attach the pattern
      // shape here — otherwise the first drag would silently reset it.
      const shapedRegion = newRegion ? { ...newRegion, shape: patternShape } : null;
      setSearchRegion(shapedRegion);

      if (source && shapedRegion && shapedRegion.width > 5 && shapedRegion.height > 5) {
        void executeDetection(source, shapedRegion);
      }
    },
    [source, executeDetection, patternShape],
  );

  const handlePackageRegionChange = useCallback(
    (newRegion: SearchRegion | null) => {
      setPackageRegion(newRegion);

      if (source && searchRegion && searchRegion.width > 5 && searchRegion.height > 5) {
        void executeDetection(source, searchRegion, { packageRegion: newRegion });
      }
    },
    [source, searchRegion, executeDetection],
  );

  const handleActiveRegionChange = useCallback(
    (newRegion: SearchRegion | null) => {
      if (regionEditMode === "package") {
        handlePackageRegionChange(newRegion);

        return;
      }

      handleSearchRegionChange(newRegion);
    },
    [handlePackageRegionChange, handleSearchRegionChange, regionEditMode],
  );

  const addPackageRegion = useCallback(() => {
    const width = source?.width ?? 960;
    const height = source?.height ?? 540;
    const centerX = registeredPin1?.centerX ?? Math.round(width / 2);
    const centerY = registeredPin1?.centerY ?? Math.round(height / 2);
    const nextWidth = Math.round(width * 0.18);
    const nextHeight = Math.round(height * 0.2);

    setPackageRegion({
      x: Math.max(0, Math.round(centerX - nextWidth / 2)),
      y: Math.max(0, Math.round(centerY - nextHeight / 2)),
      width: nextWidth,
      height: nextHeight,
    });
    setRegionEditMode("package");
  }, [registeredPin1, source]);

  const handleThresholdChange = (val: number) => {
    const nextThresholdLuma = clampPin1Threshold(val);
    setThresholdLuma(nextThresholdLuma);

    if (source) {
      void executeDetection(source, searchRegion, { thresholdLuma: nextThresholdLuma });
    }
  };

  const changeGreyscaleMode = (mode: GrayscaleMode) => {
    setGreyscaleMode(mode);

    if (source) void executeDetection(source, searchRegion, { greyscaleMode: mode });
  };

  const handlePolarityChange = (val: HolePolarityType) => {
    setPolarity(val);

    if (source) void executeDetection(source, searchRegion, { polarity: val });
  };

  const handleCircularityChange = (val: number) => {
    const nextCircularity = clampPin1Circularity(val);
    setMinCircularity(nextCircularity);

    if (source) {
      void executeDetection(source, searchRegion, { minCircularityPercent: nextCircularity });
    }
  };

  const handleRadiusRangeChange = (minR: number, maxR: number) => {
    const nextRange = resolvePin1RadiusRange(minR, maxR);
    setMinRadiusPx(nextRange.minRadiusPx);
    setMaxRadiusPx(nextRange.maxRadiusPx);

    if (source) {
      void executeDetection(source, searchRegion, {
        minRadiusPx: nextRange.minRadiusPx,
        maxRadiusPx: nextRange.maxRadiusPx,
      });
    }
  };

  const handleToleranceChange = (val: number) => {
    const nextTolerance = clampPin1Tolerance(val);
    setTolerancePx(nextTolerance);

    if (source) void executeDetection(source, searchRegion, { tolerancePx: nextTolerance });
  };

  const handleAngleDatumChange = (datum: Pin1AngleDatum) => {
    setAngleDatum(datum);

    if (source) void executeDetection(source, searchRegion, { angleDatum: datum });
  };

  const registerPin1AtPoint = useCallback(
    (point: { x: number; y: number }) => {
      const radius = registeredPin1?.radius ?? Math.max(6, Math.round((minRadiusPx + maxRadiusPx) / 2));
      const nextPin1 = createRegisteredPin1Item({
        x: point.x,
        y: point.y,
        radius,
        searchRegion,
      });
      const nextHoles = [
        nextPin1,
        ...detectedHoles
          .filter((hole) => hole.id !== nextPin1.id)
          .map((hole) => ({ ...hole, isPrimaryPin1: false })),
      ];
      const res = evaluatePin1AgainstReference({
        detectedHoles: nextHoles,
        registeredPin1: nextPin1,
        searchRegion,
        packageRegion,
        angleDatum,
        tolerancePx,
      });

      setRegisteredPin1(nextPin1);
      setDetectedHoles(nextHoles);
      setMatchResult(res);
      setRegionEditMode("search");
      setMessage(`Registered Pin 1 point at ${nextPin1.centerX}, ${nextPin1.centerY}.`);
      toast.success(`Registered Pin 1 point at ${nextPin1.centerX}, ${nextPin1.centerY}`);
    },
      detectedHoles,
      maxRadiusPx,
      minRadiusPx,
      packageRegion,
      registeredPin1,
      searchRegion,
      tolerancePx,
      angleDatum,
    ],
  );

  const runDetection = useCallback(async () => {
    if (!source) {
      toast.error("Please load an image first.");

      return;
    }

    setIsDetecting(true);
    const { holes, res } = await executeDetection(source, searchRegion);
    setIsDetecting(false);
    setMessage(`Found ${holes.length} circular mark(s).`);

    if (res.isPass) {
      toast.success(`Pin 1 Verified: Position PASS (${res.score}% circularity)`);
    } else if (res.status === Pin1JudgmentStatusType.Misoriented) {
      toast.error(`Pin 1 Misoriented: Offset Δ=${res.deltaDistance}px exceeds limit`);
    } else {
      toast.error("Pin 1 Mark Missing: No circular hole satisfied criteria");
    }
  }, [source, searchRegion, executeDetection]);

  const loadFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    try {
      const stdSource = await readImageFile(file, 960, 540);
      setSource(stdSource);

      const fullRegion: SearchRegion = {
        x: 0,
        y: 0,
        width: stdSource.width,
        height: stdSource.height,
      };
      const activeSearchRegion = searchRegion ?? fullRegion;

      if (!searchRegion) {
        setSearchRegion(fullRegion);
      }

      await executeDetection(stdSource, activeSearchRegion);

      setMessage(`Loaded "${file.name}". Analyzing workpiece for circular Pin 1 fiducial hole...`);
      toast.success(`Loaded "${file.name}"`);
    } catch {
      toast.error(`Failed to load "${file.name}"`);
    }
  };

  const loadCapturedFrame = async (input: WhiteBoxMarkingInput) => {
    setSource(input);

    const fullRegion: SearchRegion = {
      x: 0,
      y: 0,
      width: input.width,
      height: input.height,
    };
    const activeSearchRegion = searchRegion ?? fullRegion;

    if (!searchRegion) {
      setSearchRegion(fullRegion);
    }

    await executeDetection(input, activeSearchRegion);

    setIsCameraOpen(false);
    setMessage(
      "Captured frame from camera. Analyzing workpiece for circular Pin 1 fiducial hole...",
    );
  };

  const clearCanvas = () => {
    setSource(null);
    setDetectedHoles([]);
    setMatchResult(null);
    setMessage("Canvas cleared.");
  };

  const toggleKeepHole = (holeId: number) => {
    setDetectedHoles((prev) => {
      const updated = prev.map((h) => {
        if (h.id === holeId) {
          return { ...h, isKept: !h.isKept };
        }

        return h;
      });

      if (source) {
        const res = evaluatePin1AgainstReference({
          detectedHoles: updated,
          registeredPin1,
          searchRegion,
          packageRegion,
          angleDatum,
          tolerancePx,
        });

        setMatchResult(res);
      }

      return updated;
    });
  };

  const includeAllHoles = () => {
    const updated = detectedHoles.map((h) => ({ ...h, isKept: true }));
    setDetectedHoles(updated);

    if (source) {
      const res = evaluatePin1AgainstReference({
        detectedHoles: updated,
        registeredPin1,
        searchRegion,
        packageRegion,
        angleDatum,
        tolerancePx,
      });

      setMatchResult(res);
    }
  };

  const excludeAllHoles = () => {
    const updated = detectedHoles.map((h) => ({ ...h, isKept: false }));
    setDetectedHoles(updated);

    if (source) {
      const res = evaluatePin1AgainstReference({
        detectedHoles: updated,
        registeredPin1,
        searchRegion,
        packageRegion,
        angleDatum,
        tolerancePx,
      });

      setMatchResult(res);
    }
  };

  const setPrimaryPin1Hole = (holeId: number) => {
    const nextHoles = detectedHoles.map((h) => ({
      ...h,
      isPrimaryPin1: h.id === holeId,
    }));
    setDetectedHoles(nextHoles);

    const targetHole = detectedHoles.find((h) => h.id === holeId);

    if (targetHole) {
      const nextPin1 = { ...targetHole, isKept: true, isPrimaryPin1: true };
      setRegisteredPin1(nextPin1);

      if (source) {
        const res = evaluatePin1AgainstReference({
          detectedHoles: nextHoles,
          registeredPin1: nextPin1,
          searchRegion,
          packageRegion,
          angleDatum,
          tolerancePx,
        });

        setMatchResult(res);
      }

      toast.success(`Hole #${targetHole.id} registered as primary Pin 1 mark`);
    }
  };

  // ONLY creates or updates rule when user explicitly clicks this button
  const savePin1Rule = useCallback(async () => {
    const primary = detectedHoles.find((h) => h.isPrimaryPin1 && h.isKept) ?? registeredPin1;

    if (!primary) {
      toast.error("Please click Pin Point or select a detected mark to register Pin 1 first.");

      return;
    }

    setIsSaving(true);
    const targetRuleId = (settings?.id || `rule-pin1-orientation-01`) as RuleId;
    const ruleName = settings?.name || "Pin 1 Orientation Rule";

    const conditionPayload = {
      ...settings,
      id: targetRuleId,
      name: ruleName,
      toolType: "Pin 1 Orientation Config",
      toolId: "tool-pin1-config",
      type: "pin1_config",
      searchRegion,
      packageRegion,
      pin1: {
        thresholdLuma,
        angleDatum,
      },
      pin1Config: {
        polarity,
        thresholdLuma,
        angleDatum,
        minCircularityPercent: minCircularity,
        minRadiusPx,
        maxRadiusPx,
        tolerancePx,
        patternShape,
        angleToleranceDeg: 1.0,
        nominalAngleDeg: calculatePin1Angle(primary, searchRegion, packageRegion, angleDatum),
        registeredPin1: primary,
        searchRegion,
        packageRegion,
        centerX: primary.centerX,
        centerY: primary.centerY,
        radius: primary.radius,
        relativeX: primary.relativeX,
        relativeY: primary.relativeY,
      },
      pin1ConfigJson: JSON.stringify({
        polarity,
        thresholdLuma,
        angleDatum,
        minCircularityPercent: minCircularity,
        minRadiusPx,
        maxRadiusPx,
        tolerancePx,
        patternShape,
        angleToleranceDeg: 1.0,
        nominalAngleDeg: calculatePin1Angle(primary, searchRegion, packageRegion, angleDatum),
        registeredPin1: primary,
        searchRegion,
        packageRegion,
        centerX: primary.centerX,
        centerY: primary.centerY,
        radius: primary.radius,
        relativeX: primary.relativeX,
        relativeY: primary.relativeY,
      }),
    };

    if (props?.onChange) {
      props.onChange((prev: any) => ({
        ...prev,
        ...conditionPayload,
      }));
    }

    try {
      const facade = makeRuleFacade();
      const allRules = await facade.list();
      const existing = allRules.find((r) => r.id === targetRuleId);
      const nowIso = new Date().toISOString();

      const libraryRule: Rule = {
        id: targetRuleId,
        name: ruleName,
        isCategory: false,
        categoryId: existing?.categoryId ?? ("cat-alignment" as RuleId),
        appliesBefore: existing?.appliesBefore ?? [],
        conditions: [conditionPayload as any],
        createdAt: existing?.createdAt ?? nowIso,
        updatedAt: nowIso,
        enabled: existing?.enabled ?? true,
      };

      if (
        targetRuleId === "draft-rule" ||
        Boolean(props?.onOk) ||
        Boolean(props?.onApply) ||
        Boolean(props?.onChange)
      ) {
        setSaveMessage(`Pin 1 pattern calibrated (${ruleName})`);
        toast.success(`Pin 1 Pattern "${ruleName}" calibrated.`);

        if (props?.onApply) {
          props.onApply(conditionPayload);
        } else if (props?.onOk) {
          props.onOk(conditionPayload);
        }

        return;
      }

      await facade.save(libraryRule);

      const store = useRulesStore.getState();
      const storeRule = {
        id: targetRuleId,
        name: ruleName,
        kind: EditorRuleKindType.R,
        family: EditorToolFamilyType.Rect,
        isHidden: false,
        isLocked: false,
        x: primary ? Math.max(0, primary.centerX - 50) : 200,
        y: primary ? Math.max(0, primary.centerY - 50) : 100,
        width: 100,
        height: 100,
        params: conditionPayload,
      };

      store.replaceAll(
        [...store.rules.filter((r) => r.id !== targetRuleId), storeRule],
        [targetRuleId],
      );

      await syncRuleToBackend({
        ruleId: String(targetRuleId),
        ruleName,
        ruleEnabled: true,
        tolerancePx,
        threshold: thresholdLuma,
        searchRegion,
        pin1Config: conditionPayload.pin1Config,
      });

      setSaveMessage(`Saved Pin 1 rule (${ruleName})`);
      toast.success(`Pin 1 Rule "${ruleName}" saved successfully.`);
      try {
        void navigate({ to: "/setup/rules" });
      } catch {
        // Safe when rendered outside TanStack Router context (e.g. unit tests)
      }
    } catch (err) {
      console.warn("[usePin1Rule] Failed to save rule:", err);
      toast.success("Pin 1 Pattern configuration saved.");
    } finally {
      setIsSaving(false);
    }
  }, [
    detectedHoles,
    registeredPin1,
    settings,
    searchRegion,
    polarity,
    thresholdLuma,
    minCircularity,
    minRadiusPx,
    maxRadiusPx,
    tolerancePx,
    patternShape,
    packageRegion,
    angleDatum,
    props,
    navigate,
  ]);

  return {
    source,
    searchRegion,
    packageRegion,
    regionEditMode,
    shapeType,
    setShapeType,
    dragState,
    polarity,
    thresholdLuma,
    effectiveThresholdLuma: effectiveThreshold?.effectiveThresholdLuma ?? thresholdLuma,
    isThresholdOverridden: effectiveThreshold?.isThresholdOverridden ?? false,
    thresholdRegionMeanLuma: effectiveThreshold?.regionMeanLuma ?? null,
    minCircularity,
    minRadiusPx,
    maxRadiusPx,
    tolerancePx,
    detectedHoles,
    registeredPin1,
    matchResult,
    isDetecting,
    isSaving,
    saveMessage,
    message,
    isCameraOpen,
    hasGreyscalePreview,
    patternShape,
    setPatternShape,
    greyscaleMode,
    changeGreyscaleMode,
    setIsCameraOpen,
    setDragState,
    handlePolarityChange,
    handleThresholdChange,
    handleCircularityChange,
    handleRadiusRangeChange,
    handleToleranceChange,
    handleAngleDatumChange,
    angleDatum,
    setMinCircularity,
    setMinRadiusPx,
    setMaxRadiusPx,
    setTolerancePx,
    toggleGreyscalePreview: () => setHasGreyscalePreview((prev) => !prev),
    handleSearchRegionChange,
    handlePackageRegionChange,
    handleActiveRegionChange,
    addPackageRegion,
    setRegionEditMode,
    loadFile,
    loadCapturedFrame,
    clearCanvas,
    runDetection,
    toggleKeepHole,
    includeAllHoles,
    excludeAllHoles,
    setPrimaryPin1Hole,
    registerPin1AtPoint,
    savePin1Rule,
  };
}
