import React, { useCallback, useState } from "react";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import { useStandardWorkbench } from "../workbench/useStandardWorkbench";
import { StandardWorkbenchShell } from "../workbench/StandardWorkbenchShell";
import { StandardWorkbenchCanvas } from "../workbench/StandardWorkbenchCanvas";
import { ConformalCoatingToolPanel } from "../workbench/ConformalCoatingToolPanel";
import type {
  CieLabColor,
  CoatingInspectionModeType,
  ConformalCoatingResult,
  RgbColor,
  UvTracerChannelType,
} from "@/domain/vision/conformal-coating-types";
import {
  analyzeConformalCoating,
  calculateFluorescenceSignal,
  computeDeltaE,
  srgbToCieLab,
} from "@/lib/vision/algorithms/color-and-coating";

export interface StandardConformalCoatingToolProps {
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

export function StandardConformalCoatingTool(
  props: StandardConformalCoatingToolProps,
): React.JSX.Element {
  const workbench = useStandardWorkbench({
    settings: props.settings,
    onChange: props.onChange,
    imageRef: props.imageRef,
    onImageRegistered: props.onImageRegistered,
  });

  const initialParams = (props.settings.params as Record<string, unknown> | undefined) ?? {};

  const [inspectionMode, setInspectionMode] = useState<CoatingInspectionModeType>(
    (initialParams.inspectionMode as CoatingInspectionModeType) ?? "uv-fluorescence",
  );
  const [uvChannel, setUvChannel] = useState<UvTracerChannelType>(
    (initialParams.uvChannel as UvTracerChannelType) ?? "uv-blue",
  );
  const [fluorescenceThreshold, setFluorescenceThreshold] = useState<number>(
    Number(initialParams.fluorescenceThreshold ?? 110),
  );
  const [minCoveragePct, setMinCoveragePct] = useState<number>(
    Number(initialParams.minCoveragePct ?? 95),
  );
  const [maxDeltaE, setMaxDeltaE] = useState<number>(Number(initialParams.maxDeltaE ?? 5.0));
  const [maxAllowedVoids, setMaxAllowedVoids] = useState<number>(
    Number(initialParams.maxAllowedVoids ?? 0),
  );
  const [targetLab, setTargetLab] = useState<CieLabColor>(
    (initialParams.targetLab as CieLabColor) ?? { l: 60, a: -10, b: 35 },
  );

  // Explicit processing state: no tool auto-analyzes
  const [hasProcessed, setHasProcessed] = useState<boolean>(false);
  const [coatingResult, setCoatingResult] = useState<ConformalCoatingResult | null>(null);
  // Preview verdict only, never a rule judgment: undefined until a real
  // Process runs on a teach image. Apply must not write this to the rule.
  const [isPass, setIsPass] = useState<boolean | undefined>(undefined);

  const handleProcess = useCallback(() => {
    if (!workbench.source || !workbench.searchRegion) {
      // Preview only: no teach image / search region, so no coating result
      // and no verdict. Stay unprocessed; never report a pass.
      setHasProcessed(false);
      setIsPass(undefined);

      return;
    }

    const res = analyzeConformalCoating({
      imageData: workbench.source,
      roi: workbench.searchRegion,
      inspectionMode,
      uvChannel,
      fluorescenceThreshold,
      minCoveragePct,
      maxDeltaE,
      targetLab,
      maxAllowedVoids,
    });

    setCoatingResult(res);
    setIsPass(res.isPass);
    setHasProcessed(true);
  }, [
    workbench.source,
    workbench.searchRegion,
    inspectionMode,
    uvChannel,
    fluorescenceThreshold,
    minCoveragePct,
    maxDeltaE,
    targetLab,
    maxAllowedVoids,
  ]);

  const handleInspectionModeChange = useCallback((mode: CoatingInspectionModeType) => {
    setInspectionMode(mode);
    setHasProcessed(false);
  }, []);

  const handleUvChannelChange = useCallback((channel: UvTracerChannelType) => {
    setUvChannel(channel);
    setHasProcessed(false);
  }, []);

  const handleFluorescenceThresholdChange = useCallback((val: number) => {
    setFluorescenceThreshold(val);
    setHasProcessed(false);
  }, []);

  const handleMinCoveragePctChange = useCallback((val: number) => {
    setMinCoveragePct(val);
    setHasProcessed(false);
  }, []);

  const handleMaxDeltaEChange = useCallback((val: number) => {
    setMaxDeltaE(val);
    setHasProcessed(false);
  }, []);

  const handleMaxAllowedVoidsChange = useCallback((val: number) => {
    setMaxAllowedVoids(val);
    setHasProcessed(false);
  }, []);

  const handleTargetLabChange = useCallback((lab: CieLabColor) => {
    setTargetLab(lab);
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

        const isInsideRegion = x >= rx1 && x < rx2 && y >= ry1 && y < ry2;

        if (hasProcessed && isInsideRegion) {
          const r = raw[idx];
          const g = raw[idx + 1];
          const b = raw[idx + 2];

          let isCoated = false;

          if (inspectionMode === "cie-lab-color") {
            const pixLab = srgbToCieLab(r, g, b);
            isCoated = computeDeltaE(pixLab, targetLab) <= maxDeltaE;
          } else {
            const sig = calculateFluorescenceSignal(r, g, b, uvChannel);
            isCoated = sig >= fluorescenceThreshold;
          }

          if (inspectionMode === "keep-out-zone") {
            if (isCoated) {
              // Prohibited coating detected: vibrant red breach highlight
              out[idx] = 255;
              out[idx + 1] = 40;
              out[idx + 2] = 40;
              out[idx + 3] = 255;
            } else {
              out[idx] = raw[idx];
              out[idx + 1] = raw[idx + 1];
              out[idx + 2] = raw[idx + 2];
              out[idx + 3] = raw[idx + 3];
            }
          } else if (isCoated) {
            // High-fluorescence coated region: neon blue / cyan tint
            out[idx] = Math.round(raw[idx] * 0.4);
            out[idx + 1] = Math.min(255, Math.round(raw[idx + 1] * 0.6 + 100));
            out[idx + 2] = Math.min(255, Math.round(raw[idx + 2] * 0.5 + 160));
            out[idx + 3] = 255;
          } else {
            // Uncoated void / de-wetting pocket: bright magenta alert
            out[idx] = 255;
            out[idx + 1] = 0;
            out[idx + 2] = 128;
            out[idx + 3] = 255;
          }
        } else {
          // Keep full workpiece image completely visible - never blackout outside ROI
          out[idx] = raw[idx];
          out[idx + 1] = raw[idx + 1];
          out[idx + 2] = raw[idx + 2];
          out[idx + 3] = raw[idx + 3];
        }
      }

      return output;
    },
    [
      workbench.searchRegion,
      hasProcessed,
      inspectionMode,
      uvChannel,
      fluorescenceThreshold,
      maxDeltaE,
      targetLab,
    ],
  );

