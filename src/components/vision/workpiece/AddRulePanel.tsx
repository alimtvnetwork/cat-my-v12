import React, { useState, useMemo, useEffect } from "react";
import { Settings, Search, CopyPlus, Cpu, X } from "lucide-react";
import { useProjectStore, selectProject, selectRulesetsForProject } from "@/lib/projects/store";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { resolveIdParam, IntAliasNamespaceType } from "@/lib/ids/int-alias";
import {
  VISION_TOOL_CATALOG,
  InspectionCategoryType,
  getVisionToolsByCategory,
  type VisionToolDefinition,
} from "@/lib/vision/tool-catalog";
import type { EditorRule } from "@/lib/editor/types";
import { EditorRuleKindType, EditorToolFamilyType } from "@/lib/editor/types";
import { useSitemapStateCacheStore } from "@/lib/stores/sitemap-state-cache-store";
import { ToolInspectionGraphic } from "@/components/vision/ToolInspectionGraphic";

export interface AddRulePanelProps {
  projectId: string;
  rulesetId: string;
  /** Called after a rule is created. When omitted, the panel only commits to the store. */
  onRuleCreated?: (rulesetId: string, ruleId: string) => void;
  /** When provided, an Exit button is shown in the header. */
  onExit?: () => void;
}

function generateRuleId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };

  if (g.crypto?.randomUUID) {
    return g.crypto.randomUUID();
  }

  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getCategoryColor(category: string): {
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  cardGlow: string;
  iconBg: string;
  iconText: string;
} {
  const cat = category.toLowerCase();

  if (cat.includes("alignment") || cat.includes("fiducial")) {
    return {
      badgeBg: "bg-cyan-500/10",
      badgeBorder: "border-cyan-400/30",
      badgeText: "text-cyan-300",
      cardGlow: "border-cyan-400/50 shadow-[0_0_24px_rgba(6,182,212,0.25)]",
      iconBg: "bg-cyan-500/15 border-cyan-400/30",
      iconText: "text-cyan-300",
    };
  }

  if (cat.includes("surface") || cat.includes("defect") || cat.includes("anomaly")) {
    return {
      badgeBg: "bg-amber-500/10",
      badgeBorder: "border-amber-400/30",
      badgeText: "text-amber-300",
      cardGlow: "border-amber-400/50 shadow-[0_0_24px_rgba(245,158,11,0.25)]",
      iconBg: "bg-amber-500/15 border-amber-400/30",
      iconText: "text-amber-300",
    };
  }

  if (cat.includes("dimension") || cat.includes("feature") || cat.includes("caliper")) {
    return {
      badgeBg: "bg-emerald-500/10",
      badgeBorder: "border-emerald-400/30",
      badgeText: "text-emerald-300",
      cardGlow: "border-emerald-400/50 shadow-[0_0_24px_rgba(16,185,129,0.25)]",
      iconBg: "bg-emerald-500/15 border-emerald-400/30",
      iconText: "text-emerald-300",
    };
  }

  if (cat.includes("ident") || cat.includes("code") || cat.includes("ocr")) {
    return {
      badgeBg: "bg-purple-500/10",
      badgeBorder: "border-purple-400/30",
      badgeText: "text-purple-300",
      cardGlow: "border-purple-400/50 shadow-[0_0_24px_rgba(168,85,247,0.25)]",
      iconBg: "bg-purple-500/15 border-purple-400/30",
      iconText: "text-purple-300",
    };
  }

  return {
    badgeBg: "bg-fuchsia-500/10",
    badgeBorder: "border-fuchsia-400/30",
    badgeText: "text-fuchsia-300",
    cardGlow: "border-fuchsia-400/50 shadow-[0_0_24px_rgba(217,70,239,0.25)]",
    iconBg: "bg-fuchsia-500/15 border-fuchsia-400/30",
    iconText: "text-fuchsia-300",
  };
}

function cleanRuleBaseName(name: string): string {
  return name.replace(/^Rule\s+\d+\s*:\s*/i, "").trim() || "Existing Rule";
}

