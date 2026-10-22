import React, { useCallback, useMemo, useState } from "react";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { DefectTargetType } from "@/domain/vision/surface-flaw-types";
import type { WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import { useStandardWorkbench } from "../workbench/useStandardWorkbench";
import { StandardWorkbenchShell } from "../workbench/StandardWorkbenchShell";
import { StandardWorkbenchCanvas } from "../workbench/StandardWorkbenchCanvas";
import { DefectToolPanel } from "../workbench/DefectToolPanel";
import type { JudgmentItem } from "../tabs/JudgmentConditionsTab";

export interface StandardDefectToolProps {
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

interface DetectedFlaw {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
}

export function StandardDefectTool(props: StandardDefectToolProps): React.JSX.Element {
  const workbench = useStandardWorkbench({
    settings: props.settings,
    onChange: props.onChange,
    imageRef: props.imageRef,
    onImageRegistered: props.onImageRegistered,
  });

  const initialParams = (props.settings.params as Record<string, unknown> | undefined) ?? {};

  const [defectSensitivity, setDefectSensitivity] = useState<number>(
    Number(initialParams.defectSensitivity ?? 35),
  );
  const [defectTarget, setDefectTarget] = useState<DefectTargetType>(
    (initialParams.defectTarget as DefectTargetType) ?? "both",
  );
  const [minDefectArea, setMinDefectArea] = useState<number>(
    Number(initialParams.minDefectArea ?? 15),
  );
  const [maxAllowedDefects, setMaxAllowedDefects] = useState<number>(
    Number(initialParams.maxAllowedDefects ?? 0),
  );

  // Analyze surface flaw candidates based on gradient differential
  const { detectedFlaws, isPass } = useMemo(() => {
    if (!workbench.source || !workbench.searchRegion) {
      return {
        detectedFlaws: [] as DetectedFlaw[],
        isPass: true,
      };
    }

    const { width, height, rgba } = workbench.source;
    const region = workbench.searchRegion;

    const startX = Math.max(1, Math.min(width - 2, region.x));
    const startY = Math.max(1, Math.min(height - 2, region.y));
    const endX = Math.max(2, Math.min(width - 1, region.x + region.width));
    const endY = Math.max(2, Math.min(height - 1, region.y + region.height));

    const thresholdGradient = Math.round(180 * (1 - defectSensitivity / 100));
    const flaws: DetectedFlaw[] = [];

    // Simple grid scan for high-frequency gradient anomaly clusters
    const step = 16;

    for (let y = startY; y < endY - step; y += step) {
      for (let x = startX; x < endX - step; x += step) {
        let anomalyCount = 0;

        for (let dy = 0; dy < step; dy += 2) {
          for (let dx = 0; dx < step; dx += 2) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            const idxRight = ((y + dy) * width + (x + dx + 1)) * 4;
            const idxDown = ((y + dy + 1) * width + (x + dx)) * 4;

            const luma = 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];
            const lumaR = 0.299 * rgba[idxRight] + 0.587 * rgba[idxRight + 1] + 0.114 * rgba[idxRight + 2];
            const lumaD = 0.299 * rgba[idxDown] + 0.587 * rgba[idxDown + 1] + 0.114 * rgba[idxDown + 2];

            const grad = Math.abs(luma - lumaR) + Math.abs(luma - lumaD);

            if (defectTarget === "dark-defects" && luma > 128) {
              continue;
            }

            if (defectTarget === "bright-defects" && luma < 128) {
              continue;
            }

            if (grad >= thresholdGradient) {
              anomalyCount += 1;
            }
          }
        }

        if (anomalyCount >= minDefectArea) {
          flaws.push({
            id: flaws.length + 1,
            x,
            y,
            width: step,
            height: step,
            score: anomalyCount,
          });
        }
      }
    }

    const pass = flaws.length <= maxAllowedDefects;

    return {
      detectedFlaws: flaws,
      isPass: pass,
    };
  }, [workbench.source, workbench.searchRegion, defectSensitivity, defectTarget, minDefectArea, maxAllowedDefects]);

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

      const thresholdGradient = Math.round(180 * (1 - defectSensitivity / 100));

      for (let i = 0; i < totalPixels; i += 1) {
        const idx = i * 4;
        const x = i % source.width;
        const y = Math.floor(i / source.width);

        const isInsideRegion = x >= rx1 && x < rx2 && y >= ry1 && y < ry2;

        if (isInsideRegion && x + 1 < source.width && y + 1 < source.height) {
          const idxR = (y * source.width + (x + 1)) * 4;
          const idxD = ((y + 1) * source.width + x) * 4;

          const luma = 0.299 * raw[idx] + 0.587 * raw[idx + 1] + 0.114 * raw[idx + 2];
          const lumaR = 0.299 * raw[idxR] + 0.587 * raw[idxR + 1] + 0.114 * raw[idxR + 2];
          const lumaD = 0.299 * raw[idxD] + 0.587 * raw[idxD + 1] + 0.114 * raw[idxD + 2];

          const grad = Math.abs(luma - lumaR) + Math.abs(luma - lumaD);

          if (grad >= thresholdGradient) {
            // Neon rose / red edge highlight
            out[idx] = 244;
            out[idx + 1] = 63;
            out[idx + 2] = 94;
            out[idx + 3] = 255;
          } else {
            const dimmed = Math.round(luma * 0.35);
            out[idx] = dimmed;
            out[idx + 1] = dimmed;
            out[idx + 2] = dimmed;
            out[idx + 3] = 255;
          }
        } else {
          out[idx] = 12;
          out[idx + 1] = 16;
          out[idx + 2] = 22;
          out[idx + 3] = 255;
        }
      }

      return output;
    },
    [workbench.searchRegion, defectSensitivity],
  );

  const renderCustomOverlays = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      for (const flaw of detectedFlaws) {
        ctx.save();
        ctx.strokeStyle = "#f43f5e";
        ctx.lineWidth = 2;
        ctx.fillStyle = "rgba(244, 63, 94, 0.2)";

        ctx.fillRect(flaw.x, flaw.y, flaw.width, flaw.height);
        ctx.strokeRect(flaw.x, flaw.y, flaw.width, flaw.height);

        // Flaw Crosshair
        ctx.beginPath();
        ctx.moveTo(flaw.x - 4, flaw.y + flaw.height / 2);
        ctx.lineTo(flaw.x + flaw.width + 4, flaw.y + flaw.height / 2);
        ctx.moveTo(flaw.x + flaw.width / 2, flaw.y - 4);
        ctx.lineTo(flaw.x + flaw.width / 2, flaw.y + flaw.height + 4);
        ctx.stroke();

        // Label
        ctx.fillStyle = "#f43f5e";
        ctx.font = "bold 9px monospace";
        ctx.fillText(`FLAW #${flaw.id}`, flaw.x, Math.max(10, flaw.y - 4));
        ctx.restore();
      }
    },
    [detectedFlaws],
  );

  const handleApply = useCallback(() => {
    const defaultDefectItem: JudgmentItem = {
      id: "j1",
      name: "Flaw Count",
      unit: "count",
      lowerLimit: 0,
      measured: detectedFlaws.length,
      upperLimit: maxAllowedDefects,
      status: isPass ? "PASS" : "FAIL",
    };

    props.onChange((prev) => ({
      ...prev,
      params: {
        ...(prev.params ?? {}),
        toolCode: "T107",
        defectSensitivity,
        defectTarget,
        minDefectArea,
        maxAllowedDefects,
        detectedCount: detectedFlaws.length,
        judgmentItems: [defaultDefectItem],
      },
    }));

    props.onOk?.();
  }, [defectSensitivity, defectTarget, minDefectArea, maxAllowedDefects, detectedFlaws, isPass, props]);

  return (
    <StandardWorkbenchShell
      toolName="Scratch & Crack Detector"
      toolCode="T107"
      isCameraOpen={workbench.isCameraOpen}
      onCloseCamera={() => workbench.setIsCameraOpen(false)}
      onCaptureCameraFrame={workbench.handleCaptureFrame}
      onLoadFile={workbench.handleLoadFile}
      onRefresh={props.onRefresh}
      canvas={
        <StandardWorkbenchCanvas
          source={workbench.source}
          searchRegion={workbench.searchRegion}
          dragState={workbench.dragState}
          hasFilteredPreview={workbench.hasFilteredPreview}
          hasOverlays={workbench.hasOverlays}
          filterModeLabel="FILTERED (Gradient Contrast)"
          toolBadge="T107 SCRATCH/CRACK"
          statusText={`${detectedFlaws.length} FLAWS [${isPass ? "PASS" : "FAIL"}]`}
          isPass={isPass}
          onSearchRegionChange={workbench.handleRegionChange}
          onDragStateChange={workbench.setDragState}
          onToggleFilteredPreview={workbench.toggleFilteredPreview}
          onResetRegion={workbench.resetRegion}
          createFilteredImageData={createFilteredImageData}
          renderCustomOverlays={renderCustomOverlays}
        />
      }
      inspectorPanel={
        <DefectToolPanel
          sensitivity={defectSensitivity}
          defectTarget={defectTarget}
          minArea={minDefectArea}
          maxAllowedDefects={maxAllowedDefects}
          detectedCount={detectedFlaws.length}
          isPass={isPass}
          actionButtonLabel={props.actionButtonLabel}
          onSensitivityChange={setDefectSensitivity}
          onDefectTargetChange={setDefectTarget}
          onMinAreaChange={setMinDefectArea}
          onMaxAllowedDefectsChange={setMaxAllowedDefects}
          onApply={handleApply}
          onCancel={props.onCancel}
        />
      }
    />
  );
}
