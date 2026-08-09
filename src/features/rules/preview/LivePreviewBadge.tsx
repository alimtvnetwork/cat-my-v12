// Plan 42 step 27. Live-preview verdict pill, driven by useLivePreview.
//
// Colors: uses semantic HMI tokens (`--hmi-*`) via Tailwind utility classes
// wired to the design system; never hardcoded hex per spec 02 guidelines.
// Renders four states: idle (hidden), running (pulse), done (verdict), error.

import { RunStatusType } from "@/types/run/RunStatus";
import { CheckCircle2, XCircle, Loader2, AlertTriangle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LivePreviewState } from "./useLivePreview";
import { REASON_CODE_LABEL } from "@/types/rules/ReasonCode";

export interface LivePreviewBadgeProps {
  state: LivePreviewState;
  className?: string;
}

export function LivePreviewBadge({ state, className }: LivePreviewBadgeProps) {
  if (RunStatusType.isIdle(state.status)) return null;

  if (RunStatusType.isRunning(state.status)) {
    return (
      <span
        role="status"
        aria-live="polite"
        data-preview-status="running"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Running
      </span>
    );
  }

  if (state.status === "error") {
    return (
      <span
        role="status"
        aria-live="polite"
        data-preview-status="error"
        title={state.error ?? "Runner error"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive",
          className,
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        Runner error
      </span>
    );
  }

  const result = state.result;

  if (!result) return null;

  const { verdict, reasonCode } = result;
  const label = REASON_CODE_LABEL[reasonCode] ?? reasonCode;
  const tone =
    verdict === "PASS"
      ? "border-ca-ok/40 bg-ca-ok/10 text-ca-ok"
      : verdict === "FAIL"
        ? "border-ca-ng/40 bg-ca-ng/10 text-ca-ng"
        : verdict === "SKIP"
          ? "border-border bg-muted text-muted-foreground"
          : "border-destructive/40 bg-destructive/10 text-destructive";
  const Icon =
    verdict === "PASS"
      ? CheckCircle2
      : verdict === "FAIL"
        ? XCircle
        : verdict === "SKIP"
          ? MinusCircle
          : AlertTriangle;

  return (
    <span
      role="status"
      aria-live="polite"
      data-preview-status="done"
      data-verdict={verdict}
      title={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        tone,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {verdict}
      <span className="text-[11px] font-normal opacity-70">({result.rules.length} rules)</span>
    </span>
  );
}
