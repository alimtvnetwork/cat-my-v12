import React, { useMemo } from "react";
import { Layers, Plus, Shield, Sliders } from "lucide-react";
import type { PhotoshopLayersPanelProps } from "./types";
import { VisionLayerRow } from "./VisionLayerRow";

export function VisionLayersPanel({
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
}: PhotoshopLayersPanelProps): React.JSX.Element {
  // Sort layers by zIndex descending (topmost rendered layer at the top of the panel)
  const sortedLayers = useMemo(() => {
    return [...layers].sort((a, b) => b.zIndex - a.zIndex);
  }, [layers]);

  return (
    <div
      data-testid="vision-layers-panel"
      id="panel-vision-layers"
      data-automation-id="panel-vision-layers"
      data-automation-name="Vision Layers Panel"
      data-automation-xpath="//div[@id='panel-vision-layers']"
      className="flex flex-col h-full rounded-xl border border-white/[0.08] bg-[#0c1017]/90 shadow-2xl backdrop-blur-xl overflow-hidden select-none"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-3 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-cyan-400" />
          <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-white">
            Layers Stack
          </h3>
          <span className="rounded-full bg-cyan-950/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300 border border-cyan-800/60">
            {layers.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400 font-mono">
            {layers.filter((l) => l.isLocked).length > 0 ? (
              <span className="flex items-center gap-1 text-rose-400">
                <Shield className="h-3 w-3" />
                <span>Locked</span>
              </span>
            ) : null}
          </span>
        </div>
      </div>

      {/* Layers List Viewport */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
        {sortedLayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-36 text-center text-slate-500 p-4">
            <Sliders className="h-6 w-6 text-slate-600 mb-2 stroke-[1.5]" />
            <p className="text-xs font-medium">No layers defined yet</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Draw an ROI or Pattern on the canvas to instantiate layers.
            </p>
          </div>
        ) : (
          sortedLayers.map((layer) => (
            <VisionLayerRow
              key={layer.id}
              layer={layer}
              isSelected={layer.id === selectedLayerId}
              onSelect={onSelectLayer}
              onToggleVisibility={onToggleVisibility}
              onToggleLocked={onToggleLocked}
              onBringToFront={onBringToFront}
              onSendToBack={onSendToBack}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onDelete={onDeleteLayer}
              onDuplicate={onDuplicateLayer}
            />
          ))
        )}
      </div>

      {/* Panel Footer Controls */}
      <div className="border-t border-white/[0.08] bg-white/[0.02] px-3 py-2 flex items-center justify-between text-xs text-slate-400 shrink-0">
        <span className="text-[10px] text-slate-500 font-mono">Right-click for options</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Layer Hint"
            className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition"
          >
            Photoshop Mode
          </button>
        </div>
      </div>
    </div>
  );
}
