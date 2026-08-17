import React from "react";

interface ConfidenceThresholdSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * ConfidenceThresholdSlider — 0–100 range slider to set minimum passing score.
 * Uses 13px tabular-nums typography and a 40px minimum touch target.
 */
export function ConfidenceThresholdSlider({
  value,
  onChange,
  disabled = false,
}: ConfidenceThresholdSliderProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor="confidence-threshold"
          className="text-[13px] font-medium text-ca-text"
        >
          Min. Confidence Threshold
        </label>
        <span
          className="text-[13px] tabular-nums font-mono text-ca-ink-muted"
          aria-live="polite"
        >
          {value}%
        </span>
      </div>
      <input
        id="confidence-threshold"
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled === true}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full min-h-[40px] cursor-pointer accent-ca-accent"
        aria-label={`Minimum confidence threshold: ${value}%`}
        data-testid="confidence-threshold-slider"
      />
      <div className="flex justify-between text-[11px] text-ca-ink-muted">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
