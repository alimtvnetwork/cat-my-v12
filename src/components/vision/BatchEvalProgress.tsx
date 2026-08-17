import React from "react";

interface BatchEvalProgressProps {
  total: number;
  completed: number;
  isRunning: boolean;
}

/**
 * BatchEvalProgress — progress bar shown during 'Test All Rules' batch evaluation.
 * Min 40px height for touch target compliance.
 */
export function BatchEvalProgress({
  total,
  completed,
  isRunning,
}: BatchEvalProgressProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (!isRunning && completed === 0) return null;

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Evaluating rules: ${completed} of ${total}`}
      className="flex flex-col gap-1.5 min-h-[40px] justify-center"
    >
      <div className="flex justify-between text-[13px] tabular-nums text-ca-ink-muted">
        <span>{isRunning ? "Evaluating…" : "Complete"}</span>
        <span>
          {completed}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-ca-border overflow-hidden">
        <div
          className="h-full rounded-full bg-ca-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
