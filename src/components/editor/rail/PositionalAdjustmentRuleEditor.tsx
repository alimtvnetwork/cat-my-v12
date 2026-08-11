// Positional Adjustment param editor (Plan 67 step 34). Bound to
// `PositionalAdjustmentParams` from
// `src/lib/editor/primitives/positional-adjustment.ts`. Provides anchor
// source select, manual anchor x/y, translate x/y, rotation (degrees, wrapped
// to radians), and a reference-rule picker fed by an optional
// `availableRules` prop so this editor stays decoupled from the store.
import {
  POSITIONAL_ADJUSTMENT_DEFAULTS,
  validatePositionalAdjustment,
  type AnchorSource,
  type PositionalAdjustmentParams,
} from "@/lib/editor/primitives/positional-adjustment";

export interface PositionalAdjustmentRuleOption {
  id: string;
  label: string;
}

export interface PositionalAdjustmentRuleEditorProps {
  name?: string;
  params: PositionalAdjustmentParams;
  onChange: (next: PositionalAdjustmentParams) => void;
  /** Anchor rule candidates. Empty list is allowed; picker shows a hint. */
  availableRules?: readonly PositionalAdjustmentRuleOption[];
}

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

export function PositionalAdjustmentRuleEditor({
  name,
  params,
  onChange,
  availableRules = [],
}: PositionalAdjustmentRuleEditorProps) {
  const p: PositionalAdjustmentParams = { ...POSITIONAL_ADJUSTMENT_DEFAULTS, ...params };
  const patch = (next: Partial<PositionalAdjustmentParams>) => onChange({ ...p, ...next });
  const errors = validatePositionalAdjustment(p);
  const rotateDeg = Math.round(p.rotate * RAD_TO_DEG * 100) / 100;

  return (
    <section
      aria-label="Positional adjustment rule editor"
      className="flex flex-col gap-hmi-3 border-t border-ca-border bg-ca-panel-2 p-hmi-3"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-hmi-header text-ca-ink">Positional adjustment</h2>
        {name ? <span className="text-hmi-caption text-ca-ink-muted">{name}</span> : null}
      </header>

      <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
        <span>Anchor source</span>
        <select
          value={p.anchorSource}
          onChange={(e) => patch({ anchorSource: e.target.value as AnchorSource })}
          className="bg-ca-bg border border-ca-border p-hmi-1 text-ca-ink"
        >
          <option value="manual-point">Manual point</option>
          <option value="rule-centroid">Rule centroid</option>
        </select>
      </label>

      {p.anchorSource === "manual-point" ? (
        <div className="grid grid-cols-2 gap-hmi-2">
          <NumberField
            label="Anchor X (px)"
            value={p.anchor.x}
            onChange={(v) => patch({ anchor: { ...p.anchor, x: v } })}
          />
          <NumberField
            label="Anchor Y (px)"
            value={p.anchor.y}
            onChange={(v) => patch({ anchor: { ...p.anchor, y: v } })}
          />
        </div>
      ) : (
        <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
          <span>Reference rule</span>
          <select
            value={p.referenceRuleId}
            onChange={(e) => patch({ referenceRuleId: e.target.value })}
            className="bg-ca-bg border border-ca-border p-hmi-1 text-ca-ink"
          >
            <option value="">Select a rule...</option>
            {availableRules.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          {availableRules.length === 0 ? (
            <span className="text-hmi-caption text-ca-ink-muted">
              No candidate rules. Add a rule that publishes a centroid first.
            </span>
          ) : null}
        </label>
      )}

      <div className="grid grid-cols-2 gap-hmi-2">
        <NumberField
          label="Translate X (px)"
          value={p.translate.x}
          onChange={(v) => patch({ translate: { ...p.translate, x: v } })}
        />
        <NumberField
          label="Translate Y (px)"
          value={p.translate.y}
          onChange={(v) => patch({ translate: { ...p.translate, y: v } })}
        />
      </div>

      <label className="flex flex-col gap-hmi-1">
        <span className="flex justify-between text-hmi-body text-ca-ink">
          <span>Rotation (deg)</span>
          <span className="font-hmi-mono text-ca-ink-muted">{rotateDeg}</span>
        </span>
        <input
          type="range"
          min={-360}
          max={360}
          step={0.1}
          value={rotateDeg}
          onChange={(e) => patch({ rotate: Number(e.target.value) * DEG_TO_RAD })}
          className="accent-ca-primary"
        />
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

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

function NumberField({ label, value, onChange }: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
      <span>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(Number.isFinite(v) ? v : 0);
        }}
        className="bg-ca-bg border border-ca-border p-hmi-1 font-hmi-mono text-ca-ink"
      />
    </label>
  );
}