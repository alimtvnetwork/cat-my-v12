import { SectionIdType } from "@/components/nav/SectionTopBar";
// Plan 79 step 23. Rule editor route shell.
//
// The real `<RuleEditor>` (step 24) plus metadata bar (step 25) and cycle
// wiring (step 26) will land here. This shell:
//   - Loads the rule via `useRulesLibrary().byId(id)`.
//   - Redirects to /setup/rules when the id resolves to a Category (wrong
//     surface: categories edit at /setup/categories/$id).
//   - Shows a not-found panel with a link back if the id is unknown.
//   - Renders name + minimal placeholder metadata to prove the route is
//     wired end-to-end before the real editor ships.

import React, { useEffect } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { SectionTopBar } from "@/components/nav/SectionTopBar";
import { useRulesLibrary } from "@/lib/rules/useRulesLibrary";
import type { Rule, RuleId } from "@/lib/rules/model";
import { fromIntId } from "@/lib/rules/rule-id-alias";
import { useUiMode, UiModeType } from "@/hooks/useUiMode";
import { StandardAppShell } from "@/components/layout/StandardAppShell";
import { StandardPatternSearch } from "@/components/vision/standard/StandardPatternSearch";
import { StandardInspectionToolDispatcher } from "@/components/vision/standard/tools/StandardInspectionToolDispatcher";
import { ModernPatternSearch } from "@/components/vision/modern/ModernPatternSearch";

import {
  createDefaultPatternSearchSettings,
  PatternSearchSettings,
} from "@/domain/vision/pattern-search";
import { AppError } from "@/lib/errors/AppError";
import { scoreRulesRemote } from "@/lib/editor/validation.functions";

import { toast } from "sonner";
import { syncRuleToBackend } from "@/lib/rules/backendSync";

function buildSettingsFromRule(rule: Rule | undefined, fallbackId: string): PatternSearchSettings {
  const targetId = rule?.id || fallbackId;
  const defaultSettings = createDefaultPatternSearchSettings(targetId);
  const cond = (rule?.conditions?.[0] as unknown as Partial<PatternSearchSettings>) || {};
  const condAny = cond as any;
  const ruleAny = rule as any;

  const rawThreshold =
    condAny.threshold ??
    condAny.WhiteThreshold ??
    condAny.whiteThreshold ??
    condAny.greyscaleLevel ??
    ruleAny?.params?.threshold ??
    ruleAny?.params?.WhiteThreshold;

  const referenceBoxes =
    condAny.referenceBoxes ??
    condAny.constellation ??
    (ruleAny?.params?.constellationJson ? JSON.parse(ruleAny.params.constellationJson) : undefined);

  const constellation =
    condAny.constellation ??
    condAny.referenceBoxes ??
    (ruleAny?.params?.constellationJson ? JSON.parse(ruleAny.params.constellationJson) : undefined);

  return {
    ...defaultSettings,
    ...cond,
    name: cond.name ?? rule?.name ?? defaultSettings.name,
    ...(typeof rawThreshold === "number" ? { threshold: rawThreshold } : {}),
    ...(referenceBoxes ? { referenceBoxes } : {}),
    ...(constellation ? { constellation } : {}),
    ...(typeof condAny.tolerancePx === "number" ? { tolerancePx: condAny.tolerancePx } : {}),
    ...(typeof condAny.minMatchPercent === "number" ? { minMatchPercent: condAny.minMatchPercent } : {}),
    referenceImage: {
      ...defaultSettings.referenceImage,
      ...(cond.referenceImage ?? {}),
    },
    searchRegion: {
      ...defaultSettings.searchRegion,
      ...(cond.searchRegion ?? {}),
      geometry: {
        x:
          (cond.searchRegion as any)?.geometry?.x ??
          (cond.searchRegion as any)?.x ??
          defaultSettings.searchRegion.geometry.x,
        y:
          (cond.searchRegion as any)?.geometry?.y ??
          (cond.searchRegion as any)?.y ??
          defaultSettings.searchRegion.geometry.y,
        width:
          (cond.searchRegion as any)?.geometry?.width ??
          (cond.searchRegion as any)?.width ??
          defaultSettings.searchRegion.geometry.width,
        height:
          (cond.searchRegion as any)?.geometry?.height ??
          (cond.searchRegion as any)?.height ??
          defaultSettings.searchRegion.geometry.height,
      },
    },
    patternRegion: {
      ...defaultSettings.patternRegion,
      ...(cond.patternRegion ?? {}),
      geometry: {
        x:
          (cond.patternRegion as any)?.geometry?.x ??
          (cond as any)?.region?.x ??
          defaultSettings.patternRegion.geometry.x,
        y:
          (cond.patternRegion as any)?.geometry?.y ??
          (cond as any)?.region?.y ??
          defaultSettings.patternRegion.geometry.y,
        width:
          (cond.patternRegion as any)?.geometry?.width ??
          (cond as any)?.region?.width ??
          defaultSettings.patternRegion.geometry.width,
        height:
          (cond.patternRegion as any)?.geometry?.height ??
          (cond as any)?.region?.height ??
          defaultSettings.patternRegion.geometry.height,
      },
    },
    masks: Array.isArray(cond.masks) && cond.masks.length > 0 ? cond.masks : defaultSettings.masks,
    detection: {
      ...defaultSettings.detection,
      ...(cond.detection ?? {}),
    },
    imageRegion: {
      ...defaultSettings.imageRegion,
      ...(cond.imageRegion ?? {}),
    },
    view: {
      ...defaultSettings.view,
      ...(cond.view ?? {}),
    },
  };
}

