// Edge Width param editor (Plan 67 step 32). Bound to EdgeWidthParams from
// `src/lib/editor/primitives/line-tool.ts`. Reuses LineToolControls with
// the shared LineTool surface. Params + onChange API so it can be mounted
// before the "W" rule kind is registered.
import {
  EDGE_WIDTH_DEFAULTS,
  validateLineToolParams,
  type EdgeWidthParams,
  type LineToolParams,
} from "@/lib/editor/primitives/line-tool";
import { LineToolControls } from "./LineToolControls";

export interface EdgeWidthRuleEditorProps {
  name?: string;
  params: EdgeWidthParams;
  onChange: (next: EdgeWidthParams) => void;
}

const WIDTH_MAX = 4096;

export function EdgeWidthRuleEditor({ name, params, onChange }: EdgeWidthRuleEditorProps) {
  const p: EdgeWidthParams = { ...EDGE_WIDTH_DEFAULTS, ...params };
  const patch = (next: Partial<EdgeWidthParams>) => onChange({ ...p, ...next });
  const patchLineTool = (next: Partial<LineToolParams>) => patch(next as Partial<EdgeWidthParams>);
  const errors = validateLineToolParams(p);
  const widthOrder = p.minWidth > p.maxWidth;

  return (
    <section
      aria-label="Edge width rule editor"
      className="flex flex-col gap-hmi-3 border-t border-ca-border bg-ca-panel-2 p-hmi-3"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-hmi-header text-ca-ink">Edge width</h2>
        {name ? <span className="text-hmi-caption text-ca-ink-muted">{name}</span> : null}
      </header>

      <LineToolControls params={p} onChange={patchLineTool} />

      <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
        <span>Pairing</span>
        <select
          value={p.pairing}
          onChange={(e) => patch({ pairing: e.target.value as EdgeWidthParams["pairing"] })}
          className="bg-ca-bg border border-ca-border p-hmi-1 text-ca-ink"
        >
          <option value="rise-to-fall">Rise to fall (bright bar)</option>
          <option value="fall-to-rise">Fall to rise (dark gap)</option>
        </select>
      </label>

      <label className="flex flex-col gap-hmi-1">
        <span className="flex justify-between text-hmi-body text-ca-ink">
          <span>Min width (samples)</span>
          <span className="font-hmi-mono text-ca-ink-muted">{p.minWidth}</span>
        </span>
        <input
          type="range"
          min={1}
          max={WIDTH_MAX}
          step={1}
          value={p.minWidth}
          onChange={(e) => patch({ minWidth: Number(e.target.value) })}
          className="accent-ca-primary"
        />
      </label>
      <label className="flex flex-col gap-hmi-1">
        <span className="flex justify-between text-hmi-body text-ca-ink">
          <span>Max width (samples)</span>
          <span className="font-hmi-mono text-ca-ink-muted">{p.maxWidth}</span>
        </span>
        <input
          type="range"
          min={1}
          max={WIDTH_MAX}
          step={1}
          value={p.maxWidth}
          onChange={(e) => patch({ maxWidth: Number(e.target.value) })}
          className="accent-ca-primary"
        />
      </label>

      {errors.length > 0 || widthOrder ? (
        <ul role="alert" className="flex flex-col gap-hmi-1 border border-ca-ng bg-ca-bg p-hmi-2">
          {errors.map((e) => (
            <li key={e.code} className="text-hmi-caption text-ca-ng">
              [{e.code}] {e.message}
            </li>
          ))}
          {widthOrder ? (
            <li className="text-hmi-caption text-ca-ng">
              [width.order] minWidth must be less than or equal to maxWidth.
            </li>
          ) : null}
        </ul>
      ) : null}
    </section>
  );
}
