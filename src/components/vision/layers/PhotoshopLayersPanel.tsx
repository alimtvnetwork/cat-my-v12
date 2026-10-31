import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Copy,
  Trash2,
  Layers,
  Image as ImageIcon,
  Square,
  Crosshair,
  Shield,
  Palette,
  Sparkles,
  Plus,
} from "lucide-react";
import type { PhotoshopLayersPanelProps, VisionLayerItem, VisionLayerType } from "./types";

function getLayerIcon(type: VisionLayerType) {
  if (type === "image") {
    return <ImageIcon size={13} className="text-sky-400" />;
  }

  if (type === "roi") {
    return <Square size={13} className="text-[#00e5ff]" />;
  }

  if (type === "pattern") {
    return <Crosshair size={13} className="text-emerald-400" />;
  }

  if (type === "mask") {
    return <Shield size={13} className="text-amber-400" />;
  }

  if (type === "overlay") {
    return <Sparkles size={13} className="text-fuchsia-400" />;
  }

  return <Palette size={13} className="text-cyan-400" />;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  layerId: string;
}

export interface PhotoshopLayersPanelPropsWithRegion extends PhotoshopLayersPanelProps {
  onCreateRegion?: () => void;
}

export function PhotoshopLayersPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleVisibility,
  onToggleLocked,
  onBringToFront,
  onSendToBack,
  onMoveUp,
  onMoveDown,
  onDeleteLayer,
  onDuplicateLayer,
  onCreateRegion,
}: PhotoshopLayersPanelPropsWithRegion): React.JSX.Element {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    layerId: "",
  });

  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, layerId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();

    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      layerId,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    function handleDocumentClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    }

    if (contextMenu.isOpen) {
      document.addEventListener("mousedown", handleDocumentClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [contextMenu.isOpen, closeContextMenu]);

  const activeLayer = layers.find((l) => l.id === selectedLayerId);
  const isSelectedActive = Boolean(activeLayer);
  const isSelectedLocked = Boolean(activeLayer?.isLocked);
  const isSelectedFixed = activeLayer?.type === "image";

  // Photoshop stack order: Top visual layers at top of list (highest zIndex first)
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c1017]/95 shadow-2xl backdrop-blur-xl">
      {/* Panel Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-3 py-2">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-[#00e5ff]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-white">
            Layers Stack
          </span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-mono text-white/60">
            {layers.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onCreateRegion ? (
            <button
              type="button"
              data-testid="btn-new-region-header"
              onClick={onCreateRegion}
              className="flex items-center gap-1 rounded border border-[#00e5ff]/30 bg-[#00e5ff]/10 px-2 py-0.5 font-sans text-[10px] font-semibold text-[#00e5ff] hover:border-[#00e5ff]/60 hover:bg-[#00e5ff]/20 active:scale-95 transition"
              title="New Region / Rectangle Rule"
            >
              <Plus size={11} />
              <span>New Region</span>
            </button>
          ) : null}

          <div className="flex items-center gap-1 text-[10px] text-white/40">
            <span>Photoshop-Style</span>
          </div>
        </div>
      </div>

      {/* Layer List Stack */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1 select-none">
        {sortedLayers.map((layer, index) => {
          const isSelected = layer.id === selectedLayerId;
          const isLayerImage = layer.type === "image";
          const isTopLayer = index === 0;
          const isBottomLayer = index === sortedLayers.length - 1;

          return (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              onContextMenu={(e) => handleContextMenu(e, layer.id)}
              className={`group flex items-center justify-between rounded-lg border px-2 py-1.5 text-xs transition cursor-pointer ${
                isSelected
                  ? "border-[#00e5ff]/50 bg-[#00e5ff]/10 text-white shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                  : "border-white/5 bg-white/[0.02] text-white/70 hover:border-white/15 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              {/* Left: Swatch + Icons + Name */}
              <div className="flex min-w-0 items-center gap-2">
                {/* Color Swatch Tag */}
                <div
                  className="h-3.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: layer.colorTag }}
                  title={`Color Tag: ${layer.colorTag}`}
                />

                {/* Visibility Toggle Eye */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(layer.id);
                  }}
                  className={`p-0.5 transition rounded hover:bg-white/10 ${
                    layer.isVisible ? "text-white/80 hover:text-white" : "text-white/20 hover:text-white/40"
                  }`}
                  title={layer.isVisible ? "Hide Layer" : "Show Layer"}
                >
                  {layer.isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>

                {/* Lock Toggle Padlock */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();

                    if (!isLayerImage) {
                      onToggleLocked(layer.id);
                    }
                  }}
                  disabled={isLayerImage}
                  className={`p-0.5 transition rounded ${
                    isLayerImage
                      ? "text-white/20 cursor-not-allowed"
                      : layer.isLocked
                        ? "text-amber-400 hover:text-amber-300"
                        : "text-white/20 hover:text-white/50"
                  }`}
                  title={layer.isLocked ? "Layer Locked (Click to Unlock)" : "Lock Layer"}
                >
                  {layer.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>

                {/* Layer Icon */}
                <div className="shrink-0">{getLayerIcon(layer.type)}</div>

                {/* Layer Name & Details */}
                <div className="min-w-0 flex flex-col">
                  <span
                    className={`truncate font-medium text-[11px] ${
                      isSelected ? "text-white font-semibold" : "text-white/80"
                    }`}
                  >
                    {layer.name}
                  </span>

                  {layer.details ? (
                    <span className="truncate font-mono text-[9px] text-white/40">
                      {layer.details}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Right: z-index badge */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono text-[9px] rounded bg-black/40 px-1 py-0.5 text-white/40">
                  z:{layer.zIndex}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Toolbar: Quick Stack Actions */}
      <div className="flex shrink-0 items-center justify-between border-t border-white/[0.08] bg-white/[0.02] p-2">
        <div className="flex items-center gap-1">
          {/* Bring to Front */}
          <button
            type="button"
            disabled={!isSelectedActive || isSelectedFixed}
            onClick={() => activeLayer && onBringToFront(activeLayer.id)}
            className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/5 text-white/70 hover:border-[#00e5ff]/40 hover:bg-[#00e5ff]/10 hover:text-[#00e5ff] disabled:opacity-30 disabled:pointer-events-none transition"
            title="Bring to Front"
          >
            <ChevronsUp size={13} />
          </button>

          {/* Move Up */}
          <button
            type="button"
            disabled={!isSelectedActive || isSelectedFixed}
            onClick={() => activeLayer && onMoveUp(activeLayer.id)}
            className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/5 text-white/70 hover:border-[#00e5ff]/40 hover:bg-[#00e5ff]/10 hover:text-[#00e5ff] disabled:opacity-30 disabled:pointer-events-none transition"
            title="Move Layer Up"
          >
            <ChevronUp size={13} />
          </button>

          {/* Move Down */}
          <button
            type="button"
            disabled={!isSelectedActive || isSelectedFixed}
            onClick={() => activeLayer && onMoveDown(activeLayer.id)}
            className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/5 text-white/70 hover:border-[#00e5ff]/40 hover:bg-[#00e5ff]/10 hover:text-[#00e5ff] disabled:opacity-30 disabled:pointer-events-none transition"
            title="Move Layer Down"
          >
            <ChevronDown size={13} />
          </button>

          {/* Send to Back */}
          <button
            type="button"
            disabled={!isSelectedActive || isSelectedFixed}
            onClick={() => activeLayer && onSendToBack(activeLayer.id)}
            className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/5 text-white/70 hover:border-[#00e5ff]/40 hover:bg-[#00e5ff]/10 hover:text-[#00e5ff] disabled:opacity-30 disabled:pointer-events-none transition"
            title="Send to Back"
          >
            <ChevronsDown size={13} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* New Region / Rectangle */}
          {onCreateRegion ? (
            <button
              type="button"
              data-testid="btn-new-region-rectangle"
              onClick={onCreateRegion}
              className="flex h-7 items-center gap-1 rounded border border-[#00e5ff]/30 bg-[#00e5ff]/10 px-2 font-sans text-[10px] font-semibold text-[#00e5ff] hover:border-[#00e5ff]/60 hover:bg-[#00e5ff]/20 active:scale-95 transition"
              title="New Region / Rectangle"
            >
              <Square size={12} className="text-[#00e5ff]" />
              <span>New Region</span>
            </button>
          ) : null}

          {/* Duplicate Layer */}
          {onDuplicateLayer ? (
            <button
              type="button"
              disabled={!isSelectedActive || isSelectedFixed}
              onClick={() => activeLayer && onDuplicateLayer(activeLayer.id)}
              className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/5 text-white/70 hover:border-[#00e5ff]/40 hover:bg-[#00e5ff]/10 hover:text-[#00e5ff] disabled:opacity-30 disabled:pointer-events-none transition"
              title="Duplicate Layer"
            >
              <Copy size={13} />
            </button>
          ) : null}

          {/* Delete Layer */}
          {onDeleteLayer ? (
            <button
              type="button"
              disabled={!isSelectedActive || isSelectedFixed}
              onClick={() => activeLayer && onDeleteLayer(activeLayer.id)}
              className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/5 text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-30 disabled:pointer-events-none transition"
              title="Delete Layer"
            >
              <Trash2 size={13} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Floating Right-Click Context Menu */}
      {contextMenu.isOpen ? (
        <div
          ref={menuRef}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 min-w-44 rounded-lg border border-white/15 bg-[#0f172a]/95 p-1 text-xs text-white shadow-2xl backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => {
              onBringToFront(contextMenu.layerId);
              closeContextMenu();
            }}
            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left hover:bg-[#00e5ff]/20 hover:text-[#00e5ff]"
          >
            <ChevronsUp size={13} />
            <span>Bring to Front</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onMoveUp(contextMenu.layerId);
              closeContextMenu();
            }}
            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left hover:bg-[#00e5ff]/20 hover:text-[#00e5ff]"
          >
            <ChevronUp size={13} />
            <span>Move Up</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onMoveDown(contextMenu.layerId);
              closeContextMenu();
            }}
            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left hover:bg-[#00e5ff]/20 hover:text-[#00e5ff]"
          >
            <ChevronDown size={13} />
            <span>Move Down</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSendToBack(contextMenu.layerId);
              closeContextMenu();
            }}
            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left hover:bg-[#00e5ff]/20 hover:text-[#00e5ff]"
          >
            <ChevronsDown size={13} />
            <span>Send to Back</span>
          </button>

          <div className="my-1 border-t border-white/10" />

          <button
            type="button"
            onClick={() => {
              onToggleLocked(contextMenu.layerId);
              closeContextMenu();
            }}
            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left hover:bg-white/10"
          >
            <Lock size={13} />
            <span>Toggle Lock</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleVisibility(contextMenu.layerId);
              closeContextMenu();
            }}
            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left hover:bg-white/10"
          >
            <Eye size={13} />
            <span>Toggle Visibility</span>
          </button>

          {onDuplicateLayer ? (
            <button
              type="button"
              onClick={() => {
                onDuplicateLayer(contextMenu.layerId);
                closeContextMenu();
              }}
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left hover:bg-white/10"
            >
              <Copy size={13} />
              <span>Duplicate</span>
            </button>
          ) : null}

          {onDeleteLayer ? (
            <>
              <div className="my-1 border-t border-white/10" />
              <button
                type="button"
                onClick={() => {
                  onDeleteLayer(contextMenu.layerId);
                  closeContextMenu();
                }}
                className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
              >
                <Trash2 size={13} />
                <span>Delete Layer</span>
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
