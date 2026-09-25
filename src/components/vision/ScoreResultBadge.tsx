import { Badge } from "@/components/ui/badge";
import type { ScoreResponse } from "@/lib/vision/score-schema";

interface Props {
  result?: ScoreResponse;
  /** Legacy: confidence-only mode */
  confidence?: number;
}

export function ScoreResultBadge({ result, confidence }: Props): React.JSX.Element {
  if (!result && confidence === undefined) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-between px-4 py-2 bg-ca-panel-2 border-t border-ca-border text-xs"
      >
        <span className="font-medium text-ca-ink-muted">
          Vision Status: <span className="text-ca-ink font-semibold">Ready</span> (Select a sample thumbnail below or click &quot;Evaluate Inspection&quot;)
        </span>
        <span className="font-mono text-ca-ink-muted">No inspection run yet</span>
      </div>
    );
  }

  const isPassing = result ? result.is_pass === true : (confidence ?? 0) >= 80;
  const displayConfidence = result ? result.confidence : (confidence ?? 0);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-between px-4 py-2 bg-ca-panel-2 border-t border-ca-border"
    >
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-bold">
          {isPassing ? (
            <span className="text-green-400 font-extrabold">PASS</span>
          ) : (
            <span className="text-red-500 font-extrabold">FAIL</span>
          )}:
        </span>
        <Badge
          variant="outline"
          className={`text-[13px] tabular-nums font-mono font-bold ${
            isPassing ? "text-green-400 border-green-500/40 bg-green-950/20" : "text-red-400 border-red-500/40 bg-red-950/20"
          }`}
        >
          {displayConfidence.toFixed(1)}% Match
        </Badge>
      </div>
      {result?.reason ? (
        <span className="text-xs text-ca-ink-muted truncate max-w-[420px]" title={result.reason}>
          {result.reason}
        </span>
      ) : result?.label ? (
        <span className="text-xs font-mono text-ca-ink-muted">
          Rule: {result.label}
        </span>
      ) : null}
    </div>
  );
}
