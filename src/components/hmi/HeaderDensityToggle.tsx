// HeaderDensityToggle: user-facing toggle that flips the app titlebar
// between "comfortable" and "compact" heights. Small, icon-only control
// sitting in the Titlebar's right cluster so it lives inside the same
// grid column as TopMenuBar and cannot collide with center content.
//
// The visual density switch is expressed on `<header data-density>`;
// CSS overrides scoped to `[data-density="compact"]` shrink `--header-h`,
// `--header-crumb-h`, and the menubar height so the right menu stays
// aligned with the reduced row.
import { Rows2, Rows4 } from "lucide-react";
import { useUiPrefsStore } from "@/lib/stores/ui-prefs-store";

export function HeaderDensityToggle() {
  const density = useUiPrefsStore((s) => s.headerDensity);
  const toggle = useUiPrefsStore((s) => s.toggleHeaderDensity);
  const compact = density === "compact";
  const label = compact ? "Switch to comfortable header" : "Switch to compact header";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={compact}
      data-testid="header-density-toggle"
      className="hmi-focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ca-border/70 bg-ca-panel/60 text-ca-chrome-ink/80 transition-colors hover:bg-ca-panel-2 hover:text-ca-chrome-ink aria-pressed:bg-ca-primary/15 aria-pressed:text-ca-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ca-focus-ring)]"
    >
      {compact ? (
        <Rows2 aria-hidden className="h-4 w-4" />
      ) : (
        <Rows4 aria-hidden className="h-4 w-4" />
      )}
      <span className="sr-only">{label}</span>
    </button>
  );
}
