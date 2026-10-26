import React, { useCallback, useState } from "react";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { AreaMeasurementMode, AreaTargetPolarity } from "@/domain/vision/area-gate-types";
import type { WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import { useStandardWorkbench } from "../workbench/useStandardWorkbench";
import { StandardWorkbenchShell } from "../workbench/StandardWorkbenchShell";
import { StandardWorkbenchCanvas } from "../workbench/StandardWorkbenchCanvas";
import { AreaToolPanel } from "../workbench/AreaToolPanel";

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
  // Preview measurement only. Never written to the rule: the analyzer
  // re-measures the saved rule on every analysis image.
  const [measuredArea, setMeasuredArea] = useState<number>(0);
  // Preview verdict only, never a rule judgment: undefined until a real
  // Process runs on a teach image. Apply must not write this to the rule.
  const [isPass, setIsPass] = useState<boolean | undefined>(undefined);

  // Execute vision rule analysis strictly on demand
  const handleProcess = useCallback(() => {
    if (!workbench.source || !workbench.searchRegion) {
      // Preview only: without a teach image and a search region there is
      // nothing to measure. Stay unprocessed and verdict-less; never
      // report a pass (or a seeded 5000px measurement) from an absent image.
      setHasProcessed(false);
      setIsPass(undefined);

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
  }, [
    workbench.source,
    workbench.searchRegion,
    targetPolarity,
    threshold,
    areaMode,
    minArea,
    maxArea,
  ]);

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

        const luma = Math.round(0.299 * raw[idx] + 0.587 * raw[idx + 1] + 0.114 * raw[idx + 2]);

        const isInsideRegion = x >= rx1 && x < rx2 && y >= ry1 && y < ry2;
        const isTarget = targetPolarity === "dark" ? luma <= threshold : luma >= threshold;

        if (hasProcessed && isInsideRegion && isTarget) {
          // Highlight active target pixels in neon emerald once processed
          out[idx] = 0;
          out[idx + 1] = 255;
          out[idx + 2] = 157;
          out[idx + 3] = 255;
        } else {
          // Keep the full workpiece image completely visible - never cut off
          out[idx] = raw[idx];
          out[idx + 1] = raw[idx + 1];
          out[idx + 2] = raw[idx + 2];
          out[idx + 3] = raw[idx + 3];
        }
      }

      return output;
    },
    [workbench.searchRegion, targetPolarity, threshold, hasProcessed],
  );

  // Apply = rule creation. Writes TEACH params only: the analyzer
  // re-measures area from these on every analysis image. The preview
  // measurement and its PASS/FAIL are deliberately NOT written here
  // (no measuredArea, no judgmentItems, no isPass), so Apply without
  // Process can never create a passing rule, and a preview judgment can
  // never become a rule judgment. The teach region itself is the search
  // region (saved by the workbench on region change); this tool stores
  // no other absolute teach-image coordinates, so there is no
  // region-relative coordinate to add for it.
  const handleApply = useCallback(() => {
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
      },
    }));

    props.onOk?.();
  }, [areaMode, targetPolarity, threshold, minArea, maxArea, props]);

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
