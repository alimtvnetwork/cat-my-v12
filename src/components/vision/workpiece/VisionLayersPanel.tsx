import React, { useState, useMemo, useCallback } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Layers,
  Image as ImageIcon,
  Grid,
  Shield,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  MoveUp,
  MoveDown,
  CheckCircle2,
  XCircle,
  Square,
  Circle,
  MoreVertical,
} from "lucide-react";
import type { WorkpieceRoi } from "./VisualToolWorkpieceCanvas";

export interface IcosBoxItem {
  number: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isVisible: boolean;
  isExcluded: boolean;
  status: "pass" | "fail" | "skipped" | "pending";
  confidenceScore: number;
}

export interface VisionLayersPanelProps {
  roi: WorkpieceRoi;
  onChangeRoi?: (roi: WorkpieceRoi) => void;
  isRoiLocked?: boolean;
  onToggleRoiLock?: () => void;
  activeBoxes?: readonly IcosBoxItem[];
  excludedNumbers?: ReadonlySet<number>;
  onToggleBoxExcluded?: (boxNumber: number) => void;
  onReorderBox?: (boxNumber: number, action: "top" | "bottom" | "up" | "down") => void;
  sourceDimensions?: { width: number; height: number };
  baseImageOpacity?: number;
  onChangeBaseImageOpacity?: (opacity: number) => void;
  isBaseImageVisible?: boolean;
  onToggleBaseImageVisible?: () => void;
  isContrastStretchingActive?: boolean;
  onToggleContrastStretching?: () => void;
}

function generateDefaultIcosBoxes(roi: WorkpieceRoi): IcosBoxItem[] {
  const boxes: IcosBoxItem[] = [];
  const cols = 8;
  const rows = 8;
  const marginX = 24;
  const marginY = 24;
  const availableW = Math.max(100, roi.width - marginX * 2);
  const availableH = Math.max(100, roi.height - marginY * 2);
  const cellW = Math.max(12, Math.floor(availableW / cols));
  const cellH = Math.max(12, Math.floor(availableH / rows));

  for (let i = 1; i <= 57; i += 1) {
    const col = (i - 1) % cols;
    const row = Math.floor((i - 1) / cols);
    boxes.push({
      number: i,
      label: `B${i.toString().padStart(2, "0")}`,
      x: Math.round(roi.x + marginX + col * cellW),
      y: Math.round(roi.y + marginY + row * cellH),
      width: Math.max(8, cellW - 6),
      height: Math.max(8, cellH - 6),
      isVisible: true,
      isExcluded: false,
      status: i % 17 === 0 ? "fail" : "pass",
      confidenceScore: Math.max(70, Math.min(99, 92 + (i % 7))),
    });
  }

  return boxes;
}

