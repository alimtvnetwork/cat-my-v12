import React, { useCallback, useState } from "react";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import { useStandardWorkbench } from "../workbench/useStandardWorkbench";
import { StandardWorkbenchShell } from "../workbench/StandardWorkbenchShell";
import { StandardWorkbenchCanvas } from "../workbench/StandardWorkbenchCanvas";
import { CodeReaderToolPanel } from "../workbench/CodeReaderToolPanel";
import type { JudgmentItem } from "../tabs/JudgmentConditionsTab";
import type {
  CodeReaderResult,
  IsoGradingReport,
  IsoQualityGrade,
  SymbologyType,
} from "@/domain/vision/code-reader-types";
import { decodeAndGradeCode } from "@/lib/vision/algorithms/code-reader-iso";

export interface StandardCodeReaderToolProps {
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

export function StandardCodeReaderTool(props: StandardCodeReaderToolProps): React.JSX.Element {
  const workbench = useStandardWorkbench({
    settings: props.settings,
    onChange: props.onChange,
    imageRef: props.imageRef,
    onImageRegistered: props.onImageRegistered,
  });

  const initialParams = (props.settings.params as Record<string, unknown> | undefined) ?? {};

  const [symbology, setSymbology] = useState<SymbologyType>(
    (initialParams.symbology as SymbologyType) ?? "datamatrix",
  );
  const [expectedPattern, setExpectedPattern] = useState<string>(
    String(initialParams.expectedPattern ?? ""),
  );
  const [minQualityGrade, setMinQualityGrade] = useState<IsoQualityGrade>(
    (initialParams.minQualityGrade as IsoQualityGrade) ?? "B",
  );

  // Explicit processing state: no tool auto-analyzes
  const [hasProcessed, setHasProcessed] = useState<boolean>(false);
  const [codeResult, setCodeResult] = useState<CodeReaderResult | null>(null);
  const [decodedPayload, setDecodedPayload] = useState<string>(
    String(initialParams.decodedPayload ?? "SN20261022-A9048-REV2"),
  );
  const [detectedSymbology, setDetectedSymbology] = useState<string>("DataMatrix");
  const [printQualityGrade, setPrintQualityGrade] = useState<string>("A (4.0)");
  const [isPass, setIsPass] = useState<boolean>(true);

  // Decode payload from workpiece ROI strictly on demand
  const handleProcess = useCallback(() => {
    if (!workbench.source || !workbench.searchRegion) {
      setHasProcessed(true);
      setIsPass(true);

      return;
    }

    const result = decodeAndGradeCode({
      imageData: workbench.source,
      roi: workbench.searchRegion,
      symbology,
      expectedPattern,
      minQualityGrade,
      presetPayload:
        typeof initialParams.decodedPayload === "string"
          ? initialParams.decodedPayload
          : undefined,
    });

    setCodeResult(result);
    setDecodedPayload(result.payload);
    setDetectedSymbology(result.symbologyName);
    setPrintQualityGrade(
      `Grade ${result.grading.overallGrade} (${result.grading.overallScore.toFixed(1)})`,
    );
    setIsPass(result.isPass);
    setHasProcessed(true);
  }, [
    workbench.source,
    workbench.searchRegion,
    symbology,
    expectedPattern,
    minQualityGrade,
    initialParams.decodedPayload,
  ]);

  const handleSymbologyChange = useCallback((sym: SymbologyType) => {
    setSymbology(sym);
    setHasProcessed(false);
  }, []);

  const handlePatternChange = useCallback((pattern: string) => {
    setExpectedPattern(pattern);
    setHasProcessed(false);
  }, []);

  const handleMinQualityGradeChange = useCallback((grade: IsoQualityGrade) => {
    setMinQualityGrade(grade);
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

        if (hasProcessed && isInsideRegion) {
          // Sharpen contrast for 2D cell grid
          const cellVal = luma < 120 ? 0 : 255;
          out[idx] = cellVal === 255 ? 0 : 0;
          out[idx + 1] = cellVal === 255 ? 240 : 18;
          out[idx + 2] = cellVal === 255 ? 255 : 24;
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
    [workbench.searchRegion, hasProcessed],
  );

  const renderCustomOverlays = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!workbench.searchRegion || !hasProcessed) {
        return;
      }

      const region = workbench.searchRegion;

      ctx.save();
      const strokeColor = isPass ? "#00ff9d" : "#f43f5e";
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;

      // 1. Four corner brackets for barcode locator reticle
      const cornerLen = 16;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(region.x, region.y + cornerLen);
      ctx.lineTo(region.x, region.y);
      ctx.lineTo(region.x + cornerLen, region.y);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(region.x + region.width - cornerLen, region.y);
      ctx.lineTo(region.x + region.width, region.y);
      ctx.lineTo(region.x + region.width, region.y + cornerLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(region.x, region.y + region.height - cornerLen);
      ctx.lineTo(region.x, region.y + region.height);
      ctx.lineTo(region.x + cornerLen, region.y + region.height);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(region.x + region.width - cornerLen, region.y + region.height);
      ctx.lineTo(region.x + region.width, region.y + region.height);
      ctx.lineTo(region.x + region.width, region.y + region.height - cornerLen);
      ctx.stroke();

      // 2. Projected Module Cell Grid
      const gridCols = symbology === "code128" || symbology === "code39" ? 24 : 14;
      const gridRows = symbology === "code128" || symbology === "code39" ? 1 : 14;
      const cellW = region.width / gridCols;
      const cellH = region.height / gridRows;

      ctx.strokeStyle = "rgba(6, 182, 212, 0.25)";
      ctx.lineWidth = 1;

      for (let c = 1; c < gridCols; c += 1) {
        ctx.beginPath();
        ctx.moveTo(region.x + c * cellW, region.y);
        ctx.lineTo(region.x + c * cellW, region.y + region.height);
        ctx.stroke();
      }

      if (gridRows > 1) {
        for (let r = 1; r < gridRows; r += 1) {
          ctx.beginPath();
          ctx.moveTo(region.x, region.y + r * cellH);
          ctx.lineTo(region.x + region.width, region.y + r * cellH);
          ctx.stroke();
        }
      }

      // 3. Decoded payload banner over the code
      ctx.fillStyle = "rgba(10, 13, 18, 0.85)";
      ctx.fillRect(region.x, region.y - 24, Math.max(220, region.width), 20);
      ctx.strokeStyle = strokeColor;
      ctx.strokeRect(region.x, region.y - 24, Math.max(220, region.width), 20);

      ctx.fillStyle = strokeColor;
      ctx.font = "bold 10px monospace";
      const gradeStr = codeResult ? `[Grade ${codeResult.grading.overallGrade}]` : "";
      ctx.fillText(
        `${gradeStr} ${detectedSymbology}: ${decodedPayload.slice(0, 22)} [${isPass ? "PASS" : "FAIL"}]`,
        region.x + 6,
        region.y - 10,
      );

      ctx.restore();
    },
    [
      workbench.searchRegion,
      hasProcessed,
      isPass,
      detectedSymbology,
      decodedPayload,
      codeResult,
      symbology,
    ],
  );

  const handleApply = useCallback(() => {
    const defaultCodeItem: JudgmentItem = {
      id: "j1",
      name: "Code Read Verification",
      unit: "text",
      lowerLimit: 0,
      measured: isPass ? 1 : 0,
      upperLimit: 1,
      status: isPass ? "PASS" : "FAIL",
    };

    const defaultGradeItem: JudgmentItem = {
      id: "j2",
      name: "ISO/IEC Quality Score",
      unit: "score",
      lowerLimit: minQualityGrade === "A" ? 3.5 : minQualityGrade === "B" ? 2.5 : 1.5,
      measured: codeResult ? codeResult.grading.overallScore : 4.0,
      upperLimit: 4.0,
      status: isPass ? "PASS" : "FAIL",
    };

    props.onChange((prev) => ({
      ...prev,
      params: {
        ...(prev.params ?? {}),
        toolCode: "T103",
        symbology,
        expectedPattern,
        minQualityGrade,
        decodedPayload,
        detectedSymbology,
        printQualityGrade,
        overallIsoGrade: codeResult ? codeResult.grading.overallGrade : "A",
        symbolContrast: codeResult ? codeResult.grading.symbolContrast : 80,
        modulation: codeResult ? codeResult.grading.modulation : 0.7,
        judgmentItems: [defaultCodeItem, defaultGradeItem],
      },
    }));

    props.onOk?.();
  }, [
    symbology,
    expectedPattern,
    minQualityGrade,
    decodedPayload,
    detectedSymbology,
    printQualityGrade,
    codeResult,
    isPass,
    props,
  ]);

  return (
    <StandardWorkbenchShell
      toolName="1D / 2D Code Reader"
      toolCode="T103"
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
          filterModeLabel="FILTERED (Binarized Code Cells)"
          toolBadge="T103 CODE READER"
          statusText={
            hasProcessed
              ? `${detectedSymbology} [${isPass ? "PASS" : "FAIL"}]`
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
        <CodeReaderToolPanel
          symbology={symbology}
          expectedPattern={expectedPattern}
          minQualityGrade={minQualityGrade}
          decodedPayload={decodedPayload}
          detectedSymbology={detectedSymbology}
          printQualityGrade={printQualityGrade}
          gradingReport={codeResult ? codeResult.grading : null}
          isPass={isPass}
          hasProcessed={hasProcessed}
          actionButtonLabel={props.actionButtonLabel}
          onSymbologyChange={handleSymbologyChange}
          onExpectedPatternChange={handlePatternChange}
          onMinQualityGradeChange={handleMinQualityGradeChange}
          onProcess={handleProcess}
          onApply={handleApply}
          onCancel={props.onCancel}
        />
      }
    />
  );
}
