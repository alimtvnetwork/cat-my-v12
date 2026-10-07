import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Film,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  Save,
  Sliders,
  Trash2,
  XCircle,
} from "lucide-react";
import { InspectionHierarchyTree } from "@/components/vision/workpiece/InspectionHierarchyTree";
import {
  DEFAULT_RULE_CAMERA_SETTINGS,
  DEFAULT_RULE_LIGHT_SETTINGS,
  EditorRuleKindType,
  EditorToolFamilyType,
  type EditorRule,
  type RuleCameraSettings,
  type RuleLightSettings,
} from "@/lib/editor/types";
import type { Project, RuleSet } from "@/lib/projects/types";
import { CarrierTapeResultPanel } from "./pattern-matching/carrier-tape-simulation/CarrierTapeResultPanel";
import { CarrierTapeSimulationCanvas } from "./pattern-matching/carrier-tape-simulation/CarrierTapeSimulationCanvas";
import { useCarrierTapeSimulation } from "./pattern-matching/carrier-tape-simulation/useCarrierTapeSimulation";
import type { PatternMatchingRuleProps } from "./pattern-matching/types";

interface SimulationTreeRule {
  id: string;
  name: string;
  toolCode: string;
  kind: EditorRuleKindType;
  cameraSettings: RuleCameraSettings;
  lightSettings: RuleLightSettings;
}

const builtInSimulationRuleIds = new Set(["rule-pin1", "rule-pattern"]);

