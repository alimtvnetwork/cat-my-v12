import React, { useRef, useState, useEffect } from "react";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";
import { Geometry, ShapeType } from "@/domain/vision/shapes";
import { imageToScreen, clampRectToBounds, IMAGE_BOUNDS, screenToImage } from "@/lib/editor/coords";
import { Viewport } from "@/lib/editor/types";

function RegionOverlay({
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
}) {
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

export function StandardCanvas({
  settings,
  setSettings,
  viewModes,
}: {
  settings: PatternSearchSettings;
  setSettings: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  viewModes?: { regions: boolean; results: boolean; grid: boolean };
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  const zoomFactor = settings.view.zoom / 100;
  const viewport: Viewport = { panX, panY, zoom: zoomFactor };

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const anchorScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      const newZoom = Math.max(
        0.1,
        Math.min(5, zoomFactor * Math.exp(-e.deltaY * 0.0015))
      );

      const anchorImage = screenToImage(anchorScreen, viewport);

      const newPanX = anchorScreen.x - anchorImage.x * newZoom;
      const newPanY = anchorScreen.y - anchorImage.y * newZoom;

      setPanX(newPanX);
      setPanY(newPanY);

      setSettings((s) => ({
        ...s,
        view: { ...s.view, zoom: Math.round(newZoom * 100) },
      }));
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [setSettings, zoomFactor, viewport]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);
      const startX = e.clientX;
      const startY = e.clientY;
      const startPanX = panX;
      const startPanY = panY;

      const onMove = (moveEv: PointerEvent) => {
        setPanX(startPanX + (moveEv.clientX - startX));
        setPanY(startPanY + (moveEv.clientY - startY));
      };

      const onUp = () => {
        el.releasePointerCapture(e.pointerId);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    }
  };

  const updatePatternRegion = (geom: Geometry) => {
    setSettings((s) => ({ ...s, patternRegion: { ...s.patternRegion, geometry: geom } }));
  };

  const updateSearchRegion = (geom: Geometry) => {
    setSettings((s) => ({ ...s, searchRegion: { ...s.searchRegion, geometry: geom } }));
  };

  const updateMaskRegion = (index: number, geom: Geometry) => {
    setSettings((s) => {
      const masks = [...s.masks];
      masks[index] = { ...masks[index], geometry: geom };
      return { ...s, masks };
    });
  };

  const showRegions = viewModes?.regions ?? true;

  return (
    <div
      ref={canvasRef}
      className="flex-1 bg-neutral-900 relative overflow-hidden touch-none select-none"
      onPointerDown={handlePointerDown}
    >
      <div
        style={{
          position: "absolute",
          left: panX,
          top: panY,
          width: IMAGE_BOUNDS.width * zoomFactor,
          height: IMAGE_BOUNDS.height * zoomFactor,
          backgroundColor: "#333",
          backgroundImage: "radial-gradient(#444 1px, transparent 1px)",
          backgroundSize: `${20 * zoomFactor}px ${20 * zoomFactor}px`,
        }}
      />

      {showRegions && (
        <>
          <div
            style={{
              position: "absolute",
              left: panX,
              top: panY,
              width: IMAGE_BOUNDS.width * zoomFactor,
              height: IMAGE_BOUNDS.height * zoomFactor,
              border: "2px solid yellow",
              pointerEvents: "none",
            }}
          />

          <RegionOverlay
            color="blue"
            geometry={settings.searchRegion.geometry}
            onChange={updateSearchRegion}
            viewport={viewport}
            active={true}
          />

          <RegionOverlay
            color="#00ff00"
            geometry={settings.patternRegion.geometry}
            onChange={updatePatternRegion}
            viewport={viewport}
            active={true}
          />

          {settings.masks.map(
            (mask, i) =>
              mask.shape !== ShapeType.None && (
                <RegionOverlay
                  key={i}
                  color="red"
                  geometry={mask.geometry}
                  onChange={(geom) => updateMaskRegion(i, geom)}
                  viewport={viewport}
                  active={true}
                />
              )
          )}
        </>
      )}
    </div>
  );
}
