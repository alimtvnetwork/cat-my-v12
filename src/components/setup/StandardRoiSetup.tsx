import React, { useState } from "react";
import {
  Square,
  Circle,
  RotateCw,
  Plus,
  Minus,
  Check,
  X,
  Layers,
  Crosshair,
  Maximize2,
  Trash2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { StandardAppShell } from "@/components/layout/StandardAppShell";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export type RoiShapeType = "rectangle" | "rotated_rect" | "circle" | "ring" | "polygon";

export interface StandardRoiData {
  shape: RoiShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  angleDeg: number;
  innerRadius: number;
  outerRadius: number;
  activeMasks: { id: number; name: string; enabled: boolean; x: number; y: number; w: number; h: number }[];
}

export function StandardRoiSetup(): React.JSX.Element {
  const navigate = useNavigate();

  const [shape, setShape] = useState<RoiShapeType>("rectangle");
  const [x, setX] = useState<number>(240);
  const [y, setY] = useState<number>(180);
  const [width, setWidth] = useState<number>(320);
  const [height, setHeight] = useState<number>(240);
  const [angleDeg, setAngleDeg] = useState<number>(0);
  const [innerRadius, setInnerRadius] = useState<number>(40);
  const [outerRadius, setOuterRadius] = useState<number>(120);

  const [masks, setMasks] = useState([
    { id: 0, name: "Mask 0 (Center Hole)", enabled: false, x: 360, y: 260, w: 80, h: 80 },
    { id: 1, name: "Mask 1 (Glare Reflection)", enabled: false, x: 280, y: 200, w: 60, h: 40 },
    { id: 2, name: "Mask 2 (Edge Margin)", enabled: false, x: 200, y: 150, w: 50, h: 50 },
    { id: 3, name: "Mask 3 (Custom)", enabled: false, x: 400, y: 300, w: 60, h: 60 },
  ]);

  const [activeTab, setActiveTab] = useState<"geometry" | "masks" | "anchor">("geometry");
  const [anchorTracking, setAnchorTracking] = useState<boolean>(true);
  const [anchorRuleName, setAnchorRuleName] = useState<string>("Pattern Search 01 (Origin)");

  const handleApply = () => {
    toast.success("ROI and Mask configuration applied to active inspection rule.");
  };

  const handleOk = () => {
    toast.success("Saved Region of Interest (ROI) settings.");
    void navigate({ to: "/setup" });
  };

  const handleCancel = () => {
    void navigate({ to: "/setup" });
  };

  const stepCoord = (setter: React.Dispatch<React.SetStateAction<number>>, delta: number) => {
    setter((prev) => Math.max(0, prev + delta));
  };

  const actionButtons = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          setX(100);
          setY(100);
          setWidth(440);
          setHeight(320);
          setAngleDeg(0);
          toast.info("Reset ROI to default bounding box");
        }}
        className="px-3 py-1.5 bg-ca-panel border border-ca-border text-ca-ink font-medium rounded text-xs hover:bg-ca-panel-2 shadow-sm"
      >
        Reset Full
      </button>
      <button
        type="button"
        onClick={handleApply}
        className="px-3 py-1.5 bg-ca-panel border border-ca-border text-ca-ink font-medium rounded text-xs hover:bg-ca-panel-2 shadow-sm"
      >
        Apply
      </button>
      <button
        type="button"
        onClick={handleOk}
        className="px-3.5 py-1.5 bg-ca-select text-ca-bg font-bold rounded text-xs flex items-center gap-1 hover:brightness-110 shadow-sm"
      >
        <Check size={13} />
        OK
      </button>
      <button
        type="button"
        onClick={handleCancel}
        className="px-3 py-1.5 bg-ca-panel border border-ca-border text-ca-ink-muted rounded text-xs flex items-center gap-1 hover:bg-ca-panel-2"
      >
        <X size={13} />
        Cancel
      </button>
    </div>
  );

  return (
    <StandardAppShell
      activeNav="setup"
      title="Inspection Region (ROI) Setup"
      subtitle={`Industrial Geometric Region Definition · Shape [${shape.toUpperCase()}] · X:${x} Y:${y} W:${width} H:${height}`}
      actions={actionButtons}
    >
      <div className="flex flex-1 min-h-0 overflow-hidden bg-ca-canvas">
        {/* Left Viewport with ROI Visualizer */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-ca-border bg-ca-bg">
          {/* Shape Selector Ribbon */}
          <div className="h-11 px-3 border-b border-ca-border bg-ca-panel flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-ca-ink mr-1 text-[11px] uppercase tracking-wide">Shape:</span>
              {(
                [
                  { id: "rectangle", label: "Rect", icon: Square },
                  { id: "rotated_rect", label: "Rotated Rect", icon: RotateCw },
                  { id: "circle", label: "Circle", icon: Circle },
                  { id: "ring", label: "Ring", icon: Crosshair },
                ] as const
              ).map((s) => {
                const Icon = s.icon;
                const active = shape === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setShape(s.id)}
                    className={`px-2.5 py-1 rounded border flex items-center gap-1 font-medium transition-colors ${
                      active
                        ? "bg-ca-select text-ca-bg border-ca-select font-bold shadow-sm"
                        : "bg-ca-panel-2 border-ca-border text-ca-ink hover:bg-ca-panel"
                    }`}
                  >
                    <Icon size={12} />
                    {s.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-ca-ink-muted text-[11px]">
              <span>Bounding Area: <strong className="font-mono text-ca-ink">{width * height} px²</strong></span>
            </div>
          </div>

          {/* Interactive ROI Canvas */}
          <div className="flex-1 min-h-0 relative overflow-hidden flex items-center justify-center p-6 bg-[repeating-linear-gradient(45deg,rgba(128,128,128,0.04)_0_8px,transparent_8px_16px)]">
            <div className="relative border border-ca-border shadow-md bg-slate-900 overflow-hidden w-[640px] h-[480px]">
              {/* Background Reference Placeholder */}
              <img
                src="/images/placeholders/sample_grid.png"
                alt="ROI Reference Canvas"
                className="w-full h-full object-cover opacity-60 pointer-events-none select-none"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='480' viewBox='0 0 640 480'><rect width='640' height='480' fill='%230f172a'/><circle cx='320' cy='240' r='140' fill='%231e293b' stroke='%23334155' stroke-width='2'/><rect x='200' y='160' width='240' height='160' fill='%23334155' stroke='%23475569' stroke-width='2'/></svg>";
                }}
              />

              {/* Render Primary ROI */}
              {shape === "rectangle" && (
                <div
                  className="absolute border-2 border-emerald-400 bg-emerald-500/15 pointer-events-none transition-all duration-75 flex flex-col justify-between p-1"
                  style={{ left: x, top: y, width, height }}
                >
                  <span className="text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 px-1 py-0.5 rounded w-max border border-emerald-400/40">
                    ROI 01 [{width}x{height}]
                  </span>
                  <div className="self-end text-[9px] font-mono text-emerald-300 bg-emerald-950/80 px-1 rounded">
                    X:{x}, Y:{y}
                  </div>
                </div>
              )}

              {shape === "rotated_rect" && (
                <div
                  className="absolute border-2 border-emerald-400 bg-emerald-500/15 pointer-events-none transition-all duration-75 flex items-center justify-center"
                  style={{
                    left: x,
                    top: y,
                    width,
                    height,
                    transform: `rotate(${angleDeg}deg)`,
                  }}
                >
                  <span className="text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 px-1 rounded border border-emerald-400/40">
                    Rotated [{angleDeg}°]
                  </span>
                </div>
              )}

              {shape === "circle" && (
                <div
                  className="absolute border-2 border-emerald-400 bg-emerald-500/15 rounded-full pointer-events-none transition-all duration-75 flex items-center justify-center"
                  style={{
                    left: x - outerRadius,
                    top: y - outerRadius,
                    width: outerRadius * 2,
                    height: outerRadius * 2,
                  }}
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="absolute bottom-2 text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 px-1 rounded">
                    R:{outerRadius}px
                  </span>
                </div>
              )}

              {shape === "ring" && (
                <div
                  className="absolute border-2 border-emerald-400 bg-emerald-500/15 rounded-full pointer-events-none transition-all duration-75 flex items-center justify-center"
                  style={{
                    left: x - outerRadius,
                    top: y - outerRadius,
                    width: outerRadius * 2,
                    height: outerRadius * 2,
                  }}
                >
                  <div
                    className="border-2 border-dashed border-emerald-300 rounded-full bg-slate-900/60"
                    style={{
                      width: innerRadius * 2,
                      height: innerRadius * 2,
                    }}
                  />
                  <span className="absolute bottom-2 text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 px-1 rounded">
                    Ring R1:{innerRadius} R2:{outerRadius}
                  </span>
                </div>
              )}

              {/* Render Active Mask Exclusions */}
              {masks
                .filter((m) => m.enabled)
                .map((m) => (
                  <div
                    key={m.id}
                    className="absolute border-2 border-rose-500 bg-rose-600/30 pointer-events-none flex items-center justify-center"
                    style={{ left: m.x, top: m.y, width: m.w, height: m.h }}
                  >
                    <span className="text-[9px] font-mono font-bold bg-rose-950/90 text-rose-300 px-1 py-0.5 rounded border border-rose-500/50">
                      MASK {m.id} (EXCLUDED)
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right Tabbed Coordinate & Mask Panel */}
        <div className="w-80 flex flex-col shrink-0 bg-ca-panel border-l border-ca-border text-xs text-ca-ink">
          {/* Tab Headers */}
          <div className="flex border-b border-ca-border bg-ca-panel-2">
            <button
              type="button"
              onClick={() => setActiveTab("geometry")}
              className={`flex-1 py-2.5 px-2 text-center font-medium border-b-2 transition-colors ${
                activeTab === "geometry"
                  ? "border-ca-select text-ca-select bg-ca-panel font-bold"
                  : "border-transparent text-ca-ink-muted hover:text-ca-ink"
              }`}
            >
              Coordinates
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("masks")}
              className={`flex-1 py-2.5 px-2 text-center font-medium border-b-2 transition-colors ${
                activeTab === "masks"
                  ? "border-ca-select text-ca-select bg-ca-panel font-bold"
                  : "border-transparent text-ca-ink-muted hover:text-ca-ink"
              }`}
            >
              Masks (0-3)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("anchor")}
              className={`flex-1 py-2.5 px-2 text-center font-medium border-b-2 transition-colors ${
                activeTab === "anchor"
                  ? "border-ca-select text-ca-select bg-ca-panel font-bold"
                  : "border-transparent text-ca-ink-muted hover:text-ca-ink"
              }`}
            >
              Anchor Link
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {activeTab === "geometry" && (
              <div className="space-y-3">
                <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
                  <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-[11px]">
                    Position & Dimensions (px)
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div>
                      <div className="flex justify-between text-ca-ink-muted mb-1">
                        <span>Origin X: <strong className="font-mono text-ca-ink">{x} px</strong></span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => stepCoord(setX, -1)} className="px-1 bg-ca-bg border border-ca-border rounded">-1</button>
                          <button type="button" onClick={() => stepCoord(setX, 1)} className="px-1 bg-ca-bg border border-ca-border rounded">+1</button>
                          <button type="button" onClick={() => stepCoord(setX, 10)} className="px-1 bg-ca-bg border border-ca-border rounded">+10</button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={640}
                        value={x}
                        onChange={(e) => setX(Number(e.target.value))}
                        className="w-full accent-ca-select"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-ca-ink-muted mb-1">
                        <span>Origin Y: <strong className="font-mono text-ca-ink">{y} px</strong></span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => stepCoord(setY, -1)} className="px-1 bg-ca-bg border border-ca-border rounded">-1</button>
                          <button type="button" onClick={() => stepCoord(setY, 1)} className="px-1 bg-ca-bg border border-ca-border rounded">+1</button>
                          <button type="button" onClick={() => stepCoord(setY, 10)} className="px-1 bg-ca-bg border border-ca-border rounded">+10</button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={480}
                        value={y}
                        onChange={(e) => setY(Number(e.target.value))}
                        className="w-full accent-ca-select"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-ca-ink-muted mb-1">
                        <span>Width (W): <strong className="font-mono text-ca-ink">{width} px</strong></span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => stepCoord(setWidth, -5)} className="px-1 bg-ca-bg border border-ca-border rounded">-5</button>
                          <button type="button" onClick={() => stepCoord(setWidth, 5)} className="px-1 bg-ca-bg border border-ca-border rounded">+5</button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={640}
                        value={width}
                        onChange={(e) => setWidth(Number(e.target.value))}
                        className="w-full accent-ca-select"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-ca-ink-muted mb-1">
                        <span>Height (H): <strong className="font-mono text-ca-ink">{height} px</strong></span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => stepCoord(setHeight, -5)} className="px-1 bg-ca-bg border border-ca-border rounded">-5</button>
                          <button type="button" onClick={() => stepCoord(setHeight, 5)} className="px-1 bg-ca-bg border border-ca-border rounded">+5</button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={480}
                        value={height}
                        onChange={(e) => setHeight(Number(e.target.value))}
                        className="w-full accent-ca-select"
                      />
                    </div>

                    {shape === "rotated_rect" && (
                      <div>
                        <div className="flex justify-between text-ca-ink-muted mb-1">
                          <span>Rotation Angle: <strong className="font-mono text-ca-ink">{angleDeg}°</strong></span>
                        </div>
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          value={angleDeg}
                          onChange={(e) => setAngleDeg(Number(e.target.value))}
                          className="w-full accent-ca-select"
                        />
                      </div>
                    )}

                    {(shape === "circle" || shape === "ring") && (
                      <div>
                        <div className="flex justify-between text-ca-ink-muted mb-1">
                          <span>Outer Radius: <strong className="font-mono text-ca-ink">{outerRadius} px</strong></span>
                        </div>
                        <input
                          type="range"
                          min={20}
                          max={240}
                          value={outerRadius}
                          onChange={(e) => setOuterRadius(Number(e.target.value))}
                          className="w-full accent-ca-select"
                        />
                      </div>
                    )}

                    {shape === "ring" && (
                      <div>
                        <div className="flex justify-between text-ca-ink-muted mb-1">
                          <span>Inner Radius: <strong className="font-mono text-ca-ink">{innerRadius} px</strong></span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={outerRadius - 5}
                          value={innerRadius}
                          onChange={(e) => setInnerRadius(Number(e.target.value))}
                          className="w-full accent-ca-select"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "masks" && (
              <div className="space-y-3">
                <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
                  <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-[11px]">
                    Background & Glare Mask Slots
                  </div>

                  <div className="space-y-2">
                    {masks.map((mask) => (
                      <div
                        key={mask.id}
                        className="p-2 bg-ca-panel border border-ca-border rounded flex items-center justify-between"
                      >
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={mask.enabled}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setMasks((prev) =>
                                prev.map((m) => (m.id === mask.id ? { ...m, enabled: checked } : m))
                              );
                            }}
                            className="rounded border-ca-border accent-ca-select"
                          />
                          <span className="font-medium text-ca-ink">{mask.name}</span>
                        </label>
                        <span className="font-mono text-[10px] text-ca-ink-muted">
                          {mask.enabled ? `${mask.w}x${mask.h}` : "Disabled"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "anchor" && (
              <div className="space-y-3">
                <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
                  <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-[11px]">
                    Position Correction & Tracking
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={anchorTracking}
                      onChange={(e) => setAnchorTracking(e.target.checked)}
                      className="rounded border-ca-border accent-ca-select"
                    />
                    <span className="font-medium text-ca-ink">Track Coordinate Origin with Anchor Tool</span>
                  </label>

                  {anchorTracking && (
                    <div className="pt-2 border-t border-ca-border space-y-2">
                      <label className="text-ca-ink-muted block text-[11px]">Reference Anchor Master Rule</label>
                      <select
                        value={anchorRuleName}
                        onChange={(e) => setAnchorRuleName(e.target.value)}
                        className="w-full bg-ca-bg border border-ca-border px-2 py-1 rounded text-ca-ink"
                      >
                        <option value="Pattern Search 01 (Origin)">Pattern Search 01 (Origin)</option>
                        <option value="ShapeTrax3 01 (Feature Alignment)">ShapeTrax3 01 (Feature Alignment)</option>
                        <option value="Edge Position 01 (Corner Datum)">Edge Position 01 (Corner Datum)</option>
                      </select>
                      <p className="text-[10px] text-ca-ink-muted mt-1">
                        When the part rotates or shifts on the conveyor, this ROI automatically follows the detected offset.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </StandardAppShell>
  );
}
