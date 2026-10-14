import React, { useCallback, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useProjectStore, selectRulesetsForProject } from "@/lib/projects/store";
import { resolveIdParam, toIntParam, IntAliasNamespaceType } from "@/lib/ids/int-alias";
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
    imageRef,
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
    const ruleImageRef =
      typeof (rule.params as any)?.imageRef === "string" ? ((rule.params as any).imageRef as string) : undefined;

    return buildSettingsFromRule(rule, ruleImageRef);
  }, [rule]);
  
  const [settings, setSettings] = useState<any>(initialSettings);

  const handleImageRegistered = useCallback(
    (imageRef: string) => {
      setSettings((prev: any) => ({
        ...prev,
        imageRef,
      }));
    },
    [],
  );

  if (!ruleset || !rule || !settings) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#06080d] text-slate-400 font-mono text-xs">
        Rule not found.
      </div>
    );
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
    toolCode === "T103" ||
    toolCode === "T105" ||
    toolCode === "T117" ||
    toolCode === "pin1_config" ||
    toolCode === "pin1_orientation" ||
    normalizedName.includes("orientation") ||
    normalizedName.includes("pin 1") ||
    normalizedName.includes("pin1");

  const effectiveImageRef =
    typeof (settings as any)?.imageRef === "string" ? ((settings as any).imageRef as string) : undefined;
  const isGuidedSimulation = new URLSearchParams(window.location.search).get("guided") === "1";

  const navigateBack = async () => {
    await navigate({
      to: "/projects/$projectId/rulesets/$rulesetId",
      params: {
        projectId,
        rulesetId: toIntParam(IntAliasNamespaceType.Ruleset, ruleset.id),
      },
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
      ...((settings as any)?.imageRef ? { imageRef: (settings as any).imageRef } : {}),
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
      ...((settings as any)?.imageRef ? { imageRef: (settings as any).imageRef } : {}),
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
      ...((settings as any)?.imageRef ? { imageRef: (settings as any).imageRef } : {}),
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

  if (isGuidedSimulation) {
    return (
      <GuidedRuleConfigPreview
        rule={rule}
        imageRef={effectiveImageRef}
        isPin1={isPin1}
        isGreyscalePattern={isGreyscalePattern}
      />
    );
  }

  return (
    <div
      data-tour="rule-config-editor"
      className="flex h-full w-full flex-col overflow-hidden bg-[#06080d] text-slate-100 font-sans antialiased"
    >
      {isGreyscalePattern ? (
        <WhiteBoxMarkingTool
          settings={settings}
          onSettingsChange={setSettings}
          actionButtonLabel="Apply & Return"
          onApply={handleApplyPattern}
          onCancel={navigateBack}
          imageRef={effectiveImageRef}
          onImageRegistered={handleImageRegistered}
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
          onCancel={navigateBack}
        />
      )}
    </div>
  );
}

function GuidedRuleConfigPreview({
  rule,
  imageRef,
  isPin1,
  isGreyscalePattern,
}: {
  rule: EditorRule;
  imageRef?: string;
  isPin1: boolean;
  isGreyscalePattern: boolean;
}): React.JSX.Element {
  const toolCode = typeof rule.params?.toolCode === "string" ? rule.params.toolCode : "T102";
  const pinCfg = (rule.params as any)?.pin1Config;
  const searchRegion = (rule.params as any)?.searchRegion ?? {
    x: rule.x,
    y: rule.y,
    width: rule.width,
    height: rule.height,
  };
  const patternRegion = (rule.params as any)?.patternRegion;
  const boxes = Array.isArray((rule.params as any)?.referenceBoxes)
    ? ((rule.params as any).referenceBoxes as Array<any>)
    : [];

  return (
    <div
      data-tour="rule-config-editor"
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#06080d] text-slate-100 font-sans antialiased"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-[#0a0d14] px-4">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
            Guided Configuration
          </div>
          <h1 className="font-mono text-sm font-black uppercase tracking-wider text-white">
            {rule.name}
          </h1>
        </div>
        <span className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 font-mono text-xs font-bold text-cyan-200">
          {toolCode}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] overflow-hidden">
        <div className="relative flex min-h-0 items-center justify-center overflow-hidden bg-black p-6">
          <div className="relative max-h-full max-w-full">
            {imageRef ? (
              <img
                src={imageRef}
                alt="Guided rule setup"
                className="max-h-[calc(100vh-8rem)] max-w-full rounded border border-white/20 object-contain"
              />
            ) : (
              <div className="flex h-80 w-[520px] items-center justify-center rounded border border-dashed border-white/20 text-xs uppercase tracking-wider text-white/40">
                No image registered
              </div>
            )}
            <div className="pointer-events-none absolute inset-0">
              {isPin1 && pinCfg ? (
                <>
                  <div
                    className="absolute rounded border-2 border-cyan-300/90 bg-cyan-300/10 shadow-[0_0_16px_rgba(34,211,238,0.45)]"
                    style={{
                      left: `${(searchRegion.x / 247) * 100}%`,
                      top: `${(searchRegion.y / 404) * 100}%`,
                      width: `${(searchRegion.width / 247) * 100}%`,
                      height: `${(searchRegion.height / 404) * 100}%`,
                    }}
                  />
                  <div
                    className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.8)]"
                    style={{
                      left: `${((pinCfg.centerX ?? pinCfg.registeredPin1?.x ?? 60) / 247) * 100}%`,
                      top: `${((pinCfg.centerY ?? pinCfg.registeredPin1?.y ?? 280) / 404) * 100}%`,
                    }}
                  />
                </>
              ) : null}
              {isGreyscalePattern && patternRegion ? (
                <>
                  <div
                    className="absolute rounded border-2 border-amber-300/90 bg-amber-300/10 shadow-[0_0_16px_rgba(251,191,36,0.35)]"
                    style={{
                      left: `${(patternRegion.x / 247) * 100}%`,
                      top: `${(patternRegion.y / 404) * 100}%`,
                      width: `${(patternRegion.width / 247) * 100}%`,
                      height: `${(patternRegion.height / 404) * 100}%`,
                    }}
                  />
                  {boxes.slice(0, 8).map((box) => (
                    <div
                      key={box.number}
                      className="absolute rounded-sm border border-emerald-300 bg-emerald-300/15"
                      style={{
                        left: `${(box.x / 247) * 100}%`,
                        top: `${(box.y / 404) * 100}%`,
                        width: `${(box.width / 247) * 100}%`,
                        height: `${(box.height / 404) * 100}%`,
                      }}
                    />
                  ))}
                </>
              ) : null}
            </div>
          </div>
        </div>

        <aside
          data-tour="rule-config-summary-panel"
          className="flex min-h-0 flex-col border-l border-white/10 bg-[#0d1218]"
        >
          <div className="border-b border-white/10 p-4">
            <h2 className="font-mono text-xs font-black uppercase tracking-wider text-white">
              {isPin1 ? "PIN1 Configuration" : "Greyscale Pattern Configuration"}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Lightweight guided preview. The real editor remains available outside the presentation flow.
            </p>
          </div>
          <div className="grid gap-3 p-4 text-xs">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                Search Region
              </div>
              <div className="mt-1 font-mono font-bold text-white">
                {Math.round(searchRegion.x ?? 0)}, {Math.round(searchRegion.y ?? 0)} · {Math.round(searchRegion.width ?? 0)} x {Math.round(searchRegion.height ?? 0)}
              </div>
            </div>
            {isPin1 ? (
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-emerald-200">
                  Registered Pin
                </div>
                <div className="mt-1 font-mono font-bold text-emerald-100">
                  X {Math.round(pinCfg?.centerX ?? pinCfg?.registeredPin1?.x ?? 0)} · Y {Math.round(pinCfg?.centerY ?? pinCfg?.registeredPin1?.y ?? 0)}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-emerald-200">
                  Pattern Boxes
                </div>
                <div className="mt-1 font-mono font-bold text-emerald-100">
                  {boxes.length} active reference boxes
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
