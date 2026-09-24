import { useState } from "react";
import { CameraCaptureModal } from "../../white-box/CameraCaptureModal";
import { PatternMatchCanvas } from "./pattern-matching/PatternMatchCanvas";
import { PatternMatchFooter } from "./pattern-matching/PatternMatchFooter";
import { PatternMatchHeader } from "./pattern-matching/PatternMatchHeader";
import { PatternMatchResultCard } from "./pattern-matching/PatternMatchResultCard";
import { PatternMatchSettingsCard } from "./pattern-matching/PatternMatchSettingsCard";
import type { PatternMatchingRuleProps, SimulationModeType } from "./pattern-matching/types";
import { usePatternMatchingRule } from "./pattern-matching/usePatternMatchingRule";

export function StandardGreyscalePatternMatchingTool(
  props: PatternMatchingRuleProps,
): React.JSX.Element {
  const model = usePatternMatchingRule(props);
  const [simulationMode, setSimulationMode] = useState<SimulationModeType>("image");
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
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-std-chrome text-ca-ink font-sans select-none">
      <div className="flex h-full w-full min-h-0 min-w-0 flex-col">
        <PatternMatchHeader
          isMatching={model.isMatching}
          hasOverlays={hasOverlays}
          statusScore={model.matchResult?.score}
          isPass={model.matchResult?.isPass}
          simulation={model.simulation}
          simulationMode={simulationMode}
          onSimulationModeChange={setSimulationMode}
          onLoadFile={model.loadFile}
          onLoadSampleAtmel={model.loadSampleAtmel}
          onLoadSampleStm8={model.loadSampleStm8}
          onOpenCamera={() => model.setIsCameraOpen(true)}
          onMatch={model.runMatch}
          onClear={model.clearCanvas}
          onToggleOverlays={() => setHasOverlays((prev) => !prev)}
        />

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px]">
          <PatternMatchCanvas
            source={model.source}
            matchResult={model.matchResult}
            referenceBoxes={model.referenceBoxes}
            searchRegion={model.searchRegion}
            greyscaleLevel={model.greyscaleLevel}
            hasOverlays={hasOverlays}
            dragState={model.dragState}
            simulation={model.simulation}
            onSearchRegionChange={model.handleSearchRegionChange}
            onDragStateChange={model.setDragState}
          />

          <div className="flex flex-col h-full border-l border-ca-border bg-ca-panel-2 p-2.5 overflow-y-auto gap-3">
            <PatternMatchResultCard
              matchResult={model.matchResult}
              totalBoxes={model.referenceBoxes.length}
              isMatching={model.isMatching}
              simulation={model.simulation}
              onMatch={model.runMatch}
            />

            {!model.simulation?.isSimulating && (
              <PatternMatchSettingsCard
                minMatchPercent={model.minMatchPercent}
                tolerancePx={model.tolerancePx}
                greyscaleLevel={model.greyscaleLevel}
                activeBoxCount={model.referenceBoxes.length}
                simulation={model.simulation}
                onMinPercentChange={model.changeMinPercent}
                onToleranceChange={model.changeTolerance}
                onReconfigure={handleReconfigure}
              />
            )}
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
