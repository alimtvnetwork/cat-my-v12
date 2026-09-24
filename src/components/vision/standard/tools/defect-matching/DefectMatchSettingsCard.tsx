import React from "react";
import { Edit3, Sliders } from "lucide-react";

export interface DefectMatchSettingsCardProps {
  minMatchPercent: number;
  tolerancePx: number;
  greyscaleLevel: number;
  activeFeatureCount: number;
  onMinPercentChange: (val: number) => void;
  onToleranceChange: (val: number) => void;
  onReconfigure: () => void;
}

export function DefectMatchSettingsCard(props: DefectMatchSettingsCardProps): React.JSX.Element {
  return (
    <div className="rounded border border-ca-border bg-ca-panel p-3 font-sans select-none text-xs space-y-3">
      <div className="flex items-center justify-between border-b border-ca-border pb-1.5 font-semibold text-ca-ink">
        <div className="flex items-center gap-1.5">
          <Sliders className="h-3.5 w-3.5 text-ca-select" />
          <span>Defect Judgment Criteria</span>
        </div>
        <span className="font-mono text-[11px] text-ca-ink-muted">Inverted Rule</span>
      </div>

      {/* Min Match % Limit Slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-ca-ink font-semibold">Defect Match Limit</span>
          <span className="font-mono font-bold text-rose-400">{props.minMatchPercent}%</span>
        </div>
        <input
          type="range"
          min={10}
          max={100}
          value={props.minMatchPercent}
          onChange={(e) => props.onMinPercentChange(Number(e.target.value))}
          className="w-full accent-rose-500"
        />
        <p className="text-[10px] text-ca-ink-muted leading-tight">
          Workpieces matching \u2265 {props.minMatchPercent}% of registered flaw pattern are REJECTED.
        </p>
      </div>

      {/* Tolerance px Slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-ca-ink font-semibold">Positional Tolerance</span>
          <span className="font-mono font-bold text-ca-ink">\u00B1{props.tolerancePx} px</span>
        </div>
        <input
          type="range"
          min={1}
          max={30}
          value={props.tolerancePx}
          onChange={(e) => props.onToleranceChange(Number(e.target.value))}
          className="w-full accent-ca-select"
        />
      </div>

      {/* Readonly Template Specs */}
      <div className="rounded border border-ca-border bg-ca-panel-2 p-2 space-y-1 font-mono text-[10px] text-ca-ink-muted">
        <div className="flex justify-between">
          <span>Active Flaw Elements:</span>
          <span className="text-ca-ink font-bold">{props.activeFeatureCount} features</span>
        </div>
        <div className="flex justify-between">
          <span>Greyscale Level:</span>
          <span className="text-ca-ink">{props.greyscaleLevel}</span>
        </div>
      </div>

      {/* Reconfigure Button */}
      <button
        type="button"
        onClick={props.onReconfigure}
        className="w-full flex items-center justify-center gap-1.5 rounded border border-ca-border bg-ca-panel-2 py-1.5 text-xs font-semibold text-ca-ink hover:bg-ca-bg transition-colors"
      >
        <Edit3 className="h-3.5 w-3.5 text-ca-ink-muted" />
        <span>Reconfigure Defect Template</span>
      </button>
    </div>
  );
}
