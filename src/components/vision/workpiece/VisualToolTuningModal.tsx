import React, { useCallback, useMemo, useState } from "react";
import { X, Sliders, Check } from "lucide-react";
import type { EditorRule } from "@/lib/editor/types";
import {
  createDefaultPatternSearchSettings,
  type PatternSearchSettings,
} from "@/domain/vision/pattern-search";
import { ShapeType } from "@/domain/vision/shapes";
import { WhiteBoxMarkingTool } from "../WhiteBoxMarkingTool";
import { Pin1MarkingTool } from "../standard/tools/pin1-config/Pin1MarkingTool";
import { StandardInspectionToolDispatcher } from "../standard/tools/StandardInspectionToolDispatcher";
import type { FormulatedPatternGeometry } from "../white-box/types";
import { defaultWorkpieceFilledSample } from "@/lib/vision/workpiece-rule-analyzer";

export interface VisualToolTuningModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: EditorRule;
  onApplyRule: (updatedRule: EditorRule) => void;
  imageRef?: string;
  onImageRegistered?: (imageRef: string) => void;
}

function buildSettingsFromRule(rule: EditorRule, imageRef?: string): PatternSearchSettings {
  const base = createDefaultPatternSearchSettings(rule.id);
  const toolCode = typeof rule.params?.toolCode === "string" ? rule.params.toolCode : "T102";
  const rawThresh = rule.params?.greyscaleLevel ?? rule.params?.threshold ?? 170;
  const rawThreshNum = typeof rawThresh === "number" ? rawThresh : 170;
  const threshold = Number.isFinite(rawThreshNum) ? Math.max(0, Math.min(255, Math.round(rawThreshNum))) : 170;
  const marginPx = typeof rule.params?.marginPx === "number" ? rule.params.marginPx : 8;
  const tolPx = typeof rule.params?.tolerancePx === "number" ? rule.params.tolerancePx : 8;

  let referenceBoxes = undefined;

  if (typeof rule.params?.constellationJson === "string") {
    try {
      referenceBoxes = JSON.parse(rule.params.constellationJson);
    } catch {
      // Ignored
    }
  }

  let pin1Config = (rule.params as any)?.pin1Config;

  if (!pin1Config && typeof rule.params?.pin1ConfigJson === "string") {
    try {
      pin1Config = JSON.parse(rule.params.pin1ConfigJson);
    } catch {
      // Ignored
    }
  }

  const savedSearchRegion =
    readSavedRegion((rule.params as any)?.searchRegion) ??
    readSavedRegion((rule.params as any)?.searchRegionJson) ??
    readSavedRegion(pin1Config?.searchRegion);
  const savedPackageRegion =
    readSavedRegion((rule.params as any)?.packageRegion) ??
    readSavedRegion((rule.params as any)?.packageRegionJson) ??
    readSavedRegion(pin1Config?.packageRegion);
  const tuningSearchRegion = savedSearchRegion ?? {
    x: rule.x,
    y: rule.y,
    width: rule.width,
    height: rule.height,
  };

  return {
    ...base,
    name: rule.name,
    searchRegion: {
      shape: ShapeType.Rectangle,
      geometry: tuningSearchRegion,
    },
    patternRegion: {
      shape: ShapeType.Rectangle,
      geometry: { x: rule.x, y: rule.y, width: rule.width, height: rule.height },
    },
    ...({
      toolType: toolCode === "T102" ? "Greyscale Pattern Matching" : rule.name,
      threshold,
      marginPx,
      tolerancePx: tolPx,
      referenceBoxes,
      constellation: referenceBoxes,
      imageRef,
      pin1Config: pin1Config
        ? {
            ...pin1Config,
            searchRegion: savedSearchRegion ?? pin1Config.searchRegion,
            packageRegion: savedPackageRegion ?? pin1Config.packageRegion,
          }
        : pin1Config,
      packageRegion: savedPackageRegion,
    } as any),
  };
}

function readSavedRegion(rawRegion: unknown): { x: number; y: number; width: number; height: number } | null {
  let value = rawRegion;

  if (typeof rawRegion === "string") {
    try {
      value = JSON.parse(rawRegion);
    } catch {
      return null;
    }
  }

  const geometry = (value as any)?.geometry ?? value;

  if (
    geometry &&
    typeof (geometry as any).x === "number" &&
    typeof (geometry as any).y === "number" &&
    typeof (geometry as any).width === "number" &&
    typeof (geometry as any).height === "number"
  ) {
    return {
      x: Math.round((geometry as any).x),
      y: Math.round((geometry as any).y),
      width: Math.round((geometry as any).width),
      height: Math.round((geometry as any).height),
    };
  }

  return null;
}

