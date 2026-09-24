import React, { useState } from "react";
import { CameraCaptureModal } from "@/components/vision/white-box/CameraCaptureModal";
import { Pin1Canvas } from "./pin1-config/Pin1Canvas";
import { Pin1Footer } from "./pin1-config/Pin1Footer";
import { Pin1Header } from "./pin1-config/Pin1Header";
import { Pin1ResultCard } from "./pin1-config/Pin1ResultCard";
import { Pin1SettingsCard } from "./pin1-config/Pin1SettingsCard";
import type { Pin1ToolProps } from "./pin1-config/types";
import { usePin1Rule } from "./pin1-config/usePin1Rule";

export function StandardPin1ConfigTool(
  props: Pin1ToolProps = {} as Pin1ToolProps,
): React.JSX.Element {
  const model = usePin1Rule(props);
  const [hasOverlays, setHasOverlays] = useState(true);

  const handleReconfigure = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/setup/pin1";
    }
  };

  const handleApply = () => {
    model.runDetection();
    props.onOk?.();
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-std-chrome text-ca-ink font-sans select-none">
      <div className="flex h-full w-full min-h-0 min-w-0 flex-col">
        {/* Stage 2 Runtime Header */}
        <Pin1Header
          hasOverlays={hasOverlays}
          hasGreyscalePreview={model.hasGreyscalePreview}
          isDetecting={model.isDetecting}
          onLoadFile={(file) => void model.loadFile(file)}
          onOpenCamera={() => model.setIsCameraOpen(true)}
          onDetect={model.runDetection}
          onClear={model.clearCanvas}
          onToggleOverlays={() => setHasOverlays((prev) => !prev)}
          onToggleGreyscalePreview={model.toggleGreyscalePreview}
        />

        {/* Split Grid: Test Device Canvas + Results / Tolerance Tuning */}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px]">
          <Pin1Canvas
            source={model.source}
            searchRegion={model.searchRegion}
            detectedHoles={model.matchResult?.activeHole ? [model.matchResult.activeHole] : []}
            registeredPin1={model.registeredPin1}
            matchResult={model.matchResult}
            hasOverlays={hasOverlays}
            hasGreyscalePreview={model.hasGreyscalePreview}
            thresholdLuma={model.thresholdLuma}
            polarity={model.polarity}
            dragState={model.dragState}
            onSearchRegionChange={model.handleSearchRegionChange}
            onDragStateChange={model.setDragState}
          />

          <div className="flex flex-col h-full border-l border-ca-border bg-ca-panel-2 p-2.5 overflow-y-auto gap-3">
            <Pin1ResultCard
              matchResult={model.matchResult}
              registeredPin1={model.registeredPin1}
              tolerancePx={model.tolerancePx}
            />


            <Pin1SettingsCard
              polarity={model.polarity}
              thresholdLuma={model.thresholdLuma}
              minCircularity={model.minCircularity}
              tolerancePx={model.tolerancePx}
              expectedX={model.registeredPin1?.centerX}
              expectedY={model.registeredPin1?.centerY}
              expectedRadius={model.registeredPin1?.radius}
              onToleranceChange={model.setTolerancePx}
              onCircularityChange={model.setMinCircularity}
              onReconfigure={handleReconfigure}
            />
          </div>
        </div>

        {/* Footer with Apply Rule cycle */}
        <Pin1Footer
          isVerifying={model.isDetecting}
          onApply={handleApply}
          onCancel={props.onCancel}
        />
      </div>

      <CameraCaptureModal
        isOpen={model.isCameraOpen}
        onClose={() => model.setIsCameraOpen(false)}
        onCapture={(frame) => void model.loadCapturedFrame(frame)}
      />
    </section>
  );
}
