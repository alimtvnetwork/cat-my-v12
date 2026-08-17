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
import type { RuleId } from "@/lib/rules/model";
import { fromIntId } from "@/lib/rules/rule-id-alias";
import { useUiMode, UiModeType } from "@/hooks/useUiMode";
import { StandardPatternSearch } from "@/components/vision/standard/StandardPatternSearch";
import { ModernPatternSearch } from "@/components/vision/modern/ModernPatternSearch";
import { createDefaultPatternSearchSettings, PatternSearchSettings } from "@/domain/vision/pattern-search";
import { AppError } from "@/lib/errors/AppError";
import { scoreRulesRemote } from "@/lib/editor/validation.functions";

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
  const { byId, save } = useRulesLibrary();
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
    return (rule?.conditions?.[0] as unknown as PatternSearchSettings) || createDefaultPatternSearchSettings(rule?.id || "T106");
  });

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
        } else if (err instanceof AppError || (err instanceof Error && (err as any).name === "AppError")) {
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
    try {
      const res = await scoreRulesRemote({
        data: {
          imageDataUrl: "data:image/jpeg;base64,", // Stub
          imageName: "reference.jpg",
          imageWidth: 1920,
          imageHeight: 1080,
          rules: [{
            id: rule.id,
            kind: "C",
            name: rule.name,
            x: settings.searchRegion?.geometry?.x ?? 0,
            y: settings.searchRegion?.geometry?.y ?? 0,
            width: settings.searchRegion?.geometry?.width ?? 100,
            height: settings.searchRegion?.geometry?.height ?? 100,
            params: {}
          }]
        }
      });
      console.log("Evaluate result:", res);
      if (res.ok === false) {
        setValidationError(res.error.message);
      }
    } catch (err: unknown) {
      if (err instanceof AppError || (err instanceof Error && (err as any).name === "AppError")) {
         setValidationError((err as Error).message);
      } else {
         setValidationError(String(err));
      }
    }
  }, [rule, settings]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ca-bg text-ca-ink">
      <SectionTopBar section={SectionIdType.Home} active="setup" />
      {validationError && (
        <div className="bg-red-100 text-red-900 px-4 py-2 text-sm border-b border-red-200">
          Error: {validationError}
        </div>
      )}
      {rule && !rule.isCategory ? (
        <div className="flex flex-1 flex-col min-h-0">
          {mode === UiModeType.Standard ? (
            <StandardPatternSearch settings={settings} onChange={setSettings} onEvaluate={onEvaluate} />
          ) : (
            <ModernPatternSearch settings={settings} onChange={setSettings} />
          )}
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
