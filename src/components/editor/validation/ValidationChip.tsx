/**
 * Inline validation chip for the Layers list, Plan 64 step 70.
 *
 * Subscribes directly to `useValidationStore` for a single rule id so
 * only affected rows re-render when results update. Clicking the chip
 * opens a popover with per-rule score, stub status, message, and any
 * debug metadata the validator attached.
 */
import {
  useValidationResult,
  useValidationStore,
  ValidationStatusType,
} from "@/lib/editor/validation-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Fragment } from "react";

const TONE: Record<ValidationStatusType, { bg: string; text: string; label: string }> = {
  [ValidationStatusType.Pass]: { bg: "bg-ca-ok/15", text: "text-ca-ok", label: "PASS" },
  [ValidationStatusType.Fail]: { bg: "bg-ca-ng/15", text: "text-ca-ng", label: "FAIL" },
  [ValidationStatusType.Warn]: { bg: "bg-ca-warn/15", text: "text-ca-warn", label: "WARN" },
  [ValidationStatusType.Pending]: { bg: "bg-ca-panel-2", text: "text-ca-ink-muted", label: "..." },
};

export function ValidationChip({ ruleId }: { ruleId: string }) {
  const result = useValidationResult(ruleId);
  const setFocusedRule = useValidationStore((s) => s.setFocusedRule);

  if (!result) return null;
  const tone = TONE[result.status];
  const scoreLabel = typeof result.score === "number" ? ` ${(result.score * 100).toFixed(0)}%` : "";
  const debugEntries = result.debug
    ? Object.entries(result.debug).map(([k, v]) => [k, formatDebugValue(v)] as const)
    : [];

  return (
    <Popover
      onOpenChange={(next) => {
        // Only highlight rules that failed or warned; a passing chip
        // opening should not add visual noise on the canvas.
        if (
          next &&
          (result.status === ValidationStatusType.Fail ||
            result.status === ValidationStatusType.Warn)
        ) {
          setFocusedRule(ruleId);
        } else if (!next) {
          // Release the highlight when the popover closes, unless the
          // user opened a different chip in the meantime (that chip
          // will have overwritten focusedRuleId already).
          const current = useValidationStore.getState().focusedRuleId;

          if (current === ruleId) setFocusedRule(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider motion-safe:transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ca-focus ${tone.bg} ${tone.text}`}
          aria-label={`Rule ${ruleId} validation: ${tone.label}${scoreLabel}${result.stub ? ", stub result" : ""}. Press Enter for details.`}
          aria-haspopup="dialog"
          data-stub={result.stub || undefined}
          onClick={(e) => e.stopPropagation()}
        >
          {tone.label}
          {scoreLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 space-y-2 border-ca-border bg-ca-panel p-3 text-hmi-caption text-ca-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`font-mono text-[11px] font-bold tracking-wider ${tone.text}`}>
            {tone.label}
            {scoreLabel}
          </span>
          {result.stub ? (
            <span className="rounded-sm bg-ca-panel-2 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ca-ink-muted">
              stub
            </span>
          ) : (
            <span className="rounded-sm bg-ca-ok/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ca-ok">
              live
            </span>
          )}
        </div>
        <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-1">
          <dt className="text-ca-ink-muted">Rule</dt>
          <dd className="truncate font-mono text-[11px]" title={ruleId}>
            {ruleId}
          </dd>
          <dt className="text-ca-ink-muted">Score</dt>
          <dd className="font-mono text-[11px]">
            {typeof result.score === "number" ? result.score.toFixed(4) : "n/a"}
          </dd>
          <dt className="text-ca-ink-muted">Status</dt>
          <dd className="font-mono text-[11px] uppercase">{result.status}</dd>
        </dl>
        {result.message ? (
          <p className="border-t border-ca-border pt-2 text-ca-ink-muted">{result.message}</p>
        ) : null}
        {debugEntries.length > 0 ? (
          <div className="border-t border-ca-border pt-2">
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-ca-ink-muted">
              Debug
            </div>
            <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-1">
              {debugEntries.map(([k, v]) => (
                <Fragment key={k}>
                  <dt className="text-ca-ink-muted">{k}</dt>
                  <dd className="truncate font-mono text-[11px]" title={v}>
                    {v}
                  </dd>
                </Fragment>
              ))}
            </dl>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function formatDebugValue(v: unknown): string {
  if (v === null || v === undefined) return String(v);

  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return "[unserializable]";
  }
}