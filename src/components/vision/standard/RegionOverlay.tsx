import React from "react";
import { GripHorizontal } from "lucide-react";
import { Geometry } from "@/domain/vision/shapes";
import { imageToScreen, screenToImage, clampRectToBounds, IMAGE_BOUNDS } from "@/lib/editor/coords";
import { Viewport } from "@/lib/editor/types";
import { recordRoiDragStart, recordRoiDragEnd } from "@/lib/recorder/event-interceptor";
import {
  beginRoiInteraction,
  completeRoiInteraction,
  type DragCoordinates,
} from "../roi-recording-bridge";

export interface RegionOverlayProps {
  color: string;
  geometry: Geometry;
  onChange: (g: Geometry) => void;
  viewport: Viewport;
  active?: boolean;
  isLocked?: boolean;
  label?: string;
  onSelect?: () => void;
  /** Telemetry callback invoked on pointer drag/resize completion */
  onDragTelemetry?: (telemetry: DragCoordinates) => void;
}

/**
 * RegionOverlay (Spec 83: Modern Design Layer Integration & Spec 87: ROI Telemetry).
 * Renders high-precision CAD-grade white/slate resize handles, a 20px top header grip bar,
 * interior click-through, and bridges pointer operations into recorder telemetry.
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
  onDragTelemetry,
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
    let currentGeom = { ...startGeom };

    const startImageCoords = screenToImage({ x: startX, y: startY }, viewport);

    recordRoiDragStart({
      action: "move",
      roi: startGeom,
      element: el,
    });

    const bridgeSession = beginRoiInteraction({
      operationType: "roi-drag",
      screenCoords: { x: startX, y: startY },
      imageCoords: startImageCoords,
      geometry: startGeom,
      handleId: "header-drag",
      element: el,
      label,
    });

    const onMove = (moveEv: PointerEvent) => {
      const dxImg = (moveEv.clientX - startX) / viewport.zoom;
      const dyImg = (moveEv.clientY - startY) / viewport.zoom;

      currentGeom = clampRectToBounds(
        { ...startGeom, x: startGeom.x + dxImg, y: startGeom.y + dyImg },
        IMAGE_BOUNDS,
      );

      onChange(currentGeom);
    };

    const onUp = (upEv: PointerEvent) => {
      el.releasePointerCapture(e.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);

      const endX = upEv.clientX;
      const endY = upEv.clientY;
      const endImageCoords = screenToImage({ x: endX, y: endY }, viewport);

      recordRoiDragEnd({
        action: "move",
        startRoi: startGeom,
        endRoi: currentGeom,
        element: el,
      });

      if (bridgeSession) {
        completeRoiInteraction({
          session: bridgeSession,
          screenCoords: { x: endX, y: endY },
          imageCoords: endImageCoords,
          finalGeometry: currentGeom,
          element: el,
        });

        if (onDragTelemetry) {
          const deltaX = Math.round(currentGeom.x - startGeom.x);
          const deltaY = Math.round(currentGeom.y - startGeom.y);

          onDragTelemetry({
            startScreenX: Math.round(startX),
            startScreenY: Math.round(startY),
            endScreenX: Math.round(endX),
            endScreenY: Math.round(endY),
            startNaturalX: Math.round(startImageCoords.x),
            startNaturalY: Math.round(startImageCoords.y),
            endNaturalX: Math.round(endImageCoords.x),
            endNaturalY: Math.round(endImageCoords.y),
            deltaX,
            deltaY,
            startGeometry: startGeom,
            endGeometry: currentGeom,
            deltaWidth: 0,
            deltaHeight: 0,
            handleId: "header-drag",
            xpath: bridgeSession.targetXPath,
            startScreenshotId: bridgeSession.startScreenshotId,
          });
        }
      }
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
    let currentGeom = { ...startGeom };

    const startImageCoords = screenToImage({ x: startX, y: startY }, viewport);

    recordRoiDragStart({
      action: "resize",
      roi: startGeom,
      element: el,
      handle,
    });

    const bridgeSession = beginRoiInteraction({
      operationType: "roi-resize",
      screenCoords: { x: startX, y: startY },
      imageCoords: startImageCoords,
      geometry: startGeom,
      handleId: `handle-${handle}`,
      element: el,
      label,
    });

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

      currentGeom = clampRectToBounds({ x: newX, y: newY, width: newW, height: newH }, IMAGE_BOUNDS);
      onChange(currentGeom);
    };

    const onUp = (upEv: PointerEvent) => {
      el.releasePointerCapture(e.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);

      const endX = upEv.clientX;
      const endY = upEv.clientY;
      const endImageCoords = screenToImage({ x: endX, y: endY }, viewport);

      recordRoiDragEnd({
        action: "resize",
        startRoi: startGeom,
        endRoi: currentGeom,
        element: el,
        handle,
      });

      if (bridgeSession) {
        completeRoiInteraction({
          session: bridgeSession,
          screenCoords: { x: endX, y: endY },
          imageCoords: endImageCoords,
          finalGeometry: currentGeom,
          element: el,
        });

        if (onDragTelemetry) {
          const deltaX = Math.round(currentGeom.x - startGeom.x);
          const deltaY = Math.round(currentGeom.y - startGeom.y);
          const deltaWidth = Math.round(currentGeom.width - startGeom.width);
          const deltaHeight = Math.round(currentGeom.height - startGeom.height);

          onDragTelemetry({
            startScreenX: Math.round(startX),
            startScreenY: Math.round(startY),
            endScreenX: Math.round(endX),
            endScreenY: Math.round(endY),
            startNaturalX: Math.round(startImageCoords.x),
            startNaturalY: Math.round(startImageCoords.y),
            endNaturalX: Math.round(endImageCoords.x),
            endNaturalY: Math.round(endImageCoords.y),
            deltaX,
            deltaY,
            startGeometry: startGeom,
            endGeometry: currentGeom,
            deltaWidth,
            deltaHeight,
            handleId: `handle-${handle}`,
            xpath: bridgeSession.targetXPath,
            startScreenshotId: bridgeSession.startScreenshotId,
          });
        }
      }
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
      <div
        onPointerDown={handleHeaderPointerDown}
        style={{
          pointerEvents: active && !isLocked ? "auto" : "none",
          cursor: isLocked ? "default" : "move",
        }}
        className="absolute inset-0 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors"
        data-testid="roi-interior-body"
      />

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
