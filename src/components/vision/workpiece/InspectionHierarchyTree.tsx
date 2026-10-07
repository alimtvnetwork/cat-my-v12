import { useState, useMemo, useCallback } from "react";
import {
  FolderTree,
  Cpu,
  FileCode2,
  ListChecks,
  Sun,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Wand2,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Play,
  Eye,
  EyeOff,
  Trash2,
  Camera,
} from "lucide-react";
import type { Project, RuleSet } from "@/lib/projects/types";
import {
  type EditorRule,
  type RuleCameraSettings,
  type RuleLightSettings,
  DEFAULT_RULE_CAMERA_SETTINGS,
  DEFAULT_RULE_LIGHT_SETTINGS,
} from "@/lib/editor/types";
import {
  useValidationStore,
  ValidationStatusType,
  type ValidationResult,
} from "@/lib/editor/validation-store";

export interface InspectionHierarchyTreeProps {
  project: Project;
  ruleset: RuleSet;
  rulesets?: RuleSet[];
  onSelectRuleset?: (rulesetId: string) => void;
  rules: EditorRule[];
  selectedRuleId?: string | null;
  onSelectRule: (ruleId: string) => void;
  onToggleHidden?: (ruleId: string) => void;
  onDeleteRule?: (ruleId: string) => void;
  onReorderRule?: (ruleId: string, direction: "up" | "down") => void;
  onAddRuleClick?: () => void;
  onAddRulesetClick?: () => void;
  onDeleteRulesetClick?: () => void;
  onTuneRule?: (ruleId: string) => void;
  onRunAnalysis?: () => void;
  isAnalyzing?: boolean;
  onUpdateCameraSettings?: (ruleId: string, settings: RuleCameraSettings) => void;
  onUpdateLightSettings?: (ruleId: string, settings: RuleLightSettings) => void;
}

