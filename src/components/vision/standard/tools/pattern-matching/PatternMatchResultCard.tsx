import { Play, RefreshCw } from "lucide-react";
import type { PatternMatchResultCardProps } from "./types";

export function PatternMatchResultCard(props: PatternMatchResultCardProps): React.JSX.Element {
  const res = props.matchResult;
  const isPass = res?.isPass ?? false;

  return (
    <div className="rounded border border-ca-border bg-ca-panel p-3.5 space-y-3 shadow-sm">
      <div className="flex items-center justify-between border-b border-ca-border pb-2">
        <span className="text-xs font-bold uppercase tracking-wide text-ca-ink">
          Pattern Match Inspection
        </span>
        <span
          className={`px-2 py-0.5 rounded text-xs font-black tracking-wider uppercase shadow-sm ${
            isPass ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          {isPass ? "PASS" : "FAIL"}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-2xl font-extrabold font-mono text-ca-ink">
            {res ? `${res.score}%` : "--%"}
          </div>
          <div className="text-[11px] text-ca-ink-muted">
            Matched: {res?.matchedCount ?? 0} / {res?.totalCount ?? props.totalBoxes} elements
          </div>
        </div>

        <div className="text-right font-mono text-[11px] text-ca-ink-muted space-y-0.5">
          <div>Offset: ({res?.offsetX ?? 0}, {res?.offsetY ?? 0})px</div>
          <div>Speed: {res?.executionTimeMs ?? 0}ms</div>
        </div>
      </div>

      <button
        type="button"
        onClick={props.onMatch}
        disabled={props.isMatching}
        className="w-full flex items-center justify-center gap-2 rounded bg-ca-select px-3 py-2 text-xs font-bold text-white shadow hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
      >
        {props.isMatching ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4 fill-white" />
        )}
        <span>{props.isMatching ? "Matching..." : "Match Pattern"}</span>
      </button>
    </div>
  );
}
