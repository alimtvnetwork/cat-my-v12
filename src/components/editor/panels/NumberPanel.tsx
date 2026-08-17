// NumberPanel, Plan 31 step 13.
// Spec: spec/24-app-ui-design-system/05-rule-controller.md L44 (min/max/unit).
// Contract: matches ParamsNumber from src/lib/editor/schema.ts.

import { useId } from "react";
import type { ParamsNumber } from "@/lib/editor/schema";

export interface NumberPanelProps {
  value: ParamsNumber;
  onChange: (patch: Partial<ParamsNumber>) => void;
  disabled?: boolean;
}

export function NumberPanel({ value, onChange, disabled }: NumberPanelProps): React.JSX.Element | null {
  const minId = useId();
  const maxId = useId();
  const unitId = useId();

  return (
    <section
      aria-label="Number rule"
      className="flex flex-col gap-hmi-3 border border-ca-border bg-ca-panel p-hmi-3"
    >
      <header className="text-hmi-heading text-ca-ink">Number</header>

      <fieldset disabled={disabled} className="grid grid-cols-2 gap-hmi-3">
        <label htmlFor={minId} className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
          <span>Min</span>
          <input
            id={minId}
            type="number"
            value={Number.isFinite(value.min) ? value.min : 0}
            onChange={(e) => onChange({ min: Number(e.target.value) })}
            className="border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-ca-ink"
          />
        </label>

        <label htmlFor={maxId} className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
          <span>Max</span>
          <input
            id={maxId}
            type="number"
            value={Number.isFinite(value.max) ? value.max : 0}
            onChange={(e) => onChange({ max: Number(e.target.value) })}
            className="border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-ca-ink"
          />
        </label>

        <label
          htmlFor={unitId}
          className="col-span-2 flex flex-col gap-hmi-1 text-hmi-body text-ca-ink"
        >
          <span>Unit</span>
          <input
            id={unitId}
            type="text"
            maxLength={8}
            value={value.unit}
            onChange={(e) => onChange({ unit: e.target.value })}
            placeholder="mm"
            className="border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-ca-ink"
          />
        </label>
      </fieldset>

      {value.min > value.max && (
        <p role="alert" className="text-hmi-caption text-ca-danger">
          Min must be less than or equal to max.
        </p>
      )}
    </section>
  );
}
