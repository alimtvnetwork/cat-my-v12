import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { fetchBackend } from "@/lib/backend/http";
import { HttpMethod } from "@/lib/constants";
import { ShapeType } from "@/domain/vision/shapes";
import {
  createDefaultPatternSearchSettings,
  ImageSourceType,
  RenderModeType,
} from "@/domain/vision/pattern-search";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { EditorRuleKindType, EditorToolFamilyType } from "@/lib/editor/types";
import { makeRuleFacade } from "@/lib/rules/facade";
import type { Rule, RuleId } from "@/lib/rules/model";
import {
  DraftOriginType,
  getDraft,
  listDraftIds,
  putDraft,
  RuleKindType,
  ToleranceKindType,
  type RuleItem,
  type RuleSetEnvelope,
} from "@/lib/rules/draftStore";
import { syncRuleToBackend } from "@/lib/rules/backendSync";
import {
  readImageFile,
  rgbaToBase64,
  base64ToRgba,
  type WhiteBoxMark,
  type WhiteBoxMarkingInput,
  type WhiteBoxMarkingResult,
  type SearchRegion,
} from "@/lib/vision/white-box-marking";
import { computePatternGeometry } from "./pattern-geometry";
import type { BackendResult, FormulatedPatternGeometry, RegionDrag, WhiteBoxToolProps } from "./types";

