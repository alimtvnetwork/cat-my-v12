import React, { useState } from "react";
import { CameraCaptureModal } from "@/components/vision/white-box/CameraCaptureModal";
import { DefectMatchCanvas } from "./defect-matching/DefectMatchCanvas";
import { DefectMatchFooter } from "./defect-matching/DefectMatchFooter";
import { DefectMatchHeader } from "./defect-matching/DefectMatchHeader";
import { DefectMatchResultCard } from "./defect-matching/DefectMatchResultCard";
import { DefectMatchSettingsCard } from "./defect-matching/DefectMatchSettingsCard";
import type { DefectToolProps } from "./defect-matching/types";
import { useDefectMatchingRule } from "./defect-matching/useDefectMatchingRule";

export function StandardDefectMatchingTool(props: DefectToolProps): React.JSX.Element {
  const model = useDefectMatchingRule(props);
  const [hasOverlays, setHasOverlays] = useState(true);

  const handleReconfigure = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/setup/defect-matching";
    }
  };

  const handleApply = () => {
    model.runMatch();
    props.onOk?.();
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-std-chrome text-ca-ink font-sans select-none">
      <div className="flex h-full w-full min-h-0 min-w-0 flex-col">
        {/* Stage 2 Inspection Header (Simulation-Free) */}
        <DefectMatchHeader
          isMatching={model.isMatching}
          hasOverlays={hasOverlays}
          statusScore={model.matchResult?.score}
          isPass={model.matchResult?.isPass}
          hasDefect={model.matchResult?.hasDefect}
          onLoadFile={(file) => void model.loadFile(file)}
          onOpenCamera={() => model.setIsCameraOpen(true)}
          onMatch={model.runMatch}
          onClear={model.clearCanvas}
          onToggleOverlays={() => setHasOverlays((prev) => !prev)}
        />

        {/* Split Grid: Canvas + Inverted Verdict Card / Parameter Tuning */}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px]">
          <DefectMatchCanvas
            source={model.source}
            matchResult={model.matchResult}
            referenceBoxes={model.referenceBoxes}
            searchRegion={model.searchRegion}
            hasOverlays={hasOverlays}
            dragState={model.dragState}
            onSearchRegionChange={model.handleSearchRegionChange}
            onDragStateChange={model.setDragState}
          />

          <div className="flex flex-col h-full border-l border-ca-border bg-ca-panel-2 p-2.5 overflow-y-auto gap-3">
            <DefectMatchResultCard
              matchResult={model.matchResult}
              totalElements={model.referenceBoxes.length}
              isMatching={model.isMatching}
              onMatch={model.runMatch}
            />

            <DefectMatchSettingsCard
              minMatchPercent={model.minMatchPercent}
              tolerancePx={model.tolerancePx}
              greyscaleLevel={model.greyscaleLevel}
              activeFeatureCount={model.referenceBoxes.length}
              onMinPercentChange={model.changeMinPercent}
              onToleranceChange={model.changeTolerance}
              onReconfigure={handleReconfigure}
            />
          </div>
        </div>

        {/* Footer */}
        <DefectMatchFooter
          isMatching={model.isMatching}
          onApply={handleApply}
          onCancel={props.onCancel}
        />
      </div>

      <CameraCaptureModal
        isOpen={model.isCameraOpen}
        onClose={() => model.setIsCameraOpen(false)}
        onCapture={model.loadCapturedFrame}
      />
    </section>
  );
}
