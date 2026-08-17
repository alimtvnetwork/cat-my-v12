import React from "react";
import { Geometry } from "@/domain/vision/shapes";
import { imageToScreen, clampRectToBounds, IMAGE_BOUNDS } from "@/lib/editor/coords";
import { Viewport } from "@/lib/editor/types";

export function RegionOverlay({
  color,
  geometry,
  onChange,
  viewport,
  active,
}: {
  color: string;
  geometry: Geometry;
  onChange: (g: Geometry) => void;
  viewport: Viewport;
  active?: boolean;
}): React.JSX.Element | null {
  const x = geometry.x ?? 0;
  const y = geometry.y ?? 0;
  const width = geometry.width ?? 100;
  const height = geometry.height ?? 100;

  const screenTL = imageToScreen({ x, y }, viewport);
  const screenBR = imageToScreen({ x: x + width, y: y + height }, viewport);

  const style: React.CSSProperties = {
    position: "absolute",
    left: screenTL.x,
    top: screenTL.y,
    width: Math.max(0, screenBR.x - screenTL.x),
    height: Math.max(0, screenBR.y - screenTL.y),
    border: `2px solid ${color}`,
    boxSizing: "border-box",
    touchAction: "none",
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
          IMAGE_BOUNDS
        )
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
    e.preventDefault();
    e.stopPropagation();
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

      if (newW < 0) {
        newX += newW;
        newW = -newW;
      }
      if (newH < 0) {
        newY += newH;
        newH = -newH;
      }

      onChange(
        clampRectToBounds({ x: newX, y: newY, width: newW, height: newH }, IMAGE_BOUNDS)
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
      style={style}
      onPointerDown={handlePointerDown}
      className="cursor-move bg-black/10 hover:bg-black/20"
    >
      {active &&
        handles.map(({ id, cursor, ...pos }) => (
          <div
            key={id}
            onPointerDown={(e) => handleResizeDown(e, id)}
            style={{
              position: "absolute",
              width: 8,
              height: 8,
              backgroundColor: "#ff00ff",
              cursor,
              ...pos,
            }}
          />
        ))}
    </div>
  );
}
