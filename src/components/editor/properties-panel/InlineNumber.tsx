import { useRef } from "react";

export function InlineNumber({
  label,
  value,
  min,
  disabled,
  error,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  disabled?: boolean;
  error?: string | null;
  onChange: (v: number) => void;
}) {
  const errId = `num-${label}-error`;
  const dragRef = useRef<{ startX: number; startValue: number } | null>(null);
  const onLabelPointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (disabled) return;
    (e.currentTarget as HTMLSpanElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startValue: Math.round(value) };
  };
  const onLabelPointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    let next = dragRef.current.startValue + Math.round(dx);

    if (min !== undefined && next < min) next = min;
    onChange(next);
  };
  const onLabelPointerUp = (e: React.PointerEvent<HTMLSpanElement>) => {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLSpanElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <label className={`editor-properties-num ${error ? "is-invalid" : ""}`}>
      <span
        className="editor-properties-num-label"
        role="slider"
        tabIndex={-1}
        aria-label={`${label} drag-to-scrub`}
        onPointerDown={onLabelPointerDown}
        onPointerMove={onLabelPointerMove}
        onPointerUp={onLabelPointerUp}
        onPointerCancel={onLabelPointerUp}
        title={`Drag to scrub ${label}`}
      >
        {label}
      </span>
      <input
        type="number"
        step={1}
        value={Number.isFinite(value) ? Math.round(value) : 0}
        min={min}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value);

          if (Number.isFinite(n)) onChange(Math.round(n));
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        title={error ?? undefined}
        aria-label={label}
      />
      <span className="editor-properties-num-suffix" aria-hidden>
        px
      </span>
      {error ? (
        <span id={errId} role="alert" className="sr-only">
          {error}
        </span>
      ) : null}
    </label>
  );
}
