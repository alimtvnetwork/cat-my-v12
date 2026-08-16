import { Paintbrush } from "lucide-react";
import { useUiPrefsStore, type UiFlavor } from "@/lib/stores/ui-prefs-store";

const NEXT_LABEL: Record<UiFlavor, string> = {
  standard: "Switch to Modern UI",
  modern: "Switch to Standard UI",
};

export function FlavorToggle() {
  const flavor = useUiPrefsStore((s) => s.uiFlavor);
  const cycle = useUiPrefsStore((s) => s.toggleUiFlavor);
  const label = NEXT_LABEL[flavor];

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      data-testid="flavor-toggle"
      data-flavor-current={flavor}
      className="hmi-focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ca-border/70 bg-ca-panel/60 text-ca-chrome-ink/80 transition-colors hover:bg-ca-panel-2 hover:text-ca-chrome-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ca-focus-ring)]"
    >
      <Paintbrush aria-hidden className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </button>
  );
}
