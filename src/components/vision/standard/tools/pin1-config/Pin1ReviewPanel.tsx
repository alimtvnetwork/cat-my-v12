import React from "react";
import { Check, Eye, EyeOff, Loader2, Save, Target } from "lucide-react";
import { GreyscaleSliderCard } from "@/components/vision/white-box/GreyscaleSliderCard";
import type { SearchRegion } from "@/lib/vision/white-box-marking";
import { HolePolarityType, type Pin1HoleItem } from "./types";

export interface Pin1ReviewPanelProps {
  thresholdLuma: number;
  polarity: HolePolarityType;
  minCircularity: number;
  minRadiusPx: number;
  maxRadiusPx: number;
  tolerancePx: number;
  searchRegion: SearchRegion | null;
  detectedHoles: readonly Pin1HoleItem[];
  registeredPin1: Pin1HoleItem | null;
  isSaving?: boolean;
  saveMessage?: string | null;
  actionButtonLabel?: string;
  onThresholdChange: (val: number) => void;
  onPolarityChange: (val: HolePolarityType) => void;
  onCircularityChange: (val: number) => void;
  onRadiusRangeChange: (minR: number, maxR: number) => void;
  onToleranceChange: (val: number) => void;
  onToggleKeepHole: (id: number) => void;
  onSelectPrimaryPin1: (id: number) => void;
  onIncludeAll: () => void;
  onExcludeAll: () => void;
  onSaveRule: () => void;
}

