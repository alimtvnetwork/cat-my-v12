import React, { useCallback, useState } from "react";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import { useStandardWorkbench } from "../workbench/useStandardWorkbench";
import { StandardWorkbenchShell } from "../workbench/StandardWorkbenchShell";
import { StandardWorkbenchCanvas } from "../workbench/StandardWorkbenchCanvas";
import { CircleGaugeToolPanel } from "../workbench/CircleGaugeToolPanel";
import type { JudgmentItem } from "../tabs/JudgmentConditionsTab";
import type {
  CircleFitResult,
  CircleGaugePolarityType,
  CircleGaugeTargetFeatureType,
} from "@/domain/vision/circle-gauge-types";
import { computeCircleGaugeMetrics } from "@/lib/vision/algorithms/circle-fit";

export interface StandardCircleGaugeToolProps {
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

export function StandardCircleGaugeTool(
  props: StandardCircleGaugeToolProps,
): React.JSX.Element {
  const workbench = useStandardWorkbench({
    settings: props.settings,
    onChange: props.onChange,
    imageRef: props.imageRef,
    onImageRegistered: props.onImageRegistered,
  });

  const initialParams = (props.settings.params as Record<string, unknown> | undefined) ?? {};

  const [targetFeature, setTargetFeature] = useState<CircleGaugeTargetFeatureType>(
    (initialParams.targetFeature as CircleGaugeTargetFeatureType) ?? "drill-hole",
  );
  const [edgePolarity, setEdgePolarity] = useState<CircleGaugePolarityType>(
    (initialParams.edgePolarity as CircleGaugePolarityType) ?? "dark-to-light",
  );
  const [nominalDiameter, setNominalDiameter] = useState<number>(
    Number(initialParams.nominalDiameterPx ?? initialParams.nominalDiameter ?? 50),
  );
  const [tolerance, setTolerance] = useState<number>(
    Number(initialParams.diameterTolerancePx ?? initialParams.tolerance ?? 4),
  );
  const [minRoundnessScore, setMinRoundnessScore] = useState<number>(
    Number(initialParams.minRoundnessScorePct ?? 80),
  );
  const [contrastThreshold, setContrastThreshold] = useState<number>(
    Number(initialParams.minEdgeContrast ?? 20),
  );
  const [rayCount, setRayCount] = useState<number>(
    Number(initialParams.rayCount ?? 64),
  );

  // Explicit processing state: no tool auto-analyzes
  const [hasProcessed, setHasProcessed] = useState<boolean>(false);
  const [fitResult, setFitResult] = useState<CircleFitResult | null>(null);
  const [measuredDiameter, setMeasuredDiameter] = useState<number>(
    Number(initialParams.nominalDiameterPx ?? initialParams.nominalDiameter ?? 50),
  );
  const [roundnessScore, setRoundnessScore] = useState<number>(0);
  const [isPass, setIsPass] = useState<boolean>(true);

  const handleProcess = useCallback(() => {
    if (!workbench.source || !workbench.searchRegion) {
      setHasProcessed(true);
      setIsPass(true);

      return;
    }

    const result = computeCircleGaugeMetrics({
      imageData: workbench.source,
      roi: workbench.searchRegion,
      nominalDiameterPx: nominalDiameter,
      diameterTolerancePx: tolerance,
      minRoundnessScorePct: minRoundnessScore,
      edgePolarity,
      minEdgeContrast: contrastThreshold,
      rayCount,
      filterWidth: 3,
    });

    setFitResult(result);
    setMeasuredDiameter(result.diameterPx);
    setRoundnessScore(result.roundnessScorePct);
    setIsPass(result.isPass);
    setHasProcessed(true);
  }, [
    workbench.source,
    workbench.searchRegion,
    nominalDiameter,
    tolerance,
    minRoundnessScore,
    edgePolarity,
    contrastThreshold,
    rayCount,
  ]);

  const handleTargetFeatureChange = useCallback((feature: CircleGaugeTargetFeatureType) => {
    setTargetFeature(feature);
    if (feature === "drill-hole") {
      setEdgePolarity("dark-to-light");
    } else if (feature === "via-pad") {
      setEdgePolarity("light-to-dark");
    }
    setHasProcessed(false);
  }, []);

  const handlePolarityChange = useCallback((pol: CircleGaugePolarityType) => {
    setEdgePolarity(pol);
    setHasProcessed(false);
  }, []);

  const handleNominalDiameterChange = useCallback((val: number) => {
    setNominalDiameter(val);
    setHasProcessed(false);
  }, []);

  const handleToleranceChange = useCallback((val: number) => {
    setTolerance(val);
    setHasProcessed(false);
  }, []);

  const handleMinRoundnessScoreChange = useCallback((val: number) => {
    setMinRoundnessScore(val);
    setHasProcessed(false);
  }, []);

  const handleContrastThresholdChange = useCallback((val: number) => {
    setContrastThreshold(val);
    setHasProcessed(false);
  }, []);

  const handleRayCountChange = useCallback((val: number) => {
    setRayCount(val);
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

        if (hasProcessed && fitResult && fitResult.hasValidFit && isInsideRegion) {
          const dx = x - fitResult.centerX;
          const dy = y - fitResult.centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const isNearCirclePerimeter = Math.abs(dist - fitResult.radiusPx) <= 1.0;

          if (isNearCirclePerimeter) {
            // Neon circle outline on filtered view
            out[idx] = fitResult.isPass ? 0 : 255;
            out[idx + 1] = fitResult.isPass ? 255 : 60;
            out[idx + 2] = fitResult.isPass ? 157 : 60;
            out[idx + 3] = 255;
          } else {
            out[idx] = raw[idx];
            out[idx + 1] = raw[idx + 1];
            out[idx + 2] = raw[idx + 2];
            out[idx + 3] = raw[idx + 3];
          }
        } else {
          // Keep 100% of workpiece pixels visible - never blackout outside ROI
          out[idx] = raw[idx];
          out[idx + 1] = raw[idx + 1];
          out[idx + 2] = raw[idx + 2];
          out[idx + 3] = raw[idx + 3];
        }
      }

      return output;
    },
    [workbench.searchRegion, hasProcessed, fitResult],
  );

