// PatternEdgePanel, Plan 32 slice 2 (SG-31-01).
// Spec: spec/24-app-ui-design-system/05-rule-controller.md matrix row "PatternEdge".
// Contract: matches ParamsPatternEdge from src/lib/editor/schema.ts.
//
// Slice 1 (v3.202.0) shipped the schema, defaults and normalizers. This slice
// wires the dedicated UI so the resolver stops falling through to the legacy
// placeholder cluster.

import { useId } from "react";
import {
  PATTERN_EDGE_KERNELS,
  PATTERN_EDGE_POLARITIES,
  normalizePatternEdgeKernel,
  normalizePatternEdgePolarity,
  type ParamsPatternEdge,
} from "@/lib/editor/schema";

export interface PatternEdgePanelProps {
  value: ParamsPatternEdge;
  onChange: (patch: Partial<ParamsPatternEdge>) => void;
  disabled?: boolean;
}

export function PatternEdgePanel({ value, onChange, disabled }: PatternEdgePanelProps): React.JSX.Element | null {
  const kernelId = useId();
  const thresholdId = useId();
  const polarityId = useId();
  const minLengthId = useId();

  const threshold = Number.isFinite(value.threshold) ? value.threshold : 0.5;
  const minLength = Number.isFinite(value.minLength) ? value.minLength : 8;
  const kernel = normalizePatternEdgeKernel(value.edgeKernel);
  const polarity = normalizePatternEdgePolarity(value.polarity);

  return (
    <section
      aria-label="PatternEdge rule"
      data-testid="pattern-edge-panel"
      className="flex flex-col gap-hmi-3 border border-ca-border bg-ca-panel p-hmi-3"
    >
      <header className="text-hmi-heading text-ca-ink">Pattern edge</header>

      <fieldset disabled={disabled} className="grid grid-cols-2 gap-hmi-3">
        <label htmlFor={kernelId} className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
          <span>Kernel</span>
          <select
            id={kernelId}
            data-testid="pattern-edge-kernel"
            value={kernel}
            onChange={(e) => onChange({ edgeKernel: normalizePatternEdgeKernel(e.target.value) })}
            className="border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-ca-ink"
          >
            {PATTERN_EDGE_KERNELS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor={polarityId} className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
          <span>Polarity</span>
          <select
            id={polarityId}
            data-testid="pattern-edge-polarity"
            value={polarity}
            onChange={(e) => onChange({ polarity: normalizePatternEdgePolarity(e.target.value) })}
            className="border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-ca-ink"
          >
            {PATTERN_EDGE_POLARITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor={thresholdId} className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
          <span>Threshold (0-1)</span>
          <input
            id={thresholdId}
            data-testid="pattern-edge-threshold"
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={threshold}
            onChange={(e) => onChange({ threshold: Number(e.target.value) })}
            className="border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-ca-ink"
          />
        </label>

        <label htmlFor={minLengthId} className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
          <span>Min length (px)</span>
          <input
            id={minLengthId}
            data-testid="pattern-edge-min-length"
            type="number"
            min={1}
            step={1}
            value={minLength}
            onChange={(e) =>
              onChange({ minLength: Math.max(1, Math.floor(Number(e.target.value) || 0)) })
            }
            className="border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-ca-ink"
          />
        </label>
      </fieldset>

      {(threshold < 0 || threshold > 1) && (
        <p role="alert" className="text-hmi-caption text-ca-danger">
          Threshold must be between 0 and 1.
        </p>
      )}
    </section>
  );
}
