import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { fetchBackend } from "@/lib/backend/http";
import { HttpMethod } from "@/lib/constants";
import {
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
import {
  detectRoundHolesInRegion,
  evaluatePin1AgainstReference,
} from "./round-hole-detector";
import {
  HolePolarityType,
  Pin1JudgmentStatusType,
  type Pin1HoleItem,
  type Pin1MatchResult,
  type Pin1RegionEditMode,
  type Pin1ToolProps,
} from "./types";

function readRegion(rawRegion: any): SearchRegion | null {
  const geometry = rawRegion?.geometry ?? rawRegion;

  if (
    geometry &&
    typeof geometry.x === "number" &&
    typeof geometry.y === "number" &&
    typeof geometry.width === "number" &&
    typeof geometry.height === "number"
  ) {
    return {
      x: Math.round(geometry.x),
      y: Math.round(geometry.y),
      width: Math.round(geometry.width),
      height: Math.round(geometry.height),
    };
  }

  return null;
}

export function usePin1Rule(props?: Pin1ToolProps) {
  const navigate = useNavigate();
  const settings = props?.settings as any;
  const pin1Conf = settings?.pin1Config ?? {};

  const [polarity, setPolarity] = useState<HolePolarityType>(
    pin1Conf.polarity ?? HolePolarityType.DarkIndentation,
  );
  const [thresholdLuma, setThresholdLuma] = useState<number>(
    typeof pin1Conf.thresholdLuma === "number" ? pin1Conf.thresholdLuma : 35,
  );
  const [minCircularity, setMinCircularity] = useState<number>(
    typeof pin1Conf.minCircularityPercent === "number" ? pin1Conf.minCircularityPercent : 45,
  );
  const [tolerancePx, setTolerancePx] = useState<number>(
    typeof pin1Conf.tolerancePx === "number" ? pin1Conf.tolerancePx : 25,
  );
  const [minRadiusPx, setMinRadiusPx] = useState<number>(
    typeof pin1Conf.minRadiusPx === "number" ? pin1Conf.minRadiusPx : 3,
  );
  const [maxRadiusPx, setMaxRadiusPx] = useState<number>(
    typeof pin1Conf.maxRadiusPx === "number" ? pin1Conf.maxRadiusPx : 60,
  );

  const [searchRegion, setSearchRegion] = useState<SearchRegion | null>(() =>
    readRegion(pin1Conf.searchRegion ?? settings?.searchRegion),
  );
  const [packageRegion, setPackageRegion] = useState<SearchRegion | null>(() =>
    readRegion(pin1Conf.packageRegion ?? settings?.packageRegion),
  );
  const [regionEditMode, setRegionEditMode] = useState<Pin1RegionEditMode>("search");

  const [dragState, setDragState] = useState<RegionDrag | null>(null);
  const [source, setSource] = useState<WhiteBoxMarkingInput | null>(null);
  const [detectedHoles, setDetectedHoles] = useState<Pin1HoleItem[]>([]);
  const [registeredPin1, setRegisteredPin1] = useState<Pin1HoleItem | null>(() => {
    if (pin1Conf.registeredPin1) {
      const reg = pin1Conf.registeredPin1;

      return {
        ...reg,
        centerX: reg.centerX ?? reg.x,
        centerY: reg.centerY ?? reg.y,
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
  const [hasGreyscalePreview, setHasGreyscalePreview] = useState(true);

  const getVisibleHoles = useCallback(
    (holes: Pin1HoleItem[]): Pin1HoleItem[] => {
      const kept = holes.filter((h) => h.isKept);

      if (kept.length === 0) {
        return [];
      }

      if (registeredPin1) {
        const best = [...kept].sort((a, b) => {
          const da = Math.hypot(a.centerX - registeredPin1.centerX, a.centerY - registeredPin1.centerY);
          const db = Math.hypot(b.centerX - registeredPin1.centerX, b.centerY - registeredPin1.centerY);

          return da - db;
        })[0];

        return holes.map((h) => ({
          ...h,
          isPrimaryPin1: h.id === best.id,
        })).filter((h) => h.id === best.id);
      }

      const best = kept.find((h) => h.isPrimaryPin1) ?? kept[0];

      return holes.map((h) => ({
        ...h,
        isPrimaryPin1: h.id === best.id,
      })).filter((h) => h.id === best.id);
    },
    [registeredPin1],
  );

  const localDetection = useCallback(
    (inputSource: WhiteBoxMarkingInput, region: SearchRegion | null) => {
      const holes = detectRoundHolesInRegion({
        targetRgba: inputSource.rgba,
        targetWidth: inputSource.width,
        targetHeight: inputSource.height,
        searchRegion: region,
        polarity,
        thresholdLuma,
        minCircularityPercent: minCircularity,
        minRadiusPx,
        maxRadiusPx,
      });

      const visibleHoles = getVisibleHoles(holes);
      setDetectedHoles(visibleHoles);

      const res = evaluatePin1AgainstReference({
        detectedHoles: visibleHoles,
        registeredPin1,
        searchRegion: region,
        packageRegion,
        tolerancePx,
      });

      setMatchResult(res);

      return { holes: visibleHoles, res };
    },
    [
      polarity,
      thresholdLuma,
      minCircularity,
      minRadiusPx,
      maxRadiusPx,
      registeredPin1,
      tolerancePx,
      getVisibleHoles,
      packageRegion,
    ],
  );

  const executeDetection = useCallback(
    async (
      inputSource: WhiteBoxMarkingInput,
      region: SearchRegion | null,
      overrides?: {
        polarity?: HolePolarityType;
        thresholdLuma?: number;
      },
    ): Promise<{ holes: Pin1HoleItem[]; res: Pin1MatchResult }> => {
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
            MinCircularityPercent: minCircularity,
            MinRadiusPx: minRadiusPx,
            MaxRadiusPx: maxRadiusPx,
            TolerancePx: tolerancePx,
            SearchRegion: region
              ? { X: region.x, Y: region.y, Width: region.width, Height: region.height }
              : null,
            PackageRegion: packageRegion
              ? {
                  X: packageRegion.x,
                  Y: packageRegion.y,
                  Width: packageRegion.width,
                  Height: packageRegion.height,
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

        return { holes, res: visibleRes };
      } catch {
        return localDetection(inputSource, region);
      }
    },
    [
      polarity,
      thresholdLuma,
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
    const explicitUrl =
      (props as any)?.imageRef ||
      (props?.settings as any)?.imageRef;

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
      } catch {
        // Ignored
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
            shape: "rectangle",
            geometry: {
              x: searchRegion.x,
              y: searchRegion.y,
              width: searchRegion.width,
              height: searchRegion.height,
            },
          }
        : prev?.searchRegion,
      packageRegion,
      pin1Config: {
        polarity,
        thresholdLuma,
        minCircularityPercent: minCircularity,
        minRadiusPx,
        maxRadiusPx,
        tolerancePx,
        registeredPin1,
        searchRegion,
        packageRegion,
        centerX: registeredPin1.centerX,
        centerY: registeredPin1.centerY,
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
    packageRegion,
    props?.onChange,
  ]);

  const handleSearchRegionChange = useCallback(
    (newRegion: SearchRegion | null) => {
      setSearchRegion(newRegion);

      if (source && newRegion && newRegion.width > 5 && newRegion.height > 5) {
        void executeDetection(source, newRegion);
      }
    },
    [source, executeDetection],
  );

  const handlePackageRegionChange = useCallback((newRegion: SearchRegion | null) => {
    setPackageRegion(newRegion);
  }, []);

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
    setThresholdLuma(val);

    if (source) void executeDetection(source, searchRegion, { thresholdLuma: val });
  };

  const handlePolarityChange = (val: HolePolarityType) => {
    setPolarity(val);

    if (source) void executeDetection(source, searchRegion, { polarity: val });
  };

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
    setMessage("Captured frame from camera. Analyzing workpiece for circular Pin 1 fiducial hole...");
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
          tolerancePx,
        });

        setMatchResult(res);
      }

      return updated;
    });
  };

  const includeAllHoles = () => {
    setDetectedHoles((prev) => prev.map((h) => ({ ...h, isKept: true })));
  };

  const excludeAllHoles = () => {
    setDetectedHoles((prev) => prev.map((h) => ({ ...h, isKept: false })));
  };

  const setPrimaryPin1Hole = (holeId: number) => {
    setDetectedHoles((prev) =>
      prev.map((h) => ({
        ...h,
        isPrimaryPin1: h.id === holeId,
      })),
    );

    const targetHole = detectedHoles.find((h) => h.id === holeId);

    if (targetHole) {
      setRegisteredPin1(targetHole);

      if (source) {
        const res = evaluatePin1AgainstReference({
          detectedHoles,
          registeredPin1: targetHole,
          searchRegion,
          packageRegion,
          tolerancePx,
        });

        setMatchResult(res);
      }

      toast.success(`Hole #${targetHole.id} registered as primary Pin 1 origin mark`);
    }
  };

  // ONLY creates or updates rule when user explicitly clicks this button
  const savePin1Rule = useCallback(async () => {
    const primary = detectedHoles.find((h) => h.isPrimaryPin1 && h.isKept) ?? registeredPin1;

    if (!primary) {
      toast.error("Please detect and select a round hole to register as Pin 1 first.");

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
      pin1Config: {
        polarity,
        thresholdLuma,
        minCircularityPercent: minCircularity,
        minRadiusPx,
        maxRadiusPx,
        tolerancePx,
        registeredPin1: primary,
        searchRegion,
        packageRegion,
        centerX: primary.centerX,
        centerY: primary.centerY,
      },
      pin1ConfigJson: JSON.stringify({
        polarity,
        thresholdLuma,
        minCircularityPercent: minCircularity,
        minRadiusPx,
        maxRadiusPx,
        tolerancePx,
        registeredPin1: primary,
        searchRegion,
        packageRegion,
        centerX: primary.centerX,
        centerY: primary.centerY,
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
    packageRegion,
    props,
    navigate,
  ]);

  return {
    source,
    searchRegion,
    packageRegion,
    regionEditMode,
    dragState,
    polarity,
    thresholdLuma,
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
    setIsCameraOpen,
    setDragState,
    handlePolarityChange,
    handleThresholdChange,
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
    savePin1Rule,
  };
}