  const renderCustomOverlays = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!workbench.searchRegion) {
        return;
      }

      const region = workbench.searchRegion;
      const cx = region.x + region.width / 2;
      const cy = region.y + region.height / 2;

      ctx.save();

      if (!hasProcessed || !fitResult || !fitResult.hasValidFit) {
        // Draw nominal search guide circle
        ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, nominalDiameter / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Center reticle
        ctx.strokeStyle = "rgba(6, 182, 212, 0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy);
        ctx.lineTo(cx + 8, cy);
        ctx.moveTo(cx, cy - 8);
        ctx.lineTo(cx, cy + 8);
        ctx.stroke();

        ctx.restore();

        return;
      }

      // Draw radial rays (thin dark spoke lines)
      ctx.strokeStyle = "rgba(6, 182, 212, 0.15)";
      ctx.lineWidth = 1;

      for (const pt of fitResult.points) {
        ctx.beginPath();
        ctx.moveTo(fitResult.centerX, fitResult.centerY);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      }

      // Draw detected edge points: inliers (emerald) and outliers (rose)
      for (const pt of fitResult.points) {
        if (!pt.hasEdge) {
          continue;
        }

        if (pt.isOutlier) {
          ctx.strokeStyle = "#ff4d4d";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(pt.x - 2.5, pt.y - 2.5);
          ctx.lineTo(pt.x + 2.5, pt.y + 2.5);
          ctx.moveTo(pt.x - 2.5, pt.y + 2.5);
          ctx.lineTo(pt.x + 2.5, pt.y - 2.5);
          ctx.stroke();
        } else {
          ctx.fillStyle = "#00ff9d";
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Pratt fitted circle
      ctx.strokeStyle = fitResult.isPass ? "#00ff9d" : "#ff4d4d";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(fitResult.centerX, fitResult.centerY, fitResult.radiusPx, 0, Math.PI * 2);
      ctx.stroke();

      // Center crosshair
      ctx.strokeStyle = fitResult.isPass ? "#00ff9d" : "#ff4d4d";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(fitResult.centerX - 10, fitResult.centerY);
      ctx.lineTo(fitResult.centerX + 10, fitResult.centerY);
      ctx.moveTo(fitResult.centerX, fitResult.centerY - 10);
      ctx.lineTo(fitResult.centerX, fitResult.centerY + 10);
      ctx.stroke();

      // Dimension callout line across diameter
      const dimY = fitResult.centerY + fitResult.radiusPx + 14;
      const x1 = fitResult.centerX - fitResult.radiusPx;
      const x2 = fitResult.centerX + fitResult.radiusPx;

      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, dimY);
      ctx.lineTo(x2, dimY);
      ctx.stroke();

      // Arrowheads
      ctx.fillStyle = "#00f0ff";
      ctx.beginPath();
      ctx.moveTo(x1, dimY);
      ctx.lineTo(x1 + 4, dimY - 3);
      ctx.lineTo(x1 + 4, dimY + 3);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x2, dimY);
      ctx.lineTo(x2 - 4, dimY - 3);
      ctx.lineTo(x2 - 4, dimY + 3);
      ctx.closePath();
      ctx.fill();

      // Text label
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = "#00f0ff";
      const dimLabel = `D=${fitResult.diameterPx.toFixed(1)}px (Rnd=${fitResult.roundnessScorePct.toFixed(0)}%)`;
      ctx.fillText(dimLabel, fitResult.centerX - 35, dimY + 12);

      ctx.restore();
    },
    [workbench.searchRegion, hasProcessed, fitResult, nominalDiameter],
  );

  const handleApply = useCallback(() => {
    const finalDiameter = fitResult ? fitResult.diameterPx : nominalDiameter;
    const finalRoundness = fitResult ? fitResult.roundnessScorePct : 0;
    const finalPass =
      Math.abs(finalDiameter - nominalDiameter) <= tolerance &&
      finalRoundness >= minRoundnessScore;

    const defaultDiameterItem: JudgmentItem = {
      id: "j1",
      name: "Circle Diameter",
      unit: "px",
      lowerLimit: nominalDiameter - tolerance,
      measured: Number(finalDiameter.toFixed(2)),
      upperLimit: nominalDiameter + tolerance,
      status: Math.abs(finalDiameter - nominalDiameter) <= tolerance ? "PASS" : "FAIL",
    };

    const defaultRoundnessItem: JudgmentItem = {
      id: "j2",
      name: "Roundness Score",
      unit: "%",
      lowerLimit: minRoundnessScore,
      measured: Number(finalRoundness.toFixed(1)),
      upperLimit: 100,
      status: finalRoundness >= minRoundnessScore ? "PASS" : "FAIL",
    };

    props.onChange((prev) => ({
      ...prev,
      params: {
        ...(prev.params ?? {}),
        toolCode: "T111",
        targetFeature,
        edgePolarity,
        nominalDiameterPx: nominalDiameter,
        diameterTolerancePx: tolerance,
        minRoundnessScorePct: minRoundnessScore,
        minEdgeContrast: contrastThreshold,
        rayCount,
        measuredDiameterPx: Number(finalDiameter.toFixed(2)),
        roundnessScorePct: Number(finalRoundness.toFixed(1)),
        isPass: finalPass,
        judgmentItems: [defaultDiameterItem, defaultRoundnessItem],
      },
    }));

    props.onOk?.();
  }, [
    fitResult,
    nominalDiameter,
    tolerance,
    minRoundnessScore,
    targetFeature,
    edgePolarity,
    contrastThreshold,
    rayCount,
    props,
  ]);

  return (
    <StandardWorkbenchShell
      toolName="Circle & Via Gauge Inspector"
      toolCode="T111"
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
          filterModeLabel="FILTERED (Circle Edge Perimeter)"
          toolBadge="T111 CIRCLE GAUGE"
          statusText={
            hasProcessed
              ? `DIA ${measuredDiameter.toFixed(1)}px | RND ${roundnessScore.toFixed(0)}% [${isPass ? "PASS" : "FAIL"}]`
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
        <CircleGaugeToolPanel
          targetFeature={targetFeature}
          edgePolarity={edgePolarity}
          nominalDiameter={nominalDiameter}
          tolerance={tolerance}
          minRoundnessScore={minRoundnessScore}
          contrastThreshold={contrastThreshold}
          rayCount={rayCount}
          measuredDiameter={measuredDiameter}
          roundnessScore={roundnessScore}
          inlierCount={fitResult ? fitResult.inlierCount : 0}
          totalRayCount={fitResult ? fitResult.totalRayCount : rayCount}
          isPass={isPass}
          hasProcessed={hasProcessed}
          actionButtonLabel={props.actionButtonLabel}
          onTargetFeatureChange={handleTargetFeatureChange}
          onPolarityChange={handlePolarityChange}
          onNominalDiameterChange={handleNominalDiameterChange}
          onToleranceChange={handleToleranceChange}
          onMinRoundnessScoreChange={handleMinRoundnessScoreChange}
          onContrastThresholdChange={handleContrastThresholdChange}
          onRayCountChange={handleRayCountChange}
          onProcess={handleProcess}
          onApply={handleApply}
          onCancel={props.onCancel}
        />
      }
    />
  );
}
