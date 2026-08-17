import { Badge } from "@/components/ui/badge";

interface Props {
  confidence?: number;
}

export function ScoreResultBadge({ confidence = 98.5 }: Props) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-ca-panel-2 border-t border-ca-border">
      <span className="text-[13px] font-medium text-ca-text">Evaluation Confidence:</span>
      <Badge variant="outline" className="text-[13px] tabular-nums font-mono text-green-500 border-green-500/30">
        {confidence.toFixed(1)}%
      </Badge>
    </div>
  );
}