export function InspectionHierarchyTree({
  project,
  ruleset,
  rulesets,
  onSelectRuleset,
  rules,
  selectedRuleId,
  onSelectRule,
  onToggleHidden,
  onDeleteRule,
  onReorderRule,
  onAddRuleClick,
  onAddRulesetClick,
  onDeleteRulesetClick,
  onTuneRule,
  onRunAnalysis,
  isAnalyzing = false,
  onUpdateCameraSettings,
  onUpdateLightSettings,
}: InspectionHierarchyTreeProps) {
  // Tree expansion state - all open by default for immediate visibility
  const [isProjectsOpen, setIsProjectsOpen] = useState(true);
  const [isDeviceOpen, setIsDeviceOpen] = useState(true);
  const [isRulesetOpen, setIsRulesetOpen] = useState(true);
  const [isRulesOpen, setIsRulesOpen] = useState(true);
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [expandedCameraRuleId, setExpandedCameraRuleId] = useState<string | null>(null);
  const [expandedLightRuleId, setExpandedLightRuleId] = useState<string | null>(null);
  const [expandedRuleIds, setExpandedRuleIds] = useState<Record<string, boolean>>({});

  // Validation results mapped by rule ID
  const validationRuns = useValidationStore((s) => s.runs[ruleset.id]?.results);

  const filteredRules = useMemo(() => {
    if (!searchFilter.trim()) {
      return rules;
    }

    const term = searchFilter.toLowerCase();

    return rules.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        (typeof r.params?.toolCode === "string" &&
          r.params.toolCode.toLowerCase().includes(term)) ||
        (r.family && r.family.toLowerCase().includes(term)),
    );
  }, [rules, searchFilter]);

  const handleToggleAll = useCallback(() => {
    const nextState = !isRulesOpen;
    setIsProjectsOpen(nextState);
    setIsDeviceOpen(nextState);
    setIsRulesetOpen(nextState);
    setIsRulesOpen(nextState);
  }, [isRulesOpen]);

  if (isTreeCollapsed) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-ca-border/70 bg-ca-panel/80 p-2 shadow-sm w-12 shrink-0">
        <button
          type="button"
          onClick={() => setIsTreeCollapsed(false)}
          aria-label="Expand hierarchy tree"
          title="Expand inspection hierarchy tree"
          className="rounded p-1.5 text-ca-ink-muted hover:bg-ca-panel-2 hover:text-ca-ink"
        >
          <PanelLeftOpen size={16} />
        </button>
        <div className="mt-4 flex flex-col items-center gap-3">
          <span title="Project">
            <FolderTree size={16} className="text-amber-500" />
          </span>
          <span title="Device (Circuit / IC)">
            <Cpu size={16} className="text-cyan-400" />
          </span>
          <span title="Rule Set">
            <FileCode2 size={16} className="text-purple-400" />
          </span>
          <span title="Rules">
            <ListChecks size={16} className="text-emerald-400" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Inspection hierarchy tree"
      className="flex flex-col rounded-lg border border-ca-border/70 bg-ca-panel/90 shadow-sm w-full lg:w-72 xl:w-80 shrink-0 overflow-hidden"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-ca-border/60 bg-ca-panel px-3 py-2">
        <div className="flex items-center gap-2">
          <FolderTree size={16} className="text-amber-500" />
          <span className="text-hmi-caption font-semibold tracking-wide text-ca-ink uppercase">
            Inspection Tree
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleToggleAll}
            title={isRulesOpen ? "Collapse all folders" : "Expand all folders"}
            className="rounded px-1.5 py-0.5 text-[10px] text-ca-ink-muted hover:bg-ca-panel-2 hover:text-ca-ink"
          >
            {isRulesOpen ? "Collapse" : "Expand"}
          </button>
          <button
            type="button"
            onClick={() => setIsTreeCollapsed(true)}
            aria-label="Collapse sidebar"
            title="Collapse tree sidebar"
            className="rounded p-1 text-ca-ink-muted hover:bg-ca-panel-2 hover:text-ca-ink"
          >
            <PanelLeftClose size={14} />
          </button>
        </div>
      </div>

      {/* Search / Filter */}
      {rules.length > 3 && (
        <div className="border-b border-ca-border/40 p-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2 text-ca-ink-muted" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter rules..."
              className="w-full rounded border border-ca-border/60 bg-ca-bg/60 pl-7 pr-2 py-1 text-xs text-ca-ink placeholder:text-ca-ink-muted/60 focus:border-ca-select focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Tree Content Body */}
      <div className="flex-1 overflow-y-auto max-h-[70vh] min-h-[480px] p-2 space-y-1 font-mono text-xs">
        {/* LEVEL 1: PROJECTS */}
        <div className="select-none">
          <div
            onClick={() => setIsProjectsOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-ca-ink hover:bg-ca-panel-2 cursor-pointer transition-colors"
          >
            {isProjectsOpen ? (
              <ChevronDown size={14} className="text-ca-ink-muted shrink-0" />
            ) : (
              <ChevronRight size={14} className="text-ca-ink-muted shrink-0" />
            )}
            <FolderTree size={15} className="text-amber-500 shrink-0" />
            <span className="font-semibold truncate text-amber-200">Project: {project.name}</span>
            <span className="ml-auto text-[10px] text-ca-ink-muted/70 bg-ca-panel-2 px-1 rounded">
              Active
            </span>
          </div>

          {isProjectsOpen && (
            <div className="ml-3 border-l border-ca-border/40 pl-2.5 mt-1 space-y-1">
              {/* LEVEL 2: DEVICE (CIRCUIT / IC) */}
              <div>
                <div
                  onClick={() => setIsDeviceOpen((o) => !o)}
                  className="flex items-center gap-1.5 rounded px-2 py-1 text-ca-ink hover:bg-ca-panel-2 cursor-pointer transition-colors"
                >
                  {isDeviceOpen ? (
                    <ChevronDown size={14} className="text-ca-ink-muted shrink-0" />
                  ) : (
                    <ChevronRight size={14} className="text-ca-ink-muted shrink-0" />
                  )}
                  <Cpu size={15} className="text-cyan-400 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-cyan-200 truncate">
                      Device: {project.deviceId || "Circuit DUT (IC)"}
                    </span>
                    <span className="text-[10px] text-ca-ink-muted/80 truncate">
                      IC Package / Board DUT
                    </span>
                  </div>
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-cyan-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    IC Loaded
                  </span>
                </div>

                {isDeviceOpen && (
                  <div className="ml-3 border-l border-ca-border/40 pl-2.5 mt-1 space-y-1">
                    {/* LEVEL 3: RULESET */}
                    <div className="space-y-1">
                      {rulesets && rulesets.length > 1 && (
                        <div className="space-y-1 mb-1">
                          {rulesets
                            .filter((rs) => rs.id !== ruleset.id)
                            .map((rs) => (
                              <div
                                key={rs.id}
                                onClick={() => onSelectRuleset?.(rs.id)}
                                className="flex items-center gap-1.5 rounded px-2 py-1 text-ca-ink hover:bg-ca-panel-2 cursor-pointer transition-colors opacity-75 hover:opacity-100"
                              >
                                <ChevronRight size={14} className="text-ca-ink-muted shrink-0" />
                                <FileCode2 size={15} className="text-purple-400/70 shrink-0" />
                                <span className="font-medium text-purple-200/80 truncate text-xs">
                                  RuleSet: {rs.name}
                                </span>
                                <span className="ml-auto flex items-center gap-1">
                                  <span className="text-[10px] text-ca-ink-muted/80 bg-ca-panel-2 px-1 rounded">
                                    {rs.rules?.length ?? 0}
                                  </span>
                                  {onAddRuleClick ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onSelectRuleset) onSelectRuleset(rs.id);
                                        onAddRuleClick();
                                      }}
                                      title="Add rule to ruleset"
                                      aria-label="Add rule to ruleset"
                                      className="rounded p-0.5 text-ca-ink-muted hover:bg-ca-panel hover:text-purple-300"
                                    >
                                      <Plus size={11} />
                                    </button>
                                  ) : null}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Active RuleSet */}
                      <div>
                        <div
                          onClick={() => setIsRulesetOpen((o) => !o)}
                          className="flex items-center gap-1.5 rounded px-2 py-1 text-ca-ink hover:bg-ca-panel-2 cursor-pointer transition-colors bg-purple-950/20 border border-purple-900/40"
                        >
                          {isRulesetOpen ? (
                            <ChevronDown size={14} className="text-ca-ink-muted shrink-0" />
                          ) : (
                            <ChevronRight size={14} className="text-ca-ink-muted shrink-0" />
                          )}
                          <FileCode2 size={15} className="text-purple-400 shrink-0" />
                          <span className="font-semibold text-purple-200 truncate">
                            RuleSet: {ruleset.name}
                          </span>
                          <span className="ml-auto flex items-center gap-1">
                            <span className="text-[10px] text-ca-ink-muted/80 bg-ca-panel-2 px-1 rounded">
                              {rules.length}
                            </span>
                            {onAddRulesetClick && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddRulesetClick();
                                }}
                                title="Add ruleset"
                                aria-label="Add ruleset"
                                className="rounded p-0.5 text-ca-ink-muted hover:bg-ca-panel hover:text-purple-300"
                              >
                                <FileCode2 size={11} />
                              </button>
                            )}
                            {onDeleteRulesetClick && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteRulesetClick();
                                }}
                                title="Delete ruleset"
                                aria-label="Delete ruleset"
                                className="rounded p-0.5 text-ca-ink-muted hover:bg-ca-panel hover:text-rose-300"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                            {onAddRuleClick && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddRuleClick();
                                }}
                                title="Add rule to ruleset"
                                aria-label="Add rule to ruleset"
                                className="rounded p-0.5 text-ca-ink-muted hover:bg-ca-panel hover:text-purple-300"
                              >
                                <Plus size={11} />
                              </button>
                            )}
                          </span>
                        </div>

                        {isRulesetOpen && (
                          <div className="ml-3 border-l border-ca-border/40 pl-2.5 mt-1 space-y-2">
                            {/* LEVEL 4A: RULES */}
                            <div>
                              <div className="flex items-center justify-between rounded px-2 py-0.5 text-ca-ink-muted">
                                <div
                                  onClick={() => setIsRulesOpen((o) => !o)}
                                  className="flex items-center gap-1.5 hover:text-ca-ink cursor-pointer flex-1"
                                >
                                  {isRulesOpen ? (
                                    <ChevronDown size={13} className="shrink-0" />
                                  ) : (
                                    <ChevronRight size={13} className="shrink-0" />
                                  )}
                                  <ListChecks size={14} className="text-emerald-400 shrink-0" />
                                  <span className="font-medium text-[11px] uppercase tracking-wider text-ca-ink/90">
                                    Rules ({filteredRules.length})
                                  </span>
                                </div>
                                {onAddRuleClick && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAddRuleClick();
                                    }}
                                    title="Add rule from tools"
                                    aria-label="Add rule from tools"
                                    className="rounded p-1 text-ca-ink-muted hover:bg-ca-panel-2 hover:text-ca-ink transition-colors"
                                  >
                                    <Plus size={12} />
                                  </button>
                                )}
                              </div>

                              {isRulesOpen && (
                                <div className="ml-2 border-l border-ca-border/30 pl-2 mt-1 space-y-1">
                                  {filteredRules.length === 0 ? (
                                    <div className="py-2 text-center text-ca-ink-muted/60 text-[11px]">
                                      No rules defined
                                    </div>
                                  ) : (
                                    filteredRules.map((rule, idx) => {
                                      const isSelected = selectedRuleId === rule.id;
                                      const validationResult: ValidationResult | undefined =
                                        validationRuns?.[rule.id];
                                      const isPass =
                                        validationResult?.status === ValidationStatusType.Pass;
                                      const isFail =
                                        validationResult?.status === ValidationStatusType.Fail;
                                      const toolCode =
                                        typeof rule.params?.toolCode === "string"
                                          ? rule.params.toolCode
                                          : null;

                                      const camSettings =
                                        rule.cameraSettings ??
                                        (rule.params as any)?.cameraSettings ??
                                        DEFAULT_RULE_CAMERA_SETTINGS;
                                      const lightSettings =
                                        rule.lightSettings ??
                                        (rule.params as any)?.lightSettings ??
                                        DEFAULT_RULE_LIGHT_SETTINGS;
                                      const isSubtreeOpen = expandedRuleIds[rule.id] !== false;
                                      const isCameraOpen = expandedCameraRuleId === rule.id;
                                      const isLightOpen = expandedLightRuleId === rule.id;

                                      return (
                                        <div key={rule.id} className="space-y-1">
                                          <div
                                            onClick={() => onSelectRule(rule.id)}
                                            className={`group flex items-center justify-between rounded px-2 py-1.5 cursor-pointer transition-all ${
                                              isSelected
                                                ? "bg-ca-select/25 border-l-2 border-ca-select text-white font-medium shadow-sm"
                                                : "hover:bg-ca-panel-2/80 text-ca-ink/80"
                                            }`}
                                          >
                                            <div className="flex items-center gap-1.5 min-w-0 pr-1">
                                              {/* Subtree Expand/Collapse Chevron */}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setExpandedRuleIds((prev) => ({
                                                    ...prev,
                                                    [rule.id]: !(prev[rule.id] !== false),
                                                  }));
                                                }}
                                                title={
                                                  isSubtreeOpen
                                                    ? "Collapse optical subtree"
                                                    : "Expand optical subtree"
                                                }
                                                className="p-0.5 text-ca-ink-muted hover:text-ca-ink shrink-0"
                                              >
                                                {isSubtreeOpen ? (
                                                  <ChevronDown size={12} />
                                                ) : (
                                                  <ChevronRight size={12} />
                                                )}
                                              </button>

                                              <span className="text-[10px] text-ca-ink-muted font-mono shrink-0">
                                                [{idx + 1}]
                                              </span>

                                              {/* Visibility Toggle */}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onToggleHidden?.(rule.id);
                                                }}
                                                title={
                                                  rule.isHidden
                                                    ? "Show rule overlay"
                                                    : "Hide rule overlay"
                                                }
                                                className="text-ca-ink-muted/60 hover:text-ca-ink shrink-0"
                                              >
                                                {rule.isHidden ? (
                                                  <EyeOff size={12} className="text-rose-400" />
                                                ) : (
                                                  <Eye size={12} />
                                                )}
                                              </button>

                                              <span className="truncate text-xs">{rule.name}</span>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                              {toolCode && (
                                                <span className="rounded bg-ca-panel-2 px-1 py-0.2 text-[9px] font-mono text-ca-ink-muted">
                                                  {toolCode}
                                                </span>
                                              )}

                                              {/* Status Badge with visible score */}
                                              {isPass ? (
                                                <span
                                                  title={
                                                    validationResult?.message ?? "Passed inspection"
                                                  }
                                                  className="flex items-center gap-0.5 rounded bg-emerald-950/70 border border-emerald-800/80 px-1 py-0.2 text-[9px] text-emerald-400 font-semibold"
                                                >
                                                  <CheckCircle2 size={10} />
                                                  PASS{" "}
                                                  {typeof validationResult?.score === "number"
                                                    ? `${(validationResult.score * 100).toFixed(0)}%`
                                                    : ""}
                                                </span>
                                              ) : isFail ? (
                                                <span
                                                  title={
                                                    validationResult?.message ?? "Failed inspection"
                                                  }
                                                  className="flex items-center gap-0.5 rounded bg-rose-950/70 border border-rose-800/80 px-1 py-0.2 text-[9px] text-rose-400 font-semibold"
                                                >
                                                  <AlertCircle size={10} />
                                                  FAIL
                                                </span>
                                              ) : (
                                                <span className="flex items-center gap-0.5 text-[9px] text-amber-400/80 font-mono">
                                                  <Clock size={10} />
                                                  READY
                                                </span>
                                              )}

                                              {/* Camera Settings Toggle Button */}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setExpandedCameraRuleId((prev) =>
                                                    prev === rule.id ? null : rule.id,
                                                  );
                                                }}
                                                title={`Camera Settings: ${((camSettings.exposureUs ?? 20000) / 1000).toFixed(1)}ms exposure, ${(camSettings.gainDb ?? 0).toFixed(1)}dB gain`}
                                                className={`rounded p-1 transition-all ${
                                                  isCameraOpen
                                                    ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/50"
                                                    : "text-ca-ink-muted hover:text-cyan-300 hover:bg-ca-panel"
                                                }`}
                                              >
                                                <Camera size={11} />
                                              </button>

                                              {/* Light Settings Toggle Button */}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setExpandedLightRuleId((prev) =>
                                                    prev === rule.id ? null : rule.id,
                                                  );
                                                }}
                                                title={`Light Settings: CH${lightSettings.channel ?? 1}, ${lightSettings.intensity ?? 80}%`}
                                                className={`rounded p-1 transition-all ${
                                                  isLightOpen
                                                    ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/50"
                                                    : "text-ca-ink-muted hover:text-amber-300 hover:bg-ca-panel"
                                                }`}
                                              >
                                                <Sun size={11} />
                                              </button>

                                              {/* Move Up / Down actions */}
                                              {onReorderRule && (
                                                <div className="hidden group-hover:flex items-center gap-0.5">
                                                  {idx > 0 && (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        onReorderRule(rule.id, "up");
                                                      }}
                                                      title="Move rule up"
                                                      className="rounded p-0.5 text-ca-ink-muted hover:bg-ca-panel hover:text-ca-ink"
                                                    >
                                                      <ChevronUp size={11} />
                                                    </button>
                                                  )}
                                                  {idx < filteredRules.length - 1 && (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        onReorderRule(rule.id, "down");
                                                      }}
                                                      title="Move rule down"
                                                      className="rounded p-0.5 text-ca-ink-muted hover:bg-ca-panel hover:text-ca-ink"
                                                    >
                                                      <ChevronDown size={11} />
                                                    </button>
                                                  )}
                                                </div>
                                              )}

                                              {/* Tune button */}
                                              {onTuneRule && (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onTuneRule(rule.id);
                                                  }}
                                                  title="Visual Tune this rule"
                                                  className="rounded p-1 text-ca-ink-muted opacity-0 group-hover:opacity-100 hover:bg-ca-panel hover:text-ca-select transition-all"
                                                >
                                                  <Wand2 size={11} />
                                                </button>
                                              )}

                                              {/* Delete button */}
                                              {onDeleteRule && (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteRule(rule.id);
                                                  }}
                                                  title="Delete rule"
                                                  className="rounded p-1 text-ca-ink-muted opacity-0 group-hover:opacity-100 hover:bg-ca-panel hover:text-rose-400 transition-all"
                                                >
                                                  <Trash2 size={11} />
                                                </button>
                                              )}
                                            </div>
                                          </div>

                                          {/* Subtree: Camera & Light Settings */}
                                          {isSubtreeOpen && (
                                            <div className="ml-4 border-l border-ca-border/40 pl-2 space-y-1 py-0.5">
                                              {/* Subtree Node 1: Camera Settings */}
                                              <div>
                                                <div
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedCameraRuleId((prev) =>
                                                      prev === rule.id ? null : rule.id,
                                                    );
                                                  }}
                                                  className={`flex items-center justify-between rounded px-2 py-1 text-xs cursor-pointer transition-colors ${
                                                    isCameraOpen
                                                      ? "bg-cyan-950/30 text-cyan-200"
                                                      : "hover:bg-ca-panel-2/60 text-ca-ink-muted hover:text-ca-ink"
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-1.5 min-w-0">
                                                    {isCameraOpen ? (
                                                      <ChevronDown
                                                        size={11}
                                                        className="text-cyan-400 shrink-0"
                                                      />
                                                    ) : (
                                                      <ChevronRight
                                                        size={11}
                                                        className="shrink-0"
                                                      />
                                                    )}
                                                    <Camera
                                                      size={12}
                                                      className="text-cyan-400 shrink-0"
                                                    />
                                                    <span className="font-medium text-[11px] truncate">
                                                      Camera Settings
                                                    </span>
                                                  </div>
                                                  <span className="font-mono text-[9px] text-cyan-300/90 bg-cyan-950/50 px-1 py-0.2 rounded border border-cyan-800/40">
                                                    {(
                                                      (camSettings.exposureUs ?? 20000) / 1000
                                                    ).toFixed(1)}
                                                    ms · {(camSettings.gainDb ?? 0).toFixed(1)}dB
                                                  </span>
                                                </div>

                                                {/* Camera Settings Expanded Panel */}
                                                {isCameraOpen && (
                                                  <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="my-1 rounded border border-cyan-500/40 bg-ca-panel/95 p-2 text-xs shadow-md space-y-2 ml-1"
                                                  >
                                                    <div className="flex items-center justify-between border-b border-ca-border/40 pb-1">
                                                      <span className="text-[10px] font-semibold text-cyan-300">
                                                        Camera Settings: {rule.name}
                                                      </span>
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          onUpdateCameraSettings?.(
                                                            rule.id,
                                                            DEFAULT_RULE_CAMERA_SETTINGS,
                                                          )
                                                        }
                                                        className="text-[10px] text-ca-ink-muted hover:text-cyan-300 transition"
                                                        title="Reset camera settings to defaults"
                                                      >
                                                        Reset
                                                      </button>
                                                    </div>

                                                    {/* Exposure Time Slider */}
                                                    <div className="rounded bg-ca-panel-2/50 p-1.5 border border-ca-border/40">
                                                      <div className="flex items-center justify-between text-ca-ink mb-1">
                                                        <span className="text-[10px] text-ca-ink-muted font-medium">
                                                          Exposure Time
                                                        </span>
                                                        <span className="font-mono text-[10px] text-cyan-300">
                                                          {(
                                                            (camSettings.exposureUs ?? 20000) / 1000
                                                          ).toFixed(1)}{" "}
                                                          ms ({camSettings.exposureUs ?? 20000} µs)
                                                        </span>
                                                      </div>
                                                      <input
                                                        type="range"
                                                        min={500}
                                                        max={100000}
                                                        step={500}
                                                        value={camSettings.exposureUs ?? 20000}
                                                        onChange={(e) => {
                                                          const exposureUs = Number(e.target.value);
                                                          onUpdateCameraSettings?.(rule.id, {
                                                            ...camSettings,
                                                            exposureUs,
                                                          });
                                                        }}
                                                        className="w-full accent-cyan-400 h-1 bg-ca-bg rounded"
                                                      />
                                                    </div>

                                                    {/* Analog Gain Slider */}
                                                    <div className="rounded bg-ca-panel-2/50 p-1.5 border border-ca-border/40">
                                                      <div className="flex items-center justify-between text-ca-ink mb-1">
                                                        <span className="text-[10px] text-ca-ink-muted font-medium">
                                                          Analog Gain
                                                        </span>
                                                        <span className="font-mono text-[10px] text-cyan-300">
                                                          {(camSettings.gainDb ?? 0).toFixed(1)} dB
                                                        </span>
                                                      </div>
                                                      <input
                                                        type="range"
                                                        min={0}
                                                        max={24}
                                                        step={0.5}
                                                        value={camSettings.gainDb ?? 0}
                                                        onChange={(e) => {
                                                          const gainDb = Number(e.target.value);
                                                          onUpdateCameraSettings?.(rule.id, {
                                                            ...camSettings,
                                                            gainDb,
                                                          });
                                                        }}
                                                        className="w-full accent-cyan-400 h-1 bg-ca-bg rounded"
                                                      />
                                                    </div>

                                                    {/* White Balance Slider */}
                                                    <div className="rounded bg-ca-panel-2/50 p-1.5 border border-ca-border/40">
                                                      <div className="flex items-center justify-between text-ca-ink mb-1">
                                                        <span className="text-[10px] text-ca-ink-muted font-medium">
                                                          White Balance
                                                        </span>
                                                        <span className="font-mono text-[10px] text-amber-300">
                                                          {camSettings.whiteBalanceKelvin ?? 5000} K
                                                        </span>
                                                      </div>
                                                      <input
                                                        type="range"
                                                        min={2800}
                                                        max={9500}
                                                        step={100}
                                                        value={
                                                          camSettings.whiteBalanceKelvin ?? 5000
                                                        }
                                                        onChange={(e) => {
                                                          const whiteBalanceKelvin = Number(
                                                            e.target.value,
                                                          );
                                                          onUpdateCameraSettings?.(rule.id, {
                                                            ...camSettings,
                                                            whiteBalanceKelvin,
                                                          });
                                                        }}
                                                        className="w-full accent-amber-400 h-1 bg-ca-bg rounded"
                                                      />
                                                    </div>

                                                    {/* Gamma Slider */}
                                                    <div className="rounded bg-ca-panel-2/50 p-1.5 border border-ca-border/40">
                                                      <div className="flex items-center justify-between text-ca-ink mb-1">
                                                        <span className="text-[10px] text-ca-ink-muted font-medium">
                                                          Gamma
                                                        </span>
                                                        <span className="font-mono text-[10px] text-purple-300">
                                                          {(camSettings.gamma ?? 1.0).toFixed(2)}
                                                        </span>
                                                      </div>
                                                      <input
                                                        type="range"
                                                        min={0.4}
                                                        max={2.2}
                                                        step={0.05}
                                                        value={camSettings.gamma ?? 1.0}
                                                        onChange={(e) => {
                                                          const gamma = Number(e.target.value);
                                                          onUpdateCameraSettings?.(rule.id, {
                                                            ...camSettings,
                                                            gamma,
                                                          });
                                                        }}
                                                        className="w-full accent-purple-400 h-1 bg-ca-bg rounded"
                                                      />
                                                    </div>
                                                  </div>
                                                )}
                                              </div>

                                              {/* Subtree Node 2: Light Settings */}
                                              <div>
                                                <div
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedLightRuleId((prev) =>
                                                      prev === rule.id ? null : rule.id,
                                                    );
                                                  }}
                                                  className={`flex items-center justify-between rounded px-2 py-1 text-xs cursor-pointer transition-colors ${
                                                    isLightOpen
                                                      ? "bg-amber-950/30 text-amber-200"
                                                      : "hover:bg-ca-panel-2/60 text-ca-ink-muted hover:text-ca-ink"
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-1.5 min-w-0">
                                                    {isLightOpen ? (
                                                      <ChevronDown
                                                        size={11}
                                                        className="text-amber-400 shrink-0"
                                                      />
                                                    ) : (
                                                      <ChevronRight
                                                        size={11}
                                                        className="shrink-0"
                                                      />
                                                    )}
                                                    <Sun
                                                      size={12}
                                                      className="text-amber-400 shrink-0"
                                                    />
                                                    <span className="font-medium text-[11px] truncate">
                                                      Light Settings
                                                    </span>
                                                  </div>
                                                  <span className="font-mono text-[9px] text-amber-300/90 bg-amber-950/50 px-1 py-0.2 rounded border border-amber-800/40">
                                                    CH{lightSettings.channel ?? 1} ·{" "}
                                                    {lightSettings.intensity ?? 80}%
                                                    {(lightSettings.hasStrobe ?? true)
                                                      ? " · Strobe"
                                                      : ""}
                                                  </span>
                                                </div>

                                                {/* Light Settings Expanded Panel */}
                                                {isLightOpen && (
                                                  <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="my-1 rounded border border-amber-500/40 bg-ca-panel/95 p-2 text-xs shadow-md space-y-2 ml-1"
                                                  >
                                                    <div className="flex items-center justify-between border-b border-ca-border/40 pb-1">
                                                      <span className="text-[10px] font-semibold text-amber-300">
                                                        Light Settings: {rule.name}
                                                      </span>
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          onUpdateLightSettings?.(
                                                            rule.id,
                                                            DEFAULT_RULE_LIGHT_SETTINGS,
                                                          )
                                                        }
                                                        className="text-[10px] text-ca-ink-muted hover:text-amber-300 transition"
                                                        title="Reset light settings to defaults"
                                                      >
                                                        Reset
                                                      </button>
                                                    </div>

                                                    {/* Light Intensity Slider */}
                                                    <div className="rounded bg-ca-panel-2/50 p-1.5 border border-ca-border/40">
                                                      <div className="flex items-center justify-between text-ca-ink mb-1">
                                                        <span className="text-[10px] text-ca-ink-muted font-medium">
                                                          Intensity
                                                        </span>
                                                        <span className="font-mono text-[10px] text-amber-300">
                                                          {lightSettings.intensity ?? 80}%
                                                        </span>
                                                      </div>
                                                      <input
                                                        type="range"
                                                        min={0}
                                                        max={100}
                                                        step={1}
                                                        value={lightSettings.intensity ?? 80}
                                                        onChange={(e) => {
                                                          const intensity = Number(e.target.value);
                                                          onUpdateLightSettings?.(rule.id, {
                                                            ...lightSettings,
                                                            intensity,
                                                          });
                                                        }}
                                                        className="w-full accent-amber-400 h-1 bg-ca-bg rounded"
                                                      />
                                                    </div>

                                                    {/* Channel Selection (1 to 4) */}
                                                    <div className="rounded bg-ca-panel-2/50 p-1.5 border border-ca-border/40">
                                                      <div className="flex items-center justify-between text-ca-ink mb-1">
                                                        <span className="text-[10px] text-ca-ink-muted font-medium">
                                                          Channel
                                                        </span>
                                                        <span className="font-mono text-[10px] text-amber-300">
                                                          CH {lightSettings.channel ?? 1}
                                                        </span>
                                                      </div>
                                                      <div className="grid grid-cols-4 gap-1">
                                                        {[1, 2, 3, 4].map((ch) => {
                                                          const isSelectedCh =
                                                            (lightSettings.channel ?? 1) === ch;

                                                          return (
                                                            <button
                                                              key={ch}
                                                              type="button"
                                                              onClick={() =>
                                                                onUpdateLightSettings?.(rule.id, {
                                                                  ...lightSettings,
                                                                  channel: ch,
                                                                })
                                                              }
                                                              className={`rounded py-0.5 text-[10px] font-mono font-medium transition ${
                                                                isSelectedCh
                                                                  ? "bg-amber-500 text-black font-bold"
                                                                  : "bg-ca-panel text-ca-ink-muted hover:text-ca-ink hover:bg-ca-panel-2"
                                                              }`}
                                                            >
                                                              CH {ch}
                                                            </button>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>

                                                    {/* Strobe Mode Toggle and Duration */}
                                                    <div className="rounded bg-ca-panel-2/50 p-1.5 border border-ca-border/40 space-y-1.5">
                                                      <label className="flex items-center justify-between text-ca-ink cursor-pointer">
                                                        <span className="text-[10px] text-ca-ink-muted font-medium">
                                                          Strobe Pulse Mode
                                                        </span>
                                                        <input
                                                          type="checkbox"
                                                          checked={lightSettings.hasStrobe ?? true}
                                                          onChange={(e) => {
                                                            const hasStrobe = e.target.checked;
                                                            onUpdateLightSettings?.(rule.id, {
                                                              ...lightSettings,
                                                              hasStrobe,
                                                            });
                                                          }}
                                                          className="rounded accent-amber-400"
                                                        />
                                                      </label>

                                                      {(lightSettings.hasStrobe ?? true) && (
                                                        <div>
                                                          <div className="flex items-center justify-between text-ca-ink mb-1">
                                                            <span className="text-[9px] text-ca-ink-muted">
                                                              Pulse Duration
                                                            </span>
                                                            <span className="font-mono text-[9px] text-amber-300">
                                                              {lightSettings.strobeDurationUs ??
                                                                1000}{" "}
                                                              µs
                                                            </span>
                                                          </div>
                                                          <input
                                                            type="range"
                                                            min={100}
                                                            max={10000}
                                                            step={100}
                                                            value={
                                                              lightSettings.strobeDurationUs ?? 1000
                                                            }
                                                            onChange={(e) => {
                                                              const strobeDurationUs = Number(
                                                                e.target.value,
                                                              );
                                                              onUpdateLightSettings?.(rule.id, {
                                                                ...lightSettings,
                                                                strobeDurationUs,
                                                              });
                                                            }}
                                                            className="w-full accent-amber-400 h-1 bg-ca-bg rounded"
                                                          />
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="border-t border-ca-border/60 bg-ca-panel p-2 flex items-center gap-1.5">
        {onAddRulesetClick && (
          <button
            type="button"
            onClick={onAddRulesetClick}
            className="flex-1 flex items-center justify-center gap-1 rounded bg-ca-panel-2 border border-ca-border/80 px-2 py-1.5 text-xs font-semibold text-ca-ink hover:bg-ca-panel-2/80 transition-colors"
          >
            <Plus size={13} />
            <span>Add Ruleset</span>
          </button>
        )}

        {onRunAnalysis && (
          <button
            type="button"
            onClick={onRunAnalysis}
            disabled={isAnalyzing}
            className="flex-1 flex items-center justify-center gap-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Play size={13} className="fill-white" />
            <span>{isAnalyzing ? "Analyzing..." : "Analyze"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
