import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  Bug,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleDot,
  Clock,
  Cpu,
  Crosshair,
  Eye,
  EyeOff,
  FileCode2,
  FolderTree,
  Grid2X2,
  ListChecks,
  PaintBucket,
  Play,
  Plus,
  QrCode,
  RotateCcw,
  Ruler,
  ScanSearch,
  Search,
  Sun,
  Trash2,
  Type,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import type { Project, RuleSet } from "@/lib/projects/types";
import {
  DEFAULT_RULE_CAMERA_SETTINGS,
  DEFAULT_RULE_LIGHT_SETTINGS,
  type EditorRule,
  type RuleCameraSettings,
  type RuleLightSettings,
} from "@/lib/editor/types";
import {
  useValidationStore,
  ValidationStatusType,
  type ValidationResult,
} from "@/lib/editor/validation-store";

function getRuleToolCode(rule: EditorRule): string {
  return typeof rule.params?.toolCode === "string" ? rule.params.toolCode : "";
}

function getToolIcon(code: string, name: string): LucideIcon {
  const normalized = `${code} ${name}`.toLowerCase();

  if (normalized.includes("pin 1") || normalized.includes("pin1")) return CircleDot;
  if (normalized.includes("pattern") || code === "T102") return ScanSearch;
  if (normalized.includes("area") || normalized.includes("intensity")) return Grid2X2;
  if (normalized.includes("edge") || normalized.includes("lead")) return Activity;
  if (normalized.includes("blob") || normalized.includes("bridge")) return Bug;
  if (normalized.includes("void") || normalized.includes("circle") || code === "T111") return Crosshair;
  if (normalized.includes("caliper") || normalized.includes("gauge") || code === "T110") return Ruler;
  if (normalized.includes("qr") || normalized.includes("datamatrix") || code === "T103") return QrCode;
  if (normalized.includes("ocr") || normalized.includes("marking") || code === "T106") return Type;
  if (normalized.includes("coating") || normalized.includes("color") || code === "T112") return PaintBucket;

  return ScanSearch;
}

