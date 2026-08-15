// Color / Mat param editor (Plan 67 step 35). Bound to `ColorMatParams`
// from `src/lib/editor/primitives/color-mat.ts`. Provides color space
// select, native color picker (RGB expected), per-channel tolerance
// sliders switched by space, and a minCoverage slider. Params + onChange
// API so it can be mounted before the "M" rule kind is registered.
import {
  COLOR_MAT_DEFAULTS,
  rgbToHsv,
  validateColorMatParams,
  type ColorMatParams,
  type ColorSpace,
  type RgbColor,
} from "@/lib/editor/primitives/color-mat";

export interface ColorMatRuleEditorProps {
  name?: string;
  params: ColorMatParams;
  onChange: (next: ColorMatParams) => void;
}

function toHex(c: RgbColor): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");

  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

function fromHex(hex: string): RgbColor {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);

  if (!m) return { r: 0, g: 0, b: 0 };
  const n = parseInt(m[1], 16);

  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

export function ColorMatRuleEditor({ name, params, onChange }: ColorMatRuleEditorProps) {
  const p: ColorMatParams = {
    ...COLOR_MAT_DEFAULTS,
    ...params,
    tolerance: { ...COLOR_MAT_DEFAULTS.tolerance, ...(params.tolerance ?? {}) },
    expected: { ...COLOR_MAT_DEFAULTS.expected, ...(params.expected ?? {}) },
  };
  const patch = (next: Partial<ColorMatParams>) => onChange({ ...p, ...next });
  const patchTol = (next: Partial<ColorMatParams["tolerance"]>) =>
    onChange({ ...p, tolerance: { ...p.tolerance, ...next } });
  const errors = validateColorMatParams(p);
  const hsv = rgbToHsv(p.expected);

  return (
    <section
      aria-label="Color match rule editor"
      className="flex flex-col gap-hmi-3 border-t border-ca-border bg-ca-panel-2 p-hmi-3"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-hmi-header text-ca-ink">Color / Mat</h2>
        {name ? <span className="text-hmi-caption text-ca-ink-muted">{name}</span> : null}
      </header>

      <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
        <span>Color space</span>
        <select
          value={p.space}
          onChange={(e) => patch({ space: e.target.value as ColorSpace })}
          className="bg-ca-bg border border-ca-border p-hmi-1 text-ca-ink"
        >
          <option value="rgb">RGB (per channel)</option>
          <option value="hsv">HSV (hue-aware)</option>
        </select>
      </label>

      <div className="flex items-center gap-hmi-2">
        <span
          aria-hidden
          className="h-8 w-8 border border-ca-border"
          style={{ background: toHex(p.expected) }}
        />
        <label className="flex flex-1 flex-col gap-hmi-1 text-hmi-body text-ca-ink">
          <span>Expected color</span>
          <input
            type="color"
            value={toHex(p.expected)}
            onChange={(e) => patch({ expected: fromHex(e.target.value) })}
            className="h-8 w-full bg-ca-bg border border-ca-border"
          />
          <span className="font-hmi-mono text-hmi-caption text-ca-ink-muted">
            rgb({p.expected.r}, {p.expected.g}, {p.expected.b}) / hsv(
            {Math.round(hsv.h)}, {(hsv.s * 100).toFixed(0)}%, {(hsv.v * 100).toFixed(0)}%)
          </span>
        </label>
      </div>

      {p.space === "rgb" ? (
        <div className="flex flex-col gap-hmi-2">
          <NumericSlider
            label="Tolerance R"
            value={p.tolerance.r}
            min={0}
            max={255}
            step={1}
            onChange={(v) => patchTol({ r: v })}
          />
          <NumericSlider
            label="Tolerance G"
            value={p.tolerance.g}
            min={0}
            max={255}
            step={1}
            onChange={(v) => patchTol({ g: v })}
          />
          <NumericSlider
            label="Tolerance B"
            value={p.tolerance.b}
            min={0}
            max={255}
            step={1}
            onChange={(v) => patchTol({ b: v })}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-hmi-2">
          <NumericSlider
            label="Tolerance H (deg)"
            value={p.tolerance.h}
            min={0}
            max={180}
            step={1}
            onChange={(v) => patchTol({ h: v })}
          />
          <NumericSlider
            label="Tolerance S"
            value={p.tolerance.s}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => patchTol({ s: v })}
            format={(v) => v.toFixed(2)}
          />
          <NumericSlider
            label="Tolerance V"
            value={p.tolerance.v}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => patchTol({ v: v })}
            format={(v) => v.toFixed(2)}
          />
        </div>
      )}

      <NumericSlider
        label="Min coverage"
        value={p.minCoverage}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => patch({ minCoverage: v })}
        format={(v) => `${(v * 100).toFixed(0)}%`}
      />

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
  format?: (v: number) => string;
}

function NumericSlider({ label, value, min, max, step, onChange, format }: NumericSliderProps) {
  return (
    <label className="flex flex-col gap-hmi-1">
      <span className="flex justify-between text-hmi-body text-ca-ink">
        <span>{label}</span>
        <span className="font-hmi-mono text-ca-ink-muted">{format ? format(value) : value}</span>
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
