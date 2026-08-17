import { EditorRuleKindType } from "@/lib/editor/types";
// Rectangle-detector param panel (plan 30 step 75, per-kind panel for kind "R").
// Mirrors OcrRuleEditor's shape and design tokens so the rail stays consistent.
import type { EditorRule, EditorRuleParams } from "@/lib/editor/types";
import { RuleKindType } from "@/types/rules/RuleKind";
import { PassThresholdField } from "./PassThresholdField";
import { getCalibrationSuggestion } from "@/lib/editor/calibration";

export interface RectRuleEditorProps {
  rule: EditorRule;
  onChange: (id: string, patch: EditorRuleParams) => void;
}

const AREA_MIN = 0;
const AREA_MAX = 500000;
const DEG_MIN = 0;
const DEG_MAX = 45;
const EDGE_MAX = 255;

export function RectRuleEditor({ rule, onChange }: RectRuleEditorProps): React.JSX.Element | null {
  if (RuleKindType.isRectangle(rule.kind) === false) return null;
  const p = rule.params ?? {};
  const minArea = Number(p.minArea ?? 200);
  const maxArea = Number(p.maxArea ?? 50000);
  const orientationTolerance = Number(p.orientationTolerance ?? 5);
  const edgeThreshold = Number(p.edgeThreshold ?? 96);
  const passThreshold = Number(
    p.passThreshold ?? getCalibrationSuggestion(EditorRuleKindType.R)?.threshold ?? 0.5,
  );

  const patch = (next: EditorRuleParams) => onChange(rule.id, { ...p, ...next });

  return (
    <section aria-label="Rectangle rule editor" className="editor-kind-panel">
      <header className="editor-kind-panel-head">
        <h2 className="editor-kind-panel-title">Rectangle detector</h2>
        <span className="editor-kind-panel-rule-name">{rule.name}</span>
      </header>

      <NumericField
        label="Min area (px²)"
        value={minArea}
        min={AREA_MIN}
        max={AREA_MAX}
        step={10}
        onChange={(v) => patch({ minArea: v })}
      />
      <NumericField
        label="Max area (px²)"
        value={maxArea}
        min={AREA_MIN}
        max={AREA_MAX}
        step={10}
        onChange={(v) => patch({ maxArea: v })}
      />
      <NumericSlider
        label="Orientation tolerance (°)"
        value={orientationTolerance}
        min={DEG_MIN}
        max={DEG_MAX}
        onChange={(v) => patch({ orientationTolerance: v })}
      />
      <NumericSlider
        label="Edge threshold"
        value={edgeThreshold}
        min={0}
        max={EDGE_MAX}
        onChange={(v) => patch({ edgeThreshold: v })}
      />
      <PassThresholdField
        kind={EditorRuleKindType.R}
        value={passThreshold}
        onChange={(v) => patch({ passThreshold: v })}
      />
    </section>
  );
}

interface FieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}

function NumericField({ label, value, min, max, step = 1, onChange }: FieldProps) {
  return (
    <label className="editor-kind-field">
      <span className="editor-kind-field-label">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="editor-kind-input"
      />
    </label>
  );
}

function NumericSlider({ label, value, min, max, step = 1, onChange }: FieldProps) {
  return (
    <label className="editor-kind-field">
      <span className="editor-kind-field-row">
        <span>{label}</span>
        <span className="editor-kind-value">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="editor-kind-range"
      />
    </label>
  );
}