export function VisionLayersPanel({
  roi,
  onChangeRoi,
  isRoiLocked = true,
  onToggleRoiLock,
  activeBoxes,
  excludedNumbers,
  onToggleBoxExcluded,
  onReorderBox,
  sourceDimensions = { width: 960, height: 540 },
  baseImageOpacity = 1.0,
  onChangeBaseImageOpacity,
  isBaseImageVisible = true,
  onToggleBaseImageVisible,
  isContrastStretchingActive = false,
  onToggleContrastStretching,
}: VisionLayersPanelProps): React.JSX.Element {
  const [internalRoiLocked, setInternalRoiLocked] = useState(true);
  const [isZ0Expanded, setIsZ0Expanded] = useState(true);
  const [isZ1Expanded, setIsZ1Expanded] = useState(true);
  const [isZ2Expanded, setIsZ2Expanded] = useState(true);
  const [isZ3Expanded, setIsZ3Expanded] = useState(false);
  const [selectedBoxNumber, setSelectedBoxNumber] = useState<number | null>(null);
  const [contextMenuBox, setContextMenuBox] = useState<number | null>(null);

  const effectiveRoiLocked = onToggleRoiLock ? isRoiLocked : internalRoiLocked;

  const handleToggleRoiLock = useCallback(() => {
    if (onToggleRoiLock) {
      onToggleRoiLock();

      return;
    }

    setInternalRoiLocked((prev) => !prev);
  }, [onToggleRoiLock]);

  const icosBoxes = useMemo(() => {
    if (activeBoxes && activeBoxes.length > 0) return activeBoxes;

    return generateDefaultIcosBoxes(roi);
  }, [activeBoxes, roi]);

  return (
    <div
      data-element-id="vision-layers-panel"
      data-element-name="VisionLayersPanel"
      data-element-xpath="//div[@data-element-id='vision-layers-panel']"
      className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-black/60 text-xs text-white backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2 bg-white/[0.02]">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-cyan-300">
          <Layers size={13} />
          <span>Photoshop Layers</span>
        </div>
        <span className="font-mono text-[10px] text-white/40">4 Tiers (Z0–Z3)</span>
      </div>

      {/* Layers Stack List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {/* Tier Z3: Masks Layer */}
        <div className="rounded-lg border border-purple-500/20 bg-purple-950/10 overflow-hidden">
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-purple-950/20">
            <button
              type="button"
              data-element-id="tier-z3-toggle"
              data-element-name="TierZ3Toggle"
              data-element-xpath="//button[@data-element-id='tier-z3-toggle']"
              onClick={() => setIsZ3Expanded((prev) => !prev)}
              className="flex items-center gap-1.5 font-bold text-purple-300"
            >
              {isZ3Expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Shield size={12} />
              <span>Z3: Masks Layer</span>
            </button>
            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] text-purple-200">
              0 Active
            </span>
          </div>

          {isZ3Expanded ? (
            <div className="p-2 space-y-1.5 text-[11px] text-white/60">
              <div className="flex items-center justify-between">
                <span>Multi-Shape Primitives</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    data-element-id="btn-add-mask-rect"
                    data-element-name="AddMaskRectangle"
                    data-element-xpath="//button[@data-element-id='btn-add-mask-rect']"
                    className="rounded bg-white/5 p-1 hover:bg-white/10 text-white/70"
                    title="Add Rectangle Mask"
                  >
                    <Square size={11} />
                  </button>
                  <button
                    type="button"
                    data-element-id="btn-add-mask-circle"
                    data-element-name="AddMaskCircle"
                    data-element-xpath="//button[@data-element-id='btn-add-mask-circle']"
                    className="rounded bg-white/5 p-1 hover:bg-white/10 text-white/70"
                    title="Add Circle Mask"
                  >
                    <Circle size={11} />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-white/40 italic">No exclusion masks configured</p>
            </div>
          ) : null}
        </div>

        {/* Tier Z2: Pattern Search Boxes 1..57 (Hardware ICOS Grid) */}
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/10 overflow-hidden">
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-emerald-950/20">
            <button
              type="button"
              data-element-id="tier-z2-toggle"
              data-element-name="TierZ2Toggle"
              data-element-xpath="//button[@data-element-id='tier-z2-toggle']"
              onClick={() => setIsZ2Expanded((prev) => !prev)}
              className="flex items-center gap-1.5 font-bold text-emerald-300"
            >
              {isZ2Expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Grid size={12} />
              <span>Z2: Pattern Boxes (1..57)</span>
            </button>
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] text-emerald-200">
              ICOS Grid (57)
            </span>
          </div>

          {isZ2Expanded ? (
            <div className="p-1 space-y-1">
              <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
                {icosBoxes.map((b) => {
                  const isExcluded = excludedNumbers?.has(b.number) ?? b.isExcluded;
                  const isSelected = selectedBoxNumber === b.number;

                  return (
                    <div
                      key={b.number}
                      data-element-id={`icos-box-row-${b.number}`}
                      onClick={() => setSelectedBoxNumber(b.number)}
                      className={`flex items-center justify-between rounded px-2 py-1 text-[11px] transition cursor-pointer ${
                        isSelected
                          ? "bg-cyan-500/20 border border-cyan-400/40 text-cyan-100"
                          : isExcluded
                            ? "bg-white/[0.02] text-white/30 line-through"
                            : "bg-white/[0.03] text-white/80 hover:bg-white/[0.07]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          data-element-id={`btn-box-eye-${b.number}`}
                          data-element-name={`ToggleBoxEye_${b.number}`}
                          data-element-xpath={`//button[@data-element-id='btn-box-eye-${b.number}']`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleBoxExcluded?.(b.number);
                          }}
                          className="text-white/40 hover:text-white"
                        >
                          {isExcluded ? <EyeOff size={11} /> : <Eye size={11} />}
                        </button>
                        <span className="font-mono font-bold text-emerald-400">{b.label}</span>
                        <span className="font-mono text-[9px] text-white/40">
                          {b.x},{b.y} [{b.width}×{b.height}]
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`flex items-center gap-0.5 rounded px-1 py-0.2 text-[9px] font-bold ${
                            b.status === "pass"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {b.status === "pass" ? (
                            <CheckCircle2 size={9} />
                          ) : (
                            <XCircle size={9} />
                          )}
                          {b.confidenceScore}%
                        </span>

                        {onReorderBox ? (
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              title="Bring to Front"
                              onClick={(e) => {
                                e.stopPropagation();
                                onReorderBox(b.number, "top");
                              }}
                              className="text-white/30 hover:text-cyan-300"
                            >
                              <ArrowUpToLine size={10} />
                            </button>
                            <button
                              type="button"
                              title="Send to Back"
                              onClick={(e) => {
                                e.stopPropagation();
                                onReorderBox(b.number, "bottom");
                              }}
                              className="text-white/30 hover:text-cyan-300"
                            >
                              <ArrowDownToLine size={10} />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Tier Z1: Search ROI Layer (Locked by Default) */}
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/10 overflow-hidden">
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-cyan-950/20">
            <button
              type="button"
              data-element-id="tier-z1-toggle"
              data-element-name="TierZ1Toggle"
              data-element-xpath="//button[@data-element-id='tier-z1-toggle']"
              onClick={() => setIsZ1Expanded((prev) => !prev)}
              className="flex items-center gap-1.5 font-bold text-cyan-300"
            >
              {isZ1Expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Square size={12} />
              <span>Z1: Search ROI</span>
            </button>

            <button
              type="button"
              data-element-id="layer-search-roi-lock-toggle"
              data-element-name="SearchRoiLockToggle"
              data-element-xpath="//button[@data-element-id='layer-search-roi-lock-toggle']"
              onClick={handleToggleRoiLock}
              className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold transition ${
                effectiveRoiLocked
                  ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
              }`}
              title={effectiveRoiLocked ? "ROI is locked (click to unlock)" : "ROI is unlocked"}
            >
              {effectiveRoiLocked ? <Lock size={10} /> : <Unlock size={10} />}
              <span>{effectiveRoiLocked ? "LOCKED" : "UNLOCKED"}</span>
            </button>
          </div>

          {isZ1Expanded ? (
            <div
              onDoubleClick={handleToggleRoiLock}
              className="p-2 space-y-1.5 text-[11px] text-white/70 select-none cursor-pointer"
              title="Double-click row to toggle lock"
            >
              <div className="flex items-center justify-between font-mono">
                <span className="text-white/50">Bounds (X, Y):</span>
                <span className="font-bold text-white">
                  {Math.round(roi.x)}, {Math.round(roi.y)}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-white/50">Size (W × H):</span>
                <span className="font-bold text-white">
                  {Math.round(roi.width)} × {Math.round(roi.height)}
                </span>
              </div>
              <p className="text-[10px] text-white/40 italic">
                {effectiveRoiLocked
                  ? "ROI is locked against accidental clicks. Double-click or click padlock to edit."
                  : "ROI is editable. Drag perimeter or 8 handles to resize."}
              </p>
            </div>
          ) : null}
        </div>

        {/* Tier Z0: Base Image Layer */}
        <div className="rounded-lg border border-slate-500/20 bg-slate-950/20 overflow-hidden">
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-950/30">
            <button
              type="button"
              data-element-id="tier-z0-toggle"
              data-element-name="TierZ0Toggle"
              data-element-xpath="//button[@data-element-id='tier-z0-toggle']"
              onClick={() => setIsZ0Expanded((prev) => !prev)}
              className="flex items-center gap-1.5 font-bold text-slate-300"
            >
              {isZ0Expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <ImageIcon size={12} />
              <span>Z0: Base Image</span>
            </button>

            {onToggleBaseImageVisible ? (
              <button
                type="button"
                data-element-id="btn-toggle-base-image-visible"
                data-element-name="ToggleBaseImageVisible"
                data-element-xpath="//button[@data-element-id='btn-toggle-base-image-visible']"
                onClick={onToggleBaseImageVisible}
                className="text-white/40 hover:text-white"
              >
                {isBaseImageVisible ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
            ) : null}
          </div>

          {isZ0Expanded ? (
            <div className="p-2 space-y-2 text-[11px] text-white/70">
              <div className="flex items-center justify-between font-mono">
                <span className="text-white/50">Resolution:</span>
                <span className="font-bold text-white">
                  {sourceDimensions.width} × {sourceDimensions.height} px
                </span>
              </div>

              {onChangeBaseImageOpacity ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Opacity</span>
                    <span className="font-mono text-cyan-300">
                      {Math.round(baseImageOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(baseImageOpacity * 100)}
                    onChange={(e) =>
                      onChangeBaseImageOpacity(parseInt(e.target.value, 10) / 100)
                    }
                    className="h-1 w-full cursor-pointer accent-cyan-400"
                  />
                </div>
              ) : null}

              {onToggleContrastStretching ? (
                <button
                  type="button"
                  data-element-id="btn-toggle-contrast-stretch"
                  data-element-name="ToggleContrastStretch"
                  data-element-xpath="//button[@data-element-id='btn-toggle-contrast-stretch']"
                  onClick={onToggleContrastStretching}
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-[10px] font-bold uppercase transition ${
                    isContrastStretchingActive
                      ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/40"
                      : "bg-white/5 text-white/50 hover:text-white border border-white/10"
                  }`}
                >
                  <span>2nd-98th Contrast Stretch</span>
                  <span>{isContrastStretchingActive ? "ON" : "OFF"}</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
