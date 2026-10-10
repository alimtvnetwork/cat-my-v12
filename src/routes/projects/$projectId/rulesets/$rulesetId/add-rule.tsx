import React, { useState, useMemo } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Activity,
  Bug,
  CircleDot,
  Crosshair,
  Grid2X2,
  PaintBucket,
  QrCode,
  Ruler,
  ScanSearch,
  Settings,
  Search,
  Type,
  ChevronRight,
  CopyPlus,
  type LucideIcon,
} from "lucide-react";
import { useProjectStore, selectProject, selectRulesetsForProject } from "@/lib/projects/store";
import { resolveIdParam, IntAliasNamespaceType } from "@/lib/ids/int-alias";
import {
  VISION_TOOL_CATALOG,
  InspectionCategoryType,
  getVisionToolsByCategory,
  type VisionToolDefinition,
} from "@/lib/vision/tool-catalog";
import type { EditorRule } from "@/lib/editor/types";
import { EditorRuleKindType, EditorToolFamilyType } from "@/lib/editor/types";

export const Route = createFileRoute("/projects/$projectId/rulesets/$rulesetId/add-rule")({
  component: AddRuleWizard,
});

function generateRuleId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getToolIcon(tool: VisionToolDefinition): LucideIcon {
  const normalized = `${tool.code} ${tool.name}`.toLowerCase();

  if (normalized.includes("pin 1") || normalized.includes("pin1")) return CircleDot;
  if (normalized.includes("pattern") || tool.code === "T102") return ScanSearch;
  if (normalized.includes("area") || normalized.includes("intensity")) return Grid2X2;
  if (normalized.includes("edge") || normalized.includes("lead")) return Activity;
  if (normalized.includes("blob") || normalized.includes("bridge")) return Bug;
  if (normalized.includes("void") || normalized.includes("circle") || tool.code === "T111") return Crosshair;
  if (normalized.includes("caliper") || normalized.includes("gauge") || tool.code === "T110") return Ruler;
  if (normalized.includes("qr") || normalized.includes("datamatrix") || tool.code === "T103") return QrCode;
  if (normalized.includes("ocr") || normalized.includes("marking") || tool.code === "T106") return Type;
  if (normalized.includes("coating") || normalized.includes("color") || tool.code === "T112") return PaintBucket;

  return ScanSearch;
}

function getRuleToolIcon(rule: EditorRule): LucideIcon {
  const toolCode = typeof rule.params?.toolCode === "string" ? rule.params.toolCode : "";
  const normalized = `${toolCode} ${rule.name}`.toLowerCase();

  if (normalized.includes("pin 1") || normalized.includes("pin1")) return CircleDot;
  if (normalized.includes("pattern") || toolCode === "T102") return ScanSearch;
  if (normalized.includes("area") || normalized.includes("intensity")) return Grid2X2;
  if (normalized.includes("edge") || normalized.includes("lead")) return Activity;
  if (normalized.includes("blob") || normalized.includes("bridge")) return Bug;
  if (normalized.includes("void") || normalized.includes("circle") || toolCode === "T111") return Crosshair;
  if (normalized.includes("caliper") || normalized.includes("gauge") || toolCode === "T110") return Ruler;
  if (normalized.includes("qr") || normalized.includes("datamatrix") || toolCode === "T103") return QrCode;
  if (normalized.includes("ocr") || normalized.includes("marking") || toolCode === "T106") return Type;
  if (normalized.includes("coating") || normalized.includes("color") || toolCode === "T112") return PaintBucket;

  return ScanSearch;
}

function cleanRuleBaseName(name: string): string {
  return name.replace(/^Rule\s+\d+\s*:\s*/i, "").trim() || "Existing Rule";
}

