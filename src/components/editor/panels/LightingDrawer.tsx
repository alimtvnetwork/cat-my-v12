// LightingDrawer, Plan 31 step 11.
// Spec: spec/24-app-ui-design-system/02-layout.md L74-83 (dock + geometry)
//       spec/24-app-ui-design-system/08-testing.md LC-01..LC-12 (acceptance).
//
// Token-only styling: ca-* surface/ink tokens, hmi-* spacing tokens. No hex,
// no bg-white/text-black. All coded log lines are the caller's responsibility;
// this panel is a pure presentational + prop-driven slider set.

import { useId } from "react";
import { LightingSlider } from "./LightingSlider";
import { HardwareLighting } from "./HardwareLighting";
import {
  type LightingState,
  type LightingCapabilities,
  type LightingDrawerProps,
  RANGES,
} from "./LightingDrawer.types";

export function LightingDrawer(props: LightingDrawerProps): React.JSX.Element | null {
  const { value, capabilities, onChange, onApply, onSavePreset, disabled } = props;
  const rootId = useId();

  return (
    <div
      id={rootId}
      aria-label="Lighting controls"
      className="flex flex-col gap-2 border-b border-ca-border bg-ca-panel p-2"
    >
      <header className="flex items-center justify-between pb-1 border-b border-ca-border">
        <h3 className="font-semibold text-sm text-ca-ink">Lighting</h3>
      </header>

      <fieldset disabled={disabled} className="flex flex-col gap-2 mt-1">
        {capabilities.exposure && (
          <LightingSlider
            label="Exposure (ms)"
            value={value.exposureMs}
            {...RANGES.exposureMs}
            onChange={(v) => onChange({ exposureMs: v })}
          />
        )}
        {capabilities.gain && (
          <LightingSlider
            label="Gain (dB)"
            value={value.gainDb}
            {...RANGES.gainDb}
            onChange={(v) => onChange({ gainDb: v })}
          />
        )}
        {capabilities.whiteBalance && (
          <LightingSlider
            label="White balance (K)"
            value={value.whiteBalanceK}
            {...RANGES.whiteBalanceK}
            onChange={(v) => onChange({ whiteBalanceK: v })}
          />
        )}

        <HardwareLighting value={value} capabilities={capabilities} onChange={onChange} />

        {capabilities.hasLightCorrection && (
          <LightingSlider
            label="Light correction"
            value={value.lightCorrection}
            {...RANGES.lightCorrection}
            onChange={(v) => onChange({ lightCorrection: v })}
          />
        )}

        <label className="flex flex-col gap-1 text-sm text-ca-ink mt-1">
          <span>Program preset</span>
          <select
            value={value.programPreset}
            onChange={(e) => onChange({ programPreset: e.target.value })}
            className="border border-ca-border bg-ca-bg px-2 py-1 text-ca-ink rounded"
          >
            <option value="">(custom)</option>
            {capabilities.programPresets.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => onApply(value)}
            className="flex-1 border border-ca-border bg-gray-200 px-2 py-1 text-sm text-ca-ink hover:bg-gray-300 rounded shadow-sm"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => onSavePreset(value.programPreset || "custom")}
            className="flex-1 border border-ca-border bg-gray-200 px-2 py-1 text-sm text-ca-ink hover:bg-gray-300 rounded shadow-sm"
          >
            Save preset
          </button>
        </div>
      </fieldset>
    </div>
  );
}