export function Pin1ReviewPanel(props: Pin1ReviewPanelProps): React.JSX.Element {
  const hasHoles = props.detectedHoles.length > 0;
  const primaryHole =
    props.detectedHoles.find((h) => h.isPrimaryPin1 && h.isKept) ?? props.registeredPin1;
  const label = props.actionButtonLabel ?? "Save as Pin 1 Rule";

  return (
    <aside className="flex h-full flex-col overflow-hidden border-l border-ca-border bg-ca-panel text-ca-ink">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-ca-border px-3">
        <span className="font-semibold uppercase tracking-wide text-xs">Pin 1 Configuration</span>
        <span className="font-mono text-[11px] text-ca-ink-muted">T117</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* 1. Exact Greyscale Slider Card */}
        <GreyscaleSliderCard
          greyscaleLevel={props.thresholdLuma}
          onGreyscaleChange={props.onThresholdChange}
        />

        {/* 2. Search Region & Dimple Geometry Card */}
        <div className="rounded border border-ca-border bg-ca-panel-2 p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-ca-border pb-1 font-semibold uppercase text-xs">
            <span>Search Region (ROI)</span>
            <span className="font-mono text-[11px] text-cyan-400">
              {props.searchRegion
                ? `${Math.round(props.searchRegion.width)}×${Math.round(props.searchRegion.height)}`
                : "None"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="rounded border border-ca-border/60 bg-ca-panel/80 p-1.5">
              <span className="text-[10px] text-ca-ink-muted block uppercase">X / Y</span>
              <span className="text-ca-ink">
                {props.searchRegion
                  ? `${Math.round(props.searchRegion.x)}, ${Math.round(props.searchRegion.y)}`
                  : "--"}
              </span>
            </div>
            <div className="rounded border border-ca-border/60 bg-ca-panel/80 p-1.5">
              <span className="text-[10px] text-ca-ink-muted block uppercase">Primary Dimple</span>
              <span className={primaryHole ? "text-emerald-400 font-semibold" : "text-amber-400"}>
                {primaryHole ? `#${primaryHole.id} (${primaryHole.circularity}%)` : "Not Selected"}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Physical Dimple Criteria */}
        <div className="rounded border border-ca-border bg-ca-panel-2 p-3 space-y-2.5">
          <div className="flex items-center justify-between border-b border-ca-border pb-1 font-semibold uppercase text-xs">
            <span>Hole Detection Filters</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ca-ink-muted">Polarity</span>
              <span className="font-mono text-ca-select">
                {props.polarity === HolePolarityType.DarkIndentation ? "Dark Indentation" : "Light Dot"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => props.onPolarityChange(HolePolarityType.DarkIndentation)}
                className={`rounded border px-2 py-1 text-[11px] font-semibold transition-colors ${
                  props.polarity === HolePolarityType.DarkIndentation
                    ? "border-ca-select bg-ca-select/20 text-ca-select"
                    : "border-ca-border bg-ca-panel text-ca-ink hover:bg-ca-panel-2"
                }`}
              >
                Dark Dimple
              </button>
              <button
                type="button"
                onClick={() => props.onPolarityChange(HolePolarityType.LightDot)}
                className={`rounded border px-2 py-1 text-[11px] font-semibold transition-colors ${
                  props.polarity === HolePolarityType.LightDot
                    ? "border-ca-select bg-ca-select/20 text-ca-select"
                    : "border-ca-border bg-ca-panel text-ca-ink hover:bg-ca-panel-2"
                }`}
              >
                Light Mark
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ca-ink-muted">Min Circularity</span>
              <span className="font-mono text-ca-select">{props.minCircularity}%</span>
            </div>
            <input
              type="range"
              min={40}
              max={95}
              value={props.minCircularity}
              onChange={(e) => props.onCircularityChange(Number(e.target.value))}
              className="w-full accent-ca-select"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ca-ink-muted">Tolerance Margin</span>
              <span className="font-mono text-ca-select">±{props.tolerancePx} px</span>
            </div>
            <input
              type="range"
              min={2}
              max={30}
              value={props.tolerancePx}
              onChange={(e) => props.onToleranceChange(Number(e.target.value))}
              className="w-full accent-ca-select"
            />
          </div>
        </div>

        {/* 4. Detected Holes Review List */}
        <div className="rounded border border-ca-border bg-ca-panel-2 p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-ca-border pb-1.5">
            <span className="font-semibold uppercase text-xs">
              Detected Holes ({props.detectedHoles.length})
            </span>
            {hasHoles && (
              <div className="flex items-center gap-1 text-[10px]">
                <button type="button" onClick={props.onIncludeAll} className="hover:text-ca-select">
                  All
                </button>
                <span>/</span>
                <button type="button" onClick={props.onExcludeAll} className="hover:text-rose-400">
                  None
                </button>
              </div>
            )}
          </div>

          <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {hasHoles ? (
              props.detectedHoles.map((hole) => {
                const isPrimary = hole.isPrimaryPin1 && hole.isKept;

                return (
                  <div
                    key={hole.id}
                    className={`flex items-center justify-between rounded border p-2 text-xs transition-colors ${
                      isPrimary
                        ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                        : !hole.isKept
                          ? "border-ca-border/40 bg-ca-panel/40 opacity-50"
                          : "border-ca-border bg-ca-panel"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => props.onSelectPrimaryPin1(hole.id)}
                        title="Set as Primary Pin 1 Mark"
                        className={`rounded p-1 transition-colors ${
                          isPrimary
                            ? "bg-emerald-500 text-black font-bold"
                            : "text-ca-ink-muted hover:text-ca-select"
                        }`}
                      >
                        <Target className="h-3.5 w-3.5" />
                      </button>

                      <div className="font-mono text-[11px] leading-tight">
                        <span className="font-semibold">
                          #{hole.id} {isPrimary ? "(PIN 1)" : ""}
                        </span>
                        <div className="text-[10px] text-ca-ink-muted">
                          R={hole.radius}px | Circ: {hole.circularity}%
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => props.onToggleKeepHole(hole.id)}
                      title={hole.isKept ? "Exclude Hole" : "Keep Hole"}
                      className={`rounded p-1 transition-colors ${
                        hole.isKept
                          ? "text-emerald-400 hover:text-rose-400"
                          : "text-rose-400 hover:text-emerald-400"
                      }`}
                    >
                      {hole.isKept ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="py-4 text-center text-[11px] text-ca-ink-muted">
                No circular holes detected. Adjust greyscale or draw ROI.
              </p>
            )}
          </div>
        </div>

        {props.saveMessage && (
          <div className="flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 p-2 text-xs text-emerald-300">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span className="font-mono text-[11px]">{props.saveMessage}</span>
          </div>
        )}
      </div>

      {/* 5. Save Button Footer */}
      <div className="border-t border-ca-border bg-ca-panel-2 p-3">
        <button
          type="button"
          onClick={props.onSaveRule}
          disabled={!primaryHole || props.isSaving}
          className="flex w-full items-center justify-center gap-2 rounded bg-ca-select py-2 font-semibold text-xs text-ca-bg shadow transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {props.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{props.isSaving ? "Saving..." : label}</span>
        </button>
      </div>
    </aside>
  );
}
