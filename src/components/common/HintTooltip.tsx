
export enum HintTooltipAlignType {
  Start = "start",
  Center = "center",
  End = "end",
}

export enum HintTooltipSideType {
  Top = "top",
  Bottom = "bottom",
  Left = "left",
  Right = "right",
}
// Shared hint tooltip. Wraps a single trigger element with a Radix
// tooltip that shows a short label, an optional secondary description,
// and optional keyboard shortcut chips. Kept intentionally small so it
// slots next to any icon-only control without cluttering the layout,
// and reuses the shared Tooltip primitive so animation, portalling,
// and z-index behave identically everywhere.

import type { ReactElement, ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  label: ReactNode;
  description?: ReactNode;
  // Rendered as kbd chips at the bottom of the tooltip. Pass display
  // strings like ["Ctrl", "N"] or ["Shift", "Drag"]. Skipped when empty.
  shortcut?: readonly string[];
  side?: HintTooltipSideType;
  align?: HintTooltipAlignType;
  delayMs?: number;
  children: ReactElement;
}

export function HintTooltip({
  label,
  description,
  shortcut,
  side = "top",
  align = "center",
  delayMs = 350,
  children,
}: Props) {
  return (
    <TooltipProvider delayDuration={delayMs} skipDelayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className="max-w-[220px] rounded-sm border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-hmi-caption text-ca-ink shadow-md"
        >
          <div className="font-semibold leading-tight">{label}</div>
          {description ? (
            <div className="mt-0.5 text-[11px] leading-snug text-ca-ink-muted">{description}</div>
          ) : null}
          {shortcut && shortcut.length > 0 ? (
            <div className="mt-hmi-1 flex flex-wrap items-center gap-1">
              {shortcut.map((key, i) => (
                <kbd
                  key={`${key}-${i}`}
                  className="rounded-sm border border-ca-border bg-ca-panel-2 px-1 py-0 font-mono text-[10px] leading-4 text-ca-ink-muted"
                >
                  {key}
                </kbd>
              ))}
            </div>
          ) : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}