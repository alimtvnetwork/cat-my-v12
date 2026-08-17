import React from "react";

export interface LightingSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

export function LightingSlider({ label, value, min, max, step, onChange }: LightingSliderProps): React.JSX.Element | null {
  return (
    <label className="flex flex-col gap-1 text-sm text-ca-ink">
      <span className="flex items-center justify-between text-xs">
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
        className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
        style={{ accentColor: "#3b82f6" }}
      />
    </label>
  );
}
