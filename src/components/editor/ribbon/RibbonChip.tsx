import type { CSSProperties } from "react";
import type { EditorRuleKind } from "@/lib/editor/types";
import { KIND_ICON, KIND_COLOR } from "@/lib/editor/kind-icons";
import { ToolTile } from "@/components/hmi";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function RibbonChip({
  kind,
  label,
  description,
  active,
  disabled,
  onCommit,
  size = 56,
  compact = false,
  hotkey,
}: {
  kind: EditorRuleKind;
  label: string;
  description?: string;
  active: boolean;
  disabled: boolean;
  onCommit: () => void;
  size?: 36 | 40 | 44 | 48 | 56 | 64 | 72;
  compact?: boolean;
  hotkey?: string;
}): React.JSX.Element | null {
  const Icon = KIND_ICON[kind];
  const style = { "--kind-color": KIND_COLOR[kind] } as CSSProperties;
  const iconPx = compact ? 18 : 26;
  const tile = (
    <ToolTile
      icon={<Icon size={iconPx} strokeWidth={2.25} style={{ color: KIND_COLOR[kind] }} />}
      label={label}
      selected={active}
      disabled={disabled}
      size={size}
      compact={compact}
      role="radio"
      aria-checked={active}
      aria-disabled={disabled}
      onClick={onCommit}
      style={style}
      data-hotkey={hotkey}
    />
  );

  if (!description) return tile;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{tile}</TooltipTrigger>
      <TooltipContent side="right" className="max-w-[240px] text-left leading-snug">
        <div className="flex items-center justify-between gap-2 text-[13px] font-semibold">
          <span>{label}</span>
          {hotkey ? (
            <kbd className="rounded border border-ca-border bg-ca-panel-2 px-1 py-[1px] text-[10px] font-mono text-ca-ink-muted">
              {hotkey}
            </kbd>
          ) : null}
        </div>
        <div className="text-[12px] opacity-90">{description}</div>
      </TooltipContent>
    </Tooltip>
  );
}