export function VisualToolTuningModal({
  isOpen,
  onClose,
  rule,
  onApplyRule,
  imageRef,
  onImageRegistered,
}: VisualToolTuningModalProps): React.JSX.Element | null {
  const initialSettings = useMemo(() => buildSettingsFromRule(rule, imageRef), [rule, imageRef]);
  const [settings, setSettings] = useState<PatternSearchSettings>(initialSettings);
  const [registeredImageRef, setRegisteredImageRef] = useState<string | undefined>(imageRef);

  const toolCode = typeof rule.params?.toolCode === "string" ? rule.params.toolCode : "";
  const normalizedName = rule.name.toLowerCase();

  const isGreyscalePattern =
    toolCode === "T102" ||
    toolCode === "T116" ||
    toolCode === "greyscale_pattern_match" ||
    normalizedName.includes("pattern match") ||
    normalizedName.includes("greyscale pattern") ||
    normalizedName.includes("white box");

  const isPin1 =
    toolCode === "T105" ||
    toolCode === "T117" ||
    toolCode === "pin1_config" ||
    normalizedName.includes("pin 1") ||
    normalizedName.includes("pin1");

  const effectiveImageRef = registeredImageRef || imageRef || defaultWorkpieceFilledSample;
  const handleImageRegistered = useCallback(
    (nextImageRef: string) => {
      setRegisteredImageRef(nextImageRef);
      setSettings((prev) => ({
        ...prev,
        imageRef: nextImageRef,
      }));
      onImageRegistered?.(nextImageRef);
    },
    [onImageRegistered],
  );

  if (!isOpen) {
    return null;
  }

  function handleApplyPattern(pattern: FormulatedPatternGeometry): void {
    const rawThresh = Number((settings as any).threshold ?? (rule.params as any)?.threshold ?? 170);
    const threshold = Number.isFinite(rawThresh) ? Math.max(0, Math.min(255, Math.round(rawThresh))) : 170;
    const searchRegion = {
      x: pattern.searchRegion.x,
      y: pattern.searchRegion.y,
      width: pattern.searchRegion.width,
      height: pattern.searchRegion.height,
    };
    const patternRegion = {
      x: pattern.patternRegion.x,
      y: pattern.patternRegion.y,
      width: pattern.patternRegion.width,
      height: pattern.patternRegion.height,
    };
    const maskRegions = pattern.maskRegions.map((region) => ({
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
    }));
    const updatedParams = {
      ...(rule.params ?? {}),
      threshold,
      greyscaleLevel: threshold,
      lumaTolerance: (rule.params as any)?.lumaTolerance ?? 32,
      marginPx: pattern.marginPx,
      tolerancePx: pattern.tolerancePx,
      activeBoxCount: pattern.activeBoxCount,
      totalBoxCount: pattern.totalBoxCount,
      referenceBoxes: pattern.referenceBoxes,
      constellation: pattern.referenceBoxes,
      constellationJson: JSON.stringify(pattern.referenceBoxes),
      searchRegion,
      patternRegion,
      maskRegions,
      searchRegionJson: JSON.stringify(searchRegion),
      patternRegionJson: JSON.stringify(patternRegion),
      maskRegionsJson: JSON.stringify(maskRegions),
      referenceBoxesJson: JSON.stringify(pattern.referenceBoxes),
      x: pattern.x,
      y: pattern.y,
      width: pattern.width,
      height: pattern.height,
    };

    const nextRule: EditorRule = {
      ...rule,
      x: pattern.x,
      y: pattern.y,
      width: pattern.width,
      height: pattern.height,
      params: updatedParams as any,
    };

    onApplyRule(nextRule);
    onClose();
  }

  function handleApplyPin1(configPayload?: any): void {
    const pin1Config =
      configPayload?.pin1Config ??
      (settings as any)?.pin1Config ??
      (rule.params as any)?.pin1Config ?? {
        registeredPin1: {
          x: 249,
          y: 264,
          centerX: 249,
          centerY: 264,
          radius: 24,
          confidence: 1.0,
        },
        centerX: 249,
        centerY: 264,
        radius: 24,
        relativeX: 26,
        relativeY: 49,
        tolerancePx: 25,
        nominalAngleDeg: -146.0,
        angleToleranceDeg: 10.0,
        thresholdLuma: 35,
      };

    const pinReg = pin1Config.registeredPin1;
    const holeX = Number(pinReg?.x ?? pinReg?.centerX ?? pin1Config?.centerX ?? 249);
    const holeY = Number(pinReg?.y ?? pinReg?.centerY ?? pin1Config?.centerY ?? 264);
    const searchRegion =
      readSavedRegion(configPayload?.searchRegion) ??
      readSavedRegion(pin1Config?.searchRegion) ??
      readSavedRegion((settings as any)?.searchRegion) ??
      null;
    const packageRegion =
      readSavedRegion(configPayload?.packageRegion) ??
      readSavedRegion(pin1Config?.packageRegion) ??
      readSavedRegion((settings as any)?.packageRegion) ??
      null;
    const enrichedPin1Config = {
      ...pin1Config,
      ...(searchRegion ? { searchRegion } : {}),
      ...(packageRegion ? { packageRegion } : {}),
    };

    const ruleX = Math.round(Math.max(0, holeX - 25));
    const ruleY = Math.round(Math.max(0, holeY - 25));
    const ruleW = 50;
    const ruleH = 50;

    const updatedParams = {
      ...(rule.params ?? {}),
      ...((settings as any).params ?? {}),
      ...(configPayload?.params ?? {}),
      ...(searchRegion ? { searchRegion, searchRegionJson: JSON.stringify(searchRegion) } : {}),
      ...(packageRegion ? { packageRegion, packageRegionJson: JSON.stringify(packageRegion) } : {}),
      pin1Config: enrichedPin1Config,
      pin1ConfigJson: JSON.stringify(enrichedPin1Config),
      x: ruleX,
      y: ruleY,
      width: ruleW,
      height: ruleH,
    };

    const nextRule: EditorRule = {
      ...rule,
      x: ruleX,
      y: ruleY,
      width: ruleW,
      height: ruleH,
      params: updatedParams as any,
    };

    onApplyRule(nextRule);
    onClose();
  }

  function handleApplyStandardTool(): void {
    const rawRegion = settings.searchRegion;
    const geom = (rawRegion as any)?.geometry ?? rawRegion ?? {
      x: rule.x,
      y: rule.y,
      width: rule.width,
      height: rule.height,
    };

    const ruleX = Number(geom.x ?? rule.x);
    const ruleY = Number(geom.y ?? rule.y);
    const ruleW = Number(geom.width ?? rule.width);
    const ruleH = Number(geom.height ?? rule.height);

    const pin1Config = (settings as any)?.pin1Config;

    const updatedParams = {
      ...(rule.params ?? {}),
      ...((settings as any).params ?? {}),
      ...(pin1Config ? { pin1Config, pin1ConfigJson: JSON.stringify(pin1Config) } : {}),
      x: ruleX,
      y: ruleY,
      width: ruleW,
      height: ruleH,
    };

    const nextRule: EditorRule = {
      ...rule,
      x: ruleX,
      y: ruleY,
      width: ruleW,
      height: ruleH,
      params: updatedParams as any,
    };

    onApplyRule(nextRule);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="visual-tool-tuning-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
    >
      <div className="flex h-full w-full flex-col overflow-hidden">
        {isGreyscalePattern ? (
          <WhiteBoxMarkingTool
            settings={settings}
            onSettingsChange={setSettings}
            actionButtonLabel="Apply to Rule"
            onApply={handleApplyPattern}
            onCancel={onClose}
            imageRef={effectiveImageRef}
            onImageRegistered={handleImageRegistered}
          />
        ) : isPin1 ? (
          <Pin1MarkingTool
            actionButtonLabel="Apply to Rule"
            {...({
              settings,
              onChange: setSettings,
              onApply: handleApplyPin1,
              onOk: handleApplyPin1,
              onCancel: onClose,
              imageRef: effectiveImageRef,
              onImageRegistered: handleImageRegistered,
            } as any)}
          />
        ) : (
          <StandardInspectionToolDispatcher
            toolType={toolCode || rule.categoryName}
            ruleName={rule.name}
            settings={settings}
            onChange={setSettings}
            onOk={handleApplyStandardTool}
            onCancel={onClose}
          />
        )}
      </div>
    </div>
  );
}
