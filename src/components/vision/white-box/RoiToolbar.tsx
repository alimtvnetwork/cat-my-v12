import React, { useState } from "react";
import {
  Lock,
  Unlock,
  Square,
  Circle,
  Shield,
  FlipHorizontal,
  Crop,
  Sliders,
} from "lucide-react";

export interface RoiToolbarRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RoiShapeType = "rectangle" | "square" | "circle";

export interface RoiToolbarProps {
  region: RoiToolbarRegion | null;
  canvasWidth: number;
  canvasHeight: number;
  label: string;
  isLocked?: boolean;
  onToggleLock?: () => void;
  shape?: RoiShapeType;
  onShapeChange?: (shape: RoiShapeType) => void;
  isMaskEnabled?: boolean;
  onToggleMask?: () => void;
  isInverted?: boolean;
  onToggleInvert?: () => void;
  onCrop?: () => void;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
  children?: React.ReactNode;
}

/**
 * Floating Toolbar anchored to a canvas region (Spec 83: Modern Design Layer Integration).
 * Tracks region in percentage coordinates so it remains pinned at any viewport resolution.
 * Flips inside if near the top boundary. Houses high-density action controls.
 */
export function RoiToolbar({
  region,
  canvasWidth,
  canvasHeight,
  label,
  isLocked = false,
  onToggleLock,
  shape = "rectangle",
  onShapeChange,
  isMaskEnabled = false,
  onToggleMask,
  isInverted = false,
  onToggleInvert,
  onCrop,
  opacity = 100,
  onOpacityChange,
  children,
}: RoiToolbarProps): React.JSX.Element | null {
  const [hasSliderOpen, setHasSliderOpen] = useState(false);

  if (region === null || canvasWidth <= 0 || canvasHeight <= 0) {
    return null;
  }

  const leftPct = (region.x / canvasWidth) * 100;
  const aboveTopPct = ((region.y - 34) / canvasHeight) * 100;
  const insideTopPct = (region.y / canvasHeight) * 100;
  const topPct = region.y >= 34 ? aboveTopPct : insideTopPct;

  const cycleShape = () => {
    if (!onShapeChange) {
      return;
    }

    if (shape === "rectangle") {
      onShapeChange("square");
    } else if (shape === "square") {
      onShapeChange("circle");
    } else {
      onShapeChange("rectangle");
    }
  };

  return (
    <div
      className="pointer-events-none absolute z-30 flex items-center gap-1.5 rounded-md bg-slate-950/90 border border-slate-700/80 px-2 py-1 text-[11px] text-white shadow-xl backdrop-blur-sm"
      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
      data-testid="roi-toolbar"
    >
      {/* Label and Geometry Badge */}
      <span className="font-mono font-medium text-slate-300 whitespace-nowrap pr-1 border-r border-slate-700/80">
        {label} • {Math.round(region.width)}×{Math.round(region.height)}
      </span>

      {/* Interactive Controls Strip */}
      <div className="pointer-events-auto flex items-center gap-1">
        {/* Lock / Unlock Toggle */}
        {onToggleLock && (
          <button
            type="button"
            onClick={onToggleLock}
            title={isLocked ? "Unlock ROI Position" : "Lock ROI Position"}
            className={`p-1 rounded transition-colors ${
              isLocked
                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            data-testid="btn-toggle-lock"
          >
            {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
        )}

        {/* Shape Selector */}
        {onShapeChange && (
          <button
            type="button"
            onClick={cycleShape}
            title={`Current Shape: ${shape}. Click to cycle.`}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            data-testid="btn-shape-selector"
          >
            {shape === "circle" ? <Circle size={12} /> : <Square size={12} />}
          </button>
        )}

        {/* Mask Toggle */}
        {onToggleMask && (
          <button
            type="button"
            onClick={onToggleMask}
            title={isMaskEnabled ? "Disable Mask" : "Enable Mask Overlay"}
            className={`p-1 rounded transition-colors ${
              isMaskEnabled
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            data-testid="btn-toggle-mask"
          >
            <Shield size={12} />
          </button>
        )}

        {/* Invert Polarity Toggle */}
        {onToggleInvert && (
          <button
            type="button"
            onClick={onToggleInvert}
            title={isInverted ? "Normal Polarity" : "Inverted Polarity"}
            className={`p-1 rounded transition-colors ${
              isInverted
                ? "bg-sky-500/20 text-sky-400 hover:bg-sky-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            data-testid="btn-toggle-invert"
          >
            <FlipHorizontal size={12} />
          </button>
        )}

        {/* Crop Template */}
        {onCrop && (
          <button
            type="button"
            onClick={onCrop}
            title="Crop & Extract Pattern Template"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            data-testid="btn-crop-template"
          >
            <Crop size={12} />
          </button>
        )}

        {/* Opacity Slider Toggle */}
        {onOpacityChange && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setHasSliderOpen((prev) => !prev)}
              title={`Opacity: ${opacity}%`}
              className={`p-1 rounded transition-colors ${
                hasSliderOpen ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
              data-testid="btn-opacity-slider"
            >
              <Sliders size={12} />
            </button>

            {hasSliderOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 flex items-center gap-2 rounded bg-slate-900 border border-slate-700 px-2 py-1 shadow-lg z-50">
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={opacity}
                  onChange={(e) => onOpacityChange(Number(e.target.value))}
                  className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
                <span className="font-mono text-[9px] text-slate-300 min-w-[24px]">{opacity}%</span>
              </div>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
