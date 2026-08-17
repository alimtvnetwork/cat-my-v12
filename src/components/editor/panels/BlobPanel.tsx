// BlobPanel, Plan 31 step 16.
// Spec: spec/24-app-ui-design-system/05-rule-controller.md L49
//   (minArea / maxArea / expectedCount).
// Contract: matches ParamsBlob from src/lib/editor/schema.ts.

import { useId } from "react";
import {
  BLOB_GROWTH_TOLERANCES,
  DEFAULT_BLOB_GROWTH_TOLERANCE,
  normalizeGrowthTolerance,
  type ParamsBlob,
} from "@/lib/editor/schema";

export interface BlobPanelProps {
  value: ParamsBlob;
  onChange: (patch: Partial<ParamsBlob>) => void;
  disabled?: boolean;
}

export function BlobPanel({ value, onChange, disabled }: BlobPanelProps): React.JSX.Element | null {
  const minId = useId();
  const maxId = useId();
  const countId = useId();
  const tolId = useId();

  const areaInvalid = value.minArea > value.maxArea;
  const tolerance = normalizeGrowthTolerance(
    value.growthTolerance ?? DEFAULT_BLOB_GROWTH_TOLERANCE,
  );
  const growthRatio = value.minArea > 0 ? value.maxArea / value.minArea - 1 : 0;
  const outOfTolerance = !areaInvalid && value.minArea > 0 && growthRatio > tolerance;

  return (
    <section
      aria-label="Blob rule"
      className={
        "flex flex-col gap-hmi-3 border bg-ca-panel p-hmi-3 " +
        (outOfTolerance ? "border-ca-warn shadow-[0_0_0_1px_var(--ca-warn)]" : "border-ca-border")
      }
      data-out-of-tolerance={outOfTolerance || undefined}
    >
      <header className="text-hmi-heading text-ca-ink">Blob</header>

      <fieldset disabled={disabled} className="grid grid-cols-2 gap-hmi-3">
        <label htmlFor={minId} className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
          <span>Min area (px)</span>
          <input
            id={minId}
            type="number"
            min={0}
            value={value.minArea}
            onChange={(e) => onChange({ minArea: Number(e.target.value) })}
            className="border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-ca-ink"
          />
        </label>

        <label htmlFor={maxId} className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
          <span>Max area (px)</span>
          <input
            id={maxId}
            type="number"
            min={0}
            value={value.maxArea}
            onChange={(e) => onChange({ maxArea: Number(e.target.value) })}
            className="border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-ca-ink"
          />
        </label>

        <label
          htmlFor={countId}
          className="col-span-2 flex flex-col gap-hmi-1 text-hmi-body text-ca-ink"
        >
          <span>Expected count</span>
          <input
            id={countId}
            type="number"
            min={0}
            step={1}
            value={value.expectedCount}
            onChange={(e) => onChange({ expectedCount: Number(e.target.value) })}
            className="border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-ca-ink"
          />
        </label>
      </fieldset>

      <fieldset disabled={disabled} className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
        <legend id={tolId} className="text-hmi-caption text-ca-ink-muted">
          Acceptable growth
        </legend>
        <div role="radiogroup" aria-labelledby={tolId} className="flex gap-hmi-2">
          {BLOB_GROWTH_TOLERANCES.map((t) => {
            const active = tolerance === t;

            return (
              <label
                key={t}
                className={
                  "cursor-pointer border px-hmi-2 py-hmi-1 text-hmi-body " +
                  (active
                    ? "border-ca-primary bg-ca-primary/10 text-ca-ink"
                    : "border-ca-border bg-ca-panel-2 text-ca-ink-muted")
                }
              >
                <input
                  type="radio"
                  name={tolId}
                  className="sr-only"
                  checked={active}
                  onChange={() => onChange({ growthTolerance: normalizeGrowthTolerance(t) })}
                />
                {`${(t * 100).toFixed(0)}%`}
              </label>
            );
          })}
        </div>
      </fieldset>

      {areaInvalid && (
        <p role="alert" className="text-hmi-caption text-ca-ng">
          Min area must be less than or equal to max area.
        </p>
      )}
      {outOfTolerance && (
        <p role="alert" className="text-hmi-caption text-ca-warn">
          Growth {(growthRatio * 100).toFixed(1)}% exceeds {(tolerance * 100).toFixed(0)}%
          tolerance.
        </p>
      )}
    </section>
  );
}
