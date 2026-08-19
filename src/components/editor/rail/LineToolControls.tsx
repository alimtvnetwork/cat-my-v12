// Shared LineTool controls (Plan 67 step 32). Renders the four LineTool
// parameters (smoothWindow, edgeThreshold, polarity, minSeparation) so the
// Edge Width and Edge Pitch editors can share the same UI surface.
import type { LineToolParams } from "@/lib/editor/primitives/line-tool";

export interface LineToolControlsProps {
  params: LineToolParams;
  onChange: (next: Partial<LineToolParams>) => void;
}

export function LineToolControls({
  params,
  onChange,
}: LineToolControlsProps): React.JSX.Element | null {
  return (
    <div className="flex flex-col gap-hmi-3">
      <label className="flex flex-col gap-hmi-1">
        <span className="flex justify-between text-hmi-body text-ca-ink">
          <span>Smooth window (odd)</span>
          <span className="font-hmi-mono text-ca-ink-muted">{params.smoothWindow}</span>
        </span>
        <input
          type="range"
          min={1}
          max={51}
          step={2}
          value={params.smoothWindow}
          onChange={(e) => onChange({ smoothWindow: Number(e.target.value) })}
          className="accent-ca-primary"
        />
      </label>
      <label className="flex flex-col gap-hmi-1">
        <span className="flex justify-between text-hmi-body text-ca-ink">
          <span>Edge threshold</span>
          <span className="font-hmi-mono text-ca-ink-muted">{params.edgeThreshold}</span>
        </span>
        <input
          type="range"
          min={0}
          max={255}
          step={1}
          value={params.edgeThreshold}
          onChange={(e) => onChange({ edgeThreshold: Number(e.target.value) })}
          className="accent-ca-primary"
        />
      </label>
      <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
        <span>Polarity</span>
        <select
          value={params.polarity}
          onChange={(e) => onChange({ polarity: e.target.value as LineToolParams["polarity"] })}
          className="bg-ca-bg border border-ca-border p-hmi-1 text-ca-ink"
        >
          <option value="rising">Rising (dark to light)</option>
          <option value="falling">Falling (light to dark)</option>
          <option value="both">Both</option>
        </select>
      </label>
      <label className="flex flex-col gap-hmi-1">
        <span className="flex justify-between text-hmi-body text-ca-ink">
          <span>Min separation</span>
          <span className="font-hmi-mono text-ca-ink-muted">{params.minSeparation}</span>
        </span>
        <input
          type="range"
          min={1}
          max={50}
          step={1}
          value={params.minSeparation}
          onChange={(e) => onChange({ minSeparation: Number(e.target.value) })}
          className="accent-ca-primary"
        />
      </label>
    </div>
  );
}
