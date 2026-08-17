import { EditorRuleKindType } from "@/lib/editor/types";
// Circle-detector param panel (plan 30 step 75, per-kind panel for kind "C").
// Mirrors OcrRuleEditor's shape and design tokens so the rail stays consistent.
import type { EditorRule, EditorRuleParams } from "@/lib/editor/types";
import { RuleKindType } from "@/types/rules/RuleKind";
import { PassThresholdField } from "./PassThresholdField";
import { getCalibrationSuggestion } from "@/lib/editor/calibration";

export interface CircleRuleEditorProps {
  rule: EditorRule;
  onChange: (id: string, patch: EditorRuleParams) => void;
}

const MIN_RADIUS_MIN = 1;
const MAX_RADIUS_MAX = 512;
const EDGE_MIN = 0;
const EDGE_MAX = 255;
const ROTATION_MIN = -180;
const ROTATION_MAX = 180;

export function CircleRuleEditor({ rule, onChange }: CircleRuleEditorProps): React.JSX.Element | null {
  if (RuleKindType.isCircle(rule.kind) === false) return null;
  const p = rule.params ?? {};
  const minRadius = Number(p.minRadius ?? 10);
  const maxRadius = Number(p.maxRadius ?? 120);
  const edgeThreshold = Number(p.edgeThreshold ?? 96);
  const invertPolarity = Boolean(p.invertPolarity ?? false);
  const innerRadius = Number(p.innerRadius ?? 0);
  const rotationDeg = Number(p.rotationDeg ?? 0);
  const passThreshold = Number(
    p.passThreshold ?? getCalibrationSuggestion(EditorRuleKindType.C)?.threshold ?? 0.5,
  );

  const patch = (next: EditorRuleParams) => onChange(rule.id, { ...p, ...next });

  return (
    <section
      aria-label="Circle rule editor"
      className="flex flex-col gap-hmi-3 border-t border-ca-border bg-ca-panel-2 p-hmi-3"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-hmi-header text-ca-ink">Circle detector</h2>
        <span className="text-hmi-caption text-ca-ink-muted">{rule.name}</span>
      </header>

      <NumericSlider
        label="Min radius (px)"
        value={minRadius}
        min={MIN_RADIUS_MIN}
        max={MAX_RADIUS_MAX}
        onChange={(v) => patch({ minRadius: v })}
      />
      <NumericSlider
        label="Max radius (px)"
        value={maxRadius}
        min={MIN_RADIUS_MIN}
        max={MAX_RADIUS_MAX}
        onChange={(v) => patch({ maxRadius: v })}
      />
      <NumericSlider
        label="Inner radius (0 = disk)"
        value={innerRadius}
        min={0}
        max={MAX_RADIUS_MAX}
        onChange={(v) => patch({ innerRadius: Math.min(v, minRadius) })}
      />
      {innerRadius > 0 ? (
        <p className="text-hmi-caption text-ca-ink-muted">
          Annulus ROI: pixels between inner and min radius are ignored.
        </p>
      ) : null}
      <NumericSlider
        label="Edge threshold"
        value={edgeThreshold}
        min={EDGE_MIN}
        max={EDGE_MAX}
        onChange={(v) => patch({ edgeThreshold: v })}
      />
      <NumericSlider
        label="Rotation (deg)"
        value={rotationDeg}
        min={ROTATION_MIN}
        max={ROTATION_MAX}
        onChange={(v) => patch({ rotationDeg: v })}
      />

      <label className="flex items-center gap-hmi-2 text-hmi-body text-ca-ink">
        <input
          type="checkbox"
          checked={invertPolarity}
          onChange={(e) => patch({ invertPolarity: e.target.checked })}
          className="accent-ca-primary"
        />
        Invert polarity (dark-on-light)
      </label>
      <PassThresholdField
        kind={EditorRuleKindType.C}
        value={passThreshold}
        onChange={(v) => patch({ passThreshold: v })}
      />
    </section>
  );
}

interface NumericSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

function NumericSlider({ label, value, min, max, onChange }: NumericSliderProps) {
  return (
    <label className="flex flex-col gap-hmi-1">
      <span className="flex justify-between text-hmi-body text-ca-ink">
        <span>{label}</span>
        <span className="font-hmi-mono text-ca-ink-muted">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-ca-primary"
      />
    </label>
  );
}