  const renderCustomOverlays = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!workbench.searchRegion) {
        return;
      }

      const region = workbench.searchRegion;

      ctx.save();

      if (!hasProcessed || !coatingResult) {
        // Pending dashed guide box
        ctx.strokeStyle = "rgba(139, 92, 246, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(region.x, region.y, region.width, region.height);
        ctx.setLineDash([]);
        ctx.restore();

        return;
      }

      // Draw Keep-Out Zone caution boundary
      if (inspectionMode === "keep-out-zone") {
        ctx.strokeStyle = coatingResult.isPass ? "#10b981" : "#ef4444";
        ctx.lineWidth = 2;
        ctx.strokeRect(region.x, region.y, region.width, region.height);

        // Caution diagonal hatching
        ctx.strokeStyle = coatingResult.isPass
          ? "rgba(16, 185, 129, 0.2)"
          : "rgba(239, 68, 68, 0.3)";
        ctx.lineWidth = 1;
        const step = 16;

        for (let x = region.x; x < region.x + region.width + region.height; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, region.y);
          ctx.lineTo(x - region.height, region.y + region.height);
          ctx.stroke();
        }
      }

      // Draw bounding boxes around detected uncoated voids
      for (const voidItem of coatingResult.uncoatedVoids) {
        ctx.strokeStyle = "#ff0080";
        ctx.lineWidth = 2;
        ctx.strokeRect(voidItem.x, voidItem.y, voidItem.width, voidItem.height);

        ctx.fillStyle = "#ff0080";
        ctx.font = "bold 9px monospace";
        ctx.fillText(`VOID (${voidItem.areaPx}px)`, voidItem.x, Math.max(10, voidItem.y - 3));
      }

      // Status summary badge in bottom corner of ROI
      const badgeY = region.y + region.height + 16;
      ctx.fillStyle = coatingResult.isPass ? "#10b981" : "#ef4444";
      ctx.font = "bold 11px monospace";

      const badgeText =
        inspectionMode === "keep-out-zone"
          ? `KOZ: ${coatingResult.coveragePct}% BREACH [${coatingResult.isPass ? "CLEAR" : "BREACH"}]`
          : inspectionMode === "cie-lab-color"
            ? `COLOR: ΔE=${coatingResult.deltaE.toFixed(1)} | ${coatingResult.coveragePct}% [${coatingResult.isPass ? "PASS" : "FAIL"}]`
            : `COATING: ${coatingResult.coveragePct}% (${coatingResult.uncoatedVoidCount} voids) [${coatingResult.isPass ? "PASS" : "FAIL"}]`;

      ctx.fillText(badgeText, region.x, badgeY);

      ctx.restore();
    },
    [workbench.searchRegion, hasProcessed, coatingResult, inspectionMode],
  );

  // Apply = rule creation. Writes TEACH params only. The preview
  // coverage / delta-E / void count and its verdict are deliberately
  // NOT written (no measuredCoveragePct, no measuredDeltaE, no
  // detectedVoidCount, no isPass, no judgmentItems): the analyzer
  // re-measures coating on every analysis image. Note the previous
  // Apply defaulted an unprocessed preview to PASS (finalPass = true
  // when coatingResult was null) — Apply without Process now writes
  // teach params only and no verdict at all. This tool has no keep-out
  // mask control (keep-out-zone is an inspection mode, not a mask
  // region), so no mask reference is stored.
  const handleApply = useCallback(() => {
    const uvColorChannel =
      uvChannel === "uv-blue" ? "uvBlue" : uvChannel === "uv-green" ? "uvGreen" : "luminance";

    props.onChange((prev) => ({
      ...prev,
      params: {
        ...(prev.params ?? {}),
        toolCode: "T112",
        inspectionMode,
        uvChannel,
        uvColorChannel,
        fluorescenceThreshold,
        minCoveragePct,
        maxDeltaE,
        maxAllowedVoids,
        targetLab,
      },
    }));

    props.onOk?.();
  }, [
    minCoveragePct,
    maxAllowedVoids,
    inspectionMode,
    uvChannel,
    fluorescenceThreshold,
    maxDeltaE,
    targetLab,
    props,
  ]);

  return (
    <StandardWorkbenchShell
      toolName="Conformal Coating & Color Inspector"
      toolCode="T112"
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
          filterModeLabel="FILTERED (Coating & Void Map)"
          toolBadge="T112 COATING/COLOR"
          statusText={
            hasProcessed
              ? `${coatingResult?.coveragePct.toFixed(1)}% COV [${isPass ? "PASS" : "FAIL"}]`
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
        <ConformalCoatingToolPanel
          inspectionMode={inspectionMode}
          uvChannel={uvChannel}
          fluorescenceThreshold={fluorescenceThreshold}
          minCoveragePct={minCoveragePct}
          maxDeltaE={maxDeltaE}
          maxAllowedVoids={maxAllowedVoids}
          targetLab={targetLab}
          coveragePct={coatingResult ? coatingResult.coveragePct : 0}
          deltaE={coatingResult ? coatingResult.deltaE : 0}
          meanRgb={coatingResult ? coatingResult.meanRgb : { r: 0, g: 0, b: 0 }}
          meanLab={coatingResult ? coatingResult.meanLab : { l: 0, a: 0, b: 0 }}
          uncoatedVoidCount={coatingResult ? coatingResult.uncoatedVoidCount : 0}
          isPass={isPass}
          hasProcessed={hasProcessed}
          actionButtonLabel={props.actionButtonLabel}
          onInspectionModeChange={handleInspectionModeChange}
          onUvChannelChange={handleUvChannelChange}
          onFluorescenceThresholdChange={handleFluorescenceThresholdChange}
          onMinCoveragePctChange={handleMinCoveragePctChange}
          onMaxDeltaEChange={handleMaxDeltaEChange}
          onMaxAllowedVoidsChange={handleMaxAllowedVoidsChange}
          onTargetLabChange={handleTargetLabChange}
          onProcess={handleProcess}
          onApply={handleApply}
          onCancel={props.onCancel}
        />
      }
    />
  );
}
