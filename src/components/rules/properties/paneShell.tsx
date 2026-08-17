// Plan 80 step 16. Shared shell + row + slider primitives extracted from
// PropertiesPalette so each pane can live in its own file without
// duplicating markup or focus styles.
import { useId } from "react";

export function PaneShell({ children }: { children: React.ReactNode }): React.JSX.Element | null {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-hmi-2 text-[12px] text-ca-ink">{children}</div>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element | null {
  const id = useId();

  return (
    <label htmlFor={id} className="flex items-center justify-between gap-hmi-2">
      <span className="min-w-0 truncate text-[11px] uppercase tracking-wide text-ca-ink-muted">
        {label}
      </span>
      <span id={id} className="flex min-w-0 shrink-0 items-center gap-1">
        {children}
      </span>
    </label>
  );
}

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  label: string;
}): React.JSX.Element | null {
  return (
    <input
      type="range"
      aria-label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="ca-focus-fluid h-1 w-24 cursor-pointer accent-ca-primary"
    />
  );
}
