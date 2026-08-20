import { Badge } from "@/components/ui/badge";
import type { ScoreResponse } from "@/lib/vision/score-schema";

interface Props {
  result?: ScoreResponse;
  /** Legacy: confidence-only mode */
  confidence?: number;
}

export function ScoreResultBadge({ result, confidence = 98.5 }: Props): React.JSX.Element {
  const isPassing = result ? result.is_pass === true : true;
  const displayConfidence = result ? result.confidence : confidence;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 px-4 py-2 bg-ca-panel-2 border-t border-ca-border"
    >
      <span className="text-[13px] font-medium text-ca-text">
        {result ? (isPassing ? "PASS" : "FAIL") : "Confidence"}:
      </span>
      <Badge
        variant="outline"
        className={`text-[13px] tabular-nums font-mono ${
          isPassing ? "text-green-500 border-green-500/30" : "text-red-500 border-red-500/30"
        }`}
      >
        {displayConfidence.toFixed(1)}%
      </Badge>
    </div>
  );
}
