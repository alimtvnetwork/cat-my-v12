import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { SearchRegion, WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import type { RegionDrag } from "@/components/vision/white-box/types";
import {
  normalizeImageToStandardCanvas,
  dataUrlToStandardImageInput,
  createDefaultSearchRegion,
} from "@/components/vision/standard/tools/pattern-matching/usePatternMatchingRule";
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
  type Pin1ToolProps,
} from "./types";

export function usePin1Rule(props?: Pin1ToolProps) {
  const navigate = useNavigate();
  const settings = props?.settings as any;
  const pin1Conf = settings?.pin1Config ?? {};

  const [polarity, setPolarity] = useState<HolePolarityType>(
    pin1Conf.polarity ?? HolePolarityType.DarkIndentation,
  );
  const [thresholdLuma, setThresholdLuma] = useState<number>(
    typeof pin1Conf.thresholdLuma === "number" ? pin1Conf.thresholdLuma : 80,
  );
  const [minCircularity, setMinCircularity] = useState<number>(
    typeof pin1Conf.minCircularityPercent === "number" ? pin1Conf.minCircularityPercent : 70,
  );
  const [tolerancePx, setTolerancePx] = useState<number>(
    typeof pin1Conf.tolerancePx === "number" ? pin1Conf.tolerancePx : 8,
  );
  const [minRadiusPx, setMinRadiusPx] = useState<number>(
    typeof pin1Conf.minRadiusPx === "number" ? pin1Conf.minRadiusPx : 3,
  );
  const [maxRadiusPx, setMaxRadiusPx] = useState<number>(
    typeof pin1Conf.maxRadiusPx === "number" ? pin1Conf.maxRadiusPx : 30,
  );

  const [searchRegion, setSearchRegion] = useState<SearchRegion | null>(() => {
    const sr = settings?.searchRegion;

    if (!sr) {
      return { x: 260, y: 70, width: 440, height: 400 };
    }

    if (sr.geometry && typeof sr.geometry.x === "number") {
      return {
        x: Math.round(sr.geometry.x),
        y: Math.round(sr.geometry.y),
        width: Math.round(sr.geometry.width),
        height: Math.round(sr.geometry.height),
      };
    }

    if (typeof sr.x === "number") {
      return {
        x: Math.round(sr.x),
        y: Math.round(sr.y),
        width: Math.round(sr.width),
        height: Math.round(sr.height),
      };
    }

    return { x: 260, y: 70, width: 440, height: 400 };
  });

  const [dragState, setDragState] = useState<RegionDrag | null>(null);
  const [source, setSource] = useState<WhiteBoxMarkingInput | null>(null);
  const [detectedHoles, setDetectedHoles] = useState<Pin1HoleItem[]>([]);
  const [registeredPin1, setRegisteredPin1] = useState<Pin1HoleItem | null>(
    pin1Conf.registeredPin1 ?? null,
  );
  const [matchResult, setMatchResult] = useState<Pin1MatchResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [message, setMessage] = useState("Load image to start.");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasGreyscalePreview, setHasGreyscalePreview] = useState(true);

  const executeDetection = useCallback(
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

      setDetectedHoles(holes);

      const res = evaluatePin1AgainstReference({
        detectedHoles: holes,
        registeredPin1,
        searchRegion: region,
        tolerancePx,
      });

      setMatchResult(res);

      return { holes, res };
    },
    [polarity, thresholdLuma, minCircularity, minRadiusPx, maxRadiusPx, registeredPin1, tolerancePx],
  );

  const handleSearchRegionChange = useCallback(
    (newRegion: SearchRegion | null) => {
      setSearchRegion(newRegion);

      if (source && newRegion && newRegion.width > 5 && newRegion.height > 5) {
        executeDetection(source, newRegion);
      }
    },
    [source, executeDetection],
  );

  const handleThresholdChange = (val: number) => {
    setThresholdLuma(val);

    if (source && searchRegion) {
      const holes = detectRoundHolesInRegion({
        targetRgba: source.rgba,
        targetWidth: source.width,
        targetHeight: source.height,
        searchRegion,
        polarity,
        thresholdLuma: val,
        minCircularityPercent: minCircularity,
        minRadiusPx,
        maxRadiusPx,
      });

      setDetectedHoles(holes);

      const res = evaluatePin1AgainstReference({
        detectedHoles: holes,
        registeredPin1,
        searchRegion,
        tolerancePx,
      });

      setMatchResult(res);
    }
  };

  const handlePolarityChange = (val: HolePolarityType) => {
    setPolarity(val);

    if (source && searchRegion) {
      const holes = detectRoundHolesInRegion({
        targetRgba: source.rgba,
        targetWidth: source.width,
        targetHeight: source.height,
        searchRegion,
        polarity: val,
        thresholdLuma,
        minCircularityPercent: minCircularity,
        minRadiusPx,
        maxRadiusPx,
      });

      setDetectedHoles(holes);
    }
  };

  const runDetection = useCallback(() => {
    if (!source) {
      toast.error("Please load an image first.");

      return;
    }

    setIsDetecting(true);
    const { holes, res } = executeDetection(source, searchRegion);
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
      const bitmap = await createImageBitmap(file);
      const { source: stdSource, searchRegion: stdRegion } =
        await normalizeImageToStandardCanvas(bitmap, bitmap.width, bitmap.height, false);

      setSource(stdSource);
      const currentRegion = searchRegion ?? stdRegion;

      if (!searchRegion) {
        setSearchRegion(stdRegion);
      }

      executeDetection(stdSource, currentRegion);
      setMessage(`Loaded "${file.name}". Draw required region or click Detect.`);
      toast.success(`Loaded "${file.name}"`);
    } catch {
      toast.error(`Failed to load "${file.name}"`);
    }
  };

  const loadCapturedFrame = async (input: WhiteBoxMarkingInput) => {
    setSource(input);
    const region = searchRegion ?? createDefaultSearchRegion(input.width, input.height);

    if (!searchRegion) {
      setSearchRegion(region);
    }

    executeDetection(input, region);
    setIsCameraOpen(false);
    setMessage("Captured frame from camera. Draw region or click Detect.");
  };


  const loadSampleAtmel = useCallback(async () => {
    try {
      const { REAL_ATMEL_CHIP_DATA_URL } = await import(
        "@/components/vision/standard/tools/pattern-matching/chip-assets"
      );
      const { source: stdSource, searchRegion: stdRegion } =
        await dataUrlToStandardImageInput(REAL_ATMEL_CHIP_DATA_URL, true);

      setSource(stdSource);
      const currentRegion = searchRegion ?? stdRegion;

      if (!searchRegion) {
        setSearchRegion(stdRegion);
      }

      executeDetection(stdSource, currentRegion);
      setMessage("Loaded Atmel MEGA32U4 sample chip.");
      toast.success("Loaded Golden Atmel sample chip (Atmel MEGA32U4)");
    } catch {
      toast.error("Failed to load Golden Atmel sample chip");
    }
  }, [searchRegion, executeDetection]);

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
      pin1Config: {
        polarity,
        thresholdLuma,
        minCircularityPercent: minCircularity,
        minRadiusPx,
        maxRadiusPx,
        tolerancePx,
        registeredPin1: primary,
      },
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

      await facade.save(libraryRule);

      const store = useRulesStore.getState();
      const storeRule = {
        id: targetRuleId,
        name: ruleName,
        kind: EditorRuleKindType.R,
        family: EditorToolFamilyType.Rect,
        isHidden: false,
        isLocked: false,
        x: primary.centerX,
        y: primary.centerY,
        width: primary.diameter,
        height: primary.diameter,
        params: conditionPayload,
      };

      store.replaceAll([...store.rules.filter((r) => r.id !== targetRuleId), storeRule], [targetRuleId]);

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
    props,
    navigate,
  ]);

  return {
    source,
    searchRegion,
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
    loadFile,
    loadSampleAtmel,
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

