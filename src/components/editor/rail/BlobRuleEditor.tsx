// Blob-detection param editor (Plan 67 step 31). Bound to BlobParams from
// `src/lib/editor/primitives/blob.ts`. Params + onChange API so it can be
// mounted before the "L" rule kind is registered in EditorRuleKind.
import {
  BLOB_DEFAULTS,
  validateBlobParams,
  type BlobParams,
  type BlobPolarity,
} from "@/lib/editor/primitives/blob";

export interface BlobRuleEditorProps {
  name?: string;
  params: BlobParams;
  onChange: (next: BlobParams) => void;
}

const AREA_MAX = 1_000_000;
const COUNT_MAX = 9_999;

export function BlobRuleEditor({ name, params, onChange }: BlobRuleEditorProps) {
  const p: BlobParams = { ...BLOB_DEFAULTS, ...params };
  const patch = (next: Partial<BlobParams>) => onChange({ ...p, ...next });
  const errors = validateBlobParams(p);
  const maxCountFinite = Number.isFinite(p.maxCount);

  return (
    <section
      aria-label="Blob detection rule editor"
      className="flex flex-col gap-hmi-3 border-t border-ca-border bg-ca-panel-2 p-hmi-3"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-hmi-header text-ca-ink">Blob detection</h2>
        {name ? <span className="text-hmi-caption text-ca-ink-muted">{name}</span> : null}
      </header>

      <NumericSlider
        label="Threshold (0..255)"
        value={p.threshold}
        min={0}
        max={255}
        step={1}
        onChange={(v) => patch({ threshold: v })}
      />

      <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
        <span>Polarity</span>
        <select
          value={p.polarity}
          onChange={(e) => patch({ polarity: e.target.value as BlobPolarity })}
          className="bg-ca-bg border border-ca-border p-hmi-1 text-ca-ink"
        >
          <option value="dark-on-light">Dark on light</option>
          <option value="light-on-dark">Light on dark</option>
        </select>
      </label>

      <NumericSlider
        label="Min area (px)"
        value={p.minArea}
        min={1}
        max={AREA_MAX}
        step={1}
        onChange={(v) => patch({ minArea: v })}
      />
      <NumericSlider
        label="Max area (px)"
        value={p.maxArea}
        min={1}
        max={AREA_MAX}
        step={1}
        onChange={(v) => patch({ maxArea: v })}
      />

      <NumericSlider
        label="Min count"
        value={p.minCount}
        min={0}
        max={COUNT_MAX}
        step={1}
        onChange={(v) => patch({ minCount: v })}
      />

      <label className="flex items-center gap-hmi-2 text-hmi-body text-ca-ink">
        <input
          type="checkbox"
          checked={!maxCountFinite}
          onChange={(e) =>
            patch({
              maxCount: e.target.checked ? Number.POSITIVE_INFINITY : Math.max(p.minCount, 10),
            })
          }
          className="accent-ca-primary"
        />
        No max count cap
      </label>
      {maxCountFinite ? (
        <NumericSlider
          label="Max count"
          value={p.maxCount}
          min={0}
          max={COUNT_MAX}
          step={1}
          onChange={(v) => patch({ maxCount: v })}
        />
      ) : null}

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
