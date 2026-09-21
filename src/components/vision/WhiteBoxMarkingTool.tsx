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

  return (
    <section className="flex h-full min-h-0 flex-col overflow-x-auto bg-std-chrome text-ca-ink font-sans select-none">
      <div className="flex h-full min-h-[720px] min-w-[1024px] flex-col">
        <header className="flex h-10 shrink-0 flex-wrap items-center gap-3 border-b border-ca-border bg-ca-panel-2 px-3 py-1.5">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 text-xs font-semibold text-ca-ink hover:bg-ca-bg">
            <Upload className="h-3.5 w-3.5" />
            <span>Load Image</span>
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
            className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 text-xs font-semibold text-ca-ink hover:bg-ca-bg"
          >
            <Camera className="h-3.5 w-3.5 text-ca-select" />
            <span>Live Camera</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 text-xs font-semibold text-ca-ink hover:bg-ca-bg disabled:opacity-50"
            onClick={() => {
              if (model.source && model.searchRegion) {
                void model.processRegion(model.source, model.searchRegion);
              }
            }}
            disabled={model.source === null || model.searchRegion === null || model.isProcessing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${model.isProcessing ? "animate-spin" : ""}`} />
            <span>{model.isProcessing ? "Processing" : "Process"}</span>
          </button>

          <span className="ml-auto font-mono text-[11px] text-ca-ink-muted">{model.message}</span>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px]">
          <PatternCanvas
            source={model.source}
            result={model.result}
            searchRegion={model.searchRegion}
            greyscaleLevel={model.greyscaleLevel}
            detectedBoxes={model.detectedBoxes}
            excludedNumbers={model.excludedNumbers}
            formulatedPattern={model.formulatedPattern}
            dragState={model.dragState}
            onSearchRegionChange={model.setSearchRegion}
            onDragStateChange={model.setDragState}
          />

          <BoxReviewPanel
            greyscaleLevel={model.greyscaleLevel}
            marginPx={model.marginPx}
            detectedBoxes={model.detectedBoxes}
            excludedNumbers={model.excludedNumbers}
            formulatedPattern={model.formulatedPattern}
            searchRegion={model.searchRegion}
            isSaving={model.isSaving}
            saveMessage={model.saveMessage}
            onGreyscaleChange={model.changeGreyscaleLevel}
            onMarginChange={model.changeMarginPx}
            onRemoveBox={model.removeBox}
            onRestoreBox={model.restoreBox}
            onToggleBox={model.toggleBox}
            onIncludeAll={model.includeAllBoxes}
            onExcludeAll={model.excludeAllBoxes}
            onInvert={model.invertExclusions}
            onApplyPattern={model.applyPatternGeometry}
            actionButtonLabel={buttonLabel}
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
