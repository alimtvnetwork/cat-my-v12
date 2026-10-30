import type { GrayscaleMode } from "@/lib/vision/white-box-marking";

export interface GreyscaleSliderCardProps {
  greyscaleLevel: number;
  onGreyscaleChange: (val: number) => void;
  /** Grayscale preview mode (spec 54). Defaults to "threshold" (legacy). */
  greyscaleMode?: GrayscaleMode;
  onGreyscaleModeChange?: (mode: GrayscaleMode) => void;
}

const GREYSCALE_MODES: readonly { mode: GrayscaleMode; label: string }[] = [
  { mode: "threshold", label: "Threshold" },
  { mode: "stretch", label: "Stretch" },
  { mode: "one-bit", label: "1-Bit" },
];

export function GreyscaleSliderCard(props: GreyscaleSliderCardProps): React.JSX.Element {
  const activeMode = props.greyscaleMode ?? "threshold";

  return (
    <div className="space-y-2 rounded border border-[#303943] bg-[#182028] p-3 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#303943] pb-2 text-xs font-semibold uppercase tracking-[0.12em]">
        <span>Greyscale Level</span>
        <span className="rounded border border-ca-select/30 bg-ca-select/10 px-2 py-0.5 font-mono text-ca-select">
          {props.greyscaleLevel}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={255}
        value={props.greyscaleLevel}
        onChange={(e) => props.onGreyscaleChange(Number(e.target.value))}
        className="w-full accent-ca-select"
      />
      {/* Grayscale mode (spec 54): Threshold keeps the legacy whiten-only
          preview; Stretch darkens darks and whitens whites across the full
          range; 1-Bit reduces every pixel to pure black or white. The
          threshold slider still drives backend detection as whiteThreshold
          in every mode. */}
      <div className="space-y-1 pt-1">
        <div className="flex justify-between text-[11px] text-ca-ink-muted">
          <span>Grayscale Mode</span>
          <span className="font-mono font-bold text-ca-ink">{activeMode}</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {GREYSCALE_MODES.map(({ mode, label }) => {
            const isActive = mode === activeMode;

            return (
              <button
                key={mode}
                type="button"
                data-ui-id={`ui-greyscale-mode-${mode}`}
                onClick={() => props.onGreyscaleModeChange?.(mode)}
                className={`rounded border px-1 py-1 text-[11px] font-semibold transition-colors ${
                  isActive
                    ? "border-ca-select bg-ca-select/15 text-ca-select"
                    : "border-[#303943] bg-[#182028] text-ca-ink-muted hover:text-ca-ink"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="text-[10px] text-ca-ink-muted/80 pt-0.5">
          Stretch and 1-Bit change the preview bits; detection still uses the threshold above.
        </div>
      </div>
    </div>
  );
}