export function AddRulePanel({ projectId, rulesetId, onRuleCreated, onExit }: AddRulePanelProps) {
  const project = useProjectStore((s) => selectProject(s, projectId));
  const rulesets = useProjectStore((s) => selectRulesetsForProject(s, projectId));
  const allProjects = useProjectStore((s) => s.projects);
  const allRulesets = useProjectStore((s) => s.rulesets);
  const resolvedRulesetId = useMemo(
    () => resolveIdParam(IntAliasNamespaceType.Ruleset, rulesetId) || rulesetId,
    [rulesetId],
  );
  const ruleset = useMemo(() => {
    const matchedRuleset = rulesets.find(
      (r: any) =>
        r.id === rulesetId ||
        r.id === resolvedRulesetId ||
        resolveIdParam(IntAliasNamespaceType.Ruleset, r.id) === rulesetId,
    );

    return matchedRuleset ?? rulesets[0];
  }, [rulesets, rulesetId, resolvedRulesetId]);

  const currentPathname = typeof window !== "undefined" ? window.location.pathname : "";
  const cachedSnapshot = useSitemapStateCacheStore((s) => s.snapshots[currentPathname]);
  const saveSnapshot = useSitemapStateCacheStore((s) => s.saveSnapshot);

  // Active view tab: "catalog" (Standard Instruments) or "library" (Clone Existing Rules)
  const [activeTab, setActiveTab] = useState<"catalog" | "library">(
    cachedSnapshot?.activeTab === "library" ? "library" : "catalog",
  );
  const [selectedCategory, setSelectedCategory] = useState<InspectionCategoryType | "All">(
    (cachedSnapshot?.selectedCategory as InspectionCategoryType | "All") ?? "All",
  );
  const [selectedTool, setSelectedTool] = useState<VisionToolDefinition | null>(() => {
    if (cachedSnapshot?.selectedId) {
      const found = VISION_TOOL_CATALOG.find((t) => t.code === cachedSnapshot.selectedId);

      if (found) return found;
    }

    return VISION_TOOL_CATALOG[0] ?? null;
  });
  const [searchQuery, setSearchQuery] = useState(cachedSnapshot?.searchQuery ?? "");
  const [existingRuleSearch, setExistingRuleSearch] = useState("");

  useEffect(() => {
    if (!currentPathname) return;

    saveSnapshot({
      pathname: currentPathname,
      search: window.location.search,
      searchParams: {},
      title: ruleset?.name ? `Add Rule · ${ruleset.name}` : "Add Rule",
      activeTab,
      selectedCategory,
      selectedId: selectedTool?.code,
      searchQuery,
    });
  }, [
    currentPathname,
    ruleset?.name,
    activeTab,
    selectedCategory,
    selectedTool?.code,
    searchQuery,
    saveSnapshot,
  ]);

  const filteredTools = useMemo(() => {
    let list =
      selectedCategory === "All"
        ? [...VISION_TOOL_CATALOG]
        : getVisionToolsByCategory(selectedCategory);

    const term = searchQuery.trim().toLowerCase();

    if (term) {
      list = list.filter((tool) => {
        const text = `${tool.code} ${tool.name} ${tool.description} ${tool.category}`.toLowerCase();

        return text.includes(term);
      });
    }

    return list;
  }, [selectedCategory, searchQuery]);

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
    if (!selectedTool || !ruleset) return;

    const ruleCount = ruleset.rules?.length ?? 0;
    const ruleId = generateRuleId();
    const effectiveName = `Rule ${ruleCount + 1}: ${selectedTool.name.replace(/ \(.*\)/, "")}`;

    const initialRoiVal = { x: 0, y: 0, width: 1, height: 1 };
    const defaultParamValues = selectedTool.defaultParamValues ?? {};
    const defaultChannels = selectedTool.defaultChannels ?? [];
    const defaultExposureMs =
      typeof selectedTool.defaultExposureMs === "number" ? selectedTool.defaultExposureMs : 20;
    const defaultGainDb =
      typeof selectedTool.defaultGainDb === "number" ? selectedTool.defaultGainDb : 0;
    const defaultLightPct =
      typeof selectedTool.defaultLightPct === "number" ? selectedTool.defaultLightPct : 80;
    const defaultStrobeUs =
      typeof selectedTool.defaultStrobeUs === "number" ? selectedTool.defaultStrobeUs : 200;
    const defaultThresh = defaultParamValues.threshold ?? defaultParamValues.greyscaleLevel ?? 170;
    const defaultTol = defaultParamValues.tolerancePx ?? 8;

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
        ...defaultParamValues,
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
        ...(selectedTool.code === "T105" || selectedTool.code === "T117"
          ? {
              pin1Config: {
                registeredPin1: null,
                tolerancePx: Number(defaultTol),
                thresholdLuma: Number(defaultParamValues.thresholdLuma ?? 35),
                searchRegion: initialRoiVal,
              },
            }
          : {}),
        hasUnconfiguredRegion: true,
      } as any,
      cameraSettings: {
        exposureUs: Math.round(defaultExposureMs * 1000),
        gainDb: defaultGainDb,
      },
      lightSettings: {
        intensity: defaultLightPct,
        channel: defaultChannels[0] || 1,
        strobeDurationUs: defaultStrobeUs,
        hasStrobe: true,
      },
    };

    const nextRules = [...(ruleset.rules ?? []), newRule];
    useProjectStore.getState().updateRulesetRules(ruleset.id, nextRules);
    // Keep the editor rules store in sync so inline hosts (e.g. the analyze
    // workspace) pick up the new rule without a remount.
    useRulesStore.getState().replaceAll(nextRules, [newRule.id], []);

    onRuleCreated?.(ruleset.id, newRule.id);
  };

  const commitExistingRule = async (sourceRule: EditorRule) => {
    if (!ruleset) return;

    const ruleCount = ruleset.rules?.length ?? 0;
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

    const nextRules = [...(ruleset.rules ?? []), clonedRule];
    useProjectStore.getState().updateRulesetRules(ruleset.id, nextRules);
    useRulesStore.getState().replaceAll(nextRules, [clonedRule.id], []);

    onRuleCreated?.(ruleset.id, clonedRule.id);
  };

  if (!project || !ruleset) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#06080d] p-8 text-xs font-mono uppercase tracking-wider text-slate-400">
        Project or ruleset not found.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0a0d14] text-[#f8fafc] font-sans antialiased">
      {/* 1. Industrial Top Navigation Header */}
      <div
        role="toolbar"
        className="flex h-12 shrink-0 items-center justify-between border-b border-[#222938] bg-[#0c1017]/95 px-5 backdrop-blur-xl shadow-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#f8fafc]">
            Add Rule
          </span>
          <span className="text-xs text-[#64748b]">·</span>
          <span className="text-xs font-mono text-[#94a3b8]">{ruleset.name}</span>
        </div>

        {/* View Mode Tabs: Rule Catalog vs Existing Rules */}
        <div className="flex items-center gap-1 rounded-lg border border-[#222938] bg-[#0c1017] p-1">
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "catalog"
                ? "border border-cyan-400/40 bg-cyan-600/30 text-cyan-200 shadow-sm"
                : "border border-transparent text-[#94a3b8] hover:border-[#222938] hover:bg-[#141924] hover:text-[#f8fafc]"
            }`}
          >
            <Cpu size={13} />
            Rule Catalog
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("library")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "library"
                ? "border border-cyan-400/40 bg-cyan-600/30 text-cyan-200 shadow-sm"
                : "border border-transparent text-[#94a3b8] hover:border-[#222938] hover:bg-[#141924] hover:text-[#f8fafc]"
            }`}
          >
            <CopyPlus size={13} />
            Existing Rules ({existingRuleOptions.length})
          </button>
        </div>

        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white active:scale-95"
          >
            <X size={12} />
            Exit
          </button>
        ) : null}
      </div>

      {/* 2. Main Content Body */}
      {activeTab === "catalog" ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left: Tool Family Categories Navigation */}
          <aside className="flex w-44 shrink-0 flex-col border-r border-[#222938] bg-[#0c1017]/95 backdrop-blur-xl font-sans">
            <div className="border-b border-[#222938] px-3 py-2.5 bg-gradient-to-b from-white/[0.03] to-transparent">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                  Families
                </span>
                <span className="rounded-full border border-[#222938] bg-[#141924] px-1.5 py-0.2 font-sans text-[10px] font-bold text-[#94a3b8]">
                  {VISION_TOOL_CATALOG.length}
                </span>
              </div>
            </div>

            <nav className="flex-1 space-y-0.5 overflow-y-auto p-1.5">
              {(
                ["All", ...Object.values(InspectionCategoryType)] as (
                  | InspectionCategoryType
                  | "All"
                )[]
              ).map((cat) => {
                const count =
                  cat === "All"
                    ? VISION_TOOL_CATALOG.length
                    : getVisionToolsByCategory(cat as InspectionCategoryType).length;
                const isSelected = selectedCategory === cat;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "border border-cyan-500/40 bg-cyan-600/25 text-cyan-200 font-semibold shadow-sm"
                        : "border border-transparent text-slate-400 hover:border-[#222938] hover:bg-[#141924] hover:text-slate-200"
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    <span
                      className={`rounded px-1.5 py-0.2 text-[10px] font-sans transition-colors ${
                        isSelected
                          ? "bg-cyan-500/30 text-cyan-200 font-bold"
                          : "bg-[#141924] text-slate-500 group-hover:text-slate-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Quick Helper Callout */}
            <div className="border-t border-white/[0.06] p-2 bg-black/40">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-[10px] text-slate-400">
                <span className="block font-semibold text-cyan-400 uppercase tracking-wider text-[9px]">
                  SMT Inspection
                </span>
                <p className="mt-0.5 leading-snug text-slate-400">
                  Select tool to calibrate on canvas.
                </p>
              </div>
            </div>
          </aside>

          {/* Center: Interactive Instrument Catalog Grid */}
          <main
            data-tour="rule-add-tool-catalog"
            className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0a0d14]"
          >
            {/* Search and Filter Strip */}
            <div
              data-tour="rule-add-catalog-header"
              className="flex shrink-0 items-center justify-between gap-4 border-b border-[#222938] bg-[#0c1017]/95 px-5 py-3 backdrop-blur"
            >
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3 top-2.5 text-[#64748b]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by instrument code (T102, T117), feature, or name..."
                  className="w-full rounded-lg border border-[#222938] bg-[#141924] py-2 pl-9 pr-3 font-sans text-xs text-[#f8fafc] outline-none placeholder:text-[#64748b] focus:border-[oklch(0.76_0.145_210/0.6)] focus:ring-1 focus:ring-[oklch(0.76_0.145_210/0.4)] transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-sans text-[11px] uppercase tracking-wider text-[#64748b]">
                  Showing <span className="font-bold text-[#f8fafc]">{filteredTools.length}</span>{" "}
                  tools
                </span>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-3">
                {filteredTools.map((tool) => {
                  const isSelected = selectedTool?.code === tool.code;
                  const colors = getCategoryColor(tool.category);

                  return (
                    <button
                      key={tool.code}
                      type="button"
                      data-tour={
                        tool.code === "T105" || tool.name.toLowerCase().includes("pin 1")
                          ? "rule-add-pin1-tool"
                          : tool.code === "T102" || tool.name.toLowerCase().includes("greyscale")
                            ? "rule-add-greyscale-tool"
                            : undefined
                      }
                      onClick={() => setSelectedTool(tool)}
                      className={`group relative flex items-center gap-3.5 rounded-xl border p-3 text-left transition-all backdrop-blur-xl cursor-pointer ${
                        isSelected
                          ? `border-[oklch(0.76_0.145_210/0.7)] bg-gradient-to-r from-[oklch(0.76_0.145_210/0.14)] via-[#141924] to-[#0c1017] shadow-[0_0_24px_oklch(0.76_0.145_210/0.25),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-[oklch(0.76_0.145_210/0.5)]`
                          : "border-[#222938] bg-[#10141e]/90 hover:border-[#333e54] hover:bg-[#141924] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                      }`}
                    >
                      {/* Left: Image spanning height */}
                      <div
                        className={`shrink-0 overflow-hidden rounded-xl border transition-all ${
                          isSelected
                            ? "border-cyan-400/50 bg-[#080d1a] shadow-[0_0_14px_rgba(34,211,238,0.25)]"
                            : "border-[#222938] bg-[#080c14] group-hover:border-cyan-500/40"
                        }`}
                      >
                        <ToolInspectionGraphic toolCode={tool.code} size={58} />
                      </div>

                      {/* Right: Top Title + Bottom 1-line Description */}
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`shrink-0 inline-block rounded px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider ${colors.badgeBg} ${colors.badgeText} border ${colors.badgeBorder}`}
                          >
                            {tool.code}
                          </span>
                          <h3 className="truncate font-sans text-xs font-semibold leading-tight text-[#f8fafc] group-hover:text-cyan-300 transition-colors">
                            {tool.name.replace(/ \(.*\)/, "")}
                          </h3>
                        </div>

                        <p className="truncate font-sans text-[11px] leading-snug text-[#94a3b8]">
                          {tool.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </main>

          {/* Right: Selected Tool Spec & Calibration Action Panel */}
          <aside className="flex w-64 shrink-0 flex-col border-l border-[#222938] bg-[#0c1017]/95 backdrop-blur-2xl shadow-2xl font-sans">
            {selectedTool ? (
              <div className="flex h-full flex-col justify-between overflow-y-auto">
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 overflow-hidden rounded-xl border border-cyan-500/30 bg-[#080d1a] shadow-md">
                      <ToolInspectionGraphic toolCode={selectedTool.code} size={52} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-sans text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">
                        {selectedTool.code} · {selectedTool.category}
                      </span>
                      <h2 className="mt-0.5 text-sm font-semibold text-white">
                        {selectedTool.name}
                      </h2>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {selectedTool.description}
                  </p>
                </div>

                {/* Primary Action Button */}
                <div className="border-t border-[#222938] bg-[#0c1017] p-3 shadow-2xl">
                  <button
                    type="button"
                    data-tour="rule-add-configure-selected"
                    onClick={() => void commitRule()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-600/30 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-cyan-100 shadow-sm transition-all hover:bg-cyan-600/50 hover:border-cyan-400/60 active:scale-[0.98] cursor-pointer"
                  >
                    <Settings size={15} />
                    Configure
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-slate-500">
                <Settings size={28} className="mb-2.5 text-cyan-400/40" />
                <p className="font-sans text-xs font-semibold text-slate-400">No Tool Selected</p>
                <p className="mt-1 font-sans text-xs text-slate-500">
                  Select a tool from the catalog to configure.
                </p>
              </div>
            )}
          </aside>
        </div>
      ) : (
        /* View Tab 2: Calibrated Library (Clone Existing Configured Rules) */
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#06080d] p-6">
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col rounded-2xl border border-white/[0.08] bg-[#090d16]/90 p-5 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex shrink-0 items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-white">
                  Calibrated Rule Library
                </h2>
                <p className="font-sans text-xs text-slate-400">
                  Clone configured parameters, tolerances, and camera settings from any existing
                  rule in your projects.
                </p>
              </div>
              <div className="relative w-80">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="search"
                  value={existingRuleSearch}
                  onChange={(e) => setExistingRuleSearch(e.target.value)}
                  placeholder="Search existing rules by name, code, or project..."
                  className="w-full rounded-xl border border-white/10 bg-[#070a10] py-2 pl-9 pr-3 font-sans text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredExistingRuleOptions.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center font-sans text-xs text-slate-500">
                  {existingRuleOptions.length === 0
                    ? "No existing rules found across saved projects."
                    : "No rules match your search query."}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredExistingRuleOptions.map((item) => {
                    const toolCode =
                      typeof item.rule.params?.toolCode === "string"
                        ? item.rule.params.toolCode
                        : item.rule.kind;
                    const isSameRuleset = item.sourceRulesetId === ruleset.id;

                    return (
                      <div
                        key={`${item.sourceRulesetId}:${item.rule.id}`}
                        className="group flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 transition-all hover:border-cyan-400/50 hover:bg-white/[0.05]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#07090e]">
                            <ToolInspectionGraphic toolCode={toolCode} size={40} />
                          </div>
                          <div className="min-w-0">
                            <span className="block truncate font-sans text-xs font-semibold text-white">
                              {item.rule.name}
                            </span>
                            <span className="block truncate font-sans text-[10px] text-slate-500">
                              {item.sourceProjectName} · {item.sourceRulesetName}
                              {isSameRuleset ? " (Current)" : ""}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded bg-white/[0.06] border border-white/10 px-2 py-0.5 font-sans text-[10px] font-medium text-slate-300">
                            {toolCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => void commitExistingRule(item.rule)}
                            className="flex items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 font-sans text-[11px] font-semibold uppercase tracking-wider text-cyan-300 shadow-sm transition hover:bg-cyan-500/25 active:scale-95 cursor-pointer"
                          >
                            <CopyPlus size={12} />
                            Clone
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
