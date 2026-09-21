import type { WhiteBoxMark } from "./types";
import { Eye, EyeOff, RotateCcw, Trash2 } from "lucide-react";

export interface BoxReviewCardProps {
  box: WhiteBoxMark;
  isExcluded: boolean;
  onToggle: (boxNumber: number) => void;
  onRemove: (boxNumber: number) => void;
  onRestore: (boxNumber: number) => void;
}

export function BoxReviewCard({
  box,
  isExcluded,
  onToggle,
  onRemove,
  onRestore,
}: BoxReviewCardProps): React.JSX.Element {
  const padIndex = `#${box.number.toString().padStart(2, "0")}`;

  return (
    <div
      className={`flex items-center justify-between gap-2.5 rounded border p-2 text-xs transition-colors ${
        isExcluded
          ? "border-ca-border/40 bg-ca-panel/40 opacity-70"
          : "border-ca-border bg-ca-panel hover:border-ca-select/60"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={() => onToggle(box.number)}
          className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded shadow-sm ${
            isExcluded
              ? "bg-ca-bg text-ca-ink-muted border border-ca-border/50"
              : "bg-ca-select/20 text-ca-select border border-ca-select/40"
          }`}
          title={isExcluded ? "Click to include in pattern" : "Click to exclude"}
        >
          {padIndex}
        </button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 font-mono text-[11px] text-ca-ink">
            <span>X:{box.x} Y:{box.y}</span>
            <span className="text-ca-ink-muted">·</span>
            <span>{box.width}×{box.height}</span>
          </div>
          <span className="font-mono text-[10px] text-ca-ink-muted">
            Area: {box.area.toLocaleString()} px²
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={`px-1.5 py-0.2 rounded font-sans text-[10px] font-semibold uppercase tracking-wider ${
            isExcluded
              ? "bg-ca-bg text-rose-400 border border-rose-500/30"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
          }`}
        >
          {isExcluded ? "Excluded" : "Active"}
        </span>

        {isExcluded ? (
          <button
            type="button"
            onClick={() => onRestore(box.number)}
            className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
            title="De-remove / Restore into pattern geometry"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Restore</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onRemove(box.number)}
            className="inline-flex items-center gap-1 rounded border border-ca-border bg-ca-panel-2 px-2 py-1 text-[11px] font-semibold text-ca-ink-muted hover:text-rose-400 hover:border-rose-500/40"
            title="Remove from pattern geometry"
          >
            <EyeOff className="h-3 w-3" />
            <span>Remove</span>
          </button>
        )}
      </div>
    </div>
  );
}
