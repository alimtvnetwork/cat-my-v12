import React, { useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useUiMode, UiModeType } from "@/hooks/useUiMode";
import { StandardAppShell } from "@/components/layout/StandardAppShell";
import { HmiShell } from "@/components/hmi";
import {
  WorkpieceAnalyzeWorkspace,
} from "@/components/vision/workpiece";
import type { Project, RuleSet } from "@/lib/projects/types";
import { useWorkpieceProject } from "@/hooks/useWorkpieceProject";
import { EditorRuleKindType, EditorToolFamilyType, type EditorRule } from "@/lib/editor/types";
import { DEFAULT_24_PATTERN_BOXES } from "@/lib/vision/white-box-marking";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Control Automation — Inspection Analysis" },
      {
        name: "description",
        content: "Live inspection hierarchy and workpiece analysis for circuit IC devices and rule sets.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): {
    project?: string;
    ruleset?: string;
    rule?: string;
  } => {
    return {
      project: typeof search.project === "string" ? search.project : undefined,
      ruleset: typeof search.ruleset === "string" ? search.ruleset : undefined,
      rule: typeof search.rule === "string" ? search.rule : undefined,
    };
  },
  component: AnalyzeScreen,
});

function createDefaultRules(): EditorRule[] {
  return [
    {
      id: "rule-pin1-orientation-01",
      name: "Pin 1 Orientation Config",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 200,
      y: 215,
      width: 100,
      height: 100,
      params: {
        toolCode: "T117",
        toolType: "Pin 1 Orientation Config",
        tolerancePx: 25,
        thresholdLuma: 35,
        nominalAngleDeg: -146.0,
        angleToleranceDeg: 10.0,
        pin1Config: {
          registeredPin1: { x: 249, y: 264, centerX: 249, centerY: 264, radius: 24, confidence: 1.0 },
          centerX: 249,
          centerY: 264,
          relativeX: 26,
          relativeY: 49,
          tolerancePx: 25,
          thresholdLuma: 35,
          nominalAngleDeg: -146.0,
          angleToleranceDeg: 10.0,
        } as any,
        pin1ConfigJson: JSON.stringify({
          registeredPin1: { x: 249, y: 264, centerX: 249, centerY: 264, radius: 24, confidence: 1.0 },
          centerX: 249,
          centerY: 264,
          relativeX: 26,
          relativeY: 49,
          tolerancePx: 25,
          thresholdLuma: 35,
          nominalAngleDeg: -146.0,
          angleToleranceDeg: 10.0,
        }),
      },
    },
    {
      id: "rule-greyscale-pattern-match-24-box",
      name: "Greyscale Pattern Match",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 380,
      y: 190,
      width: 260,
      height: 155,
      params: {
        toolCode: "T116",
        toolType: "Greyscale Pattern Matching",
        activeBoxCount: 24,
        totalBoxCount: 24,
        threshold: 170,
        tolerancePx: 8,
        marginPx: 8,
        constellationJson: JSON.stringify(DEFAULT_24_PATTERN_BOXES),
      },
    },
    {
      id: "rule-defect-matching-01",
      name: "Defect Matching",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 200,
      y: 360,
      width: 480,
      height: 160,
      params: {
        toolCode: "T118",
        toolType: "Defect Matching",
        isDefectReject: true,
      },
    },
  ];
}

function AnalyzeScreen(): React.JSX.Element {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { mode } = useUiMode();

  const {
    project: targetProject,
    ruleset: targetRuleset,
    allProjects: projectList,
    allRulesets,
    updateRulesetRules,
    createProject,
  } = useWorkpieceProject(search.project, search.ruleset);

  const projectRulesets = useMemo(
    () => allRulesets.filter((rs) => rs.projectId === targetProject?.id),
    [allRulesets, targetProject?.id],
  );

  // If no project exists at all, seed a default inspection target
  useEffect(() => {
    if (projectList.length === 0) {
      const pid = createProject("DUT IC Inspection", {
        deviceId: "Circuit IC (DUT-Package-74HC)",
        rulesetNames: ["Default Inspection Ruleset"],
      });
      console.info("[analyze] seeded default project", pid);
    }
  }, [projectList.length, createProject]);

  // Seed default rules if ruleset has none
  useEffect(() => {
    if (targetRuleset && (!targetRuleset.rules || targetRuleset.rules.length === 0)) {
      updateRulesetRules(targetRuleset.id, createDefaultRules());
    }
  }, [targetRuleset, updateRulesetRules]);

  if (!targetProject || !targetRuleset) {
    return (
      <StandardAppShell
        activeNav="analyze"
        title="Inspection Analysis"
        subtitle="Loading Inspection Target..."
      >
        <div className="flex flex-1 items-center justify-center p-8 text-ca-ink-muted">
          Initializing Inspection Workspace...
        </div>
      </StandardAppShell>
    );
  }

  const workspace = (
    <WorkpieceAnalyzeWorkspace
      key={targetRuleset.id}
      project={targetProject}
      ruleset={targetRuleset}
      rulesets={projectRulesets}
      searchRule={search.rule}
      onSelectRuleset={(rulesetId) => {
        void navigate({
          search: (prev: Record<string, unknown>) => ({
            ...prev,
            project: targetProject.id,
            ruleset: rulesetId,
          }),
        });
      }}
    />
  );

  if (mode === UiModeType.Standard) {
    return (
      <StandardAppShell
        activeNav="analyze"
        title={`Inspection Analysis — ${targetRuleset.name}`}
        subtitle={`Device: ${targetProject.deviceId || "Circuit IC"} · ${targetRuleset.rules?.length ?? 0} Rules Loaded`}
      >
        <div className="flex flex-1 flex-col min-h-0 bg-[#111318]">
          {workspace}
        </div>
      </StandardAppShell>
    );
  }

  return (
    <HmiShell title={`Analyze — ${targetRuleset.name}`}>
      <div className="flex flex-1 flex-col min-h-0 bg-ca-bg">
        {workspace}
      </div>
    </HmiShell>
  );
}
