// Plan 42 step 16: Row primitive for RulesList.
// Presentational only: emits selection + reorder callbacks, no store access.
import { forwardRef, type KeyboardEvent } from "react";
import {
  GripVertical,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  MinusCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { KIND_ICON, KIND_COLOR } from "@/lib/editor/kind-icons";
import type { EditorRule } from "@/lib/editor/types";
import { cn } from "@/lib/utils";
import type { VerdictType } from "@/lib/editor/runner/types";
import { VerdictType as VerdictEnum } from "@/lib/editor/runner/types";
import type { ReasonCode } from "@/types/rules/ReasonCode";
import { REASON_CODE_LABEL } from "@/types/rules/ReasonCode";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

export interface RuleRowProps {
  rule: EditorRule;
  index: number;
  total: number;
  selected: boolean;
  onSelect: (id: string, additive: boolean) => void;
  onToggleHidden: (id: string, next: boolean) => void;
  onToggleLocked: (id: string, next: boolean) => void;
  onKeyboardReorder: (id: string, direction: "up" | "down") => void;
  /** Plan 42 step 28: last-run verdict for this rule (Sequential UI polish). */
  verdict?: VerdictType;
  reasonCode?: ReasonCode;
}

export const RuleRow = forwardRef<HTMLLIElement, RuleRowProps>(function RuleRow(
  {
    rule,
    index,
    total,
    selected,
    onSelect,
    onToggleHidden,
    onToggleLocked,
    onKeyboardReorder,
    verdict,
    reasonCode,
  },
  ref,
) {
  const Icon = KIND_ICON[rule.kind];
  const color = KIND_COLOR[rule.kind];
  const isSkipped = verdict === VerdictEnum.Skip;
  const reasonLabel = reasonCode ? (REASON_CODE_LABEL[reasonCode] ?? reasonCode) : undefined;
  const verdictTitle = verdict && reasonLabel ? `${verdict}: ${reasonLabel}` : undefined;
  const VerdictIcon =
    verdict === VerdictEnum.Pass
      ? CheckCircle2
      : verdict === VerdictEnum.Fail
        ? XCircle
        : verdict === VerdictEnum.Skip
          ? MinusCircle
          : verdict === VerdictEnum.Error
            ? AlertTriangle
            : null;
  const verdictColor =
    verdict === VerdictEnum.Pass
      ? "text-ca-ok"
      : verdict === VerdictEnum.Fail
        ? "text-ca-ng"
        : verdict === VerdictEnum.Skip
          ? "text-muted-foreground"
          : verdict === VerdictEnum.Error
            ? "text-destructive"
            : "";

  function handleKeyDown(e: KeyboardEvent<HTMLLIElement>) {
    if (e.altKey && KeyboardKeyType.isArrowUp(e.key)) {
      e.preventDefault();
      onKeyboardReorder(rule.id, "up");

      return;
    }

    if (e.altKey && KeyboardKeyType.isArrowDown(e.key)) {
      e.preventDefault();
      onKeyboardReorder(rule.id, "down");

      return;
    }

    if (KeyboardKeyType.isEnterOrSpace(e.key)) {
      e.preventDefault();
      onSelect(rule.id, e.shiftKey || e.metaKey || e.ctrlKey);
    }
  }

  const row = (
    <li
      ref={ref}
      role="option"
      aria-selected={selected}
      aria-posinset={index + 1}
      aria-setsize={total}
      tabIndex={selected ? 0 : -1}
      data-rule-id={rule.id}
      data-verdict={verdict ?? undefined}
      data-reason-code={reasonCode ?? undefined}
      data-testid={`rule-row-${rule.id}`}
      title={isSkipped ? undefined : verdictTitle}
      onClick={(e) => onSelect(rule.id, e.shiftKey || e.metaKey || e.ctrlKey)}
      onKeyDown={handleKeyDown}
      className={cn(
        "group flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-primary/60 bg-primary/10" : "border-transparent hover:bg-muted/60",
        rule.isHidden && "opacity-50",
        isSkipped && "opacity-50 grayscale italic",
      )}
    >
      <GripVertical
        aria-hidden
        className="h-4 w-4 shrink-0 text-muted-foreground/60 opacity-0 group-hover:opacity-100"
      />
      <span
        aria-hidden
        className="grid h-6 w-6 place-items-center rounded"
        style={{ backgroundColor: `color-mix(in oklch, ${color} 20%, transparent)` }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </span>
      <span className="flex-1 truncate">{rule.name || rule.id}</span>
      {VerdictIcon && (
        <VerdictIcon
          aria-label={verdictTitle}
          className={cn("h-3.5 w-3.5 shrink-0", verdictColor)}
        />
      )}
      <button
        type="button"
        aria-label={rule.isHidden ? "Show rule" : "Hide rule"}
        aria-pressed={rule.isHidden ?? false}
        onClick={(e) => {
          e.stopPropagation();
          onToggleHidden(rule.id, !rule.isHidden);
        }}
        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {rule.isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        aria-label={rule.isLocked ? "Unlock rule" : "Lock rule"}
        aria-pressed={rule.isLocked ?? false}
        onClick={(e) => {
          e.stopPropagation();
          onToggleLocked(rule.id, !rule.isLocked);
        }}
        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {rule.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
      </button>
    </li>
  );

  if (isSkipped && reasonLabel) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>{row}</TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs text-xs">
            <span className="font-medium">Skipped</span>
            <span className="mx-1 text-muted-foreground">·</span>
            <span>{reasonLabel}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return row;
});
