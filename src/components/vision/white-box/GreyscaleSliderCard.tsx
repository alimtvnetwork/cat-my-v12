import React, { useState } from "react";
import type { GrayscaleBitDepth, GrayscaleMode } from "@/lib/vision/white-box-marking";

export interface GreyscaleSliderCardProps {
  greyscaleLevel: number;
  onGreyscaleChange: (val: number) => void;
  bitDepth?: GrayscaleBitDepth;
  onBitDepthChange?: (depth: GrayscaleBitDepth) => void;
  contrastLevel?: number;
  onContrastChange?: (val: number) => void;
  hasContrastSlider?: boolean;
  /** Grayscale preview mode (spec 54). Defaults to "threshold" (legacy). */
  greyscaleMode?: GrayscaleMode;
  onGreyscaleModeChange?: (mode: GrayscaleMode) => void;
}

interface BitDepthOption {
  id: GrayscaleBitDepth;
  label: string;
  description: string;
}

const BIT_DEPTH_OPTIONS: readonly BitDepthOption[] = [
  { id: "1-bit", label: "1-bit", description: "Binary B/W" },
  { id: "2-bit", label: "2-bit", description: "4-Level" },
  { id: "8-bit", label: "8-bit", description: "Continuous" },
];

export function GreyscaleSliderCard(props: GreyscaleSliderCardProps): React.JSX.Element {
  const [internalBitDepth, setInternalBitDepth] = useState<GrayscaleBitDepth>("1-bit");
  const [internalContrast, setInternalContrast] = useState<number>(0);

  const currentBitDepth = props.bitDepth ?? internalBitDepth;
  const currentContrast = props.contrastLevel ?? internalContrast;
  const isContrastEnabled = props.hasContrastSlider ?? true;

  const handleBitDepthSelect = (depth: GrayscaleBitDepth): void => {
    setInternalBitDepth(depth);
    props.onBitDepthChange?.(depth);
    if (depth === "1-bit") {
      props.onGreyscaleModeChange?.("one-bit");
    } else if (depth === "8-bit") {
      props.onGreyscaleModeChange?.("stretch");
    } else {
      props.onGreyscaleModeChange?.("threshold");
    }
  };

  const handleContrastSelect = (val: number): void => {
    setInternalContrast(val);
    props.onContrastChange?.(val);
  };

  return (
    <div className="space-y-3 rounded border border-[#303943] bg-[#182028] p-3 shadow-sm">
      {/* 1. Threshold Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between border-b border-[#303943] pb-1.5 text-xs font-semibold uppercase tracking-[0.12em]">
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
      </div>

      {/* 2. Bit-Depth Mode Selector (1-bit / 2-bit / 8-bit) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-ca-ink-muted">
          <span>Bit-Depth Mode</span>
          <span className="font-mono text-[10px] text-ca-select">{currentBitDepth}</span>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {BIT_DEPTH_OPTIONS.map((option) => {
            const isSelected = currentBitDepth === option.id;

            return (
              <button
                key={option.id}
                type="button"
                data-ui-id={`ui-greyscale-mode-${option.id}`}
                onClick={() => handleBitDepthSelect(option.id)}
                className={`flex flex-col items-center rounded border px-1.5 py-1 text-center transition ${
                  isSelected
                    ? "border-ca-select bg-ca-select/20 text-ca-select shadow-sm"
                    : "border-[#303943] bg-[#12171e] text-ca-ink-muted hover:border-[#404c5a] hover:text-ca-ink"
                }`}
                title={option.description}
              >
                <span className="font-mono text-xs font-bold">{option.label}</span>
                <span className="text-[9px] text-white/50">{option.description}</span>
              </button>
            );
          })}
        </div>
        <div className="text-[10px] text-ca-ink-muted/80 pt-0.5">
          1-Bit and Stretch change the preview bits; detection still uses the threshold above.
        </div>
      </div>

      {/* 3. Contrast Enhancement Slider */}
      {isContrastEnabled ? (
        <div className="space-y-1.5 border-t border-[#303943]/60 pt-2">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-ca-ink-muted">
            <span>Contrast Enhancement</span>
            <span className="rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
              {currentContrast}%
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            value={currentContrast}
            onChange={(e) => handleContrastSelect(Number(e.target.value))}
            className="w-full accent-amber-400"
          />
        </div>
      ) : null}
    </div>
  );
}
