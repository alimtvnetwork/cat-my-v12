/**
 * Plan 100 Phase F step 54: compact "KBD" pill shown in the Titlebar
 * right cluster when the last input modality is keyboard. Renders
 * `sr-only` "Pointer input" while pointer is active so pointer-first
 * flows stay visually clean while the announcement remains available
 * to screen readers via `aria-live="polite"`.
 */
import { useInputModality } from "@/hooks/useInputModality";

export function KeyboardModeIndicator() {
  const modality = useInputModality();

  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="keyboard-mode-indicator"
      data-modality={modality}
      className={
        modality === "keyboard"
          ? "inline-flex select-none items-center rounded border border-ca-border bg-ca-panel-2 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-ca-ink-muted"
          : "sr-only"
      }
      title="Keyboard navigation active. Press Ctrl+/ for shortcuts."
    >
      {modality === "keyboard" ? "KBD" : "Pointer input"}
    </span>
  );
}
