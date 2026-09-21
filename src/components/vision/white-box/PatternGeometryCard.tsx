import type { FormulatedPatternGeometry } from "./types";
import { CheckCircle2, SlidersHorizontal } from "lucide-react";

export interface PatternGeometryCardProps {
  formulatedPattern: FormulatedPatternGeometry | null;
  marginPx: number;
  onMarginChange: (val: number) => void;
}

const PRESET_MARGINS = [0, 4, 8, 16, 24] as const;

export function PatternGeometryCard({
  formulatedPattern,
  marginPx,
  onMarginChange,
}: PatternGeometryCardProps): React.JSX.Element {
  return (
    <div className="rounded border border-ca-border bg-ca-panel-2 p-3 space-y-2.5">
      <div className="flex items-center justify-between border-b border-ca-border pb-1.5">
        <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wide text-xs text-ca-ink">
          <SlidersHorizontal className="h-3.5 w-3.5 text-ca-select" />
          <span>Tolerance Space (Jitter)</span>
        </div>
        <span className="font-mono text-xs font-bold text-ca-select">±{marginPx} px</span>
      </div>

      <div className="space-y-1.5">
        <input
          type="range"
          min={0}
          max={64}
          step={1}
          value={marginPx}
          onChange={(e) => onMarginChange(Number(e.target.value))}
          className="w-full accent-ca-select"
        />

        <div className="flex items-center justify-between gap-1">
          {PRESET_MARGINS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onMarginChange(preset)}
              className={`flex-1 rounded border px-1.5 py-0.5 text-[10px] font-mono font-medium transition-colors ${
                marginPx === preset
                  ? "border-ca-select bg-ca-select/20 text-ca-select font-bold"
                  : "border-ca-border bg-ca-panel text-ca-ink-muted hover:text-ca-ink"
              }`}
            >
              {preset}px
            </button>
          ))}
        </div>
      </div>

      {formulatedPattern ? (
        <div className="mt-2 rounded border border-emerald-500/40 bg-emerald-500/10 p-2 text-xs">
          <div className="flex items-center justify-between text-emerald-400 font-semibold mb-1">
            <span className="flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="h-3 w-3" />
              <span>Formulated Master ROI</span>
            </span>
            <span className="text-[10px] font-mono">
              {formulatedPattern.activeBoxCount} of {formulatedPattern.totalBoxCount} active
            </span>
          </div>
          <div className="font-mono text-[11px] text-ca-ink space-y-0.5">
            <div>
              Bounds: X {formulatedPattern.x}, Y {formulatedPattern.y}
            </div>
            <div>
              Size: {formulatedPattern.width} × {formulatedPattern.height} px
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded border border-dashed border-ca-border/60 bg-ca-bg/50 p-2 text-center text-[11px] text-ca-ink-muted">
          Process image to formulate pattern
        </div>
      )}
    </div>
  );
}
