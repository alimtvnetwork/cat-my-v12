import {
  Activity,
  Camera,
  Image as ImageIcon,
  Layers,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Upload,
} from "lucide-react";
import type { PatternMatchHeaderProps } from "./types";
import { TOTAL_BATCH_DEVICES } from "./useConveyorSimulation";

export function PatternMatchHeader(props: PatternMatchHeaderProps): React.JSX.Element {
  const isSimulating = props.simulation?.isSimulating ?? false;
  const isPlaying = props.simulation?.isPlaying ?? false;
  const inspectedCount = props.simulation?.inspectedCount ?? 0;
  const isBatchComplete = props.simulation?.isBatchComplete ?? false;

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      props.onLoadFile(file);
      props.simulation?.setIsSimulating(false);
      e.target.value = "";
    }
  };

  return (
    <header className="flex h-11 shrink-0 flex-wrap items-center gap-2.5 border-b border-ca-border bg-ca-panel-2 px-3 py-1.5 text-xs font-sans">
      {/* Mode Selector Tabs: Conveyor vs Image Inspection */}
      <div className="flex items-center rounded border border-ca-border bg-ca-bg p-0.5">
        <button
          type="button"
          onClick={() => {
            props.onSimulationModeChange?.("conveyor");
            props.simulation?.setIsSimulating(true);
          }}
          className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-bold transition-all ${
            props.simulationMode === "conveyor" || isSimulating
              ? "bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/40"
              : "text-ca-ink-muted hover:text-ca-ink"
          }`}
        >
          <Activity className="h-3.5 w-3.5 text-cyan-400" />
          <span>Single Conveyor</span>
        </button>

        <button
          type="button"
          onClick={() => {
            props.onSimulationModeChange?.("image");
            props.simulation?.setIsSimulating(false);
          }}
          className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-bold transition-all ${
            props.simulationMode === "image" && !isSimulating
              ? "bg-ca-select/20 text-ca-select shadow-sm border border-ca-select/40"
              : "text-ca-ink-muted hover:text-ca-ink"
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Image Inspection</span>
        </button>
      </div>

      <div className="h-4 w-px bg-ca-border" />

      {/* Mode Specific Toolbar */}
      {isSimulating ? (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={props.simulation?.togglePlaying}
              className={`inline-flex items-center gap-1.5 rounded border px-3 py-1 font-semibold transition-colors ${
                isPlaying
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                  : "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              }`}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{isPlaying ? "Pause Conveyor" : "Resume Conveyor"}</span>
            </button>

            <button
              type="button"
              onClick={props.simulation?.resetSimulation}
              className="inline-flex items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-3 py-1 font-semibold text-ca-ink hover:bg-ca-bg transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restart 15-Device Batch</span>
            </button>
          </div>

          {/* Direct Image Upload option from Simulation Header */}
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 font-semibold text-ca-ink hover:bg-ca-bg hover:text-cyan-300 transition-colors">
            <Upload className="h-3.5 w-3.5 text-cyan-400" />
            <span>Load Test Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="sr-only"
            />
          </label>

          <span className="font-mono text-[11px] text-cyan-400 font-semibold px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/40">
            Speed: {props.simulation?.beltSpeedMmPerS} mm/s
          </span>

          <div className="ml-auto flex items-center gap-2 font-mono text-[11px]">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-bold uppercase text-[10px] ${
                isBatchComplete
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-cyan-600/20 text-cyan-400 border border-cyan-500/30"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isBatchComplete ? "bg-emerald-400" : "bg-cyan-400 animate-pulse"
                }`}
              />
              {isBatchComplete
                ? `BATCH COMPLETE (${TOTAL_BATCH_DEVICES}/${TOTAL_BATCH_DEVICES})`
                : `INSPECTING ${inspectedCount + 1}/${TOTAL_BATCH_DEVICES}`}
            </span>
          </div>
        </>
      ) : (
        <>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 font-semibold text-ca-ink hover:bg-ca-bg">
            <Upload className="h-3.5 w-3.5 text-ca-select" />
            <span>Load Test Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="sr-only"
            />
          </label>

          <button
            type="button"
            onClick={props.onOpenCamera}
            className="inline-flex items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 font-semibold text-ca-ink hover:bg-ca-bg"
          >
            <Camera className="h-3.5 w-3.5 text-ca-select" />
            <span>Live Camera</span>
          </button>

          <button
            type="button"
            onClick={props.onMatch}
            disabled={props.isMatching}
            className="inline-flex items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 font-semibold text-ca-ink hover:bg-ca-bg disabled:opacity-50"
          >
            {props.isMatching ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-ca-select text-ca-select" />
            )}
            <span>{props.isMatching ? "Matching..." : "Run Match"}</span>
          </button>

          <button
            type="button"
            onClick={props.onToggleOverlays}
            className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-semibold ${
              props.hasOverlays
                ? "border-ca-select bg-ca-select/15 text-ca-select"
                : "border-ca-border bg-ca-panel text-ca-ink-muted hover:bg-ca-bg"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Overlays</span>
          </button>

          {props.onClear && (
            <button
              type="button"
              onClick={props.onClear}
              className="inline-flex items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 font-semibold text-ca-ink hover:bg-ca-bg"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}

          {props.statusScore !== undefined && (
            <div className="ml-auto flex items-center gap-2 font-mono text-[11px]">
              <span
                className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                  props.isPass ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                }`}
              >
                {props.isPass ? "PASS" : "FAIL"}
              </span>
              <span className="text-ca-ink font-semibold">{props.statusScore}% match</span>
            </div>
          )}
        </>
      )}
    </header>
  );
}
