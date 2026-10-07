import { useState } from "react";
import { Camera, RefreshCw, Upload } from "lucide-react";
import { BoxReviewPanel } from "./white-box/BoxReviewPanel";
import { CameraCaptureModal } from "./white-box/CameraCaptureModal";
import { PatternCanvas } from "./white-box/PatternCanvas";
import type { WhiteBoxToolProps } from "./white-box/types";
import { useWhiteBoxMarking } from "./white-box/useWhiteBoxMarking";

export function WhiteBoxMarkingTool(props: WhiteBoxToolProps = {}): React.JSX.Element {
  const model = useWhiteBoxMarking(props);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const buttonLabel = props.actionButtonLabel ?? (props.settings ? "Apply Pattern" : "Save Pattern");
  const activeRegion =
    model.regionEditMode === "mask" && model.selectedMaskIndex !== null
      ? model.maskRegions[model.selectedMaskIndex] ?? null
      : model.searchRegion;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-black text-white font-sans select-none">
      <div className="flex h-full min-h-[720px] min-w-[1024px] flex-col">
        {/* Main Workspace (Left Canvas + Right Panel) */}
        <div className="flex min-h-0 flex-1">
          {/* Left: Canvas */}
          <div className="flex min-h-0 flex-1 flex-col relative border-r border-[#333]">
            <PatternCanvas
              source={model.source}
              result={model.result}
              searchRegion={model.searchRegion}
              greyscaleLevel={model.greyscaleLevel}
              detectedBoxes={model.detectedBoxes}
              excludedNumbers={model.excludedNumbers}
              formulatedPattern={model.formulatedPattern}
              dragState={model.dragState}
              activeRegion={activeRegion}
              maskRegions={model.maskRegions}
              regionEditMode={model.regionEditMode}
              selectedMaskIndex={model.selectedMaskIndex}
              onSearchRegionChange={model.changeActiveCanvasRegion}
              onDragStateChange={model.setDragState}
            />
          </div>
          
          {/* Right: Settings Panel */}
          <div className="w-[380px] shrink-0 bg-[#1e1e1e] flex flex-col">
            <BoxReviewPanel
              greyscaleLevel={model.greyscaleLevel}
              marginPx={model.marginPx}
              detectedBoxes={model.detectedBoxes}
              excludedNumbers={model.excludedNumbers}
              formulatedPattern={model.formulatedPattern}
              searchRegion={model.searchRegion}
              maskRegions={model.maskRegions}
              regionEditMode={model.regionEditMode}
              selectedMaskIndex={model.selectedMaskIndex}
              isSaving={model.isSaving}
              saveMessage={model.saveMessage}
              onGreyscaleChange={model.changeGreyscaleLevel}
              onMarginChange={model.changeMarginPx}
              onRegionEditModeChange={model.changeRegionEditMode}
              onAddMaskRegion={model.addMaskRegion}
              onSelectMaskRegion={model.selectMaskRegion}
              onDeleteMaskRegion={model.deleteMaskRegion}
              onRemoveBox={model.removeBox}
              onRestoreBox={model.restoreBox}
              onToggleBox={model.toggleBox}
              onIncludeAll={model.includeAllBoxes}
              onExcludeAll={model.excludeAllBoxes}
              onInvert={model.invertExclusions}
              onApplyPattern={model.applyPatternGeometry}
              actionButtonLabel={buttonLabel}
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
                onChange={(e) => model.loadFile(e.target.files?.[0])}
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
              onClick={() => {
                if (model.source) {
                  const targetRegion = model.searchRegion ?? {
                    x: 0,
                    y: 0,
                    width: model.source.width,
                    height: model.source.height,
                  };
                  void model.processRegion(model.source, targetRegion);
                }
              }}
              disabled={model.source === null || model.isProcessing}
            >
              <RefreshCw size={14} className={model.isProcessing ? "animate-spin" : ""} />
              {model.isProcessing ? "Processing" : "Run"}
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
