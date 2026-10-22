import React, { useCallback, useState } from "react";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import { useStandardWorkbench } from "../workbench/useStandardWorkbench";
import { StandardWorkbenchShell } from "../workbench/StandardWorkbenchShell";
import { StandardWorkbenchCanvas } from "../workbench/StandardWorkbenchCanvas";
import { BlobToolPanel } from "../workbench/BlobToolPanel";
import type { JudgmentItem } from "../tabs/JudgmentConditionsTab";

export interface StandardBlobToolProps {
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

interface DetectedBlob {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  areaPx: number;
}

interface SolderBridge {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function StandardBlobTool(props: StandardBlobToolProps): React.JSX.Element {
  const workbench = useStandardWorkbench({
    settings: props.settings,
    onChange: props.onChange,
    imageRef: props.imageRef,
    onImageRegistered: props.onImageRegistered,
  });

  const initialParams = (props.settings.params as Record<string, unknown> | undefined) ?? {};

  const [binaryThreshold, setBinaryThreshold] = useState<number>(
    Number(initialParams.binaryThreshold ?? 128),
  );
  const [minBlobArea, setMinBlobArea] = useState<number>(
    Number(initialParams.minBlobArea ?? 50),
  );
  const [maxBlobArea, setMaxBlobArea] = useState<number>(
    Number(initialParams.maxBlobArea ?? 5000),
  );
  const [minBlobCount, setMinBlobCount] = useState<number>(
    Number(initialParams.minBlobCount ?? 1),
  );
  const [maxBlobCount, setMaxBlobCount] = useState<number>(
    Number(initialParams.maxBlobCount ?? 4),
  );
  const [hasHoleFilling, setHasHoleFilling] = useState<boolean>(
    Boolean(initialParams.hasHoleFilling ?? true),
  );
  const [targetPolarity, setTargetPolarity] = useState<"bright" | "dark" | "both">(
    (initialParams.targetPolarity as "bright" | "dark" | "both") ?? "bright",
  );

  // Explicit processing state: no tool auto-analyzes
  const [hasProcessed, setHasProcessed] = useState<boolean>(false);
  const [detectedBlobs, setDetectedBlobs] = useState<DetectedBlob[]>([]);
  const [detectedBridges, setDetectedBridges] = useState<SolderBridge[]>([]);
  const [isPass, setIsPass] = useState<boolean>(true);

  // Execute blob & solder bridge analysis strictly on "Process" click
  const handleProcess = useCallback(() => {
    if (!workbench.source || !workbench.searchRegion) {
      setDetectedBlobs([]);
      setDetectedBridges([]);
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

    const blobs: DetectedBlob[] = [];
    const bridges: SolderBridge[] = [];
    const step = 20;

    for (let y = startY; y < endY - step; y += step) {
      for (let x = startX; x < endX - step; x += step) {
        let activePixelCount = 0;

        for (let dy = 0; dy < step; dy += 2) {
          for (let dx = 0; dx < step; dx += 2) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            const luma = 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];
            const isMatch =
              targetPolarity === "dark"
                ? luma <= binaryThreshold
                : targetPolarity === "bright"
                  ? luma >= binaryThreshold
                  : true;

            if (isMatch) {
              activePixelCount += 4;
            }
          }
        }

        if (activePixelCount >= minBlobArea && activePixelCount <= maxBlobArea) {
          blobs.push({
            id: blobs.length + 1,
            x,
            y,
            width: step,
            height: step,
            areaPx: activePixelCount,
          });
        }
      }
    }

    // Check for bridging between closely spaced blobs
    for (let i = 0; i < blobs.length; i += 1) {
      for (let j = i + 1; j < blobs.length; j += 1) {
        const b1 = blobs[i];
        const b2 = blobs[j];
        const dist = Math.hypot(b1.x - b2.x, b1.y - b2.y);

        if (dist > 0 && dist < step * 1.25) {
          bridges.push({
            id: bridges.length + 1,
            x1: b1.x + b1.width / 2,
            y1: b1.y + b1.height / 2,
            x2: b2.x + b2.width / 2,
            y2: b2.y + b2.height / 2,
          });
        }
      }
    }

    const countPass = blobs.length >= minBlobCount && blobs.length <= maxBlobCount;
    const bridgePass = bridges.length === 0;

    setDetectedBlobs(blobs);
    setDetectedBridges(bridges);
    setIsPass(countPass && bridgePass);
    setHasProcessed(true);
  }, [
    workbench.source,
    workbench.searchRegion,
    binaryThreshold,
    minBlobArea,
    maxBlobArea,
    minBlobCount,
    maxBlobCount,
    targetPolarity,
  ]);

  const handleThresholdChange = useCallback((value: number) => {
    setBinaryThreshold(value);
    setHasProcessed(false);
  }, []);

  const handleMinBlobAreaChange = useCallback((value: number) => {
    setMinBlobArea(value);
    setHasProcessed(false);
  }, []);

  const handleMaxBlobAreaChange = useCallback((value: number) => {
    setMaxBlobArea(value);
    setHasProcessed(false);
  }, []);

  const handleMinBlobCountChange = useCallback((value: number) => {
    setMinBlobCount(value);
    setHasProcessed(false);
  }, []);

  const handleMaxBlobCountChange = useCallback((value: number) => {
    setMaxBlobCount(value);
    setHasProcessed(false);
  }, []);

  const handleHoleFillingChange = useCallback((hasHoles: boolean) => {
    setHasHoleFilling(hasHoles);
    setHasProcessed(false);
  }, []);

