import React from "react";
import { GripHorizontal } from "lucide-react";
import { Geometry } from "@/domain/vision/shapes";
import { imageToScreen, clampRectToBounds, IMAGE_BOUNDS } from "@/lib/editor/coords";
import { Viewport } from "@/lib/editor/types";

export interface RegionOverlayProps {
  color: string;
  geometry: Geometry;
  onChange: (g: Geometry) => void;
  viewport: Viewport;
  active?: boolean;
  isLocked?: boolean;
  label?: string;
  onSelect?: () => void;
}

/**
 * RegionOverlay (Spec 83: Modern Design Layer Integration).
 * Renders high-precision CAD-grade white/slate resize handles, a 20px top header grip bar,
 * and interior click-through (pointer-events-none on body) to prevent accidental drag hijacking.
 */
export function RegionOverlay({
  color,
  geometry,
  onChange,
  viewport,
  active = true,
  isLocked = false,
  label = "ROI",
  onSelect,
}: RegionOverlayProps): React.JSX.Element | null {
  const x = geometry.x ?? 0;
  const y = geometry.y ?? 0;
  const width = geometry.width ?? 100;
  const height = geometry.height ?? 100;

  const screenTL = imageToScreen({ x, y }, viewport);
  const screenBR = imageToScreen({ x: x + width, y: y + height }, viewport);
  const screenWidth = Math.max(0, screenBR.x - screenTL.x);
  const screenHeight = Math.max(0, screenBR.y - screenTL.y);

  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if (isLocked) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    onSelect?.();

    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const startGeom = { x, y, width, height };

    const onMove = (moveEv: PointerEvent) => {
      const dxImg = (moveEv.clientX - startX) / viewport.zoom;
      const dyImg = (moveEv.clientY - startY) / viewport.zoom;

      onChange(
        clampRectToBounds(
          { ...startGeom, x: startGeom.x + dxImg, y: startGeom.y + dyImg },
          IMAGE_BOUNDS,
        ),
      );
    };

    const onUp = () => {
      el.releasePointerCapture(e.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleResizeDown = (e: React.PointerEvent, handle: string) => {
    if (isLocked) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    onSelect?.();

    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const startGeom = { x, y, width, height };

    const onMove = (moveEv: PointerEvent) => {
      const dxImg = (moveEv.clientX - startX) / viewport.zoom;
      const dyImg = (moveEv.clientY - startY) / viewport.zoom;

      let newX = startGeom.x;
      let newY = startGeom.y;
      let newW = startGeom.width;
      let newH = startGeom.height;

      if (handle.includes("w")) {
        newX += dxImg;
        newW -= dxImg;
      }
      if (handle.includes("e")) {
        newW += dxImg;
      }
      if (handle.includes("n")) {
        newY += dyImg;
        newH -= dyImg;
      }
      if (handle.includes("s")) {
        newH += dyImg;
      }

      if (newW < 10) {
        newX += newW - 10;
        newW = 10;
      }
      if (newH < 10) {
        newY += newH - 10;
        newH = 10;
      }

      onChange(clampRectToBounds({ x: newX, y: newY, width: newW, height: newH }, IMAGE_BOUNDS));
    };

    const onUp = () => {
      el.releasePointerCapture(e.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handles = [
    { id: "nw", cursor: "nwse-resize", left: -4, top: -4 },
    { id: "n", cursor: "ns-resize", left: "50%", top: -4, transform: "translateX(-50%)" },
    { id: "ne", cursor: "nesw-resize", right: -4, top: -4 },
    { id: "e", cursor: "ew-resize", right: -4, top: "50%", transform: "translateY(-50%)" },
    { id: "se", cursor: "nwse-resize", right: -4, bottom: -4 },
    { id: "s", cursor: "ns-resize", left: "50%", bottom: -4, transform: "translateX(-50%)" },
    { id: "sw", cursor: "nesw-resize", left: -4, bottom: -4 },
    { id: "w", cursor: "ew-resize", left: -4, top: "50%", transform: "translateY(-50%)" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        left: screenTL.x,
        top: screenTL.y,
        width: screenWidth,
        height: screenHeight,
        border: `2px ${active ? "solid" : "dashed"} ${color}`,
        boxSizing: "border-box",
        pointerEvents: "none",
        touchAction: "none",
      }}
      className="group"
      data-testid="region-overlay"
    >
      {/* Draggable Interior Body */}
      {active && (
        <div
          onPointerDown={handleHeaderPointerDown}
          className={`absolute inset-0 ${
            isLocked
              ? "pointer-events-none"
              : "pointer-events-auto cursor-move bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors"
          }`}
          data-testid="roi-interior-body"
        />
      )}

      {/* 20px Header Grip Bar */}
      {active && (
        <div
          onPointerDown={handleHeaderPointerDown}
          className={`pointer-events-auto absolute -top-5 left-0 h-[20px] flex items-center gap-1.5 px-1.5 rounded-t bg-slate-900/90 border border-slate-700/80 text-[10px] font-mono text-slate-200 select-none shadow-md ${
            isLocked ? "cursor-not-allowed opacity-75" : "cursor-move hover:bg-slate-800"
          }`}
          style={{ minWidth: 90 }}
          data-testid="roi-header-grip"
        >
          <GripHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate font-semibold">{label}</span>
          <span className="text-slate-400 text-[9px] ml-auto">
            {Math.round(width)}×{Math.round(height)}
          </span>
        </div>
      )}

      {/* CAD-Grade White / Slate Handles */}
      {active &&
        !isLocked &&
        handles.map(({ id, cursor, ...pos }) => (
          <div
            key={id}
            onPointerDown={(e) => handleResizeDown(e, id)}
            className="pointer-events-auto absolute w-2 h-2 bg-white border border-slate-800 rounded-[1px] shadow-sm hover:scale-125 transition-transform"
            style={{
              cursor,
              ...pos,
            }}
            data-testid={`handle-${id}`}
          />
        ))}
    </div>
  );
}
