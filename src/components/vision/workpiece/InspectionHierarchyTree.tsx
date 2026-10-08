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
  PanelLeftClose,
  PanelLeftOpen,
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
  const [isProjectOpen, setIsProjectOpen] = useState(true);
  const [isDeviceOpen, setIsDeviceOpen] = useState(true);
  const [isRuleSetsOpen, setIsRuleSetsOpen] = useState(true);
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [openRulesetIds, setOpenRulesetIds] = useState<Record<string, boolean>>({});
  const [expandedRuleIds, setExpandedRuleIds] = useState<Record<string, boolean>>({});
  const [expandedCameraRuleId, setExpandedCameraRuleId] = useState<string | null>(null);
  const [expandedLightRuleId, setExpandedLightRuleId] = useState<string | null>(null);

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

  const handleToggleAll = useCallback(() => {
    const isNextOpen = !isRuleSetsOpen;
    setIsProjectOpen(isNextOpen);
    setIsDeviceOpen(isNextOpen);
    setIsRuleSetsOpen(isNextOpen);

    if (isNextOpen) {
      const nextOpen: Record<string, boolean> = {};

      for (const rs of displayRulesets) {
        nextOpen[rs.id] = true;
      }

      setOpenRulesetIds(nextOpen);
    }
  }, [displayRulesets, isRuleSetsOpen]);

  if (isTreeCollapsed) {
    return (
      <div className="flex w-12 shrink-0 flex-col items-center rounded border border-ca-border/70 bg-ca-panel p-2 shadow-sm">
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
      className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded border border-ca-border/70 bg-[#15191d] shadow-sm"
    >
      <div className="border-b border-ca-border bg-[#101316] px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <FolderTree size={16} className="shrink-0 text-amber-400" />
            <div className="min-w-0">
              <div className="truncate text-xs font-bold uppercase tracking-[0.14em] text-ca-ink">
                Inspection Program
              </div>
              <div className="truncate text-[10px] text-ca-ink-muted">
                {displayRulesets.length} rule sets · {totalRuleCount} rules
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={handleToggleAll}
              title={isRuleSetsOpen ? "Collapse all folders" : "Expand all folders"}
              className="rounded border border-ca-border/70 px-1.5 py-0.5 text-[10px] text-ca-ink-muted hover:bg-ca-panel-2 hover:text-ca-ink"
            >
              {isRuleSetsOpen ? "Collapse" : "Expand"}
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
      </div>

      {totalRuleCount > 3 ? (
        <div className="border-b border-ca-border/50 bg-[#12161a] p-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2 text-ca-ink-muted" />
            <input
              type="text"
              value={searchFilter}
              onChange={(event) => setSearchFilter(event.target.value)}
              placeholder="Filter program rules..."
              className="w-full rounded border border-ca-border/70 bg-ca-bg/70 py-1 pl-7 pr-2 text-xs text-ca-ink placeholder:text-ca-ink-muted/60 focus:border-ca-select focus:outline-none"
            />
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-2 font-mono text-xs">
        <div className="select-none space-y-1">
          <TreeRow
            isOpen={isProjectOpen}
            icon={<FolderTree size={15} className="shrink-0 text-amber-400" />}
            title={`Project: ${project.name}`}
            meta="Active"
            onClick={() => setIsProjectOpen((value) => !value)}
          />

          {isProjectOpen ? (
            <div className="ml-3 space-y-1 border-l border-ca-border/50 pl-2.5">
              <TreeRow
                isOpen={isDeviceOpen}
                icon={<Cpu size={15} className="shrink-0 text-cyan-400" />}
                title={`Device: ${project.deviceId || "Circuit DUT (IC)"}`}
                subtitle="IC Package / Board DUT"
                meta="IC Loaded"
                onClick={() => setIsDeviceOpen((value) => !value)}
              />

              {isDeviceOpen ? (
                <div className="ml-3 space-y-1 border-l border-ca-border/50 pl-2.5">
                  <TreeRow
                    isOpen={isRuleSetsOpen}
                    icon={<FileCode2 size={15} className="shrink-0 text-purple-400" />}
                    title="Rule Sets"
                    meta={`${displayRulesets.length}`}
                    onClick={() => setIsRuleSetsOpen((value) => !value)}
                    action={
                      onAddRulesetClick ? (
                        <IconButton
                          title="Add ruleset"
                          onClick={onAddRulesetClick}
                          className="hover:text-purple-300"
                        >
                          <Plus size={12} />
                        </IconButton>
                      ) : null
                    }
                  />

                  {isRuleSetsOpen ? (
                    <div className="ml-3 space-y-1 border-l border-ca-border/40 pl-2.5">
                      {displayRulesets.map((rs) => {
                        const isActiveRuleset = rs.id === ruleset.id;
                        const isRulesetOpen = openRulesetIds[rs.id] ?? true;
                        const rulesetRules = (rs.rules ?? []).filter((rule) =>
                          getRuleMatchesFilter(rule, searchFilter),
                        );

                        return (
                          <div key={rs.id} className="space-y-1">
                            <div
                              className={`group flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1 transition-colors ${
                                isActiveRuleset
                                  ? "border-purple-500/40 bg-purple-950/30 text-purple-100"
                                  : "border-transparent text-ca-ink hover:border-ca-border/50 hover:bg-ca-panel-2"
                              }`}
                              onClick={() => {
                                onSelectRuleset?.(rs.id);
                                setOpenRulesetIds((current) => ({
                                  ...current,
                                  [rs.id]: !isRulesetOpen,
                                }));
                              }}
                            >
                              {isRulesetOpen ? (
                                <ChevronDown size={13} className="shrink-0 text-ca-ink-muted" />
                              ) : (
                                <ChevronRight size={13} className="shrink-0 text-ca-ink-muted" />
                              )}
                              <FileCode2 size={14} className="shrink-0 text-purple-400" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-semibold">RuleSet: {rs.name}</div>
                                <div className="truncate text-[10px] text-ca-ink-muted">
                                  {rs.categoryName || "Inspection category"} · {rs.rules?.length ?? 0} rules
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <span className="rounded border border-ca-border/70 bg-ca-bg px-1 text-[10px] text-ca-ink-muted">
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
                                {onDeleteRulesetClick && isActiveRuleset ? (
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
                              <div className="ml-3 space-y-1 border-l border-ca-border/30 pl-2.5">
                                <div className="flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-ca-ink-muted">
                                  <ListChecks size={13} className="text-emerald-400" />
                                  <span>Rules ({rulesetRules.length})</span>
                                </div>

                                {rulesetRules.length === 0 ? (
                                  <div className="rounded border border-dashed border-ca-border/60 px-2 py-2 text-center text-[11px] text-ca-ink-muted/70">
                                    No rules defined
                                  </div>
                                ) : (
                                  rulesetRules.map((rule, index) => (
                                    <RuleNode
                                      key={rule.id}
                                      rule={rule}
                                      index={index}
                                      total={rulesetRules.length}
                                      isSelected={selectedRuleId === rule.id}
                                      validationResult={validationResults[rule.id]}
                                      isExpanded={expandedRuleIds[rule.id] !== false}
                                      isCameraOpen={expandedCameraRuleId === rule.id}
                                      isLightOpen={expandedLightRuleId === rule.id}
                                      onSelect={() => {
                                        onSelectRuleset?.(rs.id);
                                        onSelectRule(rule.id);
                                      }}
                                      onToggleExpanded={() =>
                                        setExpandedRuleIds((current) => ({
                                          ...current,
                                          [rule.id]: !(current[rule.id] !== false),
                                        }))
                                      }
                                      onToggleCamera={() =>
                                        setExpandedCameraRuleId((current) =>
                                          current === rule.id ? null : rule.id,
                                        )
                                      }
                                      onToggleLight={() =>
                                        setExpandedLightRuleId((current) =>
                                          current === rule.id ? null : rule.id,
                                        )
                                      }
                                      onToggleHidden={onToggleHidden}
                                      onDeleteRule={onDeleteRule}
                                      onReorderRule={onReorderRule}
                                      onTuneRule={onTuneRule}
                                      onUpdateCameraSettings={onUpdateCameraSettings}
                                      onUpdateLightSettings={onUpdateLightSettings}
                                    />
                                  ))
                                )}
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
          ) : null}
        </div>
      </div>

      {onAddRulesetClick || onAddRuleClick || onRunAnalysis ? (
        <div className="flex items-center gap-1.5 border-t border-ca-border bg-[#101316] p-2">
          {onAddRulesetClick ? (
            <button
              type="button"
              onClick={onAddRulesetClick}
              className="flex flex-1 items-center justify-center gap-1 rounded border border-ca-border bg-ca-panel-2 px-2 py-1.5 text-xs font-semibold text-ca-ink hover:border-purple-400"
            >
              <Plus size={13} />
              <span>Add Ruleset</span>
            </button>
          ) : null}
          {onAddRuleClick ? (
            <button
              type="button"
              onClick={() => onAddRuleClick(ruleset.id)}
              className="flex flex-1 items-center justify-center gap-1 rounded border border-ca-border bg-ca-panel-2 px-2 py-1.5 text-xs font-semibold text-ca-ink hover:border-ca-select"
            >
              <Plus size={13} />
              <span>Add Rule</span>
            </button>
          ) : null}
          {onRunAnalysis ? (
            <button
              type="button"
              onClick={onRunAnalysis}
              disabled={isAnalyzing}
              className="flex flex-1 items-center justify-center gap-1 rounded bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Play size={13} className="fill-white" />
              <span>{isAnalyzing ? "Analyzing..." : "Analyze"}</span>
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
      className="group flex cursor-pointer items-center gap-1.5 rounded border border-transparent px-2 py-1 text-ca-ink transition-colors hover:border-ca-border/50 hover:bg-ca-panel-2"
    >
      {isOpen ? (
        <ChevronDown size={13} className="shrink-0 text-ca-ink-muted" />
      ) : (
        <ChevronRight size={13} className="shrink-0 text-ca-ink-muted" />
      )}
      {icon}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{title}</div>
        {subtitle ? <div className="truncate text-[10px] text-ca-ink-muted">{subtitle}</div> : null}
      </div>
      {meta ? (
        <span className="rounded border border-ca-border/70 bg-ca-bg px-1 text-[10px] text-ca-ink-muted">
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
    <div className="space-y-1">
      <div
        onClick={onSelect}
        className={`group flex cursor-pointer items-center justify-between gap-1 rounded border px-2 py-1.5 transition-colors ${
          isSelected
            ? "border-ca-select/60 bg-ca-select/20 text-white"
            : "border-transparent text-ca-ink/85 hover:border-ca-border/50 hover:bg-ca-panel-2"
        }`}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <IconButton
            title={isExpanded ? "Collapse optical subtree" : "Expand optical subtree"}
            onClick={onToggleExpanded}
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </IconButton>
          <span className="shrink-0 text-[10px] text-ca-ink-muted">[{index + 1}]</span>
          <ToolIcon
            size={13}
            className={isSelected ? "shrink-0 text-ca-select" : "shrink-0 text-ca-ink-muted"}
          />
          <IconButton
            title={rule.isHidden ? "Show rule overlay" : "Hide rule overlay"}
            onClick={() => onToggleHidden?.(rule.id)}
            className="text-ca-ink-muted/70 hover:text-ca-ink"
          >
            {rule.isHidden ? <EyeOff size={12} className="text-rose-400" /> : <Eye size={12} />}
          </IconButton>
          <span className="truncate text-xs">{rule.name}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {toolCode ? (
            <span className="rounded bg-ca-panel-2 px-1 py-0.2 text-[9px] font-mono text-ca-ink-muted">
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
    <span className="flex items-center gap-0.5 text-[9px] font-mono text-amber-400/80">
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
              <span className="font-mono text-[10px] text-amber-300">CH {settings.channel ?? 1}</span>
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
      <span className={`rounded border px-1 py-0.2 font-mono text-[9px] ${metaClass}`}>
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
        <span className={`font-mono text-[10px] ${valueClass}`}>{display}</span>
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
      className={`rounded p-1 text-ca-ink-muted transition-colors hover:bg-ca-panel hover:text-ca-ink ${className}`}
    >
      {children}
    </button>
  );
}
