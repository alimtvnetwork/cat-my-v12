import { useState } from "react";
import { CameraCaptureModal } from "../../white-box/CameraCaptureModal";
import { PatternMatchCanvas } from "./pattern-matching/PatternMatchCanvas";
import { PatternMatchFooter } from "./pattern-matching/PatternMatchFooter";
import { PatternMatchHeader } from "./pattern-matching/PatternMatchHeader";
import { PatternMatchResultCard } from "./pattern-matching/PatternMatchResultCard";
import { PatternMatchSettingsCard } from "./pattern-matching/PatternMatchSettingsCard";
import type { PatternMatchingRuleProps } from "./pattern-matching/types";
import { usePatternMatchingRule } from "./pattern-matching/usePatternMatchingRule";

export function StandardGreyscalePatternMatchingTool(
  props: PatternMatchingRuleProps,
): React.JSX.Element {
  const model = usePatternMatchingRule(props);
  const [hasOverlays, setHasOverlays] = useState(true);

  const handleReconfigure = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/setup/white-boxes";
    }
  };

  const handleApply = () => {
    if (!model.searchRegion) {
      model.runMatch();

      return;
    }

    model.runMatch();
    props.onOk?.();
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-x-auto bg-std-chrome text-ca-ink font-sans select-none">
      <div className="flex h-full min-h-[720px] min-w-[1024px] flex-col">
        <PatternMatchHeader
          isMatching={model.isMatching}
          hasOverlays={hasOverlays}
          statusScore={model.matchResult?.score}
          isPass={model.matchResult?.isPass}
          onLoadFile={model.loadFile}
          onOpenCamera={() => model.setIsCameraOpen(true)}
          onMatch={model.runMatch}
          onClear={model.clearCanvas}
          onToggleOverlays={() => setHasOverlays((prev) => !prev)}
        />

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px]">
          <PatternMatchCanvas
            source={model.source}
            matchResult={model.matchResult}
            referenceBoxes={model.referenceBoxes}
            searchRegion={model.searchRegion}
            greyscaleLevel={model.greyscaleLevel}
            hasOverlays={hasOverlays}
            dragState={model.dragState}
            onSearchRegionChange={model.handleSearchRegionChange}
            onDragStateChange={model.setDragState}
          />

          <div className="flex flex-col gap-3 border-l border-ca-border bg-ca-panel-2 p-3 overflow-y-auto">
            <PatternMatchResultCard
              matchResult={model.matchResult}
              totalBoxes={model.referenceBoxes.length}
              isMatching={model.isMatching}
              onMatch={model.runMatch}
            />

            <PatternMatchSettingsCard
              minMatchPercent={model.minMatchPercent}
              tolerancePx={model.tolerancePx}
              greyscaleLevel={model.greyscaleLevel}
              activeBoxCount={model.referenceBoxes.length}
              onMinPercentChange={model.changeMinPercent}
              onToleranceChange={model.changeTolerance}
              onReconfigure={handleReconfigure}
            />
          </div>
        </div>

        <PatternMatchFooter
          isMatching={model.isMatching}
          onApply={handleApply}
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