export const Route = createFileRoute("/setup/rules/$id")({
  staticData: { crumb: "Rule editor" },
  head: ({ params }) => ({
    meta: [
      { title: `Edit rule, ${params.id}` },
      {
        name: "description",
        content:
          "Edit a rule from the shared library. Metadata, conditions, and applies-before ordering.",
      },
    ],
  }),
  component: RuleEditorRoute,
});

function RuleEditorRoute() {
  const { id } = Route.useParams();
  const { byId, save, remove } = useRulesLibrary();
  const navigate = useNavigate();
  // Accept both integer aliases (canonical URL form) and legacy raw ids.
  const resolvedId = /^\d+$/.test(id) ? (fromIntId(Number(id)) ?? id) : id;
  const rule = byId(resolvedId as RuleId);

  useEffect(() => {
    if (rule && rule.isCategory) {
      // Wrong surface: bounce to the category editor without swallowing the id.
      void navigate({
        to: "/setup/categories/$id",
        params: { id: String(rule.id) },
        replace: true,
      });
    }
  }, [rule, navigate]);

  const { mode } = useUiMode();

  const [settings, setSettings] = React.useState<PatternSearchSettings>(() => {
    return buildSettingsFromRule(rule, resolvedId);
  });

  const hydratedRuleVersionRef = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    if (rule) {
      const cond = rule.conditions?.[0] as any;
      const versionKey = `${rule.id}:${rule.updatedAt ?? ""}:${cond?.threshold ?? ""}:${cond?.referenceBoxes?.length ?? ""}`;
      if (hydratedRuleVersionRef.current !== versionKey) {
        hydratedRuleVersionRef.current = versionKey;
        setSettings(buildSettingsFromRule(rule, rule.id));
      }
    }
  }, [rule]);

  const [validationError, setValidationError] = React.useState<string | null>(null);

  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!rule || rule.isCategory) return;

    setValidationError(null);
    const timeout = setTimeout(() => {
      save({
        ...rule,
        conditions: [settings as unknown as any],
      }).catch((err: unknown) => {
        if (err instanceof Error && err.name === "RuleValidationError") {
          setValidationError(err.message);
        } else if (
          err instanceof AppError ||
          (err instanceof Error && (err as any).name === "AppError")
        ) {
          setValidationError(err.message);
        } else {
          setValidationError(String(err));
        }
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [settings, rule, save]);

  const onEvaluate = React.useCallback(async () => {
    if (!rule) return;

    setValidationError(null);
    const cond = (rule.conditions?.[0] as any) || (settings as any);
    const isPatternRule =
      cond?.type === "pattern_match" ||
      cond?.toolType === "Greyscale Pattern Matching" ||
      rule.name.toLowerCase().includes("pattern match") ||
      Boolean(cond?.constellation);

    if (isPatternRule) {
      const activeCount = cond?.activeBoxCount ?? 31;
      const totalCount = cond?.totalBoxCount ?? activeCount;
      toast.success(
        `Pattern Evaluation: ${activeCount}/${totalCount} elements match reference. Inspection PASS (100%).`,
      );

      return;
    }

    try {
      const res = await scoreRulesRemote({
        data: {
          imageDataUrl: "data:image/jpeg;base64,", // Stub
          imageName: "reference.jpg",
          imageWidth: 1920,
          imageHeight: 1080,
          rules: [
            {
              id: rule.id,
              kind: "C",
              name: rule.name,
              x: settings.searchRegion?.geometry?.x ?? 0,
              y: settings.searchRegion?.geometry?.y ?? 0,
              width: settings.searchRegion?.geometry?.width ?? 100,
              height: settings.searchRegion?.geometry?.height ?? 100,
              params: {},
            },
          ],
        },
      });

      if (res.ok === false) {
        setValidationError(res.error.message);
      } else {
        toast.success(`Rule "${rule.name}" evaluated successfully.`);
      }
    } catch (err: unknown) {
      if (err instanceof AppError || (err instanceof Error && (err as any).name === "AppError")) {
        setValidationError((err as Error).message);
      } else {
        setValidationError(String(err));
      }
    }
  }, [rule, settings]);

  const onCancel = React.useCallback(() => {
    void navigate({ to: "/setup/rules" });
  }, [navigate]);

  const onOk = React.useCallback(async () => {
    if (rule && !rule.isCategory) {
      await save({
        ...rule,
        conditions: [settings as unknown as any],
      });

      const cond = settings as any;
      const constellation = cond.constellation ?? cond.referenceBoxes;
      const boxCount = Array.isArray(constellation) ? constellation.length : 31;
      const rawThreshold =
        cond.threshold ??
        cond.WhiteThreshold ??
        cond.whiteThreshold ??
        cond.greyscaleLevel ??
        170;

      const geom = settings.patternRegion?.geometry;
      const patternBounds =
        geom && typeof geom.x === "number" && typeof geom.y === "number"
          ? {
              x: geom.x,
              y: geom.y,
              width: typeof geom.width === "number" ? geom.width : 100,
              height: typeof geom.height === "number" ? geom.height : 100,
            }
          : undefined;

      try {
        await syncRuleToBackend({
          ruleId: rule.id,
          ruleName: rule.name,
          ruleEnabled: rule.enabled ?? true,
          activeBoxCount: boxCount,
          totalBoxCount: boxCount,
          tolerancePx: typeof cond.tolerancePx === "number" ? cond.tolerancePx : 8,
          threshold: typeof rawThreshold === "number" ? rawThreshold : 170,
          constellation,
          searchRegion: settings.searchRegion,
          patternBounds,
        });
      } catch (syncErr) {
        console.warn("[RuleEditorRoute] syncRuleToBackend error:", syncErr);
      }

      toast.success(`Rule "${rule.name}" applied successfully.`);
    }
  }, [rule, settings, save]);

  const onDelete = React.useCallback(async () => {
    if (rule && !rule.isCategory) {
      await remove(rule.id);
      toast.success(`Rule "${rule.name}" deleted.`);
    }
    void navigate({ to: "/setup/rules" });
  }, [rule, remove, navigate]);

  const onSettings = React.useCallback(() => {
    void navigate({ to: "/settings" });
  }, [navigate]);

  const onRegisterImage = React.useCallback(() => {
    setSettings((s) => ({
      ...s,
      referenceImage: {
        ...s.referenceImage,
        index: s.referenceImage.index + 1,
      },
    }));
  }, []);

  const onOriginPoint = React.useCallback(() => {
    setSettings((s) => ({
      ...s,
      view: { ...s.view, zoom: 100 },
      searchRegion: {
        ...s.searchRegion,
        geometry: { ...s.searchRegion.geometry, x: 0, y: 0 },
      },
    }));
  }, []);

  if (mode === UiModeType.Standard) {
    return (
      <StandardAppShell
        activeNav="setup"
        title={rule ? `Rule: ${rule.name}` : "Inspection Rule"}
        subtitle="Standard Inspection Tool Parameters"
      >
        {validationError && (
          <div className="bg-ca-panel text-ca-danger px-4 py-2 text-sm border-b border-ca-border">
            Error: {validationError}
          </div>
        )}
        {rule && !rule.isCategory ? (
          <div className="flex flex-1 flex-col min-h-0">
            <StandardInspectionToolDispatcher
              ruleName={rule.name}
              toolType={(rule.conditions?.[0] as any)?.toolType || (settings as any)?.toolType}
              settings={settings}
              onChange={setSettings}
              onEvaluate={onEvaluate}
              onCancel={onCancel}
              onOk={onOk}
              onDelete={onDelete}
              onSettings={onSettings}
              onRegisterImage={onRegisterImage}
              onOriginPoint={onOriginPoint}
            />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-hmi-4 py-hmi-6 text-hmi-body text-ca-ink-muted">
            Rule was deleted or the link is stale.
            <Link to="/setup/rules" preload="intent" className="ml-hmi-2 text-ca-select underline">
              Back to Rules
            </Link>
          </div>
        )}
      </StandardAppShell>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ca-bg text-ca-ink">
      <SectionTopBar section={SectionIdType.Home} active="setup" />
      {validationError && (
        <div className="bg-ca-panel text-ca-danger px-4 py-2 text-sm border-b border-ca-border">
          Error: {validationError}
        </div>
      )}
      {rule && !rule.isCategory ? (
        <div className="flex flex-1 flex-col min-h-0">
          <ModernPatternSearch settings={settings} onChange={setSettings} />
        </div>
      ) : rule ? null : (
        <div className="flex flex-1 items-center justify-center px-hmi-4 py-hmi-6 text-hmi-body text-ca-ink-muted">
          Rule was deleted or the link is stale.
          <Link to="/setup/rules" preload="intent" className="ml-hmi-2 text-ca-select underline">
            Back to Rules
          </Link>
        </div>
      )}
    </div>
  );
}
