import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

/**
 * ToolTile: 36-72px square tile for ToolRibbon.
 * SS-03: selected uses bg-ca-select; focus uses hmi-focus-ring; no one-off styling.
 * `compact` hides the visible label and keeps it available as aria-label +
 * native title so hover tooltips still work in the tight left rail.
 */
export interface ToolTileProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  selected?: boolean;
  size?: 36 | 40 | 44 | 48 | 56 | 64 | 72;
  compact?: boolean;
}

const sizeClass: Record<36 | 40 | 44 | 48 | 56 | 64 | 72, string> = {
  36: "editor-tool-tile-size-36",
  40: "editor-tool-tile-size-40",
  44: "editor-tool-tile-size-44",
  48: "editor-tool-tile-size-48",
  56: "editor-tool-tile-size-56",
  64: "editor-tool-tile-size-64",
  72: "editor-tool-tile-size-72",
};

export const ToolTile = forwardRef<HTMLButtonElement, ToolTileProps>(function ToolTile(
  { icon, label, selected = false, size = 56, compact = false, className, disabled, role, ...rest },
  ref,
) {
  const base = "editor-tool-tile hmi-focus-ring";
  const state = selected ? "editor-tool-tile-selected" : "";
  const disabledState = disabled ? "opacity-50 cursor-not-allowed" : "";
  const compactState = compact ? "editor-tool-tile-compact" : "";
  const composed = [base, sizeClass[size], state, disabledState, compactState, className]
    .filter(Boolean)
    .join(" ");

  // When used as a radio (e.g. within a radiogroup), aria-checked is the
  // correct state attribute; aria-pressed is only valid on toggle buttons.
  const isRadio = role === "radio";
  const selectionAttrs = isRadio ? { "aria-checked": selected } : { "aria-pressed": selected };

  return (
    <button
      ref={ref}
      type="button"
      role={role}
      aria-label={label}
      title={label}
      {...selectionAttrs}
      disabled={disabled}
      className={composed}
      {...rest}
    >
      <span aria-hidden="true" className="grid place-items-center leading-none">
        {icon}
      </span>
      {compact ? null : (
        <span className="max-w-full truncate px-1 text-hmi-caption font-bold">{label}</span>
      )}
    </button>
  );
});
