import React, { useState, useEffect } from "react";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

interface BadgeNumberFieldProps {
  value: number;
  onCommit: (next: number) => void;
  ariaLabel: string;
  min?: number;
  max?: number;
  suffix?: string;
  disabled?: boolean;
}

function getClampedValue(
  draft: string,
  lo: number,
  effMax: number,
  onClamp: () => void,
): number | null {
  const trimmed = draft.trim();
  const n = trimmed === "" ? NaN : Number(trimmed);
  if (!Number.isFinite(n)) {
    return null;
  }
  const rounded = Math.round(n);
  const clamped = Math.min(effMax, Math.max(lo, rounded));
  if (clamped !== rounded) {
    onClamp();
  }
  return clamped;
}

export function BadgeNumberField({
  value,
  onCommit,
  ariaLabel,
  min,
  max,
  suffix,
  disabled = false,
}: BadgeNumberFieldProps): React.JSX.Element | null {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(Math.round(value)));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(String(Math.round(value)));
    }
  }, [value, editing]);

  const lo = min ?? Number.NEGATIVE_INFINITY;
  const hi = max ?? Number.POSITIVE_INFINITY;
  const effMax = hi < lo ? lo : hi;

  const triggerFlash = () => {
    setInvalid(true);
    window.setTimeout(() => setInvalid(false), 600);
  };

  const commit = () => {
    const clamped = getClampedValue(draft, lo, effMax, triggerFlash);

    if (clamped === null) {
      triggerFlash();
      setDraft(String(Math.round(value)));
      return;
    }

    if (clamped !== Math.round(value)) {
      onCommit(clamped);
    }
    setDraft(String(clamped));
    setEditing(false);
  };

  if (editing && !disabled) {
    return (
      <input
        autoFocus
        type="number"
        inputMode="numeric"
        step={1}
        min={Number.isFinite(lo) ? lo : undefined}
        max={Number.isFinite(effMax) ? effMax : undefined}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        value={draft}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^\d-]/g, "").replace(/(?!^)-/g, "");
          setDraft(cleaned);
          if (invalid) setInvalid(false);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (KeyboardKeyType.isEnter(e.key)) {
            e.preventDefault();
            commit();
          } else if (KeyboardKeyType.isEscape(e.key)) {
            e.preventDefault();
            setDraft(String(Math.round(value)));
            setInvalid(false);
            setEditing(false);
          }
          e.stopPropagation();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={
          "w-14 rounded-sm border bg-popover px-1 py-0.5 text-center font-mono text-[13px] font-medium leading-none text-foreground shadow-sm outline-none tabular-nums focus:ring-2 " +
          (invalid ? "border-destructive ring-2 ring-destructive" : "")
        }
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={`Double-click to edit ${ariaLabel}`}
      onDoubleClick={() => !disabled && setEditing(true)}
      onPointerDown={(e) => e.stopPropagation()}
      className="pointer-events-auto font-mono text-[13px] font-medium leading-none tabular-nums hover:underline"
    >
      {Math.round(value)}
      {suffix ?? ""}
    </button>
  );
}
