// Flaw-detection param editor (Plan 67 step 29). Standalone panel bound to
// the FlawDetectionParams contract from
// `src/lib/editor/primitives/flaw-detection.ts`. Accepts params + onChange
// directly so it can be mounted before the "F" rule kind is registered in
// the EditorRuleKind union (that happens in the kind-registration slice).
import {
  FLAW_DETECTION_DEFAULTS,
  validateFlawDetectionParams,
  type FlawDetectionParams,
} from "@/lib/editor/primitives/flaw-detection";

export interface FlawRuleEditorProps {
  name?: string;
  params: FlawDetectionParams;
  onChange: (next: FlawDetectionParams) => void;
}

const WINDOW_MIN = 3;
const WINDOW_MAX = 31;
const VAR_MIN = 0;
const VAR_MAX = 65025; // 255^2

export function FlawRuleEditor({
  name,
  params,
  onChange,
}: FlawRuleEditorProps): React.JSX.Element | null {
  const p: FlawDetectionParams = { ...FLAW_DETECTION_DEFAULTS, ...params };
  const patch = (next: Partial<FlawDetectionParams>) => onChange({ ...p, ...next });
  const errors = validateFlawDetectionParams(p);

  return (
    <section
      aria-label="Flaw detection rule editor"
      className="flex flex-col gap-hmi-3 border-t border-ca-border bg-ca-panel-2 p-hmi-3"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-hmi-header text-ca-ink">Flaw detection</h2>
        {name ? <span className="text-hmi-caption text-ca-ink-muted">{name}</span> : null}
      </header>

      <NumericSlider
        label="Min edge variance"
        value={p.minEdgeVariance}
        min={VAR_MIN}
        max={VAR_MAX}
        step={1}
        onChange={(v) => patch({ minEdgeVariance: v })}
      />
      <NumericSlider
        label="Max edge variance"
        value={p.maxEdgeVariance}
        min={VAR_MIN}
        max={VAR_MAX}
        step={1}
        onChange={(v) => patch({ maxEdgeVariance: v })}
      />
      <label className="flex flex-col gap-hmi-1">
        <span className="flex justify-between text-hmi-body text-ca-ink">
          <span>Kernel window (odd)</span>
          <span className="font-hmi-mono text-ca-ink-muted">{p.window}</span>
        </span>
        <input
          type="range"
          min={WINDOW_MIN}
          max={WINDOW_MAX}
          step={2}
          value={p.window}
          onChange={(e) => patch({ window: Number(e.target.value) })}
          className="accent-ca-primary"
        />
      </label>

      <label className="flex items-center gap-hmi-2 text-hmi-body text-ca-ink">
        <input
          type="checkbox"
          checked={p.invert}
          onChange={(e) => patch({ invert: e.target.checked })}
          className="accent-ca-primary"
        />
        Invert (fail INSIDE the band)
      </label>

      {errors.length > 0 ? (
        <ul role="alert" className="flex flex-col gap-hmi-1 border border-ca-ng bg-ca-bg p-hmi-2">
          {errors.map((e) => (
            <li key={e.code} className="text-hmi-caption text-ca-ng">
              [{e.code}] {e.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

interface NumericSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function NumericSlider({ label, value, min, max, step, onChange }: NumericSliderProps) {
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
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-ca-primary"
      />
    </label>
  );
}
