import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Activity,
  AlertCircle,
  Bug,
  CheckCircle2,
  CircleDot,
  Crosshair,
  Eye,
  EyeOff,
  Grid2X2,
  HelpCircle,
  PaintBucket,
  Play,
  QrCode,
  Ruler,
  ScanSearch,
  Sliders,
  Trash2,
  Type,
  X,
  XCircle,
  Hexagon,
  Square,
  Circle,
  Layers,
  type LucideIcon,
} from "lucide-react";
import type { EditorRule } from "@/lib/editor/types";
import type { RuleSet } from "@/lib/projects/types";
import { ValidationStatusType, type ValidationResult } from "@/lib/editor/validation-store";

export interface RuleRightToolbarPanelProps {
  rule: EditorRule | null;
  ruleset: RuleSet | null;
  onUpdateRule: (updatedRule: EditorRule) => void;
  onToggleHidden: (ruleId: string) => void;
  onClose: () => void;
  validationResult?: ValidationResult;
  isEvaluating?: boolean;
  onEvaluateSingleRule?: (ruleId: string) => void;
  onDeleteRule?: (ruleId: string) => void;
  onLaunchWorkbench?: () => void;
}

function getToolIcon(code: string, name: string): LucideIcon {
  const normalized = `${code} ${name}`.toLowerCase();

  if (normalized.includes("pin 1") || normalized.includes("pin1")) return CircleDot;

  if (normalized.includes("pattern") || code === "T102") return ScanSearch;

  if (normalized.includes("area") || normalized.includes("intensity")) return Grid2X2;

  if (normalized.includes("edge") || normalized.includes("lead")) return Activity;

  if (normalized.includes("blob") || normalized.includes("bridge")) return Bug;

  if (normalized.includes("void") || normalized.includes("circle") || code === "T111")
    return Crosshair;

  if (normalized.includes("caliper") || normalized.includes("gauge") || code === "T110")
    return Ruler;

  if (normalized.includes("qr") || normalized.includes("datamatrix") || code === "T103")
    return QrCode;

  if (normalized.includes("ocr") || normalized.includes("marking") || code === "T106") return Type;

  if (normalized.includes("coating") || normalized.includes("color") || code === "T112")
    return PaintBucket;

  return ScanSearch;
}

export function RuleRightToolbarPanel(props: RuleRightToolbarPanelProps): React.JSX.Element | null {
  if (!props.rule) {
    return null;
  }

  return <RuleRightToolbarPanelContent {...props} rule={props.rule} />;
}

interface RuleRightToolbarPanelContentProps extends Omit<RuleRightToolbarPanelProps, "rule"> {
  rule: EditorRule;
}

