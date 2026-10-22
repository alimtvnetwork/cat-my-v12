import React, { useCallback, useState } from "react";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import { useStandardWorkbench } from "../workbench/useStandardWorkbench";
import { StandardWorkbenchShell } from "../workbench/StandardWorkbenchShell";
import { StandardWorkbenchCanvas } from "../workbench/StandardWorkbenchCanvas";
import { VoidPorosityToolPanel } from "../workbench/VoidPorosityToolPanel";
import type { JudgmentItem } from "../tabs/JudgmentConditionsTab";

export interface StandardVoidPorosityToolProps {
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

interface DetectedVoid {
  id: number;
  centerX: number;
  centerY: number;
  radius: number;
  areaPx: number;
}

export function StandardVoidPorosityTool(
  props: StandardVoidPorosityToolProps,
): React.JSX.Element {
  const workbench = useStandardWorkbench({
    settings: props.settings,
    onChange: props.onChange,
    imageRef: props.imageRef,
    onImageRegistered: props.onImageRegistered,
  });

  const initialParams = (props.settings.params as Record<string, unknown> | undefined) ?? {};

  const [voidSensitivity, setVoidSensitivity] = useState<number>(
    Number(initialParams.voidSensitivity ?? 40),
  );
  const [minVoidDiameterPx, setMinVoidDiameterPx] = useState<number>(
    Number(initialParams.minVoidDiameterPx ?? 4),
  );
  const [maxPorosityPercent, setMaxPorosityPercent] = useState<number>(
    Number(initialParams.maxPorosityPercent ?? 3.5),
  );
  const [maxAllowedVoids, setMaxAllowedVoids] = useState<number>(
    Number(initialParams.maxAllowedVoids ?? 0),
  );

  // Explicit processing state: no tool auto-analyzes
  const [hasProcessed, setHasProcessed] = useState<boolean>(false);
  const [detectedVoids, setDetectedVoids] = useState<DetectedVoid[]>([]);
  const [measuredPorosityPercent, setMeasuredPorosityPercent] = useState<number>(0);
  const [isPass, setIsPass] = useState<boolean>(true);

  // Execute void analysis strictly on "Process" click
  const handleProcess = useCallback(() => {
    if (!workbench.source || !workbench.searchRegion) {
      setDetectedVoids([]);
      setMeasuredPorosityPercent(0);
      setIsPass(true);
      setHasProcessed(true);

      return;
    }

    const { width, height, rgba } = workbench.source;
    const region = workbench.searchRegion;

    const startX = Math.max(0, Math.min(width - 1, region.x));
    const startY = Math.max(0, Math.min(height - 1, region.y));
    const endX = Math.max(1, Math.min(width, region.x + region.width));
    const endY = Math.max(1, Math.min(height, region.y + region.height));

    const totalSubstratePixels = Math.max(1, (endX - startX) * (endY - startY));
    const voidThresholdLuma = Math.round(50 + voidSensitivity * 1.2);
    const minRadius = Math.max(2, Math.round(minVoidDiameterPx / 2));

    let totalVoidPixels = 0;
    const voids: DetectedVoid[] = [];
    const cellSize = 14;

    for (let y = startY; y < endY - cellSize; y += cellSize) {
      for (let x = startX; x < endX - cellSize; x += cellSize) {
        let lowLumaCount = 0;

        for (let dy = 0; dy < cellSize; dy += 2) {
          for (let dx = 0; dx < cellSize; dx += 2) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            const luma = 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];

            if (luma <= voidThresholdLuma) {
              lowLumaCount += 1;
              totalVoidPixels += 4;
            }
          }
        }

        const areaPx = lowLumaCount * 4;

        if (areaPx >= Math.PI * minRadius * minRadius) {
          voids.push({
            id: voids.length + 1,
            centerX: x + cellSize / 2,
            centerY: y + cellSize / 2,
            radius: Math.max(minRadius, Math.round(Math.sqrt(areaPx / Math.PI))),
            areaPx,
          });
        }
      }
    }

    const porosityRatio = Math.round((totalVoidPixels / totalSubstratePixels) * 1000) / 10;
    const pass = voids.length <= maxAllowedVoids && porosityRatio <= maxPorosityPercent;

    setDetectedVoids(voids);
    setMeasuredPorosityPercent(porosityRatio);
    setIsPass(pass);
    setHasProcessed(true);
  }, [
    workbench.source,
    workbench.searchRegion,
    voidSensitivity,
    minVoidDiameterPx,
    maxPorosityPercent,
    maxAllowedVoids,
  ]);

  const handleSensitivityChange = useCallback((val: number) => {
    setVoidSensitivity(val);
    setHasProcessed(false);
  }, []);

  const handleMinDiameterChange = useCallback((val: number) => {
    setMinVoidDiameterPx(val);
    setHasProcessed(false);
  }, []);

  const handleMaxPorosityChange = useCallback((val: number) => {
    setMaxPorosityPercent(val);
    setHasProcessed(false);
  }, []);

  const handleMaxVoidsChange = useCallback((val: number) => {
    setMaxAllowedVoids(val);
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

      const voidThresholdLuma = Math.round(50 + voidSensitivity * 1.2);

      for (let i = 0; i < totalPixels; i += 1) {
        const idx = i * 4;
        const x = i % source.width;
        const y = Math.floor(i / source.width);

        const luma = Math.round(
          0.299 * raw[idx] + 0.587 * raw[idx + 1] + 0.114 * raw[idx + 2],
        );

        const isInsideRegion = x >= rx1 && x < rx2 && y >= ry1 && y < ry2;
        const isVoid = luma <= voidThresholdLuma;

        if (hasProcessed && isInsideRegion && isVoid) {
          out[idx] = 245;
          out[idx + 1] = 158;
          out[idx + 2] = 11;
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
    [workbench.searchRegion, voidSensitivity, hasProcessed],
  );

  const renderCustomOverlays = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!hasProcessed) {
        return;
      }

      for (const voidItem of detectedVoids) {
        ctx.save();
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2;
        ctx.fillStyle = "rgba(245, 158, 11, 0.25)";

        ctx.beginPath();
        ctx.arc(voidItem.centerX, voidItem.centerY, voidItem.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(voidItem.centerX - 4, voidItem.centerY);
        ctx.lineTo(voidItem.centerX + 4, voidItem.centerY);
        ctx.moveTo(voidItem.centerX, voidItem.centerY - 4);
        ctx.lineTo(voidItem.centerX, voidItem.centerY + 4);
        ctx.stroke();

        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 9px monospace";
        ctx.fillText(
          `VOID #${voidItem.id} (r=${voidItem.radius})`,
          voidItem.centerX - 16,
          Math.max(12, voidItem.centerY - voidItem.radius - 4),
        );
        ctx.restore();
      }
    },
    [detectedVoids, hasProcessed],
  );

  // Apply button: only adds / updates rule when explicitly clicked
  const handleApply = useCallback(() => {
    const finalVoids = detectedVoids.length;
    const finalPass = finalVoids <= maxAllowedVoids && measuredPorosityPercent <= maxPorosityPercent;

    const defaultPorosityItem: JudgmentItem = {
      id: "j1",
      name: "Porosity Ratio",
      unit: "%",
      lowerLimit: 0,
      measured: measuredPorosityPercent,
      upperLimit: maxPorosityPercent,
      status: finalPass ? "PASS" : "FAIL",
    };

    const defaultVoidCountItem: JudgmentItem = {
      id: "j2",
      name: "Void Cavity Count",
      unit: "count",
      lowerLimit: 0,
      measured: finalVoids,
      upperLimit: maxAllowedVoids,
      status: finalVoids <= maxAllowedVoids ? "PASS" : "FAIL",
    };

    props.onChange((prev) => ({
      ...prev,
      params: {
        ...(prev.params ?? {}),
        toolCode: "T108",
        voidSensitivity,
        minVoidDiameterPx,
        maxPorosityPercent,
        maxAllowedVoids,
        measuredPorosityPercent,
        detectedVoidCount: finalVoids,
        judgmentItems: [defaultPorosityItem, defaultVoidCountItem],
      },
    }));

    props.onOk?.();
  }, [
    voidSensitivity,
    minVoidDiameterPx,
    maxPorosityPercent,
    maxAllowedVoids,
    measuredPorosityPercent,
    detectedVoids,
    props,
  ]);

  return (
    <StandardWorkbenchShell
      toolName="Void & Porosity Inspector"
      toolCode="T108"
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
          filterModeLabel="FILTERED (Cavity Segmentation)"
          toolBadge="T108 VOID/POROSITY"
          statusText={
            hasProcessed
              ? `${measuredPorosityPercent.toFixed(1)}% POROSITY [${isPass ? "PASS" : "FAIL"}]`
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
          renderCustomOverlays={renderCustomOverlays}
        />
      }
      inspectorPanel={
        <VoidPorosityToolPanel
          voidSensitivity={voidSensitivity}
          minVoidDiameterPx={minVoidDiameterPx}
          maxPorosityPercent={maxPorosityPercent}
          maxAllowedVoids={maxAllowedVoids}
          detectedVoidCount={detectedVoids.length}
          measuredPorosityPercent={measuredPorosityPercent}
          isPass={isPass}
          hasProcessed={hasProcessed}
          actionButtonLabel={props.actionButtonLabel}
          onVoidSensitivityChange={handleSensitivityChange}
          onMinVoidDiameterChange={handleMinDiameterChange}
          onMaxPorosityPercentChange={handleMaxPorosityChange}
          onMaxAllowedVoidsChange={handleMaxVoidsChange}
          onProcess={handleProcess}
          onApply={handleApply}
          onCancel={props.onCancel}
        />
      }
    />
  );
}
