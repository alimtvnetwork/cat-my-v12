import React, { useCallback, useMemo, useState } from "react";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import { useStandardWorkbench } from "../workbench/useStandardWorkbench";
import { StandardWorkbenchShell } from "../workbench/StandardWorkbenchShell";
import { StandardWorkbenchCanvas } from "../workbench/StandardWorkbenchCanvas";
import { EdgePositionToolPanel } from "../workbench/EdgePositionToolPanel";
import type { JudgmentItem } from "../tabs/JudgmentConditionsTab";

export interface StandardEdgePositionToolProps {
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

export function StandardEdgePositionTool(
  props: StandardEdgePositionToolProps,
): React.JSX.Element {
  const workbench = useStandardWorkbench({
    settings: props.settings,
    onChange: props.onChange,
    imageRef: props.imageRef,
    onImageRegistered: props.onImageRegistered,
  });

  const initialParams = (props.settings.params as Record<string, unknown> | undefined) ?? {};

  const [scanDirection, setScanDirection] = useState<
    "left-to-right" | "right-to-left" | "top-to-bottom" | "bottom-to-top"
  >(
    (initialParams.scanDirection as
      | "left-to-right"
      | "right-to-left"
      | "top-to-bottom"
      | "bottom-to-top") ?? "left-to-right",
  );
  const [edgePolarity, setEdgePolarity] = useState<"light-to-dark" | "dark-to-light" | "both">(
    (initialParams.edgePolarity as "light-to-dark" | "dark-to-light" | "both") ?? "light-to-dark",
  );
  const [edgeThreshold, setEdgeThreshold] = useState<number>(
    Number(initialParams.minEdgeContrast ?? 30),
  );
  const [filterWidth, setFilterWidth] = useState<number>(
    Number(initialParams.filterWidth ?? 5),
  );
  const [nominalPosition, setNominalPosition] = useState<number>(
    Number(initialParams.nominalPositionPx ?? 120),
  );
  const [tolerancePx, setTolerancePx] = useState<number>(
    Number(initialParams.tolerancePx ?? 10),
  );

  // Analyze edge position along specified ray
  const { measuredPosition, isPass, edgePoint } = useMemo(() => {
    if (!workbench.source || !workbench.searchRegion) {
      return {
        measuredPosition: 120.0,
        isPass: true,
        edgePoint: { x: 120, y: 150 },
      };
    }

    const { width, height, rgba } = workbench.source;
    const region = workbench.searchRegion;

    const midX = Math.round(region.x + region.width / 2);
    const midY = Math.round(region.y + region.height / 2);

    let foundCoord = nominalPosition;
    let foundPoint = { x: midX, y: midY };
    const thresholdGrad = Math.round(edgeThreshold * 1.5);

    if (scanDirection === "left-to-right" || scanDirection === "right-to-left") {
      const isLtoR = scanDirection === "left-to-right";
      const start = isLtoR ? Math.max(1, region.x) : Math.min(width - 2, region.x + region.width);
      const end = isLtoR ? Math.min(width - 2, region.x + region.width) : Math.max(1, region.x);
      const step = isLtoR ? 1 : -1;

      for (let x = start; isLtoR ? x < end : x > end; x += step) {
        const idxL = (midY * width + (x - 1)) * 4;
        const idxR = (midY * width + (x + 1)) * 4;

        const lumaL = 0.299 * rgba[idxL] + 0.587 * rgba[idxL + 1] + 0.114 * rgba[idxL + 2];
        const lumaR = 0.299 * rgba[idxR] + 0.587 * rgba[idxR + 1] + 0.114 * rgba[idxR + 2];
        const diff = lumaR - lumaL;

        const isMatch =
          edgePolarity === "dark-to-light"
            ? diff >= thresholdGrad
            : edgePolarity === "light-to-dark"
              ? diff <= -thresholdGrad
              : Math.abs(diff) >= thresholdGrad;

        if (isMatch) {
          foundCoord = x;
          foundPoint = { x, y: midY };
          break;
        }
      }
    } else {
      const isTtoB = scanDirection === "top-to-bottom";
      const start = isTtoB ? Math.max(1, region.y) : Math.min(height - 2, region.y + region.height);
      const end = isTtoB ? Math.min(height - 2, region.y + region.height) : Math.max(1, region.y);
      const step = isTtoB ? 1 : -1;

      for (let y = start; isTtoB ? y < end : y > end; y += step) {
        const idxU = ((y - 1) * width + midX) * 4;
        const idxD = ((y + 1) * width + midX) * 4;

        const lumaU = 0.299 * rgba[idxU] + 0.587 * rgba[idxU + 1] + 0.114 * rgba[idxU + 2];
        const lumaD = 0.299 * rgba[idxD] + 0.587 * rgba[idxD + 1] + 0.114 * rgba[idxD + 2];
        const diff = lumaD - lumaU;

        const isMatch =
          edgePolarity === "dark-to-light"
            ? diff >= thresholdGrad
            : edgePolarity === "light-to-dark"
              ? diff <= -thresholdGrad
              : Math.abs(diff) >= thresholdGrad;

        if (isMatch) {
          foundCoord = y;
          foundPoint = { x: midX, y };
          break;
        }
      }
    }

    const pass = Math.abs(foundCoord - nominalPosition) <= tolerancePx;

    return {
      measuredPosition: foundCoord,
      isPass: pass,
      edgePoint: foundPoint,
    };
  }, [
    workbench.source,
    workbench.searchRegion,
    scanDirection,
    edgePolarity,
    edgeThreshold,
    nominalPosition,
    tolerancePx,
  ]);

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

      const thresholdGrad = Math.round(edgeThreshold * 1.5);

      for (let i = 0; i < totalPixels; i += 1) {
        const idx = i * 4;
        const x = i % source.width;
        const y = Math.floor(i / source.width);

        const isInsideRegion = x >= rx1 && x < rx2 && y >= ry1 && y < ry2;

        if (isInsideRegion && x + 1 < source.width && x > 0) {
          const idxL = (y * source.width + (x - 1)) * 4;
          const idxR = (y * source.width + (x + 1)) * 4;

          const lumaL = 0.299 * raw[idxL] + 0.587 * raw[idxL + 1] + 0.114 * raw[idxL + 2];
          const lumaR = 0.299 * raw[idxR] + 0.587 * raw[idxR + 1] + 0.114 * raw[idxR + 2];
          const diff = Math.abs(lumaR - lumaL);

          if (diff >= thresholdGrad) {
            out[idx] = 0;
            out[idx + 1] = 240;
            out[idx + 2] = 255;
            out[idx + 3] = 255;
          } else {
            const dimmed = Math.round(lumaL * 0.35);
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
    [workbench.searchRegion, edgeThreshold],
  );

  const renderCustomOverlays = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!workbench.searchRegion) {
        return;
      }

      const region = workbench.searchRegion;
      const midX = Math.round(region.x + region.width / 2);
      const midY = Math.round(region.y + region.height / 2);

      ctx.save();

      // 1. Scan Ray with direction arrow
      ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      const isHorizontal = scanDirection === "left-to-right" || scanDirection === "right-to-left";

      if (isHorizontal) {
        ctx.beginPath();
        ctx.moveTo(region.x, midY);
        ctx.lineTo(region.x + region.width, midY);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(midX, region.y);
        ctx.lineTo(midX, region.y + region.height);
        ctx.stroke();
      }

      ctx.setLineDash([]);

      // 2. Detected Edge Transition Crosshair
      const strokeColor = isPass ? "#00ff9d" : "#f43f5e";
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;

      if (isHorizontal) {
        ctx.beginPath();
        ctx.moveTo(edgePoint.x, region.y);
        ctx.lineTo(edgePoint.x, region.y + region.height);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(region.x, edgePoint.y);
        ctx.lineTo(region.x + region.width, edgePoint.y);
        ctx.stroke();
      }

      // Edge Point Center Reticle
      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(edgePoint.x, edgePoint.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Text Badge
      ctx.font = "bold 10px monospace";
      ctx.fillText(
        `EDGE: ${measuredPosition.toFixed(1)} px [${isPass ? "PASS" : "FAIL"}]`,
        edgePoint.x + 8,
        edgePoint.y - 8,
      );

      ctx.restore();
    },
    [workbench.searchRegion, scanDirection, isPass, edgePoint, measuredPosition],
  );

  const handleApply = useCallback(() => {
    const defaultPositionItem: JudgmentItem = {
      id: "j1",
      name: "Edge Position",
      unit: "px",
      lowerLimit: nominalPosition - tolerancePx,
      measured: measuredPosition,
      upperLimit: nominalPosition + tolerancePx,
      status: isPass ? "PASS" : "FAIL",
    };

    props.onChange((prev) => ({
      ...prev,
      params: {
        ...(prev.params ?? {}),
        toolCode: "T104",
        scanDirection,
        edgePolarity,
        minEdgeContrast: edgeThreshold,
        filterWidth,
        nominalPositionPx: nominalPosition,
        tolerancePx,
        measuredPosition,
        judgmentItems: [defaultPositionItem],
      },
    }));

    props.onOk?.();
  }, [
    scanDirection,
    edgePolarity,
    edgeThreshold,
    filterWidth,
    nominalPosition,
    tolerancePx,
    measuredPosition,
    isPass,
    props,
  ]);

  return (
    <StandardWorkbenchShell
      toolName="Edge Position Measurement"
      toolCode="T104"
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
          filterModeLabel="FILTERED (Edge Scan Ray)"
          toolBadge="T104 EDGE POSITION"
          statusText={`EDGE @ ${measuredPosition.toFixed(1)} px [${isPass ? "PASS" : "FAIL"}]`}
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
        <EdgePositionToolPanel
          scanDirection={scanDirection}
          edgePolarity={edgePolarity}
          edgeThreshold={edgeThreshold}
          filterWidth={filterWidth}
          nominalPosition={nominalPosition}
          tolerancePx={tolerancePx}
          measuredPosition={measuredPosition}
          isPass={isPass}
          actionButtonLabel={props.actionButtonLabel}
          onScanDirectionChange={setScanDirection}
          onEdgePolarityChange={setEdgePolarity}
          onEdgeThresholdChange={setEdgeThreshold}
          onFilterWidthChange={setFilterWidth}
          onNominalPositionChange={setNominalPosition}
          onToleranceChange={setTolerancePx}
          onApply={handleApply}
          onCancel={props.onCancel}
        />
      }
    />
  );
}
