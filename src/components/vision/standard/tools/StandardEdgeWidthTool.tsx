import React, { useCallback, useMemo, useState } from "react";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import { useStandardWorkbench } from "../workbench/useStandardWorkbench";
import { StandardWorkbenchShell } from "../workbench/StandardWorkbenchShell";
import { StandardWorkbenchCanvas } from "../workbench/StandardWorkbenchCanvas";
import { EdgeWidthToolPanel } from "../workbench/EdgeWidthToolPanel";

export interface StandardEdgeWidthToolProps {
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

export function StandardEdgeWidthTool(props: StandardEdgeWidthToolProps): React.JSX.Element {
  const workbench = useStandardWorkbench({
    settings: props.settings,
    onChange: props.onChange,
    imageRef: props.imageRef,
    onImageRegistered: props.onImageRegistered,
  });

  const initialParams = (props.settings.params as Record<string, unknown> | undefined) ?? {};

  const [measurementMode, setMeasurementMode] = useState<"width" | "pitch" | "gap">(
    (initialParams.measurementMode as "width" | "pitch" | "gap") ?? "width",
  );
  const [edgePolarity, setEdgePolarity] = useState<"dark-to-light" | "light-to-dark" | "any">(
    (initialParams.edgePolarity as "dark-to-light" | "light-to-dark" | "any") ?? "any",
  );
  const [contrastThreshold, setContrastThreshold] = useState<number>(
    Number(initialParams.contrastThreshold ?? 30),
  );
  const [nominalDistance, setNominalDistance] = useState<number>(
    Number(initialParams.nominalDistance ?? 45),
  );
  const [tolerance, setTolerance] = useState<number>(Number(initialParams.tolerance ?? 5));
  const [expectedLeadCount, setExpectedLeadCount] = useState<number>(
    Number(initialParams.expectedLeadCount ?? 8),
  );

  // Explicit processing state: no tool auto-analyzes
  const [hasProcessed, setHasProcessed] = useState<boolean>(false);
  const [measuredDistance, setMeasuredDistance] = useState<number>(
    Number(initialParams.nominalDistance ?? 45),
  );
  const [measuredLeadCount, setMeasuredLeadCount] = useState<number>(
    Number(initialParams.expectedLeadCount ?? 8),
  );
  // Preview verdict only, never a rule judgment: undefined until a real
  // Process runs on a teach image. Apply must not write this to the rule.
  const [isPass, setIsPass] = useState<boolean | undefined>(undefined);
  const [edgeTransitions, setEdgeTransitions] = useState<number[]>([]);

  // Execute caliper edge detection strictly on demand
  const handleProcess = useCallback(() => {
    if (!workbench.source || !workbench.searchRegion) {
      // Preview only: no teach image / search region, so nothing is
      // measured. Do NOT seed the preview with the nominal values and
      // never report a pass from an absent image.
      setEdgeTransitions([]);
      setIsPass(undefined);
      setHasProcessed(false);

      return;
    }

    const { width, height, rgba } = workbench.source;
    const region = workbench.searchRegion;

    const startX = Math.max(1, Math.min(width - 2, region.x));
    const midY = Math.max(0, Math.min(height - 1, region.y + Math.round(region.height / 2)));
    const endX = Math.max(2, Math.min(width - 1, region.x + region.width));

    const transitions: number[] = [];
    const thresholdGrad = Math.round(contrastThreshold * 1.5);

    for (let x = startX; x < endX; x += 1) {
      const idxLeft = (midY * width + (x - 1)) * 4;
      const idxRight = (midY * width + (x + 1)) * 4;

      const lumaL = 0.299 * rgba[idxLeft] + 0.587 * rgba[idxLeft + 1] + 0.114 * rgba[idxLeft + 2];
      const lumaR =
        0.299 * rgba[idxRight] + 0.587 * rgba[idxRight + 1] + 0.114 * rgba[idxRight + 2];
      const diff = lumaR - lumaL;

      const isCandidate =
        edgePolarity === "dark-to-light"
          ? diff >= thresholdGrad
          : edgePolarity === "light-to-dark"
            ? diff <= -thresholdGrad
            : Math.abs(diff) >= thresholdGrad;

      if (isCandidate) {
        const lastEdge = transitions[transitions.length - 1];

        if (lastEdge === undefined || x - lastEdge > 6) {
          transitions.push(x);
        }
      }
    }

    let dist = nominalDistance;

    if (transitions.length >= 2) {
      dist = Math.round((transitions[1] - transitions[0]) * 10) / 10;
    }

    const detectedCount = Math.max(1, Math.round(transitions.length / 2));
    const pass = Math.abs(dist - nominalDistance) <= tolerance;

    setMeasuredDistance(dist);
    setMeasuredLeadCount(detectedCount);
    setIsPass(pass);
    setEdgeTransitions(transitions);
    setHasProcessed(true);
  }, [
    workbench.source,
    workbench.searchRegion,
    contrastThreshold,
    edgePolarity,
    nominalDistance,
    tolerance,
  ]);

  const handleModeChange = useCallback((mode: "width" | "pitch" | "gap") => {
    setMeasurementMode(mode);
    setHasProcessed(false);
  }, []);

  const handlePolarityChange = useCallback(
    (polarity: "dark-to-light" | "light-to-dark" | "any") => {
      setEdgePolarity(polarity);
      setHasProcessed(false);
    },
    [],
  );

  const handleContrastChange = useCallback((val: number) => {
    setContrastThreshold(val);
    setHasProcessed(false);
  }, []);

  const handleNominalDistanceChange = useCallback((val: number) => {
    setNominalDistance(val);
    setHasProcessed(false);
  }, []);

  const handleToleranceChange = useCallback((val: number) => {
    setTolerance(val);
    setHasProcessed(false);
  }, []);

  const handleExpectedCountChange = useCallback((val: number) => {
    setExpectedLeadCount(val);
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

      const thresholdGrad = Math.round(contrastThreshold * 1.5);

      for (let i = 0; i < totalPixels; i += 1) {
        const idx = i * 4;
        const x = i % source.width;
        const y = Math.floor(i / source.width);

        const isInsideRegion = x >= rx1 && x < rx2 && y >= ry1 && y < ry2;

        if (hasProcessed && isInsideRegion && x + 1 < source.width && x > 0) {
          const idxL = (y * source.width + (x - 1)) * 4;
          const idxR = (y * source.width + (x + 1)) * 4;

          const lumaL = 0.299 * raw[idxL] + 0.587 * raw[idxL + 1] + 0.114 * raw[idxL + 2];
          const lumaR = 0.299 * raw[idxR] + 0.587 * raw[idxR + 1] + 0.114 * raw[idxR + 2];
          const diff = Math.abs(lumaR - lumaL);

          if (diff >= thresholdGrad) {
            // Neon cyan edge transition marker
            out[idx] = 6;
            out[idx + 1] = 182;
            out[idx + 2] = 212;
            out[idx + 3] = 255;
          } else {
            out[idx] = raw[idx];
            out[idx + 1] = raw[idx + 1];
            out[idx + 2] = raw[idx + 2];
            out[idx + 3] = raw[idx + 3];
          }
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
    [workbench.searchRegion, contrastThreshold, hasProcessed],
  );

  const renderCustomOverlays = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!workbench.searchRegion) {
        return;
      }

      const region = workbench.searchRegion;
      const midY = region.y + Math.round(region.height / 2);

      // Caliper Scan Line
      ctx.save();
      ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(region.x, midY);
      ctx.lineTo(region.x + region.width, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      if (!hasProcessed) {
        ctx.restore();

        return;
      }

      // Draw Caliper transition ticks
      for (const edgeX of edgeTransitions) {
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(edgeX, midY - 14);
        ctx.lineTo(edgeX, midY + 14);
        ctx.stroke();
      }

      // Draw Caliper Dimension Arrow
      if (edgeTransitions.length >= 2) {
        const x1 = edgeTransitions[0];
        const x2 = edgeTransitions[1];

        ctx.strokeStyle = isPass ? "#00ff9d" : "#f43f5e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, midY);
        ctx.lineTo(x2, midY);
        ctx.stroke();

        // Arrowheads
        ctx.fillStyle = isPass ? "#00ff9d" : "#f43f5e";
        ctx.beginPath();
        ctx.moveTo(x1, midY);
        ctx.lineTo(x1 + 6, midY - 4);
        ctx.lineTo(x1 + 6, midY + 4);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x2, midY);
        ctx.lineTo(x2 - 6, midY - 4);
        ctx.lineTo(x2 - 6, midY + 4);
        ctx.closePath();
        ctx.fill();

        // Dimension Label
        ctx.font = "bold 11px monospace";
        const text = `${measuredDistance.toFixed(1)} px`;
        const midX = (x1 + x2) / 2;
        ctx.fillText(text, midX - 20, midY - 8);
      }

      ctx.restore();
    },
    [workbench.searchRegion, hasProcessed, edgeTransitions, measuredDistance, isPass],
  );

  // Apply = rule creation. Writes TEACH params only: the preview
  // measured width / lead count and their verdict are deliberately NOT
  // written (no measuredDistance, no measuredLeadCount, no
  // judgmentItems, no isPass) — the analyzer re-measures on every
  // analysis image. The workbench nominal is in px, so the catalog mm
  // nominal is derived with pxToMetricRatio (the stored ratio if the
  // rule already has one, else the analyzer default 0.025 mm/px), with
  // symmetric mm tolerances derived from the px tolerance.
  // nominalWidthPx is written ONLY if the rule already had it (legacy).
  // Portability: the preview edge-transition positions are display-only
  // measurements and are stored in neither absolute nor relative form;
  // the teach frame is the search region saved by the workbench, and
  // the scalar nominals above are frame-independent.
  const handleApply = useCallback(() => {
    const pxToMetricRatio =
      typeof initialParams.pxToMetricRatio === "number" &&
      Number.isFinite(initialParams.pxToMetricRatio)
        ? (initialParams.pxToMetricRatio as number)
        : 0.025;
    props.onChange((prev) => ({
      ...prev,
      params: {
        ...(prev.params ?? {}),
        toolCode: "T110",
        measurementMode,
        edgePolarity,
        contrastThreshold,
        nominalDistance,
        nominalDistancePx: nominalDistance,
        nominalDimensionMm: nominalDistance * pxToMetricRatio,
        pxToMetricRatio,
        lowerToleranceMm: -tolerance * pxToMetricRatio,
        upperToleranceMm: tolerance * pxToMetricRatio,
        tolerance,
        expectedLeadCount,
        expectedCount: expectedLeadCount,
        ...(typeof initialParams.nominalWidthPx === "number"
          ? { nominalWidthPx: initialParams.nominalWidthPx }
          : {}),
      },
    }));

    props.onOk?.();
  }, [
    measurementMode,
    edgePolarity,
    contrastThreshold,
    nominalDistance,
    tolerance,
    expectedLeadCount,
    initialParams.pxToMetricRatio,
    initialParams.nominalWidthPx,
    props,
  ]);

  return (
    <StandardWorkbenchShell
      toolName="Edge Width & Caliper Inspector"
      toolCode="T110"
      isCameraOpen={workbench.isCameraOpen}
      onCloseCamera={() => workbench.setIsCameraOpen(false)}
      onCaptureCameraFrame={workbench.handleCaptureFrame}
      onLoadFile={workbench.handleLoadFile}
      onProcess={handleProcess}
      onRefresh={props.onRefresh}
      canvas={
        <StandardWorkbenchCanvas
          source={workbench.source}
          searchRegion={workbench.searchRegion}
          dragState={workbench.dragState}
          hasFilteredPreview={workbench.hasFilteredPreview}
          hasOverlays={workbench.hasOverlays}
          filterModeLabel="FILTERED (Edge Gradient)"
          toolBadge="T110 CALIPER"
          statusText={
            hasProcessed
              ? `${measuredDistance.toFixed(1)} px [${isPass ? "PASS" : "FAIL"}]`
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
        <EdgeWidthToolPanel
          measurementMode={measurementMode}
          edgePolarity={edgePolarity}
          contrastThreshold={contrastThreshold}
          nominalDistance={nominalDistance}
          tolerance={tolerance}
          expectedLeadCount={expectedLeadCount}
          measuredDistance={measuredDistance}
          measuredLeadCount={measuredLeadCount}
          isPass={isPass}
          hasProcessed={hasProcessed}
          toolCode="T110"
          actionButtonLabel={props.actionButtonLabel}
          onMeasurementModeChange={handleModeChange}
          onPolarityChange={handlePolarityChange}
          onContrastThresholdChange={handleContrastChange}
          onNominalDistanceChange={handleNominalDistanceChange}
          onToleranceChange={handleToleranceChange}
          onExpectedLeadCountChange={handleExpectedCountChange}
          onProcess={handleProcess}
          onApply={handleApply}
          onCancel={props.onCancel}
        />
      }
    />
  );
}
