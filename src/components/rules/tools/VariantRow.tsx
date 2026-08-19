import { Check } from "lucide-react";
import type { ToolVariant } from "./toolTooltipMap";

export interface VariantRowProps {
  variant: ToolVariant;
  selected: boolean;
  onPick: () => void;
}

export function VariantRow({ variant, selected, onPick }: VariantRowProps): React.JSX.Element | null {
  return (
    <li>
      <button
        type="button"
        role="menuitemradio"
        aria-checked={selected}
        data-testid={`tools-palette-variant-${variant.id}`}
        onClick={onPick}
        className={[
          "flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left transition",
          selected ? "bg-ca-panel-2 text-ca-select" : "text-ca-ink hover:bg-ca-panel-2",
        ].join(" ")}
      >
        <span aria-hidden className="mt-[3px] flex h-3 w-3 shrink-0 items-center justify-center">
          {selected ? <Check size={12} strokeWidth={2.5} /> : null}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-[13px] font-medium leading-tight">{variant.label}</span>
          <span className="text-[11px] leading-tight text-ca-ink-muted">{variant.description}</span>
        </span>
      </button>
    </li>
  );
}
