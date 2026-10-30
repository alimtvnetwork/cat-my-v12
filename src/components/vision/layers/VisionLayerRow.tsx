import React, { useState, useCallback } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Square,
  Crosshair,
  Ban,
  Layers,
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VisionLayerItem } from "./types";

interface VisionLayerRowProps {
  readonly layer: VisionLayerItem;
  readonly isSelected: boolean;
  readonly onSelect: (id: string) => void;
  readonly onToggleVisibility: (id: string) => void;
  readonly onToggleLocked: (id: string) => void;
  readonly onBringToFront: (id: string) => void;
  readonly onSendToBack: (id: string) => void;
  readonly onMoveUp: (id: string) => void;
  readonly onMoveDown: (id: string) => void;
  readonly onDelete?: (id: string) => void;
  readonly onDuplicate?: (id: string) => void;
}

function getLayerIcon(type: VisionLayerItem["type"]): React.ReactNode {
  switch (type) {
    case "roi":
      return <Square className="h-3.5 w-3.5 text-rose-400" />;
    case "pattern":
      return <Crosshair className="h-3.5 w-3.5 text-cyan-400" />;
    case "mask":
      return <Ban className="h-3.5 w-3.5 text-purple-400" />;
    case "rule":
      return <Sliders className="h-3.5 w-3.5 text-amber-400" />;
    default:
      return <Layers className="h-3.5 w-3.5 text-slate-400" />;
  }
}

export function VisionLayerRow({
  layer,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLocked,
  onBringToFront,
  onSendToBack,
  onMoveUp,
  onMoveDown,
  onDelete,
  onDuplicate,
}: VisionLayerRowProps): React.JSX.Element {
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextPos, setContextPos] = useState({ x: 0, y: 0 });

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextPos({ x: e.clientX, y: e.clientY });
    setIsContextMenuOpen(true);
  }, []);

  return (
    <div
      role="row"
      tabIndex={0}
      data-layer-id={layer.id}
      id={`layer-row-${layer.id}`}
      data-automation-id={`layer-row-${layer.id}`}
      data-automation-name={`Layer ${layer.name}`}
      data-automation-xpath={`//div[@id='layer-row-${layer.id}']`}
      onClick={() => onSelect(layer.id)}
      onContextMenu={handleContextMenu}
      className={cn(
        "group relative flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition select-none border",
        isSelected
          ? "bg-cyan-500/20 text-cyan-200 border-cyan-400/40 shadow-[0_0_8px_rgba(34,211,238,0.15)]"
          : "bg-white/[0.02] text-slate-300 border-transparent hover:bg-white/[0.06] hover:text-white",
        !layer.isVisible && "opacity-50",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          title={layer.isVisible ? "Hide Layer" : "Show Layer"}
          aria-label={layer.isVisible ? "Hide Layer" : "Show Layer"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(layer.id);
          }}
          className="cursor-pointer p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
        >
          {layer.isVisible ? (
            <Eye className="h-3.5 w-3.5 text-cyan-400" />
          ) : (
            <EyeOff className="h-3.5 w-3.5 text-slate-500" />
          )}
        </button>

        <button
          type="button"
          title={layer.isLocked ? "Unlock Layer" : "Lock Layer"}
          aria-label={layer.isLocked ? "Unlock Layer" : "Lock Layer"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLocked(layer.id);
          }}
          className="cursor-pointer p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
        >
          {layer.isLocked ? (
            <Lock className="h-3.5 w-3.5 text-rose-400" />
          ) : (
            <Unlock className="h-3.5 w-3.5 text-slate-500 opacity-60 group-hover:opacity-100" />
          )}
        </button>

        <span className="shrink-0">{getLayerIcon(layer.type)}</span>

        <span className="truncate font-sans font-semibold text-xs tracking-tight">
          {layer.name}
        </span>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
        <button
          type="button"
          title="Move Layer Up"
          aria-label="Move Layer Up"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp(layer.id);
          }}
          className="cursor-pointer p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
        >
          <ChevronUp className="h-3 w-3" />
        </button>

        <button
          type="button"
          title="Move Layer Down"
          aria-label="Move Layer Down"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown(layer.id);
          }}
          className="cursor-pointer p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
        >
          <ChevronDown className="h-3 w-3" />
        </button>

        {onDelete ? (
          <button
            type="button"
            title="Delete Layer"
            aria-label="Delete Layer"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(layer.id);
            }}
            className="cursor-pointer p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        ) : null}
      </div>

      {isContextMenuOpen ? (
        <div
          role="menu"
          className="fixed z-[10090] w-48 rounded-xl border border-white/15 bg-[#0b0e14] p-1.5 shadow-2xl backdrop-blur-2xl text-slate-200 animate-in fade-in zoom-in-95"
          style={{ top: contextPos.y, left: contextPos.x }}
          onClick={(e) => e.stopPropagation()}
          onMouseLeave={() => setIsContextMenuOpen(false)}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs hover:bg-white/10 hover:text-white transition"
            onClick={() => {
              onBringToFront(layer.id);
              setIsContextMenuOpen(false);
            }}
          >
            <ChevronUp className="h-3.5 w-3.5 text-cyan-400" />
            <span>Bring to Front</span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs hover:bg-white/10 hover:text-white transition"
            onClick={() => {
              onSendToBack(layer.id);
              setIsContextMenuOpen(false);
            }}
          >
            <ChevronDown className="h-3.5 w-3.5 text-cyan-400" />
            <span>Send to Back</span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs hover:bg-white/10 hover:text-white transition"
            onClick={() => {
              onToggleLocked(layer.id);
              setIsContextMenuOpen(false);
            }}
          >
            <Lock className="h-3.5 w-3.5 text-rose-400" />
            <span>{layer.isLocked ? "Unlock Layer" : "Lock Layer"}</span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs hover:bg-white/10 hover:text-white transition"
            onClick={() => {
              onToggleVisibility(layer.id);
              setIsContextMenuOpen(false);
            }}
          >
            <Eye className="h-3.5 w-3.5 text-amber-400" />
            <span>{layer.isVisible ? "Hide Layer" : "Show Layer"}</span>
          </button>

          {onDuplicate ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs hover:bg-white/10 hover:text-white transition"
              onClick={() => {
                onDuplicate(layer.id);
                setIsContextMenuOpen(false);
              }}
            >
              <Copy className="h-3.5 w-3.5 text-emerald-400" />
              <span>Duplicate Layer</span>
            </button>
          ) : null}

          {onDelete ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/20 hover:text-rose-200 transition border-t border-white/10 mt-1 pt-1.5"
              onClick={() => {
                onDelete(layer.id);
                setIsContextMenuOpen(false);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Layer</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
