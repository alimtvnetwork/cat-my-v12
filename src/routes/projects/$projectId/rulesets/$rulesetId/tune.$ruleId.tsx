import React, { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useProjectStore, selectRulesetsForProject } from "@/lib/projects/store";
import { resolveIdParam, IntAliasNamespaceType } from "@/lib/ids/int-alias";
import type { EditorRule } from "@/lib/editor/types";
import { createDefaultPatternSearchSettings, type PatternSearchSettings } from "@/domain/vision/pattern-search";
import { WhiteBoxMarkingTool } from "@/components/vision/WhiteBoxMarkingTool";
import { Pin1MarkingTool } from "@/components/vision/standard/tools/pin1-config/Pin1MarkingTool";
import { StandardInspectionToolDispatcher } from "@/components/vision/standard/tools/StandardInspectionToolDispatcher";
import type { FormulatedPatternGeometry } from "@/components/vision/white-box/types";

export const Route = createFileRoute("/projects/$projectId/rulesets/$rulesetId/tune/$ruleId")({
  component: TuneRulePage,
});

function readSavedRegion(geometry: any) {
  if (!geometry) return null;
  if (
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

function buildSettingsFromRule(rule: EditorRule, imageRef?: string): PatternSearchSettings {
  const base = createDefaultPatternSearchSettings(rule.id);
  const toolCode = typeof rule.params?.toolCode === "string" ? rule.params.toolCode : "T102";
  const rawThresh = rule.params?.greyscaleLevel ?? rule.params?.threshold ?? 170;
  const rawThreshNum = typeof rawThresh === "number" ? rawThresh : 170;
  const threshold = Number.isFinite(rawThreshNum) ? Math.max(0, Math.min(255, Math.round(rawThreshNum))) : 170;
  const marginPx = typeof rule.params?.marginPx === "number" ? rule.params.marginPx : 8;
  const tolPx = typeof rule.params?.tolerancePx === "number" ? rule.params.tolerancePx : 8;

  let activeBoxCount = typeof rule.params?.activeBoxCount === "number" ? rule.params.activeBoxCount : 1;
  let totalBoxCount = typeof rule.params?.totalBoxCount === "number" ? rule.params.totalBoxCount : 1;

  let referenceBoxes = (base as any).referenceBoxes || [];
  const hasRefBoxes = Array.isArray(rule.params?.referenceBoxes) && rule.params.referenceBoxes.length > 0;
  const hasConstellation = Array.isArray((rule.params as any)?.constellation) && (rule.params as any).constellation.length > 0;
  
  if (hasConstellation) {
    referenceBoxes = (rule.params as any).constellation;
  } else if (hasRefBoxes) {
    referenceBoxes = rule.params!.referenceBoxes as any;
  }
  
  activeBoxCount = Math.max(1, referenceBoxes.length);
  totalBoxCount = Math.max(1, referenceBoxes.length);

  return {
    ...base,
    toolCode,
    threshold,
    marginPx,
    tolerancePx: tolPx,
    activeBoxCount,
    totalBoxCount,
    referenceBoxes,
    ...(rule.params?.searchRegion ? { searchRegion: rule.params.searchRegion as any } : {}),
    ...(rule.params?.patternRegion ? { patternRegion: rule.params.patternRegion as any } : {}),
    ...(Array.isArray(rule.params?.maskRegions) ? { maskRegions: rule.params.maskRegions as any } : {}),
    ...((rule.params as any)?.pin1Config ? { pin1Config: (rule.params as any).pin1Config } : {}),
    ...((rule.params as any)?.packageRegion ? { packageRegion: (rule.params as any).packageRegion } : {})
  } as unknown as PatternSearchSettings;
}

function TuneRulePage() {
  const { projectId, rulesetId, ruleId } = Route.useParams();
  const navigate = useNavigate();

  const rulesets = useProjectStore((s) => selectRulesetsForProject(s, projectId));
  const resolvedRulesetId = useMemo(
    () => resolveIdParam(IntAliasNamespaceType.Ruleset, rulesetId) || rulesetId,
    [rulesetId],
  );
  const ruleset = useMemo(
    () =>
      rulesets.find(
        (r: any) =>
          r.id === rulesetId ||
          r.id === resolvedRulesetId ||
          resolveIdParam(IntAliasNamespaceType.Ruleset, r.id) === rulesetId,
      ),
    [rulesets, rulesetId, resolvedRulesetId],
  );
  
  const rule = useMemo(() => ruleset?.rules.find((r: any) => r.id === ruleId) as EditorRule | undefined, [ruleset, ruleId]);

  const initialSettings = useMemo(() => {
    if (!rule) return null;
    return buildSettingsFromRule(rule, ruleset?.imageRef);
  }, [rule, ruleset?.imageRef]);
  
  const [settings, setSettings] = useState<any>(initialSettings);

  if (!ruleset || !rule || !settings) {
    return <div className="flex h-full w-full items-center justify-center bg-[#0b0c10] text-ca-ink">Rule not found.</div>;
  }

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

  const effectiveImageRef = ruleset.imageRef || "";

  const navigateBack = async () => {
    await navigate({
      to: "/projects/$projectId",
      params: { projectId },
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        ruleset: rulesetId,
      })
    });
  };

  const applyRuleToStore = async (updatedRule: EditorRule) => {
    const nextRules = ruleset.rules.map((r: any) => (r.id === updatedRule.id ? updatedRule : r));
    useProjectStore.getState().updateRulesetRules(ruleset.id, nextRules);
    await navigateBack();
  };

  function handleApplyPattern(pattern: FormulatedPatternGeometry): void {
    const rawThresh = Number((settings as any).threshold ?? (rule?.params as any)?.threshold ?? 170);
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
    const maskRegions = pattern.maskRegions.map((region: any) => ({
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
    }));
    
    if (!rule) return;
    
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

    applyRuleToStore(nextRule);
  }

  function handleApplyPin1(configPayload?: any): void {
    const pin1Config =
      configPayload?.pin1Config ??
      (settings as any)?.pin1Config ??
      (rule?.params as any)?.pin1Config ?? {
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

    if (!rule) return;

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

    applyRuleToStore(nextRule);
  }

  function handleApplyStandardTool(): void {
    const rawRegion = (settings as any).searchRegion;
    const geom = (rawRegion as any)?.geometry ?? rawRegion ?? {
      x: rule?.x ?? 0,
      y: rule?.y ?? 0,
      width: rule?.width ?? 100,
      height: rule?.height ?? 100,
    };

    const ruleX = Number(geom.x ?? rule?.x);
    const ruleY = Number(geom.y ?? rule?.y);
    const ruleW = Number(geom.width ?? rule?.width);
    const ruleH = Number(geom.height ?? rule?.height);

    const pin1Config = (settings as any)?.pin1Config;
    
    if (!rule) return;

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

    applyRuleToStore(nextRule);
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#0b0c10] font-hmi antialiased">
      {isGreyscalePattern ? (
        <WhiteBoxMarkingTool
          settings={settings}
          onSettingsChange={setSettings}
          actionButtonLabel="Apply & Return"
          onApply={handleApplyPattern}
          onCancel={navigateBack}
          imageRef={effectiveImageRef}
        />
      ) : isPin1 ? (
        <Pin1MarkingTool
          actionButtonLabel="Apply & Return"
          {...({
            settings,
            onChange: setSettings,
            onApply: handleApplyPin1,
            onOk: handleApplyPin1,
            onCancel: navigateBack,
            imageRef: effectiveImageRef,
          } as any)}
        />
      ) : (
        <StandardInspectionToolDispatcher
          toolType={toolCode || rule.categoryName}
          ruleName={rule.name}
          settings={settings}
          onChange={setSettings}
          onOk={handleApplyStandardTool}
          onCancel={navigateBack}
        />
      )}
    </div>
  );
}
