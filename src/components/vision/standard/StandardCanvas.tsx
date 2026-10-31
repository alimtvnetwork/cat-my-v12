import React, { useRef, useState, useEffect, useMemo } from "react";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";
import { Geometry, ShapeType } from "@/domain/vision/shapes";
import { imageToScreen, clampRectToBounds, IMAGE_BOUNDS, screenToImage } from "@/lib/editor/coords";
import { Viewport } from "@/lib/editor/types";
import { defaultWorkpieceFilledSample } from "@/lib/vision/workpiece-rule-analyzer";
import { RoiToolbar, type RoiShapeType, type RoiToolbarRegion } from "@/components/vision/white-box/RoiToolbar";

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

  // Modern In-ROI and Handle States (Spec 83)
  const [activeRegionId, setActiveRegionId] = useState<string>("search");
  const [isRoiLocked, setIsRoiLocked] = useState<boolean>(false);
  const [roiShape, setRoiShape] = useState<RoiShapeType>("rectangle");
  const [roiOpacity, setRoiOpacity] = useState<number>(100);

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

    const isAreaTool =
      settings.params?.toolCode === "T101" ||
      settings.id === "T101" ||
      settings.name.toLowerCase().includes("area");

    const isResultsVisible = viewModes?.results ?? true;

    if (isAreaTool && isResultsVisible && settings.searchRegion?.geometry) {
      const geom = settings.searchRegion.geometry;
      const rx = (geom.x ?? 0) * zoomFactor;
      const ry = (geom.y ?? 0) * zoomFactor;
      const rw = (geom.width ?? 100) * zoomFactor;
      const rh = (geom.height ?? 100) * zoomFactor;

      ctx.save();
      ctx.fillStyle = "rgba(16, 185, 129, 0.22)";
      ctx.strokeStyle = "rgba(16, 185, 129, 0.85)";
      ctx.lineWidth = 1.5;

      if (settings.searchRegion.shape === ShapeType.Circle) {
        const cx = (geom.x ?? 0) * zoomFactor;
        const cy = (geom.y ?? 0) * zoomFactor;
        const cr = (geom.radius ?? Math.min(rw, rh) / 2) * zoomFactor;

        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (
        settings.searchRegion.shape === ShapeType.Polygon &&
        geom.points &&
        geom.points.length >= 3
      ) {
        ctx.beginPath();
        ctx.moveTo(geom.points[0].x * zoomFactor, geom.points[0].y * zoomFactor);

        for (let i = 1; i < geom.points.length; i++) {
          ctx.lineTo(geom.points[i].x * zoomFactor, geom.points[i].y * zoomFactor);
        }

        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeRect(rx, ry, rw, rh);
      }

      ctx.restore();
    }

    const toolCode = String(settings.params?.toolCode ?? settings.id ?? "");
    const nameLower = settings.name.toLowerCase();

    const isDefectTool =
      toolCode === "T107" ||
      toolCode === "T108" ||
      toolCode === "T118" ||
      nameLower.includes("defect") ||
      nameLower.includes("scratch") ||
      nameLower.includes("void");

    const isBlobTool =
      toolCode === "T109" ||
      nameLower.includes("blob") ||
      nameLower.includes("bridge");

    if ((isDefectTool || isBlobTool) && isResultsVisible && settings.searchRegion?.geometry) {
      const geom = settings.searchRegion.geometry;
      const rx = (geom.x ?? 0) * zoomFactor;
      const ry = (geom.y ?? 0) * zoomFactor;
      const rw = (geom.width ?? 100) * zoomFactor;
      const rh = (geom.height ?? 100) * zoomFactor;

      ctx.save();

      if (isDefectTool) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
        ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
      } else {
        ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
        ctx.strokeStyle = "rgba(59, 130, 246, 0.85)";
      }

      ctx.lineWidth = 1.5;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);

      const debugFlaws = (settings.params as { debug?: { flaws?: Array<{
        bbox: { x: number; y: number; width: number; height: number };
        flawType: string;
      }> } })?.debug?.flaws;

      if (Array.isArray(debugFlaws)) {
        for (const flaw of debugFlaws) {
          const fx = flaw.bbox.x * zoomFactor;
          const fy = flaw.bbox.y * zoomFactor;
          const fw = flaw.bbox.width * zoomFactor;
          const fh = flaw.bbox.height * zoomFactor;

          ctx.strokeStyle = "#f87171";
          ctx.lineWidth = 2;
          ctx.strokeRect(fx, fy, fw, fh);
          ctx.fillStyle = "#f87171";
          ctx.font = "10px sans-serif";
          ctx.fillText(flaw.flawType, fx, Math.max(10, fy - 2));
        }
      }

      const debugBlobs = (settings.params as { debug?: { blobs?: Array<{
        bbox: { x: number; y: number; width: number; height: number };
        id: number;
        areaPx: number;
      }> } })?.debug?.blobs;

      if (Array.isArray(debugBlobs)) {
        for (const b of debugBlobs) {
          const bx = b.bbox.x * zoomFactor;
          const by = b.bbox.y * zoomFactor;
          const bw = b.bbox.width * zoomFactor;
          const bh = b.bbox.height * zoomFactor;

          ctx.strokeStyle = "#60a5fa";
          ctx.lineWidth = 2;
          ctx.strokeRect(bx, by, bw, bh);
          ctx.fillStyle = "#60a5fa";
          ctx.font = "10px sans-serif";
          ctx.fillText(`Blob #${b.id} (${b.areaPx}px)`, bx, Math.max(10, by - 2));
        }
      }

      const debugCaliper = (
        settings.params as {
          debug?: {
            edges?: Array<{
              canvasCoordinate: { x: number; y: number };
              polarity: string;
              subPixelPos: number;
            }>;
            measuredWidthPx?: number;
            leadPitchMeanPx?: number;
            metricUnit?: string;
          };
        }
      )?.debug;

      if (
        Array.isArray(debugCaliper?.edges) &&
        debugCaliper.edges.length > 0
      ) {
        for (const edge of debugCaliper.edges) {
          const ex = edge.canvasCoordinate.x * zoomFactor;
          const ey = edge.canvasCoordinate.y * zoomFactor;

          ctx.strokeStyle =
            edge.polarity === "dark-to-light" ? "#34d399" : "#fbbf24";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ex, ey, 4, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(ex - 6, ey);
          ctx.lineTo(ex + 6, ey);
          ctx.moveTo(ex, ey - 6);
          ctx.lineTo(ex, ey + 6);
          ctx.stroke();
        }

        if (
          debugCaliper.edges.length >= 2 &&
          typeof debugCaliper.measuredWidthPx === "number"
        ) {
          const e1 = debugCaliper.edges[0];
          const e2 = debugCaliper.edges[1];
          const x1 = Math.min(e1.canvasCoordinate.x, e2.canvasCoordinate.x) * zoomFactor;
          const x2 = Math.max(e1.canvasCoordinate.x, e2.canvasCoordinate.x) * zoomFactor;
          const yPos = e1.canvasCoordinate.y * zoomFactor;

          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x1, yPos);
          ctx.lineTo(x2, yPos);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(x1, yPos - 4);
          ctx.lineTo(x1, yPos + 4);
          ctx.moveTo(x2, yPos - 4);
          ctx.lineTo(x2, yPos + 4);
          ctx.stroke();

          const label =
            typeof debugCaliper.measuredWidthPx === "number"
              ? `${debugCaliper.measuredWidthPx.toFixed(1)} px`
              : "";

          if (label) {
            ctx.fillStyle = "#38bdf8";
            ctx.font = "bold 10px monospace";
            const midX = (x1 + x2) / 2;
            ctx.fillText(label, midX - 18, Math.max(12, yPos - 3));
          }
        }
      }

      ctx.restore();
    }
  }, [
    loadedImage,
    zoomFactor,
    settings.searchRegion,
    settings.params,
    settings.id,
    settings.name,
    viewModes?.results,
  ]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const anchorScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      const newZoom = Math.max(0.1, Math.min(5, zoomFactor * Math.exp(-e.deltaY * 0.0015)));

      const anchorImage = screenToImage(anchorScreen, viewport);

      setPanX(anchorScreen.x - anchorImage.x * newZoom);
      setPanY(anchorScreen.y - anchorImage.y * newZoom);

      setSettings((s) => ({ ...s, view: { ...s.view, zoom: Math.round(newZoom * 100) } }));
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [panX, panY, zoomFactor, viewport, setSettings]);

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

  // Active Region Readouts for Floating In-ROI Toolbar
  const activeToolbarInfo = useMemo(() => {
    if (activeRegionId === "pattern") {
      const g = settings.patternRegion.geometry;
      const screenTL = imageToScreen({ x: g.x ?? 0, y: g.y ?? 0 }, viewport);
      return {
        region: {
          x: screenTL.x,
          y: screenTL.y,
          width: Math.max(10, (g.width ?? 100) * zoomFactor),
          height: Math.max(10, (g.height ?? 100) * zoomFactor),
        },
        label: "PATTERN TEMPLATE",
      };
    }

    const g = settings.searchRegion.geometry;
    const screenTL = imageToScreen({ x: g.x ?? 0, y: g.y ?? 0 }, viewport);
    return {
      region: {
        x: screenTL.x,
        y: screenTL.y,
        width: Math.max(10, (g.width ?? 100) * zoomFactor),
        height: Math.max(10, (g.height ?? 100) * zoomFactor),
      },
      label: "SEARCH REGION",
    };
  }, [
    activeRegionId,
    settings.patternRegion.geometry,
    settings.searchRegion.geometry,
    viewport,
    zoomFactor,
  ]);

  return (
    <div
      ref={canvasRef}
      className="flex-1 bg-neutral-900 relative overflow-hidden touch-none select-none"
      onPointerDown={handlePointerDown}
      data-testid="standard-canvas-container"
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
        <img
          src={imageRef}
          alt="Registered reference"
          className="hidden pointer-events-none"
          tabIndex={-1}
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
              border: "1px solid rgba(148, 163, 184, 0.35)",
              pointerEvents: "none",
            }}
          />

          {/* In-Canvas Floating ROI Toolbar pinned to Active Region */}
          <RoiToolbar
            region={activeToolbarInfo.region}
            canvasWidth={canvasRef.current?.clientWidth ?? (IMAGE_BOUNDS.width * zoomFactor)}
            canvasHeight={canvasRef.current?.clientHeight ?? (IMAGE_BOUNDS.height * zoomFactor)}
            label={activeToolbarInfo.label}
            isLocked={isRoiLocked}
            onToggleLock={() => setIsRoiLocked((prev) => !prev)}
            shape={roiShape}
            onShapeChange={setRoiShape}
            isMaskEnabled={settings.masks.some((m) => m.shape !== ShapeType.None)}
            opacity={roiOpacity}
            onOpacityChange={setRoiOpacity}
          />

          <RegionOverlay
            color="#00e5ff"
            geometry={settings.searchRegion.geometry}
            onChange={updateSearchRegion}
            viewport={viewport}
            active={activeRegionId === "search"}
            isLocked={isRoiLocked}
            label="SEARCH REGION"
            onSelect={() => setActiveRegionId("search")}
          />

          <RegionOverlay
            color="#10b981"
            geometry={settings.patternRegion.geometry}
            onChange={updatePatternRegion}
            viewport={viewport}
            active={activeRegionId === "pattern"}
            isLocked={isRoiLocked}
            label="PATTERN TEMPLATE"
            onSelect={() => setActiveRegionId("pattern")}
          />

          {settings.masks.map(
            (mask, i) =>
              mask.shape !== ShapeType.None && (
                <RegionOverlay
                  key={i}
                  color="#f59e0b"
                  geometry={mask.geometry}
                  onChange={(geom) => updateMaskRegion(i, geom)}
                  viewport={viewport}
                  active={activeRegionId === `mask-${i}`}
                  isLocked={isRoiLocked}
                  label={`MASK #${i + 1}`}
                  onSelect={() => setActiveRegionId(`mask-${i}`)}
                />
              ),
          )}
        </>
      )}
    </div>
  );
}
