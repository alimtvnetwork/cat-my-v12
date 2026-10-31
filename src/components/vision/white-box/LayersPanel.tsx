import { ChevronDown, ChevronUp, Eye, EyeOff, Lock, LockOpen } from "lucide-react";
import type { CanvasLayer, LayersPanelProps } from "./types";

const KIND_LABELS: Record<CanvasLayer["kind"], string> = {
  roi: "ROI",
  pattern: "Pattern",
  mask: "Mask",
  box: "Box",
};

export function LayersPanel(props: LayersPanelProps): React.JSX.Element {
  const hasReorder =
    props.onBringLayerForward !== undefined && props.onSendLayerBackward !== undefined;
  const hasVisibility = props.onToggleLayerVisibility !== undefined;
  const hasLock = props.onToggleLayerLock !== undefined;

  return (
    <section
      data-ui-id={props.panelId}
      aria-label="Layers"
      className="flex h-full min-h-0 flex-col overflow-hidden border-t border-[#2a3138] bg-[#111820]"
    >
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#242c35] px-3">
        <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ca-ink">
          Layers
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ca-ink-muted">
          {props.layers.length} layers • top first
        </span>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto py-1">
        {props.layers.map((layer, index) => {
          const isSelected = props.selectedLayerId === layer.id;
          const isTop = index === 0;
          const isBottom = index === props.layers.length - 1;
          const isReorderable = props.isLayerReorderable?.(layer) ?? true;

          return (
            <li key={layer.id}>
              <div
                className={`flex items-center gap-1.5 px-2 py-1.5 ${
                  isSelected ? "bg-[#1d2f3d]" : "hover:bg-[#1a222b]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => props.onSelectLayer(layer.id)}
                  title={`Select ${layer.label}`}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="w-12 shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ca-ink-muted">
                    {KIND_LABELS[layer.kind]}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-xs ${
                      isSelected ? "font-bold text-white" : "text-ca-ink"
                    } ${layer.isVisible ? "" : "opacity-50 line-through"}`}
                  >
                    {layer.label}
                  </span>
                  {layer.rotationDeg !== 0 && (
                    <span className="shrink-0 font-mono text-[10px] text-ca-ink-muted">
                      {layer.rotationDeg}°
                    </span>
                  )}
                  {layer.isLocked && (
                    <Lock size={12} className="shrink-0 text-yellow-400" aria-label="Locked" />
                  )}
                </button>
                {hasVisibility && (
                  <button
                    type="button"
                    onClick={() => props.onToggleLayerVisibility?.(layer.id)}
                    title={layer.isVisible ? `Hide ${layer.label}` : `Show ${layer.label}`}
                    className="shrink-0 rounded p-1 text-ca-ink-muted hover:bg-[#2a3138] hover:text-white"
                  >
                    {layer.isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                )}
                {hasLock && layer.kind === "roi" && (
                  <button
                    type="button"
                    onClick={() => props.onToggleLayerLock?.(layer.id)}
                    title={layer.isLocked ? `Unlock ${layer.label}` : `Lock ${layer.label}`}
                    className="shrink-0 rounded p-1 text-ca-ink-muted hover:bg-[#2a3138] hover:text-white"
                  >
                    {layer.isLocked ? <Lock size={13} /> : <LockOpen size={13} />}
                  </button>
                )}
                {hasReorder && (
                  <span className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      disabled={isTop || !isReorderable}
                      onClick={() => props.onBringLayerForward?.(layer.id)}
                      title={`Bring ${layer.label} forward`}
                      className="rounded p-0.5 text-ca-ink-muted hover:bg-[#2a3138] hover:text-white disabled:opacity-30"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={isBottom || !isReorderable}
                      onClick={() => props.onSendLayerBackward?.(layer.id)}
                      title={`Send ${layer.label} backward`}
                      className="rounded p-0.5 text-ca-ink-muted hover:bg-[#2a3138] hover:text-white disabled:opacity-30"
                    >
                      <ChevronDown size={13} />
                    </button>
                  </span>
                )}
              </div>
            </li>
          );
        })}
        {props.layers.length === 0 && (
          <li className="px-3 py-2 text-xs text-ca-ink-muted">
            No layers yet — create a region of interest on the canvas.
          </li>
        )}
      </ul>
    </section>
  );
}