function getRuleMatchesFilter(rule: EditorRule, filter: string): boolean {
  if (!filter.trim()) return true;

  const term = filter.toLowerCase();
  const toolCode = getRuleToolCode(rule).toLowerCase();

  return (
    rule.name.toLowerCase().includes(term) ||
    toolCode.includes(term) ||
    Boolean(rule.family && rule.family.toLowerCase().includes(term))
  );
}

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
  onAddRuleClick?: (rulesetId?: string) => void;
  onAddRulesetClick?: () => void;
  onDeleteRulesetClick?: (rulesetId?: string) => void;
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
  const [isDeviceOpen, setIsDeviceOpen] = useState(true);
  const [isRuleSetsOpen, setIsRuleSetsOpen] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [openRulesetIds, setOpenRulesetIds] = useState<Record<string, boolean>>({});
  const [openRulesMap, setOpenRulesMap] = useState<Record<string, boolean>>({});
  const [expandedRuleIds, setExpandedRuleIds] = useState<Record<string, boolean>>({});
  const [expandedCameraRuleId, setExpandedCameraRuleId] = useState<string | null>(null);
  const [expandedLightRuleId, setExpandedLightRuleId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const displayRulesets = useMemo<RuleSet[]>(() => {
    if (rulesets && rulesets.length > 0) return rulesets;

    return [{ ...ruleset, rules }];
  }, [rules, ruleset, rulesets]);

  const totalRuleCount = useMemo(
    () => displayRulesets.reduce((sum, rs) => sum + (rs.rules?.length ?? 0), 0),
    [displayRulesets],
  );

  const validationRuns = useValidationStore((s) => s.runs);
  const validationResults = useMemo(() => {
    const merged: Record<string, ValidationResult> = {};

    for (const rs of displayRulesets) {
      Object.assign(merged, validationRuns[rs.id]?.results ?? {});
    }

    return merged;
  }, [displayRulesets, validationRuns]);

  if (isCollapsed) {
    return (
      <div
        role="region"
        aria-label="Inspection hierarchy tree"
        className="flex h-full min-h-0 w-12 flex-col items-center gap-2 rounded-xl border border-white/[0.08] bg-black/40 p-2 shadow-inner backdrop-blur-md"
      >
        <IconButton title="Expand inspection hierarchy tree" onClick={() => setIsCollapsed(false)}>
          <FolderTree size={16} />
        </IconButton>
        <span className="rounded bg-white/10 px-1 py-0.5 font-sans text-[9px] font-medium text-white/60">
          {totalRuleCount}
        </span>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Inspection hierarchy tree"
      className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-black/40 font-sans shadow-inner backdrop-blur-md"
    >
      {/* Compact Header & Integrated Search Filter */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <FolderTree size={14} className="shrink-0 text-amber-400" />
          <span className="truncate text-[11px] font-bold uppercase tracking-wider text-white/90">
            Inspection Program
          </span>
          <span className="rounded bg-white/10 px-1 py-0.2 font-sans text-[9px] font-medium text-white/60">
            {totalRuleCount}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="relative w-28 shrink-0">
            <Search size={11} className="pointer-events-none absolute left-2 top-1.5 text-ca-ink-muted" />
            <input
              type="text"
              value={searchFilter}
              onChange={(event) => setSearchFilter(event.target.value)}
              placeholder="Search..."
              className="h-6 w-full rounded border border-white/10 bg-black/50 pl-6 pr-2 font-sans text-[10px] text-white placeholder:text-white/30 focus:border-amber-400 focus:outline-none"
            />
          </div>
          <IconButton title="Collapse tree sidebar" onClick={() => setIsCollapsed(true)}>
            <ChevronRight size={12} />
          </IconButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 font-sans text-xs [scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin]">
        <div className="select-none space-y-0.5">
          <TreeRow
            isOpen={true}
            icon={<FolderTree size={14} className="shrink-0 text-amber-400" />}
            title={`Project: ${project.name}`}
            meta="Active"
            onClick={() => {}}
          />

          <div className="ml-2.5 space-y-0.5 border-l border-ca-border/40 pl-2">
            <TreeRow
              isOpen={isDeviceOpen}
              icon={<Cpu size={14} className="shrink-0 text-cyan-400" />}
              title={`Device: ${project.deviceId || "Circuit DUT (IC)"}`}
              subtitle="IC Package / Board DUT"
              meta="IC Loaded"
              onClick={() => setIsDeviceOpen((value) => !value)}
            />

          {isDeviceOpen ? (
            <div className="ml-2.5 space-y-0.5 border-l border-ca-border/40 pl-2">
              <TreeRow
                isOpen={isRuleSetsOpen}
                icon={<FileCode2 size={14} className="shrink-0 text-purple-400" />}
                title="Rule Sets"
                meta={`${displayRulesets.length}`}
                onClick={() => setIsRuleSetsOpen((value) => !value)}
                action={
                  onAddRulesetClick ? (
                    <IconButton
                      data-tour="project-add-ruleset"
                      title="Add ruleset"
                      onClick={onAddRulesetClick}
                      className="hover:text-purple-300"
                    >
                      <Plus size={11} />
                    </IconButton>
                  ) : null
                }
              />

              {isRuleSetsOpen ? (
                <div className="ml-2.5 space-y-0.5 border-l border-ca-border/40 pl-2">
                  {displayRulesets.map((rs) => {
                    const isActiveRuleset = rs.id === ruleset.id;
                    const isRulesetOpen = openRulesetIds[rs.id] ?? true;
                    const isRulesListOpen = openRulesMap[rs.id] ?? true;
                    const rulesetRules = (rs.rules ?? []).filter((rule) =>
                      getRuleMatchesFilter(rule, searchFilter),
                    );

                    return (
                      <div key={rs.id} className="space-y-0.5">
                        <div
                          className={`group flex cursor-pointer items-center gap-1 rounded-lg border px-1.5 py-1 transition-all ${
                            isActiveRuleset
                              ? "border-purple-400/40 bg-purple-950/40 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.15)]"
                              : "border-transparent text-white/85 hover:border-white/10 hover:bg-white/[0.04]"
                          }`}
                          onClick={() => {
                            if (isActiveRuleset) {
                              setOpenRulesetIds((current) => ({
                                ...current,
                                [rs.id]: !isRulesetOpen,
                              }));
                            } else {
                              onSelectRuleset?.(rs.id);
                              setOpenRulesetIds((current) => ({
                                ...current,
                                [rs.id]: true,
                              }));
                            }
                          }}
                        >
                          <IconButton
                            title={isRulesetOpen ? "Collapse ruleset" : "Expand ruleset"}
                            onClick={() => {
                              setOpenRulesetIds((current) => ({
                                ...current,
                                [rs.id]: !isRulesetOpen,
                              }));
                            }}
                          >
                            {isRulesetOpen ? (
                              <ChevronDown size={12} className="shrink-0 text-ca-ink-muted" />
                            ) : (
                              <ChevronRight size={12} className="shrink-0 text-ca-ink-muted" />
                            )}
                          </IconButton>
                          <FileCode2 size={13} className="shrink-0 text-purple-400" />
                          <div className="min-w-0 flex-1 truncate text-xs font-semibold">
                            <span>RuleSet: {rs.name}</span>
                            {rs.categoryName ? (
                              <span className="ml-1.5 font-sans text-[10px] font-normal text-ca-ink-muted/70">
                                ({rs.categoryName})
                              </span>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <span className="rounded border border-ca-border/70 bg-ca-bg px-1 py-0.2 text-[9px] font-sans font-medium text-ca-ink-muted">
                              {rs.rules?.length ?? 0}
                            </span>
                            {onAddRuleClick ? (
                              <IconButton
                                title="Add rule from tools"
                                onClick={() => onAddRuleClick(rs.id)}
                                className="hover:text-purple-300"
                              >
                                <Plus size={11} />
                              </IconButton>
                            ) : null}
                            {onDeleteRulesetClick && isActiveRuleset && displayRulesets.length > 1 ? (
                              <IconButton
                                title="Delete ruleset"
                                onClick={() => onDeleteRulesetClick(rs.id)}
                                className="hover:text-rose-300"
                              >
                                <Trash2 size={11} />
                              </IconButton>
                            ) : null}
                          </div>
                        </div>

                        {isRulesetOpen ? (
                          <div className="ml-2.5 space-y-0.5 border-l border-ca-border/30 pl-2">
                            <div
                              onClick={() => {
                                setOpenRulesMap((current) => ({
                                  ...current,
                                  [rs.id]: !isRulesListOpen,
                                }));
                              }}
                              className="flex cursor-pointer select-none items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ca-ink-muted transition hover:bg-white/[0.04] hover:text-white"
                            >
                              <IconButton
                                title={isRulesListOpen ? "Collapse rules list" : "Expand rules list"}
                                onClick={() => {
                                  setOpenRulesMap((current) => ({
                                    ...current,
                                    [rs.id]: !isRulesListOpen,
                                  }));
                                }}
                              >
                                {isRulesListOpen ? (
                                  <ChevronDown size={11} className="shrink-0 text-ca-ink-muted" />
                                ) : (
                                  <ChevronRight size={11} className="shrink-0 text-ca-ink-muted" />
                                )}
                              </IconButton>
                              <ListChecks size={12} className="text-emerald-400" />
                              <span>Rules ({rulesetRules.length})</span>
                            </div>

                            {isRulesListOpen ? (
                              rulesetRules.length === 0 ? (
                                <div className="rounded border border-dashed border-ca-border/60 px-2 py-1.5 text-center text-[11px] text-ca-ink-muted/70">
                                  No rules defined
                                </div>
                              ) : (
                                rulesetRules.map((rule, index) => {
                                  const isRuleOpen = Boolean(
                                    expandedRuleIds[rule.id] ||
                                    expandedCameraRuleId === rule.id ||
                                    expandedLightRuleId === rule.id,
                                  );

                                  return (
                                    <RuleNode
                                      key={rule.id}
                                      rule={rule}
                                      index={index}
                                      total={rulesetRules.length}
                                      isSelected={selectedRuleId === rule.id}
                                      validationResult={validationResults[rule.id]}
                                      isExpanded={isRuleOpen}
                                      isCameraOpen={expandedCameraRuleId === rule.id}
                                      isLightOpen={expandedLightRuleId === rule.id}
                                      onSelect={() => {
                                        onSelectRuleset?.(rs.id);
                                        onSelectRule(rule.id);
                                      }}
                                      onToggleExpanded={() => {
                                        if (isRuleOpen) {
                                          setExpandedRuleIds((current) => ({
                                            ...current,
                                            [rule.id]: false,
                                          }));
                                          if (expandedCameraRuleId === rule.id) {
                                            setExpandedCameraRuleId(null);
                                          }
                                          if (expandedLightRuleId === rule.id) {
                                            setExpandedLightRuleId(null);
                                          }
                                        } else {
                                          setExpandedRuleIds((current) => ({
                                            ...current,
                                            [rule.id]: true,
                                          }));
                                        }
                                      }}
                                      onToggleCamera={() => {
                                        const isCameraActive = expandedCameraRuleId === rule.id;
                                        setExpandedCameraRuleId(isCameraActive ? null : rule.id);
                                        if (!isCameraActive) {
                                          setExpandedRuleIds((current) => ({
                                            ...current,
                                            [rule.id]: true,
                                          }));
                                        }
                                      }}
                                      onToggleLight={() => {
                                        const isLightActive = expandedLightRuleId === rule.id;
                                        setExpandedLightRuleId(isLightActive ? null : rule.id);
                                        if (!isLightActive) {
                                          setExpandedRuleIds((current) => ({
                                            ...current,
                                            [rule.id]: true,
                                          }));
                                        }
                                      }}
                                      onToggleHidden={onToggleHidden}
                                      onDeleteRule={onDeleteRule}
                                      onReorderRule={onReorderRule}
                                      onTuneRule={onTuneRule}
                                      onUpdateCameraSettings={onUpdateCameraSettings}
                                      onUpdateLightSettings={onUpdateLightSettings}
                                    />
                                  );
                                })
                              )
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
          </div>
        </div>
      </div>
      {onAddRulesetClick || onAddRuleClick ? (
        <div className="grid shrink-0 grid-cols-2 gap-1.5 border-t border-white/[0.08] p-2">
          {onAddRulesetClick ? (
            <button
              type="button"
              onClick={onAddRulesetClick}
              className="rounded border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs font-semibold text-white transition hover:border-purple-400/50 hover:bg-purple-500/15"
            >
              + Add Ruleset
            </button>
          ) : null}
          {onAddRuleClick ? (
            <button
              type="button"
              onClick={() => onAddRuleClick(ruleset.id)}
              className="rounded border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs font-semibold text-white transition hover:border-ca-select/50 hover:bg-ca-select/15"
            >
              + Add Rule
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface TreeRowProps {
  isOpen: boolean;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
  action?: ReactNode;
  onClick: () => void;
}

function TreeRow({ isOpen, icon, title, subtitle, meta, action, onClick }: TreeRowProps) {
  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer items-center gap-1.5 rounded-lg border border-transparent px-2 py-1 text-white/90 transition-all hover:border-white/10 hover:bg-white/[0.04]"
    >
      {isOpen ? (
        <ChevronDown size={12} className="shrink-0 text-white/50" />
      ) : (
        <ChevronRight size={12} className="shrink-0 text-white/50" />
      )}
      {icon}
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold text-white/90">{title}</div>
        {subtitle ? <div className="truncate text-[10px] text-white/50">{subtitle}</div> : null}
      </div>
      {meta ? (
        <span className="rounded border border-white/10 bg-white/[0.04] px-1 py-0.2 font-sans text-[9px] font-medium text-white/60">
          {meta}
        </span>
      ) : null}
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

interface RuleNodeProps {
  rule: EditorRule;
  index: number;
  total: number;
  isSelected: boolean;
  isExpanded: boolean;
  isCameraOpen: boolean;
  isLightOpen: boolean;
  validationResult?: ValidationResult;
  onSelect: () => void;
  onToggleExpanded: () => void;
  onToggleCamera: () => void;
  onToggleLight: () => void;
  onToggleHidden?: (ruleId: string) => void;
  onDeleteRule?: (ruleId: string) => void;
  onReorderRule?: (ruleId: string, direction: "up" | "down") => void;
  onTuneRule?: (ruleId: string) => void;
  onUpdateCameraSettings?: (ruleId: string, settings: RuleCameraSettings) => void;
  onUpdateLightSettings?: (ruleId: string, settings: RuleLightSettings) => void;
}

function RuleNode({
  rule,
  index,
  total,
  isSelected,
  isExpanded,
  isCameraOpen,
  isLightOpen,
  validationResult,
  onSelect,
  onToggleExpanded,
  onToggleCamera,
  onToggleLight,
  onToggleHidden,
  onDeleteRule,
  onReorderRule,
  onTuneRule,
  onUpdateCameraSettings,
  onUpdateLightSettings,
}: RuleNodeProps) {
  const toolCode = getRuleToolCode(rule);
  const ToolIcon = getToolIcon(toolCode, rule.name);
  const isPass = validationResult?.status === ValidationStatusType.Pass;
  const isFail = validationResult?.status === ValidationStatusType.Fail;
  const cameraSettings =
    rule.cameraSettings ?? (rule.params as any)?.cameraSettings ?? DEFAULT_RULE_CAMERA_SETTINGS;
  const lightSettings =
    rule.lightSettings ?? (rule.params as any)?.lightSettings ?? DEFAULT_RULE_LIGHT_SETTINGS;

  return (
    <div className="space-y-0.5">
      <div
        onClick={onSelect}
        className={`group flex cursor-pointer items-center justify-between gap-1 rounded-lg border px-1.5 py-1 transition-all ${
          isSelected
            ? "border-ca-select/80 bg-gradient-to-r from-ca-select/25 to-ca-select/10 text-white shadow-[0_0_12px_color-mix(in_oklab,var(--ca-select)_30%,transparent),inset_0_1px_0_rgba(255,255,255,0.15)]"
            : "border-transparent text-white/80 hover:border-white/10 hover:bg-white/[0.04]"
        }`}
      >
        <div className="flex min-w-0 items-center gap-1">
          <IconButton
            title={isExpanded ? "Collapse optical subtree" : "Expand optical subtree"}
            onClick={onToggleExpanded}
          >
            {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </IconButton>
          <span className="shrink-0 font-sans text-[10px] font-medium text-ca-ink-muted">[{index + 1}]</span>
          <ToolIcon
            size={12}
            className={isSelected ? "shrink-0 text-ca-select" : "shrink-0 text-ca-ink-muted"}
          />
          <IconButton
            title={rule.isHidden ? "Show rule overlay" : "Hide rule overlay"}
            onClick={() => onToggleHidden?.(rule.id)}
            className="text-ca-ink-muted/70 hover:text-ca-ink"
          >
            {rule.isHidden ? <EyeOff size={11} className="text-rose-400" /> : <Eye size={11} />}
          </IconButton>
          <span className="truncate text-xs">{rule.name}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {toolCode ? (
            <span className="rounded bg-ca-panel-2 px-1 py-0.2 font-sans text-[9px] font-medium text-ca-ink-muted">
              {toolCode}
            </span>
          ) : null}
          <StatusBadge isPass={isPass} isFail={isFail} validationResult={validationResult} />
          <IconButton
            title={`Camera Settings: ${((cameraSettings.exposureUs ?? 20000) / 1000).toFixed(1)}ms exposure, ${(cameraSettings.gainDb ?? 0).toFixed(1)}dB gain`}
            onClick={onToggleCamera}
            className={
              isCameraOpen
                ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/50"
                : "hover:text-cyan-300"
            }
          >
            <Camera size={11} />
          </IconButton>
          <IconButton
            title={`Light Settings: CH${lightSettings.channel ?? 1}, ${lightSettings.intensity ?? 80}%`}
            onClick={onToggleLight}
            className={
              isLightOpen
                ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/50"
                : "hover:text-amber-300"
            }
          >
            <Sun size={11} />
          </IconButton>
          {onReorderRule ? (
            <div className="hidden items-center gap-0.5 group-hover:flex">
              {index > 0 ? (
                <IconButton title="Move rule up" onClick={() => onReorderRule(rule.id, "up")}>
                  <ChevronUp size={11} />
                </IconButton>
              ) : null}
              {index < total - 1 ? (
                <IconButton title="Move rule down" onClick={() => onReorderRule(rule.id, "down")}>
                  <ChevronDown size={11} />
                </IconButton>
              ) : null}
            </div>
          ) : null}
          {onTuneRule ? (
            <IconButton
              title="Visual Tune this rule"
              onClick={() => onTuneRule(rule.id)}
              className="opacity-0 hover:text-ca-select group-hover:opacity-100"
            >
              <Wand2 size={11} />
            </IconButton>
          ) : null}
          {onDeleteRule ? (
            <IconButton
              title="Delete rule"
              onClick={() => onDeleteRule(rule.id)}
              className="opacity-0 hover:text-rose-400 group-hover:opacity-100"
            >
              <Trash2 size={11} />
            </IconButton>
          ) : null}
        </div>
      </div>

      {isExpanded ? (
        <div className="ml-4 space-y-1 border-l border-ca-border/40 py-0.5 pl-2">
          <CameraSettingsPanel
            rule={rule}
            settings={cameraSettings}
            isOpen={isCameraOpen}
            onToggle={onToggleCamera}
            onUpdate={onUpdateCameraSettings}
          />
          <LightSettingsPanel
            rule={rule}
            settings={lightSettings}
            isOpen={isLightOpen}
            onToggle={onToggleLight}
            onUpdate={onUpdateLightSettings}
          />
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({
  isPass,
  isFail,
  validationResult,
}: {
  isPass: boolean;
  isFail: boolean;
  validationResult?: ValidationResult;
}) {
  if (isPass) {
    return (
      <span
        title={validationResult?.message ?? "Passed inspection"}
        className="flex items-center gap-0.5 rounded border border-emerald-800/80 bg-emerald-950/70 px-1 py-0.2 text-[9px] font-semibold text-emerald-400"
      >
        <CheckCircle2 size={10} />
        PASS{" "}
        {typeof validationResult?.score === "number"
          ? `${(validationResult.score * 100).toFixed(0)}%`
          : ""}
      </span>
    );
  }

  if (isFail) {
    return (
      <span
        title={validationResult?.message ?? "Failed inspection"}
        className="flex items-center gap-0.5 rounded border border-rose-800/80 bg-rose-950/70 px-1 py-0.2 text-[9px] font-semibold text-rose-400"
      >
        <AlertCircle size={10} />
        FAIL
      </span>
    );
  }

  return (
    <span className="flex items-center gap-0.5 text-[9px] font-sans font-medium text-amber-400/80">
      <Clock size={10} />
      READY
    </span>
  );
}

function CameraSettingsPanel({
  rule,
  settings,
  isOpen,
  onToggle,
  onUpdate,
}: {
  rule: EditorRule;
  settings: RuleCameraSettings;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate?: (ruleId: string, settings: RuleCameraSettings) => void;
}) {
  return (
    <div>
      <SubtreeHeader
        isOpen={isOpen}
        icon={<Camera size={12} className="shrink-0 text-cyan-400" />}
        title="Camera Settings"
        meta={`${((settings.exposureUs ?? 20000) / 1000).toFixed(1)}ms · ${(settings.gainDb ?? 0).toFixed(1)}dB`}
        tone="cyan"
        onClick={onToggle}
      />
      {isOpen ? (
        <div
          onClick={(event) => event.stopPropagation()}
          className="my-1 ml-1 space-y-2 rounded border border-cyan-500/40 bg-ca-panel/95 p-2 text-xs shadow-md"
        >
          <div className="flex items-center justify-between border-b border-ca-border/40 pb-1">
            <span className="text-[10px] font-semibold text-cyan-300">
              Camera Settings: {rule.name}
            </span>
            <button
              type="button"
              onClick={() => onUpdate?.(rule.id, DEFAULT_RULE_CAMERA_SETTINGS)}
              className="flex items-center gap-1 text-[10px] text-ca-ink-muted hover:text-cyan-300"
            >
              <RotateCcw size={10} />
              Reset
            </button>
          </div>
          <SliderRow
            label="Exposure Time"
            value={settings.exposureUs ?? 20000}
            min={1000}
            max={80000}
            step={1000}
            display={`${((settings.exposureUs ?? 20000) / 1000).toFixed(1)} ms`}
            tone="cyan"
            onChange={(value) => onUpdate?.(rule.id, { ...settings, exposureUs: value })}
          />
          <SliderRow
            label="Analog Gain"
            value={settings.gainDb ?? 0}
            min={0}
            max={24}
            step={0.5}
            display={`${(settings.gainDb ?? 0).toFixed(1)} dB`}
            tone="emerald"
            onChange={(value) => onUpdate?.(rule.id, { ...settings, gainDb: value })}
          />
          <SliderRow
            label="White Balance"
            value={settings.whiteBalanceKelvin ?? 5000}
            min={2800}
            max={9500}
            step={100}
            display={`${settings.whiteBalanceKelvin ?? 5000} K`}
            tone="amber"
            onChange={(value) => onUpdate?.(rule.id, { ...settings, whiteBalanceKelvin: value })}
          />
          <SliderRow
            label="Gamma"
            value={settings.gamma ?? 1}
            min={0.4}
            max={2.2}
            step={0.05}
            display={(settings.gamma ?? 1).toFixed(2)}
            tone="purple"
            onChange={(value) => onUpdate?.(rule.id, { ...settings, gamma: value })}
          />
        </div>
      ) : null}
    </div>
  );
}

function LightSettingsPanel({
  rule,
  settings,
  isOpen,
  onToggle,
  onUpdate,
}: {
  rule: EditorRule;
  settings: RuleLightSettings;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate?: (ruleId: string, settings: RuleLightSettings) => void;
}) {
  return (
    <div>
      <SubtreeHeader
        isOpen={isOpen}
        icon={<Sun size={12} className="shrink-0 text-amber-400" />}
        title="Light Settings"
        meta={`CH${settings.channel ?? 1} · ${settings.intensity ?? 80}%${
          settings.hasStrobe ?? true ? " · Strobe" : ""
        }`}
        tone="amber"
        onClick={onToggle}
      />
      {isOpen ? (
        <div
          onClick={(event) => event.stopPropagation()}
          className="my-1 ml-1 space-y-2 rounded border border-amber-500/40 bg-ca-panel/95 p-2 text-xs shadow-md"
        >
          <div className="flex items-center justify-between border-b border-ca-border/40 pb-1">
            <span className="text-[10px] font-semibold text-amber-300">
              Light Settings: {rule.name}
            </span>
            <button
              type="button"
              onClick={() => onUpdate?.(rule.id, DEFAULT_RULE_LIGHT_SETTINGS)}
              className="flex items-center gap-1 text-[10px] text-ca-ink-muted hover:text-amber-300"
            >
              <RotateCcw size={10} />
              Reset
            </button>
          </div>
          <SliderRow
            label="Intensity"
            value={settings.intensity ?? 80}
            min={0}
            max={100}
            step={1}
            display={`${settings.intensity ?? 80}%`}
            tone="amber"
            onChange={(value) => onUpdate?.(rule.id, { ...settings, intensity: value })}
          />
          <div className="rounded border border-ca-border/40 bg-ca-panel-2/50 p-1.5">
            <div className="mb-1 flex items-center justify-between text-ca-ink">
              <span className="text-[10px] font-medium text-ca-ink-muted">Channel</span>
              <span className="font-sans text-[10px] font-medium text-amber-300">CH {settings.channel ?? 1}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((channel) => {
                const isSelected = (settings.channel ?? 1) === channel;

                return (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => onUpdate?.(rule.id, { ...settings, channel })}
                    className={`rounded py-0.5 text-[10px] font-medium transition ${
                      isSelected
                        ? "bg-amber-500 text-black"
                        : "bg-ca-panel text-ca-ink-muted hover:bg-ca-panel-2 hover:text-ca-ink"
                    }`}
                  >
                    CH {channel}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5 rounded border border-ca-border/40 bg-ca-panel-2/50 p-1.5">
            <label className="flex cursor-pointer items-center justify-between text-ca-ink">
              <span className="text-[10px] font-medium text-ca-ink-muted">Strobe Pulse Mode</span>
              <input
                type="checkbox"
                checked={settings.hasStrobe ?? true}
                onChange={(event) =>
                  onUpdate?.(rule.id, { ...settings, hasStrobe: event.target.checked })
                }
                className="rounded accent-amber-400"
              />
            </label>
            {settings.hasStrobe ?? true ? (
              <SliderRow
                label="Pulse Duration"
                value={settings.strobeDurationUs ?? 1000}
                min={100}
                max={10000}
                step={100}
                display={`${settings.strobeDurationUs ?? 1000} µs`}
                tone="amber"
                onChange={(value) => onUpdate?.(rule.id, { ...settings, strobeDurationUs: value })}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SubtreeHeader({
  isOpen,
  icon,
  title,
  meta,
  tone,
  onClick,
}: {
  isOpen: boolean;
  icon: ReactNode;
  title: string;
  meta: string;
  tone: "cyan" | "amber";
  onClick: () => void;
}) {
  const openClass =
    tone === "cyan" ? "bg-cyan-950/30 text-cyan-200" : "bg-amber-950/30 text-amber-200";
  const metaClass =
    tone === "cyan"
      ? "border-cyan-800/40 bg-cyan-950/50 text-cyan-300/90"
      : "border-amber-800/40 bg-amber-950/50 text-amber-300/90";

  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`flex cursor-pointer items-center justify-between rounded px-2 py-1 text-xs transition-colors ${
        isOpen ? openClass : "text-ca-ink-muted hover:bg-ca-panel-2/60 hover:text-ca-ink"
      }`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        {icon}
        <span className="truncate text-[11px] font-medium">{title}</span>
      </div>
      <span className={`rounded border px-1 py-0.2 font-sans font-medium text-[9px] ${metaClass}`}>
        {meta}
      </span>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  display,
  tone,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  tone: "cyan" | "emerald" | "amber" | "purple";
  onChange: (value: number) => void;
}) {
  const accentClass =
    tone === "cyan"
      ? "accent-cyan-400"
      : tone === "emerald"
        ? "accent-emerald-400"
        : tone === "purple"
          ? "accent-purple-400"
          : "accent-amber-400";
  const valueClass =
    tone === "cyan"
      ? "text-cyan-300"
      : tone === "emerald"
        ? "text-emerald-300"
        : tone === "purple"
          ? "text-purple-300"
          : "text-amber-300";

  return (
    <div className="rounded border border-ca-border/40 bg-ca-panel-2/50 p-1.5">
      <div className="mb-1 flex items-center justify-between text-ca-ink">
        <span className="text-[10px] font-medium text-ca-ink-muted">{label}</span>
        <span className={`font-sans text-[10px] font-medium ${valueClass}`}>{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={`h-1 w-full rounded bg-ca-bg ${accentClass}`}
      />
    </div>
  );
}

function IconButton({
  title,
  className = "",
  children,
  onClick,
}: {
  title: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className={`rounded p-0.5 text-ca-ink-muted transition-colors hover:bg-white/10 hover:text-white ${className}`}
    >
      {children}
    </button>
  );
}
