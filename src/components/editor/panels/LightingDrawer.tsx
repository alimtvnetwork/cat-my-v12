// LightingDrawer, Plan 31 step 11.
// Spec: spec/24-app-ui-design-system/02-layout.md L74-83 (dock + geometry)
//       spec/24-app-ui-design-system/08-testing.md LC-01..LC-12 (acceptance).
//
// Token-only styling: ca-* surface/ink tokens, hmi-* spacing tokens. No hex,
// no bg-white/text-black. All coded log lines are the caller's responsibility;
// this panel is a pure presentational + prop-driven slider set.

import { useId } from "react";

export interface LightingState {
  exposureMs: number; // LC-01: 0.1..100
  gainDb: number; // LC-02: 0..24
  whiteBalanceK: number; // LC-03: 2500..10000
  programPreset: string; // LC-06: named preset id, "" = custom
}

export interface LightingCapabilities {
  exposure: boolean;
  gain: boolean;
  whiteBalance: boolean;
  programPresets: readonly string[];
}

export interface LightingDrawerProps {
  open: boolean;
  onToggle: () => void;
  value: LightingState;
  capabilities: LightingCapabilities;
  onChange: (patch: Partial<LightingState>) => void;
  onApply: (value: LightingState) => void; // LC-07 apply, emits I_CAM_LIGHTING_APPLIED
  onSavePreset: (name: string) => void; // LC-12 preset persistence
  disabled?: boolean; // LC-09 unavailable camera
}

const RANGES = {
  exposureMs: { min: 0.1, max: 100, step: 0.1 },
  gainDb: { min: 0, max: 24, step: 0.5 },
  whiteBalanceK: { min: 2500, max: 10000, step: 50 },
} as const;

export function LightingDrawer(props: LightingDrawerProps) {
  const { open, onToggle, value, capabilities, onChange, onApply, onSavePreset, disabled } = props;
  const rootId = useId();

  if (!open) {
    return (
      <aside
        aria-label="Lighting drawer, collapsed"
        className="flex h-full w-8 flex-col items-center border-r border-ca-border bg-ca-panel-2"
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={false}
          aria-controls={rootId}
          className="mt-hmi-2 px-hmi-1 py-hmi-1 text-hmi-body text-ca-ink hover:bg-ca-panel"
        >
          &gt;
        </button>
      </aside>
    );
  }

  return (
    <aside
      id={rootId}
      aria-label="Lighting drawer"
      className="flex h-full w-80 flex-col gap-hmi-3 border-r border-ca-border bg-ca-panel-2 p-hmi-3"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-hmi-heading text-ca-ink">Lighting</h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={true}
          aria-controls={rootId}
          className="px-hmi-1 py-hmi-1 text-hmi-body text-ca-ink hover:bg-ca-panel"
        >
          &lt;
        </button>
      </header>

      <fieldset disabled={disabled} className="flex flex-col gap-hmi-3">
        {capabilities.exposure && (
          <Slider
            label="Exposure (ms)"
            value={value.exposureMs}
            {...RANGES.exposureMs}
            onChange={(v) => onChange({ exposureMs: v })}
          />
        )}
        {capabilities.gain && (
          <Slider
            label="Gain (dB)"
            value={value.gainDb}
            {...RANGES.gainDb}
            onChange={(v) => onChange({ gainDb: v })}
          />
        )}
        {capabilities.whiteBalance && (
          <Slider
            label="White balance (K)"
            value={value.whiteBalanceK}
            {...RANGES.whiteBalanceK}
            onChange={(v) => onChange({ whiteBalanceK: v })}
          />
        )}

        <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
          <span>Program preset</span>
          <select
            value={value.programPreset}
            onChange={(e) => onChange({ programPreset: e.target.value })}
            className="border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-ca-ink"
          >
            <option value="">(custom)</option>
            {capabilities.programPresets.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-hmi-2">
          <button
            type="button"
            onClick={() => onApply(value)}
            className="flex-1 border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink hover:bg-ca-panel-2"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => onSavePreset(value.programPreset || "custom")}
            className="flex-1 border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink hover:bg-ca-panel-2"
          >
            Save preset
          </button>
        </div>
      </fieldset>
    </aside>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, onChange }: SliderProps) {
  return (
    <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span className="tabular-nums text-ca-ink-muted">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-ca-accent"
      />
    </label>
  );
}
