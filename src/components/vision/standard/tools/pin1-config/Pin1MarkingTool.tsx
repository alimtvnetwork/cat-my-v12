import React, { useState } from "react";
import { Binary, Camera, RefreshCw, Trash2, Upload } from "lucide-react";
import { CameraCaptureModal } from "@/components/vision/white-box/CameraCaptureModal";
import { Pin1Canvas } from "./Pin1Canvas";
import { Pin1ReviewPanel } from "./Pin1ReviewPanel";
import type { Pin1MarkingToolProps } from "./types";
import { usePin1Rule } from "./usePin1Rule";

export function Pin1MarkingTool(props: Pin1MarkingToolProps = {}): React.JSX.Element {
  const model = usePin1Rule(props as any);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const buttonLabel = props.actionButtonLabel ?? "Save as Pin 1 Rule";
  const activeRegion =
    model.regionEditMode === "package" ? model.packageRegion : model.searchRegion;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-black text-white font-sans select-none">
      <div className="flex h-full min-h-[720px] min-w-[1024px] flex-col">
        {/* Main Workspace */}
        <div className="flex min-h-0 flex-1">
          {/* Left: Canvas */}
          <div className="flex min-h-0 flex-1 flex-col relative border-r border-[#333]">
            {/* Top-left absolute toolbar (Old HMI style over canvas) */}
            <div className="absolute top-2 left-2 z-10 flex gap-2">
              <button
                type="button"
                onClick={model.toggleGreyscalePreview}
                className={`px-3 py-1.5 text-xs font-bold uppercase rounded shadow border ${
                  model.hasGreyscalePreview
                    ? "bg-[#00ff9d]/20 border-[#00ff9d] text-[#00ff9d]"
                    : "bg-[#222]/80 border-[#444] text-white hover:bg-[#333]"
                }`}
              >
                {model.hasGreyscalePreview ? "FILTERED (Binarized)" : "RAW (RGB)"}
              </button>
              <button
                type="button"
                onClick={model.clearCanvas}
                className="px-3 py-1.5 text-xs font-bold uppercase rounded shadow border border-[#444] bg-[#222]/80 text-white hover:bg-[#333]"
              >
                Clear
              </button>
            </div>

            <Pin1Canvas
            source={model.source}
            searchRegion={model.searchRegion}
            packageRegion={model.packageRegion}
            activeRegion={activeRegion}
            regionEditMode={model.regionEditMode}
            detectedHoles={model.detectedHoles}
            registeredPin1={model.registeredPin1}
            matchResult={model.matchResult}
            hasOverlays={true}
            hasGreyscalePreview={model.hasGreyscalePreview}
            thresholdLuma={model.thresholdLuma}
            polarity={model.polarity}
            dragState={model.dragState}
            onSearchRegionChange={model.handleActiveRegionChange}
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
            packageRegion={model.packageRegion}
            regionEditMode={model.regionEditMode}
            detectedHoles={model.detectedHoles}
            registeredPin1={model.registeredPin1}
            matchResult={model.matchResult}
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
            onRegionEditModeChange={model.setRegionEditMode}
            onAddPackageRegion={model.addPackageRegion}
            onToggleKeepHole={model.toggleKeepHole}
            onSelectPrimaryPin1={model.setPrimaryPin1Hole}
            onIncludeAll={model.includeAllHoles}
            onExcludeAll={model.excludeAllHoles}
            onSaveRule={model.savePin1Rule}
            onCancel={props.onCancel}
          />
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="h-12 bg-[#2d2d2d] flex items-center justify-between px-4 shrink-0 border-t border-[#444]">
          <div className="flex items-center gap-4">
            <label className="cursor-pointer px-4 py-1.5 bg-[#444] hover:bg-[#555] text-white text-xs font-bold uppercase rounded transition-colors flex items-center gap-2">
              <Upload size={14} />
              Register Image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void model.loadFile(e.target.files?.[0])}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="px-4 py-1.5 bg-[#444] hover:bg-[#555] text-white text-xs font-bold uppercase rounded transition-colors flex items-center gap-2"
            >
              <Camera size={14} />
              Live Camera
            </button>
            <button
              type="button"
              className="px-4 py-1.5 bg-[#00ff9d] text-black text-xs font-bold uppercase rounded transition-colors flex items-center gap-2 disabled:opacity-50"
              onClick={model.runDetection}
              disabled={model.source === null || model.isDetecting}
            >
              <RefreshCw size={14} className={model.isDetecting ? "animate-spin" : ""} />
              {model.isDetecting ? "Detecting..." : "Run"}
            </button>
          </div>
          <span className="font-mono text-xs text-ca-ink-muted">{model.message}</span>
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
