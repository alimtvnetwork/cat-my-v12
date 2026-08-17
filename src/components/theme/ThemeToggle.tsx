/**
 * ThemeToggle: compact icon button that cycles the app theme through
 * dark -> light -> system. Sits in the Titlebar right cluster next to
 * the density toggle; matches the same 8x8 visual footprint so header
 * geometry does not shift.
 *
 * Uses `aria-label` / `title` that reflect the NEXT state (standard
 * pattern for cycling toggles), and exposes `data-theme` for tests.
 */
import { Moon, Sun, Monitor } from "lucide-react";
import { useUiPrefsStore, type ThemeVariant } from "@/lib/stores/ui-prefs-store";

const NEXT_LABEL: Record<ThemeVariant, string> = {
  dark: "Switch to light theme",
  light: "Switch to system theme",
  system: "Switch to dark theme",
};

export function ThemeToggle(): React.JSX.Element | null {
  const theme = useUiPrefsStore((s) => s.theme);
  const cycle = useUiPrefsStore((s) => s.cycleTheme);
  const label = NEXT_LABEL[theme];
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      data-testid="theme-toggle"
      data-theme-current={theme}
      className="hmi-focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ca-border/70 bg-ca-panel/60 text-ca-chrome-ink/80 transition-colors hover:bg-ca-panel-2 hover:text-ca-chrome-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ca-focus-ring)]"
    >
      <Icon aria-hidden className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </button>
  );
}
