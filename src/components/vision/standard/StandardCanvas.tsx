import React, { useRef, useState, useEffect } from "react";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";
import { Geometry, ShapeType } from "@/domain/vision/shapes";
import { imageToScreen, clampRectToBounds, IMAGE_BOUNDS, screenToImage } from "@/lib/editor/coords";
import { Viewport } from "@/lib/editor/types";
import { defaultWorkpieceFilledSample } from "@/lib/vision/workpiece-rule-analyzer";

import { RegionOverlay } from "./RegionOverlay";

export function StandardCanvas({
  settings,
  setSettings,
  viewModes,
}: {
  settings: PatternSearchSettings;
  setSettings: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  viewModes?: { regions: boolean; results: boolean; grid: boolean };
}): React.JSX.Element | null {
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  const zoomFactor = settings.view.zoom / 100;
  const viewport: Viewport = { panX, panY, zoom: zoomFactor };

  const imageRef = settings.imageRef || defaultWorkpieceFilledSample;

  // Load the image via Image object (bypasses <img> tag issues), then draw to canvas.
  useEffect(() => {
    if (!imageRef) {
      setLoadedImage(null);

      return;
    }

    let cancelled = false;
    const img = new Image();

    img.onload = () => {
      if (!cancelled) {
        setLoadedImage(img);
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        setLoadedImage(null);
      }
    };
    img.src = imageRef;

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [imageRef]);

  // Draw the loaded image to the canvas.
  useEffect(() => {
    const canvas = imageCanvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const w = IMAGE_BOUNDS.width * zoomFactor;
    const h = IMAGE_BOUNDS.height * zoomFactor;

    canvas.width = Math.max(1, Math.round(w));
    canvas.height = Math.max(1, Math.round(h));

    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (loadedImage) {
      ctx.drawImage(loadedImage, 0, 0, canvas.width, canvas.height);
    }
  }, [loadedImage, zoomFactor]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const anchorScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      const newZoom = Math.max(0.1, Math.min(5, zoomFactor * Math.exp(-e.deltaY * 0.0015)));

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
  const hasGrid = viewModes?.grid ?? false;

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
        }}
      >
        <canvas
          ref={imageCanvasRef}
          className="h-full w-full select-none"
          style={{ objectFit: "fill" }}
        />
        {hasGrid ? (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1px)",
              backgroundSize: `${20 * zoomFactor}px ${20 * zoomFactor}px`,
            }}
          />
        ) : null}
      </div>

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
              ),
          )}
        </>
      )}
    </div>
  );
}
