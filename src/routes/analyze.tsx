import React, { useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useUiMode, UiModeType } from "@/hooks/useUiMode";
import { StandardAppShell } from "@/components/layout/StandardAppShell";
import { HmiShell } from "@/components/hmi";
import { WorkpieceAnalyzeWorkspace, WorkspaceSaveButton } from "@/components/vision/workpiece";
import type { Project, RuleSet } from "@/lib/projects/types";
import { useWorkpieceProject } from "@/hooks/useWorkpieceProject";
import { EditorRuleKindType, EditorToolFamilyType, type EditorRule } from "@/lib/editor/types";
import { DEFAULT_24_PATTERN_BOXES } from "@/lib/vision/white-box-marking";
import { useSitemapStateCacheStore } from "@/lib/stores/sitemap-state-cache-store";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Control Automation — Inspection Analysis" },
      {
        name: "description",
        content:
          "Live inspection hierarchy and workpiece analysis for circuit IC devices and rule sets.",
      },
    ],
  }),
  validateSearch: (
    search: Record<string, unknown>,
  ): {
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
      x: 180,
      y: 140,
      width: 140,
      height: 140,
      params: {
        toolCode: "T117",
        toolType: "Pin 1 Orientation Config",
        tolerancePx: 60,
        thresholdLuma: 35,
        nominalAngleDeg: -151.6,
        angleToleranceDeg: 15.0,
        searchRegion: { x: 180, y: 140, width: 140, height: 140 },
        searchRegionJson: JSON.stringify({ x: 180, y: 140, width: 140, height: 140 }),
        packageRegion: { x: 200, y: 160, width: 500, height: 300 },
        packageRegionJson: JSON.stringify({ x: 200, y: 160, width: 500, height: 300 }),
        pin1Config: {
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
          relativeX: 49.3,
          relativeY: 88.6,
          tolerancePx: 60,
          thresholdLuma: 35,
          nominalAngleDeg: -151.6,
          angleToleranceDeg: 15.0,
          searchRegion: { x: 180, y: 140, width: 140, height: 140 },
          packageRegion: { x: 200, y: 160, width: 500, height: 300 },
        } as any,
        pin1ConfigJson: JSON.stringify({
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
          relativeX: 49.3,
          relativeY: 88.6,
          tolerancePx: 60,
          thresholdLuma: 35,
          nominalAngleDeg: -151.6,
          angleToleranceDeg: 15.0,
          searchRegion: { x: 180, y: 140, width: 140, height: 140 },
          packageRegion: { x: 200, y: 160, width: 500, height: 300 },
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
      x: 100,
      y: 70,
      width: 760,
      height: 400,
      params: {
        toolCode: "T116",
        toolType: "Greyscale Pattern Matching",
        activeBoxCount: 24,
        totalBoxCount: 24,
        threshold: 110,
        tolerancePx: 12,
        marginPx: 8,
        minMatchPercent: 80,
        lumaTolerance: 255,
        searchRegion: { x: 100, y: 70, width: 760, height: 400 },
        searchRegionJson: JSON.stringify({ x: 100, y: 70, width: 760, height: 400 }),
        patternRegion: { x: 150, y: 100, width: 600, height: 300 },
        patternRegionJson: JSON.stringify({ x: 150, y: 100, width: 600, height: 300 }),
        referenceBoxes: DEFAULT_24_PATTERN_BOXES.map((b) => ({ ...b, expectedLuma: 200 })),
        constellationJson: JSON.stringify(
          DEFAULT_24_PATTERN_BOXES.map((b) => ({ ...b, expectedLuma: 200 })),
        ),
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

  const currentPathname = typeof window !== "undefined" ? window.location.pathname : "";
  const cachedSnapshot = useSitemapStateCacheStore((s) => s.snapshots[currentPathname]);
  const saveSnapshot = useSitemapStateCacheStore((s) => s.saveSnapshot);

  useEffect(() => {
    if (!search.project && !search.ruleset && cachedSnapshot?.searchParams?.project) {
      void navigate({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          project: cachedSnapshot.searchParams.project,
          ruleset: cachedSnapshot.searchParams.ruleset,
        }),
        replace: true,
      });
    }
  }, [search.project, search.ruleset, cachedSnapshot, navigate]);

  useEffect(() => {
    if (!currentPathname || !targetProject || !targetRuleset) return;

    saveSnapshot({
      pathname: currentPathname,
      search: window.location.search,
      searchParams: {
        project: targetProject.id,
        ruleset: targetRuleset.id,
      },
      title: `Analyze · ${targetRuleset.name}`,
      selectedId: targetRuleset.id,
    });
  }, [currentPathname, targetProject, targetRuleset, saveSnapshot]);

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
      key={targetProject.id}
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
        actions={<WorkspaceSaveButton />}
      >
        <div className="flex flex-1 flex-col min-h-0 bg-[#111318]">{workspace}</div>
      </StandardAppShell>
    );
  }

  return (
    <HmiShell title={`Analyze — ${targetRuleset.name}`} headerActions={<WorkspaceSaveButton />}>
      <div className="flex flex-1 flex-col min-h-0 bg-ca-bg">{workspace}</div>
    </HmiShell>
  );
}