export function StandardGreyscaleSimulationTool(
  props: PatternMatchingRuleProps,
): React.JSX.Element {
  const carrierSimulation = useCarrierTapeSimulation({
    initialMarginTolerancePx: 8,
    initialAngleToleranceDeg: 1.0,
    initialMinMatchPercent: 80,
    initialGreyscaleLevel: 170,
  });

  const [hasOverlays, setHasOverlays] = useState(true);
  const [selectedRuleId, setSelectedRuleId] = useState("rule-pin1");
  const [treeRules, setTreeRules] = useState<SimulationTreeRule[]>([
    {
      id: "rule-pin1",
      name: "Pin 1 Orientation Config",
      toolCode: "T117",
      kind: EditorRuleKindType.C,
      cameraSettings: DEFAULT_RULE_CAMERA_SETTINGS,
      lightSettings: DEFAULT_RULE_LIGHT_SETTINGS,
    },
    {
      id: "rule-pattern",
      name: "Greyscale Pattern Match 24-Box",
      toolCode: "T116",
      kind: EditorRuleKindType.R,
      cameraSettings: DEFAULT_RULE_CAMERA_SETTINGS,
      lightSettings: DEFAULT_RULE_LIGHT_SETTINGS,
    },
  ]);
  const stats = carrierSimulation.stats;
  const activeResults = carrierSimulation.currentFrame.results;
  const activeFailCount = activeResults.filter((result) => result.verdict === "FAIL").length;
  const activePassCount = activeResults.filter((result) => result.verdict === "PASS").length;
  const activeEmptyCount = activeResults.filter((result) => result.verdict === "EMPTY").length;
  const activeStatus = activeFailCount > 0 ? "FAIL" : "PASS";

  const frameProgress = useMemo(() => {
    return Math.round(((carrierSimulation.currentFrameIndex + 1) / 15) * 100);
  }, [carrierSimulation.currentFrameIndex]);

  const handleApply = () => {
    props.onOk?.();
  };
  const handleAddRule = () => {
    const nextIndex = treeRules.length + 1;
    const nextRule = {
      id: `rule-visual-${nextIndex}`,
      name: `Rule ${nextIndex}: Visual Check`,
      toolCode: "SIM",
      kind: EditorRuleKindType.R,
      cameraSettings: DEFAULT_RULE_CAMERA_SETTINGS,
      lightSettings: DEFAULT_RULE_LIGHT_SETTINGS,
    };

    setTreeRules((prev) => [...prev, nextRule]);
    setSelectedRuleId(nextRule.id);
  };
  const handleDeleteRule = (ruleId: string) => {
    if (builtInSimulationRuleIds.has(ruleId)) {
      return;
    }

    setTreeRules((prev) => prev.filter((rule) => rule.id !== ruleId));

    if (selectedRuleId === ruleId) {
      setSelectedRuleId("rule-pin1");
    }
  };
  const handleUpdateCameraSettings = (ruleId: string, cameraSettings: RuleCameraSettings) => {
    setTreeRules((prev) =>
      prev.map((rule) => (rule.id === ruleId ? { ...rule, cameraSettings } : rule)),
    );
  };
  const handleUpdateLightSettings = (ruleId: string, lightSettings: RuleLightSettings) => {
    setTreeRules((prev) =>
      prev.map((rule) => (rule.id === ruleId ? { ...rule, lightSettings } : rule)),
    );
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-ca-bg text-ca-ink font-sans select-none">
      <div
        role="toolbar"
        aria-label="Greyscale simulation actions"
        className="flex shrink-0 flex-wrap items-center gap-hmi-1 border-b border-ca-border/60 bg-ca-panel/80 p-hmi-1"
      >
        <div className="ml-hmi-2 mr-auto flex min-w-0 items-center gap-hmi-2">
          <Film aria-hidden size={16} className="text-cyan-400" />
          <span className="font-display text-hmi-body font-extrabold uppercase tracking-wide text-ca-ink">
            Greyscale Simulation
          </span>
          <span className="rounded-sm border border-cyan-800/60 bg-cyan-950/40 px-hmi-2 py-0.5 font-mono text-[10px] text-cyan-300">
            Carrier tape | 15 frames | 3 pockets
          </span>
        </div>

        <button
          type="button"
          onClick={carrierSimulation.togglePlaying}
          className={`inline-flex items-center gap-hmi-2 rounded-sm border px-hmi-2 py-hmi-1 text-hmi-caption font-semibold transition ${
            carrierSimulation.isPlaying
              ? "border-amber-600 bg-amber-950/40 text-amber-300 hover:bg-amber-900/50"
              : "border-emerald-600 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50"
          }`}
        >
          {carrierSimulation.isPlaying ? <Pause aria-hidden size={14} /> : <Play aria-hidden size={14} />}
          {carrierSimulation.isPlaying ? "Pause" : "Run"}
        </button>

        <button
          type="button"
          onClick={carrierSimulation.prevFrame}
          className="inline-flex items-center rounded-sm border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-ca-ink transition hover:border-ca-select hover:bg-ca-panel-2"
          title="Previous frame"
        >
          <ChevronLeft aria-hidden size={14} />
        </button>
        <span className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 font-mono text-hmi-caption text-ca-ink">
          Frame {carrierSimulation.currentFrame.frameNumber}/15
        </span>
        <button
          type="button"
          onClick={carrierSimulation.nextFrame}
          className="inline-flex items-center rounded-sm border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-ca-ink transition hover:border-ca-select hover:bg-ca-panel-2"
          title="Next frame"
        >
          <ChevronRight aria-hidden size={14} />
        </button>
        <button
          type="button"
          onClick={carrierSimulation.resetSimulation}
          className="inline-flex items-center rounded-sm border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-ca-ink transition hover:border-ca-select hover:bg-ca-panel-2"
          title="Reset"
        >
          <RotateCcw aria-hidden size={14} />
        </button>

        <button
          type="button"
          onClick={() => setHasOverlays((prev) => !prev)}
          className={`inline-flex items-center gap-hmi-2 rounded-sm border px-hmi-2 py-hmi-1 text-hmi-caption font-semibold transition ${
            hasOverlays
              ? "border-ca-select bg-ca-select/10 text-ca-select"
              : "border-ca-border bg-ca-panel text-ca-ink-muted"
          }`}
        >
          {hasOverlays ? <Eye aria-hidden size={14} /> : <EyeOff aria-hidden size={14} />}
          Overlay
        </button>

        <button
          type="button"
          onClick={props.onCancel}
          className="inline-flex items-center gap-hmi-2 rounded-sm border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-hmi-caption font-semibold text-ca-ink transition hover:border-rose-500 hover:text-rose-300"
        >
          <Trash2 aria-hidden size={14} />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="inline-flex items-center gap-hmi-2 rounded-sm bg-ca-select px-hmi-3 py-hmi-1 text-hmi-caption font-semibold text-ca-bg transition hover:brightness-110"
        >
          <Save aria-hidden size={14} />
          Apply
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-hmi-4 overflow-hidden p-hmi-4 lg:grid-cols-[360px_minmax(0,1fr)_380px] xl:grid-cols-[380px_minmax(0,1fr)_420px]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-md border border-ca-border bg-ca-panel">
          <div className="min-h-0 flex-1 overflow-y-auto p-hmi-3">
            <SimulationRulesTree
              treeRules={treeRules}
              selectedRuleId={selectedRuleId}
              onSelectRule={setSelectedRuleId}
              onAddRule={handleAddRule}
              onDeleteRule={handleDeleteRule}
              onUpdateCameraSettings={handleUpdateCameraSettings}
              onUpdateLightSettings={handleUpdateLightSettings}
            />
          </div>
        </aside>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-ca-border bg-ca-panel">
          <div className="flex flex-wrap items-center gap-hmi-2 border-b border-ca-border/60 bg-ca-panel-2 px-hmi-3 py-hmi-2">
            <span
              className={`inline-flex items-center gap-hmi-1 rounded-sm border px-hmi-2 py-0.5 font-mono text-hmi-caption font-bold ${
                activeStatus === "PASS"
                  ? "border-emerald-700/70 bg-emerald-950/40 text-emerald-300"
                  : "border-rose-700/70 bg-rose-950/40 text-rose-300"
              }`}
            >
              {activeStatus === "PASS" ? <CheckCircle2 aria-hidden size={13} /> : <XCircle aria-hidden size={13} />}
              {activeStatus}
            </span>
            <span className="font-mono text-hmi-caption text-ca-ink-muted">
              Current frame: {activePassCount} pass, {activeFailCount} fail, {activeEmptyCount} empty
            </span>
            <span className="ml-auto font-mono text-hmi-caption text-ca-ink-muted">
              Progress {frameProgress}%
            </span>
          </div>

          <div className="min-h-0 flex-1">
            <CarrierTapeSimulationCanvas
              frame={carrierSimulation.currentFrame}
              isAnalyzing={carrierSimulation.isAnalyzing}
              hasOverlays={hasOverlays}
              tolerances={{
                marginTolerancePx: carrierSimulation.marginTolerancePx,
                angleToleranceDeg: carrierSimulation.angleToleranceDeg,
                minMatchPercent: carrierSimulation.minMatchPercent,
                greyscaleLevel: carrierSimulation.greyscaleLevel,
              }}
              onResultsAnalyzed={carrierSimulation.handleFrameResultsAnalyzed}
            />
          </div>

          <div className="grid shrink-0 grid-cols-2 border-t border-ca-border/60 bg-ca-panel-2 md:grid-cols-5">
            <Metric label="Yield" value={`${stats.yieldPercent}%`} tone={stats.yieldPercent >= 95 ? "good" : "bad"} />
            <Metric label="Devices" value={String(stats.devicePockets)} />
            <Metric label="Passed" value={String(stats.passedPockets)} tone="good" />
            <Metric label="Failed" value={String(stats.failedPockets)} tone={stats.failedPockets > 0 ? "bad" : "muted"} />
            <Metric label="Rule 2 Skips" value={String(stats.rule2SkippedCount)} tone="warn" />
          </div>
        </div>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-md border border-ca-border bg-ca-panel">
          <div className="min-h-0 flex-1 space-y-hmi-3 overflow-y-auto p-hmi-3">
            <section className="space-y-hmi-3 rounded-lg border border-ca-border bg-ca-panel p-hmi-4">
              <div className="mb-hmi-3 flex items-start justify-between gap-hmi-3">
                <div>
                  <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
                    Controls
                  </h2>
                  <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">
                    Pixel analysis stays live while UI matches project analysis.
                  </p>
                </div>
                <Sliders aria-hidden size={15} className="mt-1 text-ca-select" />
              </div>

            <div className="rounded-sm border border-ca-border bg-ca-panel-2 p-hmi-3">
              <div className="mb-hmi-2 flex items-center justify-between text-hmi-caption">
                <span className="font-semibold text-ca-ink">Inspection Pace</span>
                <Gauge aria-hidden size={14} className="text-ca-ink-muted" />
              </div>
              <div className="grid grid-cols-3 gap-hmi-1">
                {(["slow", "normal", "fast"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => carrierSimulation.changeSpeedMode(mode)}
                    className={`rounded-sm border px-hmi-2 py-hmi-1 text-hmi-caption font-semibold capitalize transition ${
                      carrierSimulation.speedMode === mode
                        ? "border-ca-select bg-ca-select text-ca-bg"
                        : "border-ca-border bg-ca-panel text-ca-ink-muted hover:text-ca-ink"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <SliderControl
              label="Greyscale Level"
              value={carrierSimulation.greyscaleLevel}
              min={0}
              max={255}
              step={1}
              suffix=""
              onChange={carrierSimulation.setGreyscaleLevel}
            />
            <SliderControl
              label="Pin 1 Angle Tolerance"
              value={carrierSimulation.angleToleranceDeg}
              min={0}
              max={10}
              step={0.5}
              suffix="deg"
              onChange={carrierSimulation.setAngleToleranceDeg}
            />
            <SliderControl
              label="Position Tolerance"
              value={carrierSimulation.marginTolerancePx}
              min={2}
              max={20}
              step={1}
              suffix="px"
              onChange={carrierSimulation.setMarginTolerancePx}
            />
            <SliderControl
              label="Pattern Match Minimum"
              value={carrierSimulation.minMatchPercent}
              min={50}
              max={100}
              step={1}
              suffix="%"
              onChange={carrierSimulation.setMinMatchPercent}
            />

            <CarrierTapeResultPanel simulation={carrierSimulation} />
            </section>
          </div>
        </aside>
      </div>
    </section>
  );
}

function SimulationRulesTree(props: {
  treeRules: SimulationTreeRule[];
  selectedRuleId: string;
  onSelectRule: (id: string) => void;
  onAddRule: () => void;
  onDeleteRule: (id: string) => void;
  onUpdateCameraSettings: (ruleId: string, settings: RuleCameraSettings) => void;
  onUpdateLightSettings: (ruleId: string, settings: RuleLightSettings) => void;
}): React.JSX.Element {
  const {
    treeRules,
    selectedRuleId,
    onSelectRule,
    onAddRule,
    onDeleteRule,
    onUpdateCameraSettings,
    onUpdateLightSettings,
  } = props;
  const project: Project = {
    id: "sim-project",
    name: "Greyscale Simulation",
    createdAt: 0,
    rulesetIds: ["sim-ruleset-1"],
    deviceId: "Carrier Tape Camera",
    cameraName: "Simulation Camera",
  };
  const rules: EditorRule[] = treeRules.map((rule, index) => ({
    id: rule.id,
    name: rule.name,
    kind: rule.kind,
    family: EditorToolFamilyType.Rect,
    isHidden: false,
    isLocked: false,
    x: 40 + index * 12,
    y: 40 + index * 12,
    width: 120,
    height: 90,
    params: {
      toolCode: rule.toolCode,
    },
    cameraSettings: rule.cameraSettings,
    lightSettings: rule.lightSettings,
  }));
  const ruleset: RuleSet = {
    id: "sim-ruleset-1",
    projectId: project.id,
    name: "RuleSet1",
    rules,
  };

  return (
    <InspectionHierarchyTree
      project={project}
      ruleset={ruleset}
      rules={rules}
      selectedRuleId={selectedRuleId}
      onSelectRule={onSelectRule}
      onAddRuleClick={onAddRule}
      onDeleteRule={onDeleteRule}
      onUpdateCameraSettings={onUpdateCameraSettings}
      onUpdateLightSettings={onUpdateLightSettings}
    />
  );
}

function Metric(props: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "warn" | "muted";
}): React.JSX.Element {
  const toneClass =
    props.tone === "good"
      ? "text-emerald-300"
      : props.tone === "bad"
        ? "text-rose-300"
        : props.tone === "warn"
          ? "text-amber-300"
          : "text-ca-ink";

  return (
    <div className="border-r border-ca-border/60 px-hmi-3 py-hmi-2 last:border-r-0">
      <div className="font-mono text-[10px] uppercase tracking-wide text-ca-ink-muted">{props.label}</div>
      <div className={`font-mono text-hmi-body font-bold ${toneClass}`}>{props.value}</div>
    </div>
  );
}

function SliderControl(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}): React.JSX.Element {
  return (
    <div className="rounded-sm border border-ca-border bg-ca-panel-2 p-hmi-3">
      <div className="mb-hmi-2 flex items-center justify-between gap-hmi-2">
        <span className="text-hmi-caption font-semibold text-ca-ink">{props.label}</span>
        <span className="font-mono text-hmi-caption font-bold text-ca-select">
          {props.value}
          {props.suffix ? ` ${props.suffix}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.currentTarget.value))}
        className="w-full accent-ca-select"
      />
    </div>
  );
}
