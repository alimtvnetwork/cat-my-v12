import React, { useCallback, useState } from "react";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { AreaMeasurementMode, AreaTargetPolarity } from "@/domain/vision/area-gate-types";
import type { WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import { useStandardWorkbench } from "../workbench/useStandardWorkbench";
import { StandardWorkbenchShell } from "../workbench/StandardWorkbenchShell";
import { StandardWorkbenchCanvas } from "../workbench/StandardWorkbenchCanvas";
import { AreaToolPanel } from "../workbench/AreaToolPanel";
import type { JudgmentItem } from "../tabs/JudgmentConditionsTab";

export interface StandardAreaToolProps {
  settings: PatternSearchSettings;
  onChange: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  onEvaluate?: () => void;
  onCancel?: () => void;
  onOk?: () => void;
  onSettings?: () => void;
  onRegisterImage?: () => void;
  onOriginPoint?: () => void;
  onDisplay?: () => void;
  onRefresh?: () => void;
  imageRef?: string;
  onImageRegistered?: (url: string) => void;
  actionButtonLabel?: string;
}

export function StandardAreaTool(props: StandardAreaToolProps): React.JSX.Element {
  const workbench = useStandardWorkbench({
    settings: props.settings,
    onChange: props.onChange,
    imageRef: props.imageRef,
    onImageRegistered: props.onImageRegistered,
  });

  const initialParams = (props.settings.params as Record<string, unknown> | undefined) ?? {};

  const [areaMode, setAreaMode] = useState<AreaMeasurementMode>(
    (initialParams.areaMode as AreaMeasurementMode) ?? "pixels",
  );
  const [targetPolarity, setTargetPolarity] = useState<AreaTargetPolarity>(
    (initialParams.targetPolarity as AreaTargetPolarity) ??
      (initialParams.presencePolarity === "darkOnBright" ? "dark" : "bright"),
  );
  const [threshold, setThreshold] = useState<number>(
    Number(initialParams.intensityThreshold ?? initialParams.threshold ?? 128),
  );
  const [minArea, setMinArea] = useState<number>(
    Number(initialParams.minArea ?? initialParams.minAreaPx ?? 1000),
  );
  const [maxArea, setMaxArea] = useState<number>(
    Number(initialParams.maxArea ?? initialParams.maxAreaPx ?? 50000),
  );

  // Explicit processing state: no tool auto-analyzes
  const [hasProcessed, setHasProcessed] = useState<boolean>(false);
  const [measuredArea, setMeasuredArea] = useState<number>(
    Number(initialParams.measuredArea ?? 5000),
  );
  const [isPass, setIsPass] = useState<boolean>(true);

  // Execute vision rule analysis strictly on demand
  const handleProcess = useCallback(() => {
    if (!workbench.source || !workbench.searchRegion) {
      setMeasuredArea(5000);
      setIsPass(5000 >= minArea && 5000 <= maxArea);
      setHasProcessed(true);

      return;
    }

    const { width, height, rgba } = workbench.source;
    const region = workbench.searchRegion;

    const startX = Math.max(0, Math.min(width - 1, region.x));
    const startY = Math.max(0, Math.min(height - 1, region.y));
    const endX = Math.max(0, Math.min(width, region.x + region.width));
    const endY = Math.max(0, Math.min(height, region.y + region.height));

    let count = 0;
    const totalRoiPixels = Math.max(1, (endX - startX) * (endY - startY));

    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        const idx = (y * width + x) * 4;
        const luma = 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];
        const isTarget = targetPolarity === "dark" ? luma <= threshold : luma >= threshold;

        if (isTarget) {
          count += 1;
        }
      }
    }

    let measured = count;

    if (areaMode === "percentage") {
      measured = Math.round((count / totalRoiPixels) * 1000) / 10;
    } else if (areaMode === "physical") {
      measured = Math.round(count * 0.0025 * 10) / 10;
    }

    const pass = measured >= minArea && measured <= maxArea;

    setMeasuredArea(measured);
    setIsPass(pass);
    setHasProcessed(true);
  }, [workbench.source, workbench.searchRegion, targetPolarity, threshold, areaMode, minArea, maxArea]);

  const handleModeChange = useCallback((mode: AreaMeasurementMode) => {
    setAreaMode(mode);
    setHasProcessed(false);
  }, []);

  const handlePolarityChange = useCallback((polarity: AreaTargetPolarity) => {
    setTargetPolarity(polarity);
    setHasProcessed(false);
  }, []);

  const handleThresholdChange = useCallback((val: number) => {
    setThreshold(val);
    setHasProcessed(false);
  }, []);

  const handleMinAreaChange = useCallback((val: number) => {
    setMinArea(val);
    setHasProcessed(false);
  }, []);

  const handleMaxAreaChange = useCallback((val: number) => {
    setMaxArea(val);
    setHasProcessed(false);
  }, []);

  const createFilteredImageData = useCallback(
    (source: WhiteBoxMarkingInput): ImageData => {
      const output = new ImageData(source.width, source.height);
      const out = output.data;
      const raw = source.rgba;
      const totalPixels = source.width * source.height;

      const region = workbench.searchRegion;
      const rx1 = region ? region.x : 0;
      const ry1 = region ? region.y : 0;
      const rx2 = region ? region.x + region.width : source.width;
      const ry2 = region ? region.y + region.height : source.height;

      for (let i = 0; i < totalPixels; i += 1) {
        const idx = i * 4;
        const x = i % source.width;
        const y = Math.floor(i / source.width);

        const luma = Math.round(
          0.299 * raw[idx] + 0.587 * raw[idx + 1] + 0.114 * raw[idx + 2],
        );

        const isInsideRegion = x >= rx1 && x < rx2 && y >= ry1 && y < ry2;
        const isTarget = targetPolarity === "dark" ? luma <= threshold : luma >= threshold;

        if (hasProcessed && isInsideRegion && isTarget) {
          // Highlight active target pixels in neon emerald once processed
          out[idx] = 0;
          out[idx + 1] = 255;
          out[idx + 2] = 157;
          out[idx + 3] = 255;
        } else if (isInsideRegion) {
          const dimmed = Math.round(luma * 0.5);
          out[idx] = dimmed;
          out[idx + 1] = dimmed;
          out[idx + 2] = dimmed;
          out[idx + 3] = 255;
        } else {
          const dimmed = Math.round(luma * 0.2);
          out[idx] = dimmed;
          out[idx + 1] = dimmed;
          out[idx + 2] = dimmed;
          out[idx + 3] = 255;
        }
      }

      return output;
    },
    [workbench.searchRegion, targetPolarity, threshold, hasProcessed],
  );

  // Apply button: only adds / updates rule when explicitly clicked
  const handleApply = useCallback(() => {
    const finalMeasured = measuredArea;
    const finalPass = finalMeasured >= minArea && finalMeasured <= maxArea;
    const unit = areaMode === "pixels" ? "px" : areaMode === "percentage" ? "%" : "mm²";

    const defaultAreaItem: JudgmentItem = {
      id: "j1",
      name: "Detected Area",
      unit,
      lowerLimit: minArea,
      measured: finalMeasured,
      upperLimit: maxArea,
      status: finalPass ? "PASS" : "FAIL",
    };

    props.onChange((prev) => ({
      ...prev,
      params: {
        ...(prev.params ?? {}),
        toolCode: "T101",
        areaMode,
        targetPolarity,
        presencePolarity: targetPolarity === "dark" ? "darkOnBright" : "brightOnDark",
        intensityThreshold: threshold,
        threshold,
        minArea,
        minAreaPx: minArea,
        maxArea,
        maxAreaPx: maxArea,
        measuredArea: finalMeasured,
        judgmentItems: [defaultAreaItem],
      },
    }));

    props.onOk?.();
  }, [areaMode, targetPolarity, threshold, minArea, maxArea, measuredArea, props]);

  const unitLabel = areaMode === "pixels" ? "px" : areaMode === "percentage" ? "%" : "mm²";

  return (
    <StandardWorkbenchShell
      toolName="Area Gate / Pixel Intensity"
      toolCode="T101"
      isCameraOpen={workbench.isCameraOpen}
      onCloseCamera={() => workbench.setIsCameraOpen(false)}
      onCaptureCameraFrame={workbench.handleCaptureFrame}
      onLoadFile={workbench.handleLoadFile}
      onProcess={handleProcess}
      onRefresh={handleProcess}
      canvas={
        <StandardWorkbenchCanvas
          source={workbench.source}
          searchRegion={workbench.searchRegion}
          dragState={workbench.dragState}
          hasFilteredPreview={workbench.hasFilteredPreview}
          hasOverlays={workbench.hasOverlays}
          filterModeLabel="FILTERED (Binarization Mask)"
          toolBadge="T101 AREA GATE"
          statusText={
            hasProcessed
              ? `${measuredArea.toLocaleString()} ${unitLabel} [${isPass ? "PASS" : "FAIL"}]`
              : "PENDING PROCESS"
          }
          isPass={hasProcessed ? isPass : undefined}
          onSearchRegionChange={(region) => {
            workbench.handleRegionChange(region);
            setHasProcessed(false);
          }}
          onDragStateChange={workbench.setDragState}
          onToggleFilteredPreview={workbench.toggleFilteredPreview}
          onResetRegion={workbench.resetRegion}
          createFilteredImageData={createFilteredImageData}
        />
      }
      inspectorPanel={
        <AreaToolPanel
          areaMode={areaMode}
          targetPolarity={targetPolarity}
          threshold={threshold}
          minArea={minArea}
          maxArea={maxArea}
          measuredArea={measuredArea}
          isPass={isPass}
          hasProcessed={hasProcessed}
          actionButtonLabel={props.actionButtonLabel}
          onAreaModeChange={handleModeChange}
          onPolarityChange={handlePolarityChange}
          onThresholdChange={handleThresholdChange}
          onMinAreaChange={handleMinAreaChange}
          onMaxAreaChange={handleMaxAreaChange}
          onProcess={handleProcess}
          onApply={handleApply}
          onCancel={props.onCancel}
        />
      }
    />
  );
}
