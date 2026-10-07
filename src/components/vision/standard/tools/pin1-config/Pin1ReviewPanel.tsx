import React from "react";
import { Check, Eye, EyeOff, Loader2, Plus, Save, Target } from "lucide-react";
import { GreyscaleSliderCard } from "@/components/vision/white-box/GreyscaleSliderCard";
import type { SearchRegion } from "@/lib/vision/white-box-marking";
import {
  HolePolarityType,
  type Pin1HoleItem,
  type Pin1MatchResult,
  type Pin1RegionEditMode,
} from "./types";

export interface Pin1ReviewPanelProps {
  thresholdLuma: number;
  polarity: HolePolarityType;
  minCircularity: number;
  minRadiusPx: number;
  maxRadiusPx: number;
  tolerancePx: number;
  searchRegion: SearchRegion | null;
  packageRegion: SearchRegion | null;
  regionEditMode: Pin1RegionEditMode;
  detectedHoles: readonly Pin1HoleItem[];
  registeredPin1: Pin1HoleItem | null;
  matchResult: Pin1MatchResult | null;
  isSaving?: boolean;
  saveMessage?: string | null;
  actionButtonLabel?: string;
  onThresholdChange: (val: number) => void;
  onPolarityChange: (val: HolePolarityType) => void;
  onCircularityChange: (val: number) => void;
  onRadiusRangeChange: (minR: number, maxR: number) => void;
  onToleranceChange: (val: number) => void;
  onRegionEditModeChange: (mode: Pin1RegionEditMode) => void;
  onAddPackageRegion: () => void;
  onToggleKeepHole: (id: number) => void;
  onSelectPrimaryPin1: (id: number) => void;
  onIncludeAll: () => void;
  onExcludeAll: () => void;
  onSaveRule: () => void;
  onCancel?: () => void;
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

        <div className="rounded border border-ca-border bg-ca-panel-2 p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-ca-border pb-1 font-semibold uppercase text-xs">
            <span>Regions</span>
            <span className="font-mono text-[11px] text-ca-ink-muted">Search / Package</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => props.onRegionEditModeChange("search")}
              className={`rounded border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                props.regionEditMode === "search"
                  ? "border-yellow-400 bg-yellow-400/15 text-yellow-200"
                  : "border-ca-border bg-ca-panel text-ca-ink hover:bg-ca-bg"
              }`}
            >
              Search Region
            </button>
            <button
              type="button"
              onClick={() => props.onRegionEditModeChange("package")}
              className={`rounded border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                props.regionEditMode === "package"
                  ? "border-sky-400 bg-sky-400/15 text-sky-200"
                  : "border-ca-border bg-ca-panel text-ca-ink hover:bg-ca-bg"
              }`}
            >
              Package Region
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <RegionReadout label="Search" region={props.searchRegion} />
            <RegionReadout label="Package" region={props.packageRegion} />
          </div>

          {!props.packageRegion && (
            <button
              type="button"
              onClick={props.onAddPackageRegion}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2 py-1.5 text-[11px] font-semibold text-ca-ink hover:bg-ca-bg"
            >
              <Plus className="h-3.5 w-3.5 text-ca-select" />
              Add Package Region
            </button>
          )}
        </div>

        {/* 2. Pin 1 Fiducial Geometry Card */}
        <div className="rounded border border-ca-border bg-ca-panel-2 p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-ca-border pb-1 font-semibold uppercase text-xs">
            <span>Pin 1 Fiducial Geometry</span>
            <span className="font-mono text-[11px] text-ca-select">
              {primaryHole ? `R=${Math.round(primaryHole.radius)}px` : "None"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="rounded border border-ca-border/60 bg-ca-panel/80 p-1.5">
              <span className="text-[10px] text-ca-ink-muted block uppercase">Fiducial Center</span>
              <span className="text-ca-ink">
                {primaryHole
                  ? `${Math.round(primaryHole.centerX)}, ${Math.round(primaryHole.centerY)}`
                  : "--"}
              </span>
            </div>
            <div className="rounded border border-ca-border/60 bg-ca-panel/80 p-1.5">
              <span className="text-[10px] text-ca-ink-muted block uppercase">Circularity</span>
              <span className={primaryHole ? "text-emerald-400 font-semibold" : "text-amber-400"}>
                {primaryHole ? `${primaryHole.circularity}%` : "Not Selected"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded border border-ca-border bg-ca-panel-2 p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-ca-border pb-1 font-semibold uppercase text-xs">
            <span>Shape Measurement</span>
            <span className={props.matchResult?.isPass ? "font-mono text-emerald-400" : "font-mono text-rose-300"}>
              {props.matchResult?.status ?? "Not Run"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <MeasurementReadout label="Pos X" value={props.matchResult?.activeHole?.centerX ?? primaryHole?.centerX} suffix="px" />
            <MeasurementReadout label="Pos Y" value={props.matchResult?.activeHole?.centerY ?? primaryHole?.centerY} suffix="px" />
            <MeasurementReadout label="Angle" value={props.matchResult?.angleDeg} suffix="deg" />
            <MeasurementReadout label="Match" value={props.matchResult?.matchPercent ?? props.matchResult?.score} suffix="%" />
            <MeasurementReadout label="Scale" value={props.matchResult?.scale} />
            <MeasurementReadout label="Offset" value={props.matchResult?.deltaDistance} suffix="px" />
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
                No circular holes detected. Adjust greyscale threshold or polarity.
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
      <div className="border-t border-[#333] bg-[#1e1e1e] p-3 flex gap-2">
        <button
          type="button"
          onClick={props.onSaveRule}
          disabled={!primaryHole || props.isSaving}
          className="flex-1 items-center justify-center gap-2 rounded bg-[#00ff9d] text-black py-2 font-bold text-xs shadow transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <span>{props.isSaving ? "SAVING..." : "OK"}</span>
        </button>
        {props.onCancel && (
          <button
            type="button"
            onClick={props.onCancel}
            className="flex-1 items-center justify-center gap-2 rounded bg-transparent border border-[#555] py-2 font-bold text-xs text-white hover:bg-[#333]"
          >
            CANCEL
          </button>
        )}
      </div>
    </aside>
  );
}

function RegionReadout(props: { label: string; region: SearchRegion | null }): React.JSX.Element {
  return (
    <div className="rounded border border-ca-border/60 bg-ca-panel/80 p-1.5">
      <span className="block text-[10px] uppercase text-ca-ink-muted">{props.label}</span>
      <span className="text-ca-ink">
        {props.region
          ? `${props.region.x},${props.region.y} ${props.region.width}x${props.region.height}`
          : "--"}
      </span>
    </div>
  );
}

function MeasurementReadout(props: {
  label: string;
  value: number | undefined;
  suffix?: string;
}): React.JSX.Element {
  const display =
    typeof props.value === "number"
      ? `${Number.isInteger(props.value) ? props.value : props.value.toFixed(1)}${props.suffix ? ` ${props.suffix}` : ""}`
      : "--";

  return (
    <div className="rounded border border-ca-border/60 bg-ca-panel/80 p-1.5">
      <span className="block text-[10px] uppercase text-ca-ink-muted">{props.label}</span>
      <span className="text-ca-ink">{display}</span>
    </div>
  );
}