function AddRuleWizard() {
  const { projectId, rulesetId } = Route.useParams();
  const navigate = useNavigate();

  const project = useProjectStore((s) => selectProject(s, projectId));
  const rulesets = useProjectStore((s) => selectRulesetsForProject(s, projectId));
  const allProjects = useProjectStore((s) => s.projects);
  const allRulesets = useProjectStore((s) => s.rulesets);
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
  
  // Catalog State
  const [selectedCategory, setSelectedCategory] = useState<InspectionCategoryType | "All">("All");
  const [selectedTool, setSelectedTool] = useState<VisionToolDefinition | null>(null);
  const [existingRuleSearch, setExistingRuleSearch] = useState("");

  if (!project || !ruleset) {
    return <div className="p-8 text-ca-ink">Project or ruleset not found.</div>;
  }

  const filteredTools = useMemo(() => {
    return selectedCategory === "All"
      ? [...VISION_TOOL_CATALOG]
      : getVisionToolsByCategory(selectedCategory);
  }, [selectedCategory]);

  const existingRuleOptions = useMemo(() => {
    return Object.values(allRulesets)
      .flatMap((sourceRuleset) => {
        const sourceProject = allProjects[sourceRuleset.projectId];

        return (sourceRuleset.rules ?? []).map((rule) => ({
          rule,
          sourceProjectName: sourceProject?.name ?? "Unknown project",
          sourceRulesetName: sourceRuleset.name,
          sourceRulesetId: sourceRuleset.id,
        }));
      })
      .sort((a, b) => {
        const byProject = a.sourceProjectName.localeCompare(b.sourceProjectName);
        if (byProject !== 0) return byProject;
        const byRuleset = a.sourceRulesetName.localeCompare(b.sourceRulesetName);
        if (byRuleset !== 0) return byRuleset;

        return a.rule.name.localeCompare(b.rule.name);
      });
  }, [allProjects, allRulesets]);

  const filteredExistingRuleOptions = useMemo(() => {
    const term = existingRuleSearch.trim().toLowerCase();

    if (!term) return existingRuleOptions;

    return existingRuleOptions.filter((item) => {
      const toolCode =
        typeof item.rule.params?.toolCode === "string" ? item.rule.params.toolCode : item.rule.kind;
      const haystack = [
        item.rule.name,
        item.sourceProjectName,
        item.sourceRulesetName,
        toolCode,
        item.rule.categoryName ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [existingRuleOptions, existingRuleSearch]);

  const commitRule = async () => {
    if (!selectedTool) return;
    
    const ruleCount = ruleset.rules.length;
    const ruleId = generateRuleId();
    const effectiveName = `Rule ${ruleCount + 1}: ${selectedTool.name.replace(/ \(.*\)/, "")}`;
    
    const initialRoiVal = { x: 0, y: 0, width: 1, height: 1 };
    const defaultThresh =
      selectedTool.defaultParamValues?.threshold ??
      selectedTool.defaultParamValues?.greyscaleLevel ??
      170;
    const defaultTol = selectedTool.defaultParamValues?.tolerancePx ?? 8;

    const newRule: EditorRule = {
      id: ruleId,
      name: effectiveName,
      kind: selectedTool.kind ?? EditorRuleKindType.R,
      family: selectedTool.family ?? EditorToolFamilyType.Rect,
      categoryName: selectedTool.category,
      isHidden: false,
      isLocked: false,
      x: initialRoiVal.x,
      y: initialRoiVal.y,
      width: initialRoiVal.width,
      height: initialRoiVal.height,
      params: {
        ...selectedTool.defaultParamValues,
        toolCode: selectedTool.code,
        category: selectedTool.category,
        x: initialRoiVal.x,
        y: initialRoiVal.y,
        width: initialRoiVal.width,
        height: initialRoiVal.height,
        threshold: Number(defaultThresh),
        marginPx: Number(defaultTol),
        tolerancePx: Number(defaultTol),
        activeBoxCount: 0,
        totalBoxCount: 0,
        constellationJson: "[]",
        hasUnconfiguredRegion: true,
      },
      cameraSettings: {
        exposureUs: Math.round(selectedTool.defaultExposureMs * 1000),
        gainDb: selectedTool.defaultGainDb,
      },
      lightSettings: {
        intensity: selectedTool.defaultLightPct,
        channel: selectedTool.defaultChannels[0] || 1,
        strobeDurationUs: selectedTool.defaultStrobeUs,
        hasStrobe: true,
      },
    };

    useProjectStore.getState().updateRulesetRules(ruleset.id, [...ruleset.rules, newRule]);

    await navigate({
      to: "/projects/$projectId/rulesets/$rulesetId/tune/$ruleId",
      params: { projectId, rulesetId: ruleset.id, ruleId: newRule.id },
    });
  };

  const commitExistingRule = async (sourceRule: EditorRule) => {
    if (!ruleset) return;

    const ruleCount = ruleset.rules.length;
    const newRuleId = generateRuleId();
    const clonedRule: EditorRule = {
      ...sourceRule,
      id: newRuleId,
      name: `Rule ${ruleCount + 1}: ${cleanRuleBaseName(sourceRule.name)}`,
      isHidden: false,
      isLocked: false,
      params: {
        ...(sourceRule.params ?? {}),
        copiedFromRuleId: sourceRule.id,
      },
      cameraSettings: sourceRule.cameraSettings ? { ...sourceRule.cameraSettings } : undefined,
      lightSettings: sourceRule.lightSettings ? { ...sourceRule.lightSettings } : undefined,
    };

    useProjectStore.getState().updateRulesetRules(ruleset.id, [...ruleset.rules, clonedRule]);

    await navigate({
      to: "/projects/$projectId/rulesets/$rulesetId/tune/$ruleId",
      params: { projectId, rulesetId: ruleset.id, ruleId: clonedRule.id },
    });
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0b0c10] text-ca-ink font-hmi antialiased">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center border-b border-[#22252a] bg-[#111318] px-4">
        <div className="flex items-center gap-3">
          <Link to="/projects/$projectId" params={{ projectId }} className="text-ca-ink-muted hover:text-ca-primary transition-colors">
             <span className="text-[10px] font-bold uppercase tracking-wider">{project.name}</span>
          </Link>
          <span className="text-[#333]"><ChevronRight size={14} /></span>
          <span className="text-[10px] font-bold text-ca-ink-muted uppercase tracking-wider">{ruleset.name}</span>
          <span className="text-[#333]"><ChevronRight size={14} /></span>
          <h1 className="text-sm font-bold text-ca-ink tracking-wide">ADD RULE</h1>
        </div>
      </header>

      {/* Main Wizard Area */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex flex-1 flex-col h-full bg-[#0b0c10]">
            <div className="flex items-center gap-3 border-b border-[#22252a] bg-[#111318] p-4">
              <button 
                onClick={() => void navigate({ to: "/projects/$projectId", params: { projectId } })}
                className="flex items-center gap-2 text-xs font-bold uppercase text-ca-ink-muted hover:text-ca-ink"
              >
                <ChevronRight size={14} className="rotate-180" /> Back to Project
              </button>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase text-ca-ink-muted">
                  Select a tool or existing rule to configure
                </span>
              </div>
            </div>

            <div className="flex flex-1 min-h-0">
              {/* Category Sidebar */}
              <div className="w-64 border-r border-[#22252a] bg-[#111318] flex flex-col">
                <div className="p-3 border-b border-[#22252a]">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-ca-ink-muted">Categories</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                  {(["All", ...Object.values(InspectionCategoryType)] as (InspectionCategoryType | "All")[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-left px-3 py-2 text-xs font-bold uppercase tracking-wide rounded transition-colors ${
                        selectedCategory === cat 
                          ? "bg-ca-primary text-[#000]" 
                          : "text-ca-ink-muted hover:bg-[#1a1c23] hover:text-ca-ink"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tools Grid */}
              <div className="flex-1 overflow-y-auto bg-[#0b0c10] p-5">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-ca-ink-muted">Available Tools</h3>
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredTools.map((tool) => {
                    const ToolIcon = getToolIcon(tool);

                    return (
                      <button
                        key={tool.code}
                        onClick={() => setSelectedTool(tool)}
                        className={`flex flex-col gap-3 rounded border p-4 text-left transition-colors ${
                          selectedTool?.code === tool.code
                            ? "border-ca-primary bg-[#1a1c23]"
                            : "border-[#22252a] bg-[#111318] hover:border-[#444]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[#2d333b] bg-[#0b0c10] text-ca-primary">
                              <ToolIcon size={18} aria-hidden />
                            </span>
                            <span className="min-w-0 text-xs font-bold text-ca-ink">
                              {tool.name.replace(/ \(.*\)/, "")}
                            </span>
                          </div>
                          <span className="rounded bg-[#22252a] px-1.5 py-0.5 text-[9px] font-mono font-bold text-ca-ink-muted">
                            {tool.code}
                          </span>
                        </div>
                        <span className="text-[10px] text-ca-ink-muted line-clamp-2">{tool.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Existing Rules */}
              <section className="flex min-h-0 w-96 shrink-0 flex-col border-l border-[#22252a] bg-[#0f1217]">
                <div className="border-b border-[#22252a] p-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ca-ink">Existing Rules</h3>
                  <p className="mt-1 text-[10px] text-ca-ink-muted">
                    Copy a tuned rule into this ruleset.
                  </p>
                  <div className="relative mt-3">
                    <Search size={13} className="absolute left-2.5 top-2 text-ca-ink-muted" />
                    <input
                      type="search"
                      value={existingRuleSearch}
                      onChange={(event) => setExistingRuleSearch(event.target.value)}
                      placeholder="Search existing rules..."
                      className="w-full rounded border border-[#2d333b] bg-[#0b0c10] py-1.5 pl-7 pr-2 text-xs text-ca-ink outline-none placeholder:text-ca-ink-muted/60 focus:border-ca-primary"
                    />
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                  {filteredExistingRuleOptions.length === 0 ? (
                    <div className="rounded border border-dashed border-[#2d333b] p-4 text-center text-xs text-ca-ink-muted">
                      {existingRuleOptions.length === 0
                        ? "No existing rules saved yet."
                        : "No rules match this search."}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredExistingRuleOptions.map((item) => {
                        const RuleIcon = getRuleToolIcon(item.rule);
                        const toolCode =
                          typeof item.rule.params?.toolCode === "string"
                            ? item.rule.params.toolCode
                            : item.rule.kind;
                        const isSameRuleset = item.sourceRulesetId === ruleset.id;

                        return (
                          <button
                            key={`${item.sourceRulesetId}:${item.rule.id}`}
                            type="button"
                            onClick={() => void commitExistingRule(item.rule)}
                            className="group flex w-full items-start gap-3 rounded border border-[#22252a] bg-[#111318] p-3 text-left transition-colors hover:border-ca-primary hover:bg-[#1a1c23]"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#2d333b] bg-[#0b0c10] text-ca-primary">
                              <RuleIcon size={16} aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-bold text-ca-ink">
                                {item.rule.name}
                              </span>
                              <span className="mt-1 block truncate text-[10px] text-ca-ink-muted">
                                {item.sourceProjectName} / {item.sourceRulesetName}
                                {isSameRuleset ? " / current" : ""}
                              </span>
                            </span>
                            <span className="flex shrink-0 flex-col items-end gap-1">
                              <span className="rounded bg-[#22252a] px-1.5 py-0.5 text-[9px] font-mono font-bold text-ca-ink-muted">
                                {toolCode}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-ca-ink-muted group-hover:text-ca-primary">
                                <CopyPlus size={12} />
                                Add
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              {/* Right panel: Tool Details */}
              <div className="w-80 border-l border-[#22252a] bg-[#111318] flex flex-col">
                {selectedTool ? (
                  <>
                    <div className="p-6 border-b border-[#22252a] flex-1">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="rounded bg-[#22252a] px-2 py-1 text-[10px] font-mono font-bold text-ca-ink-muted">
                          {selectedTool.code}
                        </span>
                      </div>
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ca-ink">
                        {selectedTool.name}
                      </h3>
                      <p className="text-xs text-ca-ink-muted leading-relaxed">
                        {selectedTool.description}
                      </p>
                    </div>
                    <div className="p-4 border-t border-[#22252a] bg-[#0b0c10]">
                      <button
                        onClick={() => void commitRule()}
                        className="flex w-full items-center justify-center gap-2 rounded bg-ca-primary py-3 text-xs font-bold uppercase tracking-wider text-[#000] hover:brightness-110 transition-colors"
                      >
                        <Settings size={16} className="fill-current" />
                        Continue
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-ca-ink-muted">
                    <Settings size={32} className="mb-4 opacity-50" />
                    <p className="text-xs font-bold uppercase tracking-wider">No Tool Selected</p>
                    <p className="mt-2 text-[10px]">Select a tool from the catalog to configure it.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
