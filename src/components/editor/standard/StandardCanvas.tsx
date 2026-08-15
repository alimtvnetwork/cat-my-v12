import React, { useRef, useState, useEffect } from "react";
import { PatternSearchSettings } from "@/domain/vision/settings";
import { Geometry, ShapeType } from "@/domain/vision/shapes";

export function StandardCanvas({
  settings,
  setSettings,
}: {
  settings: PatternSearchSettings;
  setSettings: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Wheel zoom logic
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -5 : 5;
      setSettings((s) => ({
        ...s,
        view: {
          ...s.view,
          zoom: Math.max(10, Math.min(500, s.view.zoom + delta)),
        },
      }));
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [setSettings]);

  const updatePatternRegion = (geom: Geometry) => {
    setSettings((s) => ({
      ...s,
      patternRegion: { ...s.patternRegion, geometry: geom },
    }));
  };

  const updateSearchRegion = (geom: Geometry) => {
    setSettings((s) => ({
      ...s,
      searchRegion: { ...s.searchRegion, geometry: geom },
    }));
  };

  const updateMaskRegion = (index: number, geom: Geometry) => {
    setSettings((s) => {
      const masks = [...s.masks];
      masks[index] = { ...masks[index], geometry: geom };
      return { ...s, masks };
    });
  };

  return (
    <div
      ref={canvasRef}
      className="flex-1 bg-neutral-900 relative overflow-hidden flex items-center justify-center text-neutral-500 select-none"
    >
      <div
        className="relative border border-neutral-700 bg-neutral-800"
        style={{
          width: 800, // placeholder canvas size
          height: 600,
          transform: `scale(${settings.view.zoom / 100})`,
          transformOrigin: "center center",
        }}
      >
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
          Camera View
        </span>

        {/* Search Region */}
        {settings.searchRegion.shape !== ShapeType.None && (
          <DraggableRegion
            color="blue"
            geometry={settings.searchRegion.geometry}
            onChange={updateSearchRegion}
          />
        )}

        {/* Pattern Region */}
        {settings.patternRegion.shape !== ShapeType.None && (
          <DraggableRegion
            color="green"
            geometry={settings.patternRegion.geometry}
            onChange={updatePatternRegion}
          />
        )}

        {/* Mask Layers */}
        {settings.masks.map((mask, i) =>
          mask.shape !== ShapeType.None ? (
            <DraggableRegion
              key={`mask-${i}`}
              color="red"
              geometry={mask.geometry}
              onChange={(g) => updateMaskRegion(i, g)}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}

function DraggableRegion({
  color,
  geometry,
  onChange,
}: {
  color: string;
  geometry: Geometry;
  onChange: (g: Geometry) => void;
}) {
  const x = geometry.x ?? 0;
  const y = geometry.y ?? 0;
  const width = geometry.width ?? 100;
  const height = geometry.height ?? 100;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startObjX = x;
    const startObjY = y;

    const handlePointerMove = (ev: PointerEvent) => {
      onChange({
        ...geometry,
        x: startObjX + (ev.clientX - startX),
        y: startObjY + (ev.clientY - startY),
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className="absolute cursor-move"
      style={{
        left: x,
        top: y,
        width,
        height,
        border: `2px solid ${color}`,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
      }}
    />
  );
}
