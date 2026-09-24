import { Sliders, ExternalLink } from "lucide-react";
import type { PatternMatchSettingsCardProps } from "./types";

export function PatternMatchSettingsCard(props: PatternMatchSettingsCardProps): React.JSX.Element {
  return (
    <div className="rounded border border-ca-border bg-ca-panel p-3.5 space-y-3.5 shadow-sm text-xs font-sans">
      <div className="flex items-center gap-1.5 border-b border-ca-border pb-1.5 font-bold uppercase tracking-wide text-ca-ink">
        <Sliders className="h-3.5 w-3.5 text-ca-select" />
        <span>Match Criteria & Limits</span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-ca-ink-muted">
          <span>Min Match Score (PASS Limit)</span>
          <span className="font-mono font-bold text-ca-ink">{props.minMatchPercent}%</span>
        </div>
        <input
          type="range"
          min={50}
          max={100}
          value={props.minMatchPercent}
          onChange={(e) => props.onMinPercentChange(Number(e.target.value))}
          className="w-full accent-ca-select"
        />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-ca-ink-muted">
          <span>Margin Tolerance (Error Resolving)</span>
          <span className="font-mono font-bold text-ca-ink">±{props.tolerancePx}px</span>
        </div>
        <input
          type="range"
          min={1}
          max={24}
          value={props.tolerancePx}
          onChange={(e) => props.onToleranceChange(Number(e.target.value))}
          className="w-full accent-ca-select"
        />
      </div>

      <div className="rounded bg-ca-panel-2 p-2.5 text-[11px] text-ca-ink-muted space-y-1.5 border border-ca-border">
        <div className="flex justify-between items-center">
          <span>Registered Template:</span>
          <span className="font-semibold text-ca-ink">{props.activeBoxCount} reference boxes</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Greyscale Threshold:</span>
          <span className="font-mono font-bold text-ca-select">{props.greyscaleLevel} / 255</span>
        </div>
        <div className="text-[10px] text-ca-ink-muted/80 pt-0.5">
          (Threshold value loaded from rule)
        </div>
      </div>

      <button
        type="button"
        onClick={props.onReconfigure}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded border border-ca-border bg-ca-panel-2 px-3 py-1.5 text-xs font-semibold text-ca-ink hover:bg-ca-bg"
      >
        <ExternalLink className="h-3.5 w-3.5 text-ca-ink-muted" />
        <span>Reconfigure Template Boxes</span>
      </button>
    </div>
  );
}
