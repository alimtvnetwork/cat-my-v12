import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ShapeType } from "@/domain/vision/shapes";
import {
  createDefaultPatternSearchSettings,
  ImageSourceType,
  RenderModeType,
} from "@/domain/vision/pattern-search";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { makeRuleFacade } from "@/lib/rules/facade";
import type { Rule, RuleId } from "@/lib/rules/model";
import {
  readImageFile,
  markWhiteBoxes,
  type WhiteBoxMark,
  type WhiteBoxMarkingInput,
  type WhiteBoxMarkingResult,
  type SearchRegion,
} from "@/lib/vision/white-box-marking";
import { computePatternGeometry } from "@/components/vision/white-box/pattern-geometry";
import type {
  DefectMarkingToolProps,
  RegionDrag,
} from "./types";
import type { FormulatedPatternGeometry } from "@/components/vision/white-box/types";

export function useDefectMarking(props?: DefectMarkingToolProps) {
  const requestIdRef = useRef(0);
  const [source, setSource] = useState<WhiteBoxMarkingInput | null>(null);
  const [result, setResult] = useState<WhiteBoxMarkingResult | null>(null);
  const [detectedBoxes, setDetectedBoxes] = useState<WhiteBoxMark[]>([]);
  const [excludedNumbers, setExcludedNumbers] = useState<Set<number>>(new Set());

  const initialSettings = props?.settings as any;
  const [marginPx, setMarginPx] = useState(() => initialSettings?.marginPx ?? 8);
  const [greyscaleLevel, setGreyscaleLevel] = useState(() => initialSettings?.threshold ?? 170);
  const [searchRegion, setSearchRegion] = useState<SearchRegion | null>(() => {
    const sr = initialSettings?.searchRegion;

    if (!sr) return null;

    if (sr.geometry && typeof sr.geometry.x === "number") {
      return {
        x: sr.geometry.x,
        y: sr.geometry.y,
        width: sr.geometry.width,
        height: sr.geometry.height,
      };
    }

    if (typeof sr.x === "number") {
      return {
        x: sr.x,
        y: sr.y,
        width: sr.width,
        height: sr.height,
      };
    }

    return null;
  });

  const [dragState, setDragState] = useState<RegionDrag | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [message, setMessage] = useState("Load defect sample image to start.");

  const formulatedDefect = useMemo<FormulatedPatternGeometry | null>(() => {
    if (source === null || detectedBoxes.length === 0) {
      return null;
    }

    return computePatternGeometry({
      boxes: detectedBoxes,
      excludedNumbers,
      marginPx,
      imageWidth: source.width,
      imageHeight: source.height,
    });
  }, [detectedBoxes, excludedNumbers, marginPx, source]);

  async function loadFile(file: File | undefined): Promise<void> {
    if (file === undefined) {
      return;
    }

    const input = await readImageFile(file);
    setSource(input);
    setResult(null);
    setDetectedBoxes([]);
    setExcludedNumbers(new Set());
    setSearchRegion(null);
    setMessage(`Loaded image (${input.width}x${input.height}). Draw defect search region.`);
  }

  function loadCapturedFrame(frame: WhiteBoxMarkingInput): void {
    setSource(frame);
    setResult(null);
    setDetectedBoxes([]);
    setExcludedNumbers(new Set());
    setSearchRegion(null);
    setMessage(`Captured camera frame (${frame.width}x${frame.height}). Draw defect search region.`);
  }

  function processRegion(input: WhiteBoxMarkingInput, region: SearchRegion): void {
    const requestId = ++requestIdRef.current;
    setIsProcessing(true);
    setMessage("Segmenting defect elements...");

    try {
      const marking = markWhiteBoxes({
        width: input.width,
        height: input.height,
        rgba: input.rgba,
        whiteThreshold: greyscaleLevel,
        minAreaPx: 4,
        searchRegion: region,
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      setResult(marking);
      setDetectedBoxes(marking.boxes);
      setExcludedNumbers(new Set());
      setMessage(`Identified ${marking.boxes.length} defect feature(s).`);
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setMessage(error instanceof Error ? error.message : "Processing failed.");
    } finally {
      if (requestIdRef.current === requestId) {
        setIsProcessing(false);
      }
    }
  }

  function changeGreyscaleLevel(value: number): void {
    setGreyscaleLevel(value);
    setResult(null);
    setDetectedBoxes([]);
    setExcludedNumbers(new Set());

    if (source && searchRegion) {
      processRegion(source, searchRegion);
    } else {
      setMessage(searchRegion === null ? "Draw the defect region." : "Threshold changed. Press Process.");
    }
  }

  function changeMarginPx(value: number): void {
    setMarginPx(Math.max(0, Math.min(100, value)));
  }

  function removeBox(number: number): void {
    setExcludedNumbers((prev) => {
      const next = new Set(prev);
      next.add(number);

      return next;
    });
  }

  function restoreBox(number: number): void {
    setExcludedNumbers((prev) => {
      const next = new Set(prev);
      next.delete(number);

      return next;
    });
  }

  function toggleBox(number: number): void {
    setExcludedNumbers((prev) => {
      const next = new Set(prev);

      if (next.has(number)) {
        next.delete(number);
      } else {
        next.add(number);
      }

      return next;
    });
  }

  function includeAllBoxes(): void {
    setExcludedNumbers(new Set());
  }

  function excludeAllBoxes(): void {
    const all = new Set(detectedBoxes.map((b) => b.number));
    setExcludedNumbers(all);
  }

  function invertExclusions(): void {
    setExcludedNumbers((prev) => {
      const next = new Set<number>();

      for (const box of detectedBoxes) {
        if (!prev.has(box.number)) {
          next.add(box.number);
        }
      }

      return next;
    });
  }

  async function saveDefectRule(): Promise<void> {
    if (formulatedDefect === null) {
      toast.error("No active defect elements to save");

      return;
    }

    if (formulatedDefect.activeBoxCount === 0) {
      toast.error("At least 1 defect feature must be retained");

      return;
    }

    setIsSaving(true);
    setSaveMessage("Saving defect rule...");

    try {
      const facade = makeRuleFacade();
      const allRules = facade.list();
      const rawId = props?.settings?.id;
      const formattedRawId = rawId
        ? ((rawId.startsWith("rule-") ? rawId : `rule-${rawId}`) as RuleId)
        : null;

      const boxCount = formulatedDefect.activeBoxCount;
      const canonicalRuleName = `defect-match-${boxCount}-flaw`;
      const defaultRuleId = `rule-defect-match-${boxCount}-flaw` as RuleId;

      const targetRuleId: RuleId =
        formattedRawId ?? defaultRuleId;

      const ruleName = canonicalRuleName;

      const defaultSettings = createDefaultPatternSearchSettings(targetRuleId);
      const computedSearchGeometry = searchRegion
        ? {
            x: searchRegion.x,
            y: searchRegion.y,
            width: searchRegion.width,
            height: searchRegion.height,
          }
        : {
            x: Math.max(0, formulatedDefect.x - marginPx),
            y: Math.max(0, formulatedDefect.y - marginPx),
            width: formulatedDefect.width + marginPx * 2,
            height: formulatedDefect.height + marginPx * 2,
          };

      const constellation = formulatedDefect.referenceBoxes.map((b) => ({
        boxNumber: b.number,
        x: b.x,
        y: b.y,
        relX: b.x - formulatedDefect.x,
        relY: b.y - formulatedDefect.y,
        width: b.width,
        height: b.height,
        area: b.area,
      }));

      const referenceBoxes = formulatedDefect.referenceBoxes.map((b) => ({
        boxNumber: b.number,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        area: b.area,
      }));

      const conditionPayload = {
        ...defaultSettings,
        id: targetRuleId,
        name: ruleName,
        toolType: "Defect Matching",
        toolId: "tool-defect-matching",
        type: "defect_match",
        isDefectReject: true,
        threshold: greyscaleLevel,
        marginPx,
        tolerancePx: formulatedDefect.tolerancePx,
        activeBoxCount: formulatedDefect.activeBoxCount,
        totalBoxCount: formulatedDefect.totalBoxCount,
        minMatchPercent: 70,
        view: {
          source: ImageSourceType.Camera,
          rendering: RenderModeType.Normal,
          zoom: 100,
        },
        searchRegion: {
          shape: ShapeType.Rectangle,
          geometry: computedSearchGeometry,
        },
        patternRegion: {
          shape: ShapeType.Rectangle,
          geometry: {
            x: formulatedDefect.x,
            y: formulatedDefect.y,
            width: formulatedDefect.width,
            height: formulatedDefect.height,
          },
        },
        region: {
          x: formulatedDefect.x,
          y: formulatedDefect.y,
          width: formulatedDefect.width,
          height: formulatedDefect.height,
        },
        patternBounds: {
          x: formulatedDefect.x,
          y: formulatedDefect.y,
          width: formulatedDefect.width,
          height: formulatedDefect.height,
        },
        referenceBoxes,
        constellation,
      };

      const existingRule = allRules.find((r) => r.id === targetRuleId);
      const newRule: Rule = {
        id: targetRuleId,
        name: existingRule ? existingRule.name : ruleName,
        isCategory: false,
        appliesBefore: existingRule ? existingRule.appliesBefore : [],
        conditions: [conditionPayload as any],
        createdAt: existingRule?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: `Flaw defect matching template (${boxCount} features, threshold ${greyscaleLevel}). Inverted decision: match = reject.`,
      };

      await facade.save(newRule);
      setSaveMessage(`Saved defect rule ${ruleName}`);
      toast.success(`Saved defect rule ${ruleName}`);

      if (typeof window !== "undefined") {
        window.location.href = `/setup/rules/${targetRuleId}`;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to save defect rule";
      toast.error(errMsg);
      setSaveMessage(errMsg);
    } finally {
      setIsSaving(false);
    }
  }

  return {
    source,
    result,
    detectedBoxes,
    excludedNumbers,
    marginPx,
    greyscaleLevel,
    searchRegion,
    dragState,
    isProcessing,
    isSaving,
    saveMessage,
    message,
    formulatedDefect,
    setSearchRegion,
    setDragState,
    loadFile,
    loadCapturedFrame,
    processRegion,
    changeGreyscaleLevel,
    changeMarginPx,
    removeBox,
    restoreBox,
    toggleBox,
    includeAllBoxes,
    excludeAllBoxes,
    invertExclusions,
    saveDefectRule,
  };
}
