// ColorPanel, Plan 31 step 14.
// Spec: spec/24-app-ui-design-system/05-rule-controller.md L46 + L100-101.
// Contract: matches ParamsColor from src/lib/editor/schema.ts.
// K-5: swatch pair updates same frame as picker.

import { useId } from "react";
import type { ParamsColor } from "@/lib/editor/schema";

export interface ColorPanelProps {
  value: ParamsColor;
  sampledColor?: string; // #rrggbb, live-sampled from canvas
  onChange: (patch: Partial<ParamsColor>) => void;
  disabled?: boolean;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function ColorPanel({ value, sampledColor, onChange, disabled }: ColorPanelProps) {
  const pickerId = useId();
  const dEId = useId();
  const safeExpected = HEX.test(value.expectedColor) ? value.expectedColor : "#000000";
  const safeSampled = sampledColor && HEX.test(sampledColor) ? sampledColor : null;

  return (
    <section
      aria-label="Color rule"
      className="flex flex-col gap-hmi-3 border border-ca-border bg-ca-panel p-hmi-3"
    >
      <header className="text-hmi-heading text-ca-ink">Color</header>

      <fieldset disabled={disabled} className="flex flex-col gap-hmi-3">
        <div className="flex items-center gap-hmi-3">
          <label htmlFor={pickerId} className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
            <span>Expected color</span>
            <input
              id={pickerId}
              type="color"
              value={safeExpected}
              onChange={(e) => onChange({ expectedColor: e.target.value })}
              className="h-8 w-16 border border-ca-border bg-ca-panel-2"
            />
          </label>

          <div
            className="flex flex-1 items-center justify-end gap-hmi-2"
            aria-label="Swatch preview"
          >
            <Swatch label="Expected" color={safeExpected} />
            <Swatch label="Sampled" color={safeSampled} />
          </div>
        </div>

        <label htmlFor={dEId} className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
          <span className="flex items-center justify-between">
            <span>Delta E tolerance</span>
            <span className="tabular-nums text-ca-ink-muted">{value.deltaE.toFixed(1)}</span>
          </span>
          <input
            id={dEId}
            type="range"
            min={0}
            max={50}
            step={0.5}
            value={value.deltaE}
            onChange={(e) => onChange({ deltaE: Number(e.target.value) })}
            className="w-full accent-ca-accent"
          />
        </label>
      </fieldset>
    </section>
  );
}

function Swatch({ label, color }: { label: string; color: string | null }) {
  return (
    <div className="flex flex-col items-center gap-hmi-1 text-hmi-caption text-ca-ink-muted">
      <div
        role="img"
        aria-label={`${label} swatch`}
        title={color ?? "no sample"}
        style={color ? { backgroundColor: color } : undefined}
        className={`h-8 w-8 border border-ca-border ${color ? "" : "bg-ca-panel-2"}`}
      />
      <span>{label}</span>
    </div>
  );
}
