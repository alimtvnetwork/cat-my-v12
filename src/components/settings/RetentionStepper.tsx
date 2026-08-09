import { Minus, Plus } from "lucide-react";

// Plan 81 step 6 / subtask SS-01: labeled stepper primitive with quick
// presets. Replaces the raw `<input type="number">` used for the audit
// retention window and max on-disk size. The stepper clamps to
// [min, max], increments by `step`, and exposes a preset row so the
// operator can jump to common values without typing.

export interface RetentionPreset {
  label: string;
  value: number;
}

export interface RetentionStepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  presets?: ReadonlyArray<RetentionPreset>;
  onChange: (next: number) => void;
  /** Accessible id for `aria-labelledby`; auto-derived from label when omitted. */
  id?: string;
  helpText?: string;
}

// Pure clamp helper exported so tests can lock in the exact behaviour
// without instantiating the component. Non-finite values fall back to
// `min`, matching how the settings hub recovered from `NaN` under the
// previous free-form input.
export function clampStep(value: number, min: number, max: number): number {
  if (Number.isFinite(value) === false) return min;
  const n = Math.trunc(value);

  if (n < min) return min;

  if (n > max) return max;

  return n;
}

export function RetentionStepper({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  presets,
  onChange,
  id,
  helpText,
}: RetentionStepperProps) {
  const inputId = id ?? `retention-stepper-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const commit = (next: number) => onChange(clampStep(next, min, max));
  const dec = () => commit(value - step);
  const inc = () => commit(value + step);

  return (
    <div className="block">
      <label
        htmlFor={inputId}
        className="block text-hmi-caption uppercase tracking-wide text-ca-ink-muted"
      >
        {label}
      </label>
      <div className="mt-hmi-1 inline-flex items-stretch overflow-hidden rounded-md border border-ca-border bg-ca-panel-2">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="grid w-9 place-items-center border-r border-ca-border text-ca-ink transition hover:bg-ca-panel disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus size={14} aria-hidden />
        </button>
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => commit(Number(e.target.value))}
          className="w-24 bg-transparent px-hmi-2 py-hmi-2 text-center text-hmi-body text-ca-ink hmi-tabular focus:outline-none"
        />
        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="grid w-9 place-items-center border-l border-ca-border text-ca-ink transition hover:bg-ca-panel disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={14} aria-hidden />
        </button>
      </div>
      {unit ? (
        <span className="ml-hmi-2 text-hmi-caption text-ca-ink-muted hmi-tabular">{unit}</span>
      ) : null}
      {presets && presets.length > 0 ? (
        <div
          role="group"
          aria-label={`${label} presets`}
          className="mt-hmi-2 flex flex-wrap gap-hmi-1"
        >
          {presets.map((p) => {
            const active = p.value === value;

            return (
              <button
                key={p.label}
                type="button"
                onClick={() => commit(p.value)}
                aria-pressed={active}
                className={
                  active
                    ? "inline-flex items-center rounded-sm bg-ca-select px-hmi-2 py-[2px] text-[11px] font-semibold text-ca-bg"
                    : "inline-flex items-center rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-[2px] text-[11px] tabular-nums text-ca-ink hover:border-ca-select"
                }
              >
                {p.label}
              </button>
            );
          })}
        </div>
      ) : null}
      {helpText ? (
        <span className="mt-hmi-1 block text-[11px] text-ca-ink-muted/80">{helpText}</span>
      ) : null}
    </div>
  );
}

export const RETENTION_DAY_PRESETS: ReadonlyArray<RetentionPreset> = [
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "1y", value: 365 },
  { label: "5y", value: 1825 },
];

export const RETENTION_MB_PRESETS: ReadonlyArray<RetentionPreset> = [
  { label: "128MB", value: 128 },
  { label: "512MB", value: 512 },
  { label: "2GB", value: 2048 },
  { label: "10GB", value: 10240 },
];