function RuleRightToolbarPanelContent({
  rule,
  ruleset,
  onUpdateRule,
  onToggleHidden,
  onClose,
  validationResult,
  isEvaluating = false,
  onEvaluateSingleRule,
  onDeleteRule,
  onLaunchWorkbench,
}: RuleRightToolbarPanelContentProps): React.JSX.Element {
  const toolCode = typeof rule.params?.toolCode === "string" ? rule.params.toolCode : "T102";
  const ToolIcon = getToolIcon(toolCode, rule.name);
  const isRuleHidden = Boolean(rule.isHidden);

  const isPin1Rule =
    toolCode === "T105" ||
    rule.name.toLowerCase().includes("pin 1") ||
    rule.name.toLowerCase().includes("pin1");

  // Local state for ROI inputs to avoid jitter while typing
  const [roiX, setRoiX] = useState(String(Math.round(rule.x)));
  const [roiY, setRoiY] = useState(String(Math.round(rule.y)));
  const [roiW, setRoiW] = useState(String(Math.round(rule.width)));
  const [roiH, setRoiH] = useState(String(Math.round(rule.height)));
  const [isConfidenceHelpOpen, setIsConfidenceHelpOpen] = useState(false);

  // Sync ROI when rule changes externally (e.g. dragged on canvas)
  useEffect(() => {
    setRoiX(String(Math.round(rule.x)));
    setRoiY(String(Math.round(rule.y)));
    setRoiW(String(Math.round(rule.width)));
    setRoiH(String(Math.round(rule.height)));
  }, [rule.x, rule.y, rule.width, rule.height, rule.id]);

  const handleRoiCommit = useCallback(
    (field: "x" | "y" | "width" | "height", rawValue: string) => {
      const parsed = parseInt(rawValue, 10);

      if (isNaN(parsed)) return;

      const safeValue =
        field === "width" || field === "height" ? Math.max(4, parsed) : Math.max(0, parsed);
      const isSquare = String(rule.params?.shapeType ?? "") === "square";
      const side =
        field === "width" || field === "height"
          ? Math.max(4, Math.min(safeValue, field === "width" ? rule.height : rule.width))
          : safeValue;

      const nextRule: EditorRule = {
        ...rule,
        ...(isSquare && (field === "width" || field === "height")
          ? { width: side, height: side }
          : { [field]: safeValue }),
      };

      onUpdateRule(nextRule);
    },
    [rule, onUpdateRule],
  );

  // Pin 1 specific parameter values
  const pin1Threshold =
    typeof rule.params?.thresholdLuma === "number"
      ? rule.params.thresholdLuma
      : typeof rule.params?.greyscaleLevel === "number"
        ? rule.params.greyscaleLevel
        : typeof rule.params?.threshold === "number"
          ? rule.params.threshold
          : 35;

  const pin1TolerancePx =
    typeof rule.params?.tolerancePx === "number" ? rule.params.tolerancePx : 25;

  const pin1DiameterPx =
    typeof rule.params?.expectedDiameterPx === "number" ? rule.params.expectedDiameterPx : 24;

  const pin1MinCircularity =
    typeof rule.params?.minCircularityPct === "number"
      ? rule.params.minCircularityPct
      : typeof (rule.params as any)?.minCircularityPercent === "number"
        ? (rule.params as any).minCircularityPercent
        : 75;

  // General tool parameter helpers
  const greyscaleVal =
    typeof rule.params?.greyscaleLevel === "number"
      ? rule.params.greyscaleLevel
      : typeof rule.params?.threshold === "number"
        ? rule.params.threshold
        : 170;

  const tolerancePx = typeof rule.params?.tolerancePx === "number" ? rule.params.tolerancePx : 8;

  const marginPx = typeof rule.params?.marginPx === "number" ? rule.params.marginPx : 8;

  const activeBoxCount =
    typeof rule.params?.activeBoxCount === "number" ? rule.params.activeBoxCount : 1;

  const shapeType = String((rule.params as any)?.shapeType || "rectangle").toLowerCase();

  const circleDiameter =
    typeof (rule.params as any)?.diameterPx === "number"
      ? (rule.params as any).diameterPx
      : Math.round(Math.min(rule.width, rule.height));

  const circularityTolerance =
    typeof (rule.params as any)?.minCircularityPct === "number"
      ? (rule.params as any).minCircularityPct
      : 80;

  const polygonVertexCount =
    typeof (rule.params as any)?.vertexCount === "number"
      ? (rule.params as any).vertexCount
      : 6;

  const isPatternRule =
    toolCode === "T102" ||
    rule.name.toLowerCase().includes("pattern") ||
    rule.name.toLowerCase().includes("white box");

  const handleParamChange = useCallback(
    (key: string, value: any) => {
      const nextParams = {
        ...(rule.params ?? {}),
        [key]: value,
      };
      const isSquareShape = key === "shapeType" && value === "square";
      const side = Math.max(4, Math.min(rule.width, rule.height));

      const nextRule: EditorRule = {
        ...rule,
        ...(isSquareShape ? { width: side, height: side } : {}),
        params: nextParams,
      };

      onUpdateRule(nextRule);
    },
    [rule, onUpdateRule],
  );

  const handlePin1ThresholdChange = useCallback(
    (val: number) => {
      const nextParams = {
        ...(rule.params ?? {}),
        thresholdLuma: val,
        greyscaleLevel: val,
        threshold: val,
      };

      onUpdateRule({
        ...rule,
        params: nextParams,
      });
    },
    [rule, onUpdateRule],
  );

  const handlePin1CircularityChange = useCallback(
    (val: number) => {
      const nextParams = {
        ...(rule.params ?? {}),
        minCircularityPct: val,
        minCircularityPercent: val,
      };

      onUpdateRule({
        ...rule,
        params: nextParams,
      });
    },
    [rule, onUpdateRule],
  );

  const statusBadge = useMemo(() => {
    if (isRuleHidden) {
      return (
        <span className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Disabled
        </span>
      );
    }

    if (!validationResult) {
      return (
        <span className="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
          Pending
        </span>
      );
    }

    if (validationResult.status === ValidationStatusType.Pass) {
      return (
        <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
          <CheckCircle2 size={11} />
          PASS {Math.round((validationResult.score ?? 1) * 100)}%
        </span>
      );
    }

    if (validationResult.status === ValidationStatusType.Warn) {
      return (
        <span className="flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
          <AlertCircle size={11} />
          WARN
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
        <XCircle size={11} />
        FAIL
      </span>
    );
  }, [isRuleHidden, validationResult]);

  return (
    <div
      data-tour="rule-right-toolbar-panel"
      className="flex h-full w-88 xl:w-96 shrink-0 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c1017]/95 shadow-2xl backdrop-blur-xl"
    >
      {/* Top Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
            <ToolIcon size={15} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-sans text-xs font-bold uppercase tracking-wider text-white">
                {rule.name}
              </span>
            </div>

            <span className="font-mono text-[10px] uppercase tracking-wider text-white/50">
              {toolCode} · {ruleset?.name ?? "Ruleset"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Quick Launch Visual Workbench */}
          {onLaunchWorkbench ? (
            <button
              type="button"
              title="Open Full Visual Workbench"
              onClick={onLaunchWorkbench}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-500/10 text-cyan-300 transition hover:bg-cyan-500/20 hover:text-cyan-200"
            >
              <Sliders size={14} />
            </button>
          ) : null}

          {/* Quick Enable/Disable Toggle */}
          <button
            type="button"
            title={isRuleHidden ? "Enable this rule" : "Disable this rule"}
            onClick={() => onToggleHidden(rule.id)}
            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
              isRuleHidden
                ? "border-amber-400/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                : "border-white/10 bg-white/5 text-emerald-400 hover:bg-white/10"
            }`}
          >
            {isRuleHidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>

          {/* Close Panel */}
          <button
            type="button"
            title="Close toolbar panel"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        data-tour="rule-config-controls"
        className="min-h-0 flex-1 overflow-y-auto p-3.5 space-y-4 font-sans text-xs"
      >
        {/* Status & Evaluation banner */}
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Rule State
            </span>

            <button
              type="button"
              onClick={() => setIsConfidenceHelpOpen((prev) => !prev)}
              title="What is inspection confidence (% PASS)?"
              className="text-white/40 hover:text-cyan-300 transition"
            >
              <HelpCircle size={12} />
            </button>
          </div>

          {statusBadge}
        </div>

        {isConfidenceHelpOpen ? (
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/40 p-2.5 text-[11px] text-cyan-200 space-y-1">
            <span className="font-bold text-white block">Inspection Confidence Metric (% PASS)</span>
            <p className="leading-relaxed text-slate-300">
              Normalized correlation matching score (0–100%) against verified golden reference IC workpiece images. Scores ≥ 85% satisfy production quality criteria.
            </p>
          </div>
        ) : null}

        {/* Region of Interest (ROI) */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-white/80 text-[11px]">
              Region of Interest (ROI)
            </span>
            <span className="text-[10px] text-white/40 font-mono">Pixels</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
                X Pos
              </label>
              <input
                type="number"
                value={roiX}
                onChange={(e) => {
                  setRoiX(e.target.value);
                  handleRoiCommit("x", e.target.value);
                }}
                className="mt-0.5 w-full rounded-md border border-white/15 bg-black/50 px-2 py-1 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
                Y Pos
              </label>
              <input
                type="number"
                value={roiY}
                onChange={(e) => {
                  setRoiY(e.target.value);
                  handleRoiCommit("y", e.target.value);
                }}
                className="mt-0.5 w-full rounded-md border border-white/15 bg-black/50 px-2 py-1 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
                Width
              </label>
              <input
                type="number"
                value={roiW}
                onChange={(e) => {
                  setRoiW(e.target.value);
                  handleRoiCommit("width", e.target.value);
                }}
                className="mt-0.5 w-full rounded-md border border-white/15 bg-black/50 px-2 py-1 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
                Height
              </label>
              <input
                type="number"
                value={roiH}
                onChange={(e) => {
                  setRoiH(e.target.value);
                  handleRoiCommit("height", e.target.value);
                }}
                className="mt-0.5 w-full rounded-md border border-white/15 bg-black/50 px-2 py-1 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Region Shape Selection */}
          <div className="space-y-1 pt-1 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
                Region Shape
              </span>
              <span className="text-[9px] font-mono uppercase text-cyan-400">
                {shapeType}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {(["rectangle", "square", "circle", "polygon"] as const).map((shape) => {
                const isSelected = shapeType === shape;

                return (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => handleParamChange("shapeType", shape)}
                    className={`flex items-center justify-center gap-1 rounded-md py-1 text-[10px] font-bold uppercase transition ${
                      isSelected
                        ? "border border-cyan-400/50 bg-cyan-500/20 text-cyan-200"
                        : "border border-white/10 bg-white/5 text-white/50 hover:text-white"
                    }`}
                  >
                    {shape === "rectangle" && <Square size={10} />}
                    {shape === "square" && <Square size={10} className="scale-90" />}
                    {shape === "circle" && <Circle size={10} />}
                    {shape === "polygon" && <Hexagon size={10} />}
                    <span>{shape.slice(0, 4)}</span>
                  </button>
                );
              })}
            </div>

            {/* Shape Specific Controls */}
            {shapeType === "circle" ? (
              <div className="space-y-2 pt-2 border-t border-white/10 mt-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/60">Circle Diameter (px)</span>
                  <span className="font-mono font-bold text-cyan-300">{circleDiameter} px</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={400}
                  value={circleDiameter}
                  onChange={(e) => handleParamChange("diameterPx", parseInt(e.target.value, 10))}
                  className="h-1.5 w-full cursor-pointer accent-cyan-400"
                />

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/60">Min Circularity (%)</span>
                  <span className="font-mono font-bold text-cyan-300">{circularityTolerance}%</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={100}
                  value={circularityTolerance}
                  onChange={(e) => handleParamChange("minCircularityPct", parseInt(e.target.value, 10))}
                  className="h-1.5 w-full cursor-pointer accent-cyan-400"
                />
              </div>
            ) : null}

            {shapeType === "polygon" ? (
              <div className="space-y-2 pt-2 border-t border-white/10 mt-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/60">Polygon Vertices</span>
                  <span className="font-mono font-bold text-cyan-300">{polygonVertexCount} Points</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={12}
                  value={polygonVertexCount}
                  onChange={(e) => handleParamChange("vertexCount", parseInt(e.target.value, 10))}
                  className="h-1.5 w-full cursor-pointer accent-cyan-400"
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* Tool Parameters & Tuning */}
        {isPin1Rule ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-white/80 text-[11px]">
                Pin 1 Configuration Tools
              </span>
              <Sliders size={13} className="text-cyan-400" />
            </div>

            {/* Luminance Threshold */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/60">Luminance Threshold</span>
                <span className="font-mono font-bold text-cyan-300">{pin1Threshold}</span>
              </div>
              <input
                type="range"
                min={10}
                max={255}
                value={pin1Threshold}
                onChange={(e) => handlePin1ThresholdChange(parseInt(e.target.value, 10))}
                className="h-1.5 w-full cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Position Tolerance */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/60">Position Tolerance (± px)</span>
                <span className="font-mono font-bold text-cyan-300">{pin1TolerancePx} px</span>
              </div>
              <input
                type="range"
                min={1}
                max={60}
                value={pin1TolerancePx}
                onChange={(e) => handleParamChange("tolerancePx", parseInt(e.target.value, 10))}
                className="h-1.5 w-full cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Expected Hole Diameter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/60">Expected Hole Diameter</span>
                <span className="font-mono font-bold text-cyan-300">{pin1DiameterPx} px</span>
              </div>
              <input
                type="range"
                min={5}
                max={80}
                value={pin1DiameterPx}
                onChange={(e) =>
                  handleParamChange("expectedDiameterPx", parseInt(e.target.value, 10))
                }
                className="h-1.5 w-full cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Min Circularity % */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/60">Min Circularity %</span>
                <span className="font-mono font-bold text-cyan-300">{pin1MinCircularity}%</span>
              </div>
              <input
                type="range"
                min={30}
                max={100}
                value={pin1MinCircularity}
                onChange={(e) => handlePin1CircularityChange(parseInt(e.target.value, 10))}
                className="h-1.5 w-full cursor-pointer accent-cyan-400"
              />
            </div>

            {onLaunchWorkbench ? (
              <button
                type="button"
                onClick={onLaunchWorkbench}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-950/40 py-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-900/50 transition"
              >
                <Sliders size={12} />
                Tune in Visual Workbench
              </button>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-white/80 text-[11px]">
                Tool Parameters
              </span>
              <Sliders size={13} className="text-cyan-400" />
            </div>

            {/* Greyscale / Threshold Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/60">Greyscale Threshold</span>
                <span className="font-mono font-bold text-cyan-300">{greyscaleVal}</span>
              </div>
              <input
                type="range"
                min={0}
                max={255}
                value={greyscaleVal}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  handleParamChange("greyscaleLevel", val);
                  handleParamChange("threshold", val);
                }}
                className="h-1.5 w-full cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Tolerance */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/60">Tolerance (± px)</span>
                <span className="font-mono font-bold text-cyan-300">{tolerancePx} px</span>
              </div>
              <input
                type="range"
                min={1}
                max={40}
                value={tolerancePx}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  handleParamChange("tolerancePx", val);
                }}
                className="h-1.5 w-full cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Margin */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/60">Search Margin (px)</span>
                <span className="font-mono font-bold text-cyan-300">{marginPx} px</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                value={marginPx}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  handleParamChange("marginPx", val);
                }}
                className="h-1.5 w-full cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Active Box Count */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-white/60">Active Target Count</span>
              <input
                type="number"
                min={1}
                max={60}
                value={activeBoxCount}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                  handleParamChange("activeBoxCount", val);
                }}
                className="w-16 rounded-md border border-white/15 bg-black/50 px-2 py-1 text-center font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {isPatternRule ? (
              <button
                type="button"
                onClick={() => {
                  handleParamChange("activeBoxCount", 57);
                  handleParamChange("has57PatternBoxes", true);
                }}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-950/40 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-900/50 transition"
                title="Initialize 57 sequential pattern boxes inside ROI (ICOS Inspection System grounded)"
              >
                <Grid2X2 size={12} />
                Set 57 Pattern Boxes (1..57)
              </button>
            ) : null}

            {onLaunchWorkbench ? (
              <button
                type="button"
                onClick={onLaunchWorkbench}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-950/40 py-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-900/50 transition"
              >
                <Sliders size={12} />
                Tune in Visual Workbench
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="shrink-0 border-t border-white/[0.08] bg-black/50 p-3 space-y-2">
        {onEvaluateSingleRule ? (
          <button
            type="button"
            onClick={() => onEvaluateSingleRule(rule.id)}
            disabled={isEvaluating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 py-2 font-sans text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-emerald-500/20 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            <Play size={13} className={isEvaluating ? "animate-spin" : "fill-black"} />
            {isEvaluating ? "Evaluating..." : "Test This Rule"}
          </button>
        ) : null}

        {onDeleteRule ? (
          <button
            type="button"
            onClick={() => onDeleteRule(rule.id)}
            className="flex w-full items-center justify-center gap-1.5 py-1 text-[11px] font-semibold text-rose-400/70 transition hover:text-rose-300"
          >
            <Trash2 size={12} />
            Delete Rule
          </button>
        ) : null}
      </div>
    </div>
  );
}
