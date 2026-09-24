import React, { useEffect, useState } from "react";
import { Binary, Camera, Cpu, RefreshCw, Trash2, Upload } from "lucide-react";
import { CameraCaptureModal } from "@/components/vision/white-box/CameraCaptureModal";
import { Pin1Canvas } from "./Pin1Canvas";
import { Pin1ReviewPanel } from "./Pin1ReviewPanel";
import type { Pin1MarkingToolProps } from "./types";
import { usePin1Rule } from "./usePin1Rule";

export function Pin1MarkingTool(props: Pin1MarkingToolProps = {}): React.JSX.Element {
  const model = usePin1Rule(props as any);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const buttonLabel = props.actionButtonLabel ?? "Save as Pin 1 Rule";

  const { source, loadSampleAtmel } = model;

  // Pre-load authentic Atmel MEGA32U4 chip sample if empty
  useEffect(() => {
    if (!source) {
      void loadSampleAtmel();
    }
  }, [source, loadSampleAtmel]);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-x-auto bg-std-chrome text-ca-ink font-sans select-none">
      <div className="flex h-full min-h-[720px] min-w-[1024px] flex-col">
        {/* Stage 1 Authoring Header: Clean generic actions */}
        <header className="flex h-10 shrink-0 flex-wrap items-center gap-3 border-b border-ca-border bg-ca-panel-2 px-3 py-1.5">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 text-xs font-semibold text-ca-ink hover:bg-ca-bg">
            <Upload className="h-3.5 w-3.5" />
            <span>Load Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => void model.loadFile(e.target.files?.[0])}
              className="sr-only"
            />
          </label>

          <button
            type="button"
            onClick={() => void model.loadSampleAtmel()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 text-xs font-semibold text-ca-ink hover:bg-ca-bg"
            title="Load authentic Atmel MEGA32U4 chip sample"
          >
            <Cpu className="h-3.5 w-3.5 text-ca-select" />
            <span>Sample Chip</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCameraOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 text-xs font-semibold text-ca-ink hover:bg-ca-bg"
          >
            <Camera className="h-3.5 w-3.5 text-ca-select" />
            <span>Live Camera</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 text-xs font-semibold text-ca-ink hover:bg-ca-bg disabled:opacity-50"
            onClick={model.runDetection}
            disabled={model.source === null || model.isDetecting}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${model.isDetecting ? "animate-spin" : ""}`} />
            <span>{model.isDetecting ? "Detecting..." : "Detect Hole"}</span>
          </button>

          <button
            type="button"
            onClick={model.toggleGreyscalePreview}
            className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-semibold transition-colors ${
              model.hasGreyscalePreview
                ? "border-ca-select bg-ca-select/20 text-ca-select"
                : "border-ca-border bg-ca-panel text-ca-ink hover:bg-ca-panel-2"
            }`}
          >
            <Binary className="h-3.5 w-3.5" />
            <span>{model.hasGreyscalePreview ? "Binarized Preview" : "RGB Normal"}</span>
          </button>

          <button
            type="button"
            onClick={model.clearCanvas}
            className="inline-flex items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2 py-1 text-xs font-semibold text-ca-ink hover:bg-ca-panel-2"
          >
            <Trash2 className="h-3.5 w-3.5 text-ca-ink-muted hover:text-rose-400" />
            <span>Clear</span>
          </button>

          <span className="ml-auto font-mono text-[11px] text-ca-ink-muted">{model.message}</span>
        </header>

        {/* Main Workspace: 960x540 Canvas + Review Panel */}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px]">
          <Pin1Canvas
            source={model.source}
            searchRegion={model.searchRegion}
            detectedHoles={model.detectedHoles}
            registeredPin1={model.registeredPin1}
            matchResult={model.matchResult}
            hasOverlays={true}
            hasGreyscalePreview={model.hasGreyscalePreview}
            thresholdLuma={model.thresholdLuma}
            polarity={model.polarity}
            dragState={model.dragState}
            onSearchRegionChange={model.handleSearchRegionChange}
            onDragStateChange={model.setDragState}
            onSelectHole={model.setPrimaryPin1Hole}
          />

          <Pin1ReviewPanel
            thresholdLuma={model.thresholdLuma}
            polarity={model.polarity}
            minCircularity={model.minCircularity}
            minRadiusPx={model.minRadiusPx}
            maxRadiusPx={model.maxRadiusPx}
            tolerancePx={model.tolerancePx}
            searchRegion={model.searchRegion}
            detectedHoles={model.detectedHoles}
            registeredPin1={model.registeredPin1}
            isSaving={model.isSaving}
            saveMessage={model.saveMessage}
            actionButtonLabel={buttonLabel}
            onThresholdChange={model.handleThresholdChange}
            onPolarityChange={model.handlePolarityChange}
            onCircularityChange={model.setMinCircularity}
            onRadiusRangeChange={(minR, maxR) => {
              model.setMinRadiusPx(minR);
              model.setMaxRadiusPx(maxR);
            }}
            onToleranceChange={model.setTolerancePx}
            onToggleKeepHole={model.toggleKeepHole}
            onSelectPrimaryPin1={model.setPrimaryPin1Hole}
            onIncludeAll={model.includeAllHoles}
            onExcludeAll={model.excludeAllHoles}
            onSaveRule={model.savePin1Rule}
          />
        </div>
      </div>

      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={model.loadCapturedFrame}
      />
    </section>
  );
}
