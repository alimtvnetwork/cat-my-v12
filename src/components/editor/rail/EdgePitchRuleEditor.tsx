// Edge Pitch param editor (Plan 67 step 33). Bound to EdgePitchParams from
// `src/lib/editor/primitives/line-tool.ts`. Reuses LineToolControls with the
// shared LineTool surface. Params + onChange API so it can be mounted before
// the "P" rule kind is registered.
import {
  EDGE_PITCH_DEFAULTS,
  validateLineToolParams,
  type EdgePitchParams,
  type LineToolParams,
} from "@/lib/editor/primitives/line-tool";
import { LineToolControls } from "./LineToolControls";

export interface EdgePitchRuleEditorProps {
  name?: string;
  params: EdgePitchParams;
  onChange: (next: EdgePitchParams) => void;
}

const PITCH_MAX = 4096;
const COUNT_MAX = 9_999;

export function EdgePitchRuleEditor({ name, params, onChange }: EdgePitchRuleEditorProps): React.JSX.Element | null {
  const p: EdgePitchParams = { ...EDGE_PITCH_DEFAULTS, ...params };
  const patch = (next: Partial<EdgePitchParams>) => onChange({ ...p, ...next });
  const patchLineTool = (next: Partial<LineToolParams>) => patch(next as Partial<EdgePitchParams>);
  const errors = validateLineToolParams(p);
  const pitchOrder = p.minPitch > p.maxPitch;

  return (
    <section
      aria-label="Edge pitch rule editor"
      className="flex flex-col gap-hmi-3 border-t border-ca-border bg-ca-panel-2 p-hmi-3"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-hmi-header text-ca-ink">Edge pitch</h2>
        {name ? <span className="text-hmi-caption text-ca-ink-muted">{name}</span> : null}
      </header>

      <LineToolControls params={p} onChange={patchLineTool} />

      <label className="flex flex-col gap-hmi-1">
        <span className="flex justify-between text-hmi-body text-ca-ink">
          <span>Min pitch (samples)</span>
          <span className="font-hmi-mono text-ca-ink-muted">{p.minPitch}</span>
        </span>
        <input
          type="range"
          min={1}
          max={PITCH_MAX}
          step={1}
          value={p.minPitch}
          onChange={(e) => patch({ minPitch: Number(e.target.value) })}
          className="accent-ca-primary"
        />
      </label>
      <label className="flex flex-col gap-hmi-1">
        <span className="flex justify-between text-hmi-body text-ca-ink">
          <span>Max pitch (samples)</span>
          <span className="font-hmi-mono text-ca-ink-muted">{p.maxPitch}</span>
        </span>
        <input
          type="range"
          min={1}
          max={PITCH_MAX}
          step={1}
          value={p.maxPitch}
          onChange={(e) => patch({ maxPitch: Number(e.target.value) })}
          className="accent-ca-primary"
        />
      </label>

      <label className="flex flex-col gap-hmi-1">
        <span className="flex justify-between text-hmi-body text-ca-ink">
          <span>Expected count (0 disables)</span>
          <span className="font-hmi-mono text-ca-ink-muted">{p.expectedCount}</span>
        </span>
        <input
          type="range"
          min={0}
          max={COUNT_MAX}
          step={1}
          value={p.expectedCount}
          onChange={(e) => patch({ expectedCount: Number(e.target.value) })}
          className="accent-ca-primary"
        />
      </label>
      <label className="flex flex-col gap-hmi-1">
        <span className="flex justify-between text-hmi-body text-ca-ink">
          <span>Count tolerance</span>
          <span className="font-hmi-mono text-ca-ink-muted">{p.countTolerance}</span>
        </span>
        <input
          type="range"
          min={0}
          max={COUNT_MAX}
          step={1}
          value={p.countTolerance}
          onChange={(e) => patch({ countTolerance: Number(e.target.value) })}
          className="accent-ca-primary"
        />
      </label>

      {errors.length > 0 || pitchOrder ? (
        <ul role="alert" className="flex flex-col gap-hmi-1 border border-ca-ng bg-ca-bg p-hmi-2">
          {errors.map((e) => (
            <li key={e.code} className="text-hmi-caption text-ca-ng">
              [{e.code}] {e.message}
            </li>
          ))}
          {pitchOrder ? (
            <li className="text-hmi-caption text-ca-ng">
              [pitch.order] minPitch must be less than or equal to maxPitch.
            </li>
          ) : null}
        </ul>
      ) : null}
    </section>
  );
}