  const handlePolarityChange = useCallback((polarity: "bright" | "dark" | "both") => {
    setTargetPolarity(polarity);
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
        const isMatch =
          targetPolarity === "dark"
            ? luma <= binaryThreshold
            : targetPolarity === "bright"
              ? luma >= binaryThreshold
              : true;

        if (hasProcessed && isInsideRegion && isMatch) {
          out[idx] = 16;
          out[idx + 1] = 185;
          out[idx + 2] = 129;
          out[idx + 3] = 255;
        } else if (isInsideRegion) {
          const dimmed = Math.round(luma * 0.4);
          out[idx] = dimmed;
          out[idx + 1] = dimmed;
          out[idx + 2] = dimmed;
          out[idx + 3] = 255;
        } else {
          out[idx] = 12;
          out[idx + 1] = 16;
          out[idx + 2] = 22;
          out[idx + 3] = 255;
        }
      }

      return output;
    },
    [workbench.searchRegion, binaryThreshold, targetPolarity, hasProcessed],
  );

  const renderCustomOverlays = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!hasProcessed) {
        return;
      }

      for (const blob of detectedBlobs) {
        ctx.save();
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.fillStyle = "rgba(16, 185, 129, 0.15)";

        ctx.fillRect(blob.x, blob.y, blob.width, blob.height);
        ctx.strokeRect(blob.x, blob.y, blob.width, blob.height);

        ctx.fillStyle = "#10b981";
        ctx.font = "bold 9px monospace";
        ctx.fillText(`BLOB #${blob.id}`, blob.x, Math.max(10, blob.y - 4));
        ctx.restore();
      }

      for (const bridge of detectedBridges) {
        ctx.save();
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 2]);

        ctx.beginPath();
        ctx.moveTo(bridge.x1, bridge.y1);
        ctx.lineTo(bridge.x2, bridge.y2);
        ctx.stroke();

        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 10px monospace";
        const midX = (bridge.x1 + bridge.x2) / 2;
        const midY = (bridge.y1 + bridge.y2) / 2;
        ctx.fillText("BRIDGE SHORT", midX - 35, midY - 6);
        ctx.restore();
      }
    },
    [detectedBlobs, detectedBridges, hasProcessed],
  );

  // Apply button: only adds / updates rule when explicitly clicked
  const handleApply = useCallback(() => {
    const finalCount = detectedBlobs.length;
    const finalBridges = detectedBridges.length;
    const countPass = finalCount >= minBlobCount && finalCount <= maxBlobCount;

    const defaultCountItem: JudgmentItem = {
      id: "j1",
      name: "Blob Count",
      unit: "count",
      lowerLimit: minBlobCount,
      measured: finalCount,
      upperLimit: maxBlobCount,
      status: countPass ? "PASS" : "FAIL",
    };

    const defaultBridgeItem: JudgmentItem = {
      id: "j2",
      name: "Solder Bridge Count",
      unit: "count",
      lowerLimit: 0,
      measured: finalBridges,
      upperLimit: 0,
      status: finalBridges === 0 ? "PASS" : "FAIL",
    };

    props.onChange((prev) => ({
      ...prev,
      params: {
        ...(prev.params ?? {}),
        toolCode: "T109",
        binaryThreshold,
        minBlobArea,
        maxBlobArea,
        minBlobCount,
        maxBlobCount,
        hasHoleFilling,
        targetPolarity,
        detectedBlobCount: finalCount,
        detectedBridgeCount: finalBridges,
        judgmentItems: [defaultCountItem, defaultBridgeItem],
      },
    }));

    props.onOk?.();
  }, [
    binaryThreshold,
    minBlobArea,
    maxBlobArea,
    minBlobCount,
    maxBlobCount,
    hasHoleFilling,
    targetPolarity,
    detectedBlobs,
    detectedBridges,
    props,
  ]);

  return (
    <StandardWorkbenchShell
      toolName="Binary Blob & Solder Bridge"
      toolCode="T109"
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
          filterModeLabel="FILTERED (Blob Segmentation)"
          toolBadge="T109 BINARY BLOB"
          statusText={
            hasProcessed
              ? `${detectedBlobs.length} BLOBS / ${detectedBridges.length} BRIDGES [${isPass ? "PASS" : "FAIL"}]`
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
        <BlobToolPanel
          binaryThreshold={binaryThreshold}
          minBlobArea={minBlobArea}
          maxBlobArea={maxBlobArea}
          minBlobCount={minBlobCount}
          maxBlobCount={maxBlobCount}
          hasHoleFilling={hasHoleFilling}
          targetPolarity={targetPolarity}
          detectedBlobCount={detectedBlobs.length}
          detectedBridgeCount={detectedBridges.length}
          isPass={isPass}
          hasProcessed={hasProcessed}
          actionButtonLabel={props.actionButtonLabel}
          onThresholdChange={handleThresholdChange}
          onMinBlobAreaChange={handleMinBlobAreaChange}
          onMaxBlobAreaChange={handleMaxBlobAreaChange}
          onMinBlobCountChange={handleMinBlobCountChange}
          onMaxBlobCountChange={handleMaxBlobCountChange}
          onHoleFillingChange={handleHoleFillingChange}
          onPolarityChange={handlePolarityChange}
          onProcess={handleProcess}
          onApply={handleApply}
          onCancel={props.onCancel}
        />
      }
    />
  );
}
