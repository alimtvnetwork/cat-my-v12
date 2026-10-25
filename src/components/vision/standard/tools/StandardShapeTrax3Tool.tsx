import React, { useCallback, useState } from "react";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import { useStandardWorkbench } from "../workbench/useStandardWorkbench";
import { StandardWorkbenchShell } from "../workbench/StandardWorkbenchShell";
import { StandardWorkbenchCanvas } from "../workbench/StandardWorkbenchCanvas";
import { ShapeTrax3ToolPanel } from "../workbench/ShapeTrax3ToolPanel";
import type { JudgmentItem } from "../tabs/JudgmentConditionsTab";
import type {
  ShapeTraxContourPoint,
  ShapeTraxMatchResult,
} from "@/domain/vision/shapetrax-types";
import { matchShapeTrax } from "@/lib/vision/algorithms/shapetrax";

export interface StandardShapeTrax3ToolProps {
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

export function StandardShapeTrax3Tool(props: StandardShapeTrax3ToolProps): React.JSX.Element {
  const workbench = useStandardWorkbench({
    settings: props.settings,
    onChange: props.onChange,
    imageRef: props.imageRef,
    onImageRegistered: props.onImageRegistered,
  });

  const initialParams = (props.settings.params as Record<string, unknown> | undefined) ?? {};

  const [minMatchPercent, setMinMatchPercent] = useState<number>(
    Number(initialParams.minMatchPercent ?? 75),
  );
  const [contrastThreshold, setContrastThreshold] = useState<number>(
    Number(initialParams.contrastThreshold ?? 30),
  );
  const [angleRangeDeg, setAngleRangeDeg] = useState<number>(
    Number(initialParams.angleRangeDeg ?? initialParams.angleRange ?? 180),
  );
  const [scaleRangeMin, setScaleRangeMin] = useState<number>(
    Number(initialParams.scaleRangeMin ?? 90),
  );
  const [scaleRangeMax, setScaleRangeMax] = useState<number>(
    Number(initialParams.scaleRangeMax ?? 110),
  );
  const [roughSearchLevel, setRoughSearchLevel] = useState<number>(
    Number(initialParams.roughSearchLevel ?? 3),
  );
  const [detailSearchLevel, setDetailSearchLevel] = useState<number>(
    Number(initialParams.detailSearchLevel ?? 1),
  );

  // Explicit processing state: no tool auto-analyzes
  const [hasProcessed, setHasProcessed] = useState<boolean>(false);
  const [matchResult, setMatchResult] = useState<ShapeTraxMatchResult | null>(null);
  const [score, setScore] = useState<number>(0);
  const [matchedX, setMatchedX] = useState<number>(0);
  const [matchedY, setMatchedY] = useState<number>(0);
  const [angleDeg, setAngleDeg] = useState<number>(0);
  const [scalePct, setScalePct] = useState<number>(100);
  const [isPass, setIsPass] = useState<boolean>(true);

  const handleProcess = useCallback(() => {
    if (!workbench.source || !workbench.searchRegion) {
      setHasProcessed(true);
      setIsPass(true);

      return;
    }

    const res = matchShapeTrax({
      imageData: workbench.source,
      roi: workbench.searchRegion,
      minMatchPercent,
      contrastThreshold,
      angleRangeDeg,
      scaleRangeMin,
      scaleRangeMax,
    });

    setMatchResult(res);
    setScore(res.score);
    setMatchedX(res.x);
    setMatchedY(res.y);
    setAngleDeg(res.angleDeg);
    setScalePct(res.scalePct);
    setIsPass(res.isPass);
    setHasProcessed(true);
  }, [
    workbench.source,
    workbench.searchRegion,
    minMatchPercent,
    contrastThreshold,
    angleRangeDeg,
    scaleRangeMin,
    scaleRangeMax,
  ]);

  const handleMinMatchPercentChange = useCallback((val: number) => {
    setMinMatchPercent(val);
    setHasProcessed(false);
  }, []);

  const handleContrastThresholdChange = useCallback((val: number) => {
    setContrastThreshold(val);
    setHasProcessed(false);
  }, []);

  const handleAngleRangeChange = useCallback((val: number) => {
    setAngleRangeDeg(val);
    setHasProcessed(false);
  }, []);

  const handleScaleRangeMinChange = useCallback((val: number) => {
    setScaleRangeMin(val);
    setHasProcessed(false);
  }, []);

  const handleScaleRangeMaxChange = useCallback((val: number) => {
    setScaleRangeMax(val);
    setHasProcessed(false);
  }, []);

  const handleRoughSearchLevelChange = useCallback((val: number) => {
    setRoughSearchLevel(val);
    setHasProcessed(false);
  }, []);

  const handleDetailSearchLevelChange = useCallback((val: number) => {
    setDetailSearchLevel(val);
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

        if (hasProcessed && isInsideRegion && x > 0 && x + 1 < source.width) {
          const idxL = (y * source.width + (x - 1)) * 4;
          const idxR = (y * source.width + (x + 1)) * 4;
          const lumaL = 0.299 * raw[idxL] + 0.587 * raw[idxL + 1] + 0.114 * raw[idxL + 2];
          const lumaR = 0.299 * raw[idxR] + 0.587 * raw[idxR + 1] + 0.114 * raw[idxR + 2];
          const grad = Math.abs(lumaR - lumaL);

          if (grad >= contrastThreshold) {
            // Neon cyan contour edge highlight
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
    [workbench.searchRegion, hasProcessed, contrastThreshold],
  );

  const renderCustomOverlays = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!workbench.searchRegion) {
        return;
      }

      const region = workbench.searchRegion;

      ctx.save();

      if (!hasProcessed || !matchResult || !matchResult.hasMatchFound) {
        // Pending search guide box
        ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(region.x, region.y, region.width, region.height);
        ctx.setLineDash([]);
        ctx.restore();

        return;
      }

      // Draw vectorized contour points
      ctx.fillStyle = matchResult.isPass ? "#00ff9d" : "#f43f5e";

      for (const pt of matchResult.contourPoints) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Rotated Bounding Box
      const cx = matchResult.x;
      const cy = matchResult.y;
      const rad = (matchResult.angleDeg * Math.PI) / 180;
      const hw = (region.width / 2) * (matchResult.scalePct / 100);
      const hh = (region.height / 2) * (matchResult.scalePct / 100);

      ctx.translate(cx, cy);
      ctx.rotate(rad);

      ctx.strokeStyle = matchResult.isPass ? "#00ff9d" : "#f43f5e";
      ctx.lineWidth = 2;
      ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);

      // Orientation vector arrow pointing in direction of principal axis
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(hw * 0.8, 0);
      ctx.stroke();

      ctx.fillStyle = "#00f0ff";
      ctx.beginPath();
      ctx.moveTo(hw * 0.8, 0);
      ctx.lineTo(hw * 0.8 - 6, -4);
      ctx.lineTo(hw * 0.8 - 6, 4);
      ctx.closePath();
      ctx.fill();

      // Center crosshair
      ctx.strokeStyle = "#00ff9d";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 8);
      ctx.stroke();

      ctx.rotate(-rad);
      ctx.translate(-cx, -cy);

      // Overlay status banner
      const bannerY = region.y + region.height + 16;
      ctx.fillStyle = matchResult.isPass ? "#00ff9d" : "#f43f5e";
      ctx.font = "bold 11px monospace";
      const bannerText = `SHAPETRAX3: ${matchResult.score.toFixed(1)}% [θ=${matchResult.angleDeg >= 0 ? "+" : ""}${matchResult.angleDeg.toFixed(1)}°, S=${matchResult.scalePct.toFixed(0)}%] [${matchResult.isPass ? "PASS" : "FAIL"}]`;
      ctx.fillText(bannerText, region.x, bannerY);

      ctx.restore();
    },
    [workbench.searchRegion, hasProcessed, matchResult],
  );

  const handleApply = useCallback(() => {
    const finalScore = matchResult ? matchResult.score : score;
    const finalAngle = matchResult ? matchResult.angleDeg : angleDeg;
    const finalScale = matchResult ? matchResult.scalePct : scalePct;
    const finalPass = matchResult ? matchResult.isPass : isPass;

    const defaultScoreItem: JudgmentItem = {
      id: "j1",
      name: "Contour Correlation Score",
      unit: "%",
      lowerLimit: minMatchPercent,
      measured: Number(finalScore.toFixed(1)),
      upperLimit: 100,
      status: finalPass ? "PASS" : "FAIL",
    };

    const defaultAngleItem: JudgmentItem = {
      id: "j2",
      name: "Rotation Angle",
      unit: "deg",
      lowerLimit: -angleRangeDeg,
      measured: Number(finalAngle.toFixed(1)),
      upperLimit: angleRangeDeg,
      status: Math.abs(finalAngle) <= angleRangeDeg ? "PASS" : "FAIL",
    };

    props.onChange((prev) => ({
      ...prev,
      params: {
        ...(prev.params ?? {}),
        toolCode: "SHAPETRAX3",
        minMatchPercent,
        contrastThreshold,
        angleRangeDeg,
        scaleRangeMin,
        scaleRangeMax,
        roughSearchLevel,
        detailSearchLevel,
        measuredScore: Number(finalScore.toFixed(1)),
        measuredAngleDeg: Number(finalAngle.toFixed(1)),
        measuredScalePct: Number(finalScale.toFixed(1)),
        isPass: finalPass,
        judgmentItems: [defaultScoreItem, defaultAngleItem],
      },
    }));

    props.onOk?.();
  }, [
    matchResult,
    score,
    angleDeg,
    scalePct,
    isPass,
    minMatchPercent,
    contrastThreshold,
    angleRangeDeg,
    scaleRangeMin,
    scaleRangeMax,
    roughSearchLevel,
    detailSearchLevel,
    props,
  ]);

  return (
    <StandardWorkbenchShell
      toolName="ShapeTrax3 Contour Matcher"
      toolCode="SHAPETRAX3"
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
          filterModeLabel="FILTERED (Vectorized Contours)"
          toolBadge="SHAPETRAX3"
          statusText={
            hasProcessed
              ? `${score.toFixed(1)}% [${isPass ? "PASS" : "FAIL"}]`
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
        <ShapeTrax3ToolPanel
          minMatchPercent={minMatchPercent}
          contrastThreshold={contrastThreshold}
          angleRangeDeg={angleRangeDeg}
          scaleRangeMin={scaleRangeMin}
          scaleRangeMax={scaleRangeMax}
          roughSearchLevel={roughSearchLevel}
          detailSearchLevel={detailSearchLevel}
          score={score}
          matchedX={matchedX}
          matchedY={matchedY}
          angleDeg={angleDeg}
          scalePct={scalePct}
          matchedPoints={matchResult ? matchResult.matchedPointCount : 0}
          totalModelPoints={matchResult ? matchResult.modelPointCount : 0}
          isPass={isPass}
          hasProcessed={hasProcessed}
          actionButtonLabel={props.actionButtonLabel}
          onMinMatchPercentChange={handleMinMatchPercentChange}
          onContrastThresholdChange={handleContrastThresholdChange}
          onAngleRangeChange={handleAngleRangeChange}
          onScaleRangeMinChange={handleScaleRangeMinChange}
          onScaleRangeMaxChange={handleScaleRangeMaxChange}
          onRoughSearchLevelChange={handleRoughSearchLevelChange}
          onDetailSearchLevelChange={handleDetailSearchLevelChange}
          onProcess={handleProcess}
          onApply={handleApply}
          onCancel={props.onCancel}
        />
      }
    />
  );
}