export function useWhiteBoxMarking(props?: WhiteBoxToolProps) {
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
  const [message, setMessage] = useState("Load image to start.");

  const formulatedPattern = useMemo<FormulatedPatternGeometry | null>(() => {
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
    setDragState(null);
    setSaveMessage(null);
    setMessage(`Loaded ${file.name}. Draw the required region.`);
  }

  function loadCapturedFrame(input: WhiteBoxMarkingInput): void {
    setSource(input);
    setResult(null);
    setDetectedBoxes([]);
    setExcludedNumbers(new Set());
    setSearchRegion(null);
    setDragState(null);
    setSaveMessage(null);
    setMessage(`Captured frame (${input.width}×${input.height}). Draw the required region.`);
  }

  async function processRegion(input: WhiteBoxMarkingInput, region: SearchRegion): Promise<void> {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsProcessing(true);
    setMessage("Processing...");

    try {
      const envelope = await fetchBackend<BackendResult>("vision/white-box-marking", {
        method: HttpMethod.Post,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Width: input.width,
          Height: input.height,
          RgbaBase64: rgbaToBase64(input.rgba),
          WhiteThreshold: greyscaleLevel,
          SearchRegion: { X: region.x, Y: region.y, Width: region.width, Height: region.height },
        }),
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      const body = envelope.Results[0];
      setResult({
        width: body.Width,
        height: body.Height,
        rgba: base64ToRgba(body.RgbaBase64),
        boxes: body.Boxes,
      });
      setDetectedBoxes(body.Boxes);
      setExcludedNumbers(new Set());
      setMessage(`Marked ${body.Boxes.length} pattern element(s).`);
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
    setMessage(searchRegion === null ? "Draw the required region." : "Greyscale level changed. Press Process.");
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
        if (prev.has(box.number) === false) {
          next.add(box.number);
        }
      }

      return next;
    });
  }

  async function applyPatternGeometry(): Promise<void> {
    if (formulatedPattern === null) {
      return;
    }

    setIsSaving(true);

    try {
      // 1. Resolve Canonical Single Rule in Global Rules Library (RuleFacade)
      const facade = makeRuleFacade();
      const allRules = facade.list();
      const rawId = props?.settings?.id;
      const formattedRawId = rawId
        ? ((rawId.startsWith("rule-") ? rawId : `rule-${rawId}`) as RuleId)
        : null;

      const existingPatternRule = allRules.find(
        (r) =>
          !r.isCategory &&
          r.id !== "rule-logo-match" &&
          r.id !== "rule-logo-presence" &&
          (r.id === formattedRawId ||
            r.id === "rule-greyscale-pattern-01" ||
            r.id.startsWith("rule-greyscale-pattern-match-") ||
            r.id.startsWith("rule-pattern-") ||
            r.id.includes("greyscale-pattern") ||
            (r.conditions?.[0] as any)?.type === "pattern_match" ||
            (r.conditions?.[0] as any)?.toolType === "Greyscale Pattern Matching" ||
            (r.name.toLowerCase().includes("pattern match") &&
              !r.name.toLowerCase().includes("logo"))),
      );

      const boxCount = formulatedPattern.activeBoxCount;
      const canonicalRuleName = `greyscale-pattern-match-${boxCount}-box`;
      const defaultRuleId = `rule-greyscale-pattern-match-${boxCount}-box` as RuleId;

      const targetRuleId: RuleId =
        formattedRawId && formattedRawId !== "rule-logo-match"
          ? formattedRawId
          : existingPatternRule?.id ?? defaultRuleId;

      const ruleName = canonicalRuleName;

      // Prune any duplicate pattern matching rules so strictly 1 rule exists in library
      const duplicates = allRules.filter(
        (r) =>
          !r.isCategory &&
          r.id !== targetRuleId &&
          r.id !== "rule-logo-match" &&
          r.id !== "rule-logo-presence" &&
          (r.id.startsWith("rule-pattern-") ||
            r.id.startsWith("rule-greyscale-pattern-") ||
            r.id.includes("greyscale-pattern") ||
            ((r.conditions?.[0] as any)?.type === "pattern_match" && r.id !== targetRuleId)),
      );

      for (const dup of duplicates) {
        try {
          await facade.remove(dup.id);
        } catch {
          // Ignored if referenced
        }
      }

      const defaultSettings = createDefaultPatternSearchSettings(targetRuleId);
      const computedSearchGeometry = searchRegion
        ? {
            x: searchRegion.x,
            y: searchRegion.y,
            width: searchRegion.width,
            height: searchRegion.height,
          }
        : {
            x: Math.max(0, formulatedPattern.x - marginPx),
            y: Math.max(0, formulatedPattern.y - marginPx),
            width: formulatedPattern.width + marginPx * 2,
            height: formulatedPattern.height + marginPx * 2,
          };

      const constellation = formulatedPattern.referenceBoxes.map((b) => ({
        boxNumber: b.number,
        x: b.x,
        y: b.y,
        relX: b.x - formulatedPattern.x,
        relY: b.y - formulatedPattern.y,
        width: b.width,
        height: b.height,
        area: b.area,
      }));

      const referenceBoxes = formulatedPattern.referenceBoxes.map((b) => ({
        boxNumber: b.number,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        area: b.area,
      }));

      const patternBounds = {
        x: formulatedPattern.x,
        y: formulatedPattern.y,
        width: formulatedPattern.width,
        height: formulatedPattern.height,
      };

      const conditionPayload = {
        ...defaultSettings,
        id: targetRuleId,
        name: ruleName,
        toolType: "Greyscale Pattern Matching",
        toolId: "tool-greyscale-pattern-matching",
        type: "pattern_match",
        threshold: greyscaleLevel,
        marginPx,
        tolerancePx: formulatedPattern.tolerancePx,
        activeBoxCount: formulatedPattern.activeBoxCount,
        totalBoxCount: formulatedPattern.totalBoxCount,
        minMatchPercent: 100,
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
            x: formulatedPattern.x,
            y: formulatedPattern.y,
            width: formulatedPattern.width,
            height: formulatedPattern.height,
          },
        },
        region: {
          x: formulatedPattern.x,
          y: formulatedPattern.y,
          width: formulatedPattern.width,
          height: formulatedPattern.height,
        },
        patternBounds,
        referenceBoxes,
        constellation,
      };

      if (props?.onSettingsChange) {
        props.onSettingsChange((prev) => ({
          ...prev,
          ...conditionPayload,
        }));
      }

      const ruleParams: Record<string, string | number | boolean> = {
        threshold: greyscaleLevel,
        marginPx,
        tolerancePx: formulatedPattern.tolerancePx,
        activeBoxCount: formulatedPattern.activeBoxCount,
        totalBoxCount: formulatedPattern.totalBoxCount,
        minMatchPercent: 100,
        constellationJson: JSON.stringify(constellation),
        ...(searchRegion ? { searchRegionJson: JSON.stringify(searchRegion) } : {}),
      };

      const store = useRulesStore.getState();
      const existingRules = store.rules;
      const targetStoreRule = existingRules.find(
        (r) =>
          r.id !== "rule-logo-match" &&
          (r.id === targetRuleId ||
            r.id.includes("greyscale-pattern") ||
            (r.name.toLowerCase().includes("pattern") &&
              !r.name.toLowerCase().includes("logo"))),
      );

      const targetStoreId = targetStoreRule?.id ?? targetRuleId;
      const updatedStoreRule = {
        id: targetStoreId,
        name: ruleName,
        kind: EditorRuleKindType.R,
        family: EditorToolFamilyType.Rect,
        isHidden: false,
        isLocked: false,
        x: formulatedPattern.x,
        y: formulatedPattern.y,
        width: formulatedPattern.width,
        height: formulatedPattern.height,
        params: ruleParams,
      };

      const nonPatternRules = existingRules.filter(
        (r) =>
          r.id === "rule-logo-match" ||
          (r.id !== targetStoreId &&
            !r.id.includes("greyscale-pattern") &&
            !r.name.toLowerCase().includes("pattern")),
      );
      store.replaceAll([...nonPatternRules, updatedStoreRule], [updatedStoreRule.id]);

      const nowIso = new Date().toISOString();
      const libraryRule: Rule = {
        id: targetRuleId,
        name: ruleName,
        isCategory: false,
        categoryId: existingPatternRule?.categoryId ?? ("cat-presence" as RuleId),
        appliesBefore: existingPatternRule?.appliesBefore ?? [],
        conditions: [conditionPayload as any],
        createdAt: existingPatternRule?.createdAt ?? nowIso,
        updatedAt: nowIso,
        enabled: existingPatternRule?.enabled ?? true,
      };

      try {
        await facade.save(libraryRule);
      } catch (err) {
        console.warn("[useWhiteBoxMarking] Failed to save to RuleFacade:", err);
      }

      // 2. Save to IndexedDB Draft Store & Sync to Backend (PUT /rules/{RuleSetId})
      try {
        await syncRuleToBackend({
          ruleId: targetRuleId,
          ruleName,
          ruleEnabled: existingPatternRule?.enabled ?? true,
          activeBoxCount: formulatedPattern.activeBoxCount,
          totalBoxCount: formulatedPattern.totalBoxCount,
          tolerancePx: formulatedPattern.tolerancePx,
          threshold: greyscaleLevel,
          constellation,
          searchRegion,
          patternBounds,
        });
      } catch (syncErr) {
        console.warn("[useWhiteBoxMarking] syncRuleToBackend error:", syncErr);
      }

      if (props?.onApply) {
        props.onApply(formulatedPattern);
      }

      const isApplyMode = props?.actionButtonLabel === "Apply Pattern" || Boolean(props?.settings);
      const successToast = isApplyMode
        ? `Pattern applied to rule (${libraryRule.name})`
        : `Pattern saved to Rules Library (${libraryRule.name})`;
      toast.success(successToast);

      const statusMsg = isApplyMode
        ? `Applied (${formulatedPattern.activeBoxCount} boxes, ±${marginPx}px margin)!`
        : `Saved (${formulatedPattern.activeBoxCount} boxes, ±${marginPx}px margin)!`;
      setSaveMessage(statusMsg);
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
    formulatedPattern,
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
    applyPatternGeometry,
  };
}
