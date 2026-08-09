// Plan 81 step 12 (shared): per-condition kind token, extracted so every
// rule list surface (setup, project picker, project rules section) renders
// the same Circle / Rect / OCR / String / Expr pill. Falls back to a muted
// "Rule" pill when a row has no conditions or an unknown kind, so legacy
// rows still render safely (no throw, no blank).
import type { ReactElement } from "react";
import type { Rule } from "@/lib/rules/model";

const KIND_LABEL: Record<string, string> = {
  C: "Circle",
  R: "Rect",
  K: "OCR",
  S: "String",
  E: "Expr",
};

export interface RuleKindBadgeProps {
  rule: Pick<Rule, "conditions">;
  size?: "sm" | "md";
}

export function RuleKindBadge({ rule, size = "md" }: RuleKindBadgeProps): ReactElement {
  const raw = (rule.conditions?.[0] as { kind?: unknown } | undefined)?.kind;
  const key = typeof raw === "string" ? raw : "";
  const label = KIND_LABEL[key] ?? "Rule";
  const known = label !== "Rule";
  const dims =
    size === "sm"
      ? "h-4 min-w-[52px] px-hmi-1 text-[11px]"
      : "h-5 min-w-[64px] px-hmi-2 text-[13px]";

  return (
    <span
      title={known ? `Kind: ${label}` : "Unknown or empty rule kind"}
      data-testid="rule-kind-badge"
      data-kind={key || "unknown"}
      className={`inline-flex shrink-0 items-center justify-center rounded-sm font-semibold uppercase tabular-nums tracking-wide ${dims} ${
        known
          ? "bg-ca-select text-ca-bg"
          : "border border-ca-border bg-ca-panel-2 text-ca-ink-muted"
      }`}
    >
      {label}
    </span>
  );
}
