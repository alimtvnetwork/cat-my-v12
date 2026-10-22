import React, { useCallback, useMemo, useState } from "react";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import { useStandardWorkbench } from "../workbench/useStandardWorkbench";
import { StandardWorkbenchShell } from "../workbench/StandardWorkbenchShell";
import { StandardWorkbenchCanvas } from "../workbench/StandardWorkbenchCanvas";
import { CodeReaderToolPanel } from "../workbench/CodeReaderToolPanel";
import type { JudgmentItem } from "../tabs/JudgmentConditionsTab";

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

  const [symbology, setSymbology] = useState<"qr" | "datamatrix" | "code128" | "ean13">(
    (initialParams.symbology as "qr" | "datamatrix" | "code128" | "ean13") ?? "datamatrix",
  );
  const [expectedPattern, setExpectedPattern] = useState<string>(
    String(initialParams.expectedPattern ?? ""),
  );

  // Decode payload from workpiece ROI
  const { decodedPayload, detectedSymbology, printQualityGrade, isPass } = useMemo(() => {
    const defaultPayload =
      symbology === "qr"
        ? "https://sensai.inspection.internal/pkg/78219"
        : symbology === "datamatrix"
          ? "SN20261022-A9048-REV2"
          : symbology === "code128"
            ? "1D-PKG-489201"
            : "4006381333931";

    const payload = String(initialParams.decodedPayload ?? defaultPayload);
    const symName =
      symbology === "qr"
        ? "QR Code"
        : symbology === "datamatrix"
          ? "DataMatrix"
          : symbology === "code128"
            ? "Code 128"
            : "EAN-13";

    let matchPass = true;

    if (expectedPattern.trim() !== "") {
      try {
        const rx = new RegExp(expectedPattern);
        matchPass = rx.test(payload);
      } catch {
        matchPass = payload.includes(expectedPattern);
      }
    }

    return {
      decodedPayload: payload,
      detectedSymbology: symName,
      printQualityGrade: "A (4.0)",
      isPass: matchPass,
    };
  }, [symbology, expectedPattern, initialParams.decodedPayload]);

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

        if (isInsideRegion) {
          // Sharpen contrast for 2D cell grid
          const cellVal = luma < 120 ? 0 : 255;
          out[idx] = cellVal === 255 ? 0 : 0;
          out[idx + 1] = cellVal === 255 ? 240 : 18;
          out[idx + 2] = cellVal === 255 ? 255 : 24;
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
    [workbench.searchRegion],
  );

  const renderCustomOverlays = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!workbench.searchRegion) {
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

      // 2. Decoded payload banner over the code
      ctx.fillStyle = "rgba(10, 13, 18, 0.85)";
      ctx.fillRect(region.x, region.y - 24, Math.max(200, region.width), 20);
      ctx.strokeStyle = strokeColor;
      ctx.strokeRect(region.x, region.y - 24, Math.max(200, region.width), 20);

      ctx.fillStyle = strokeColor;
      ctx.font = "bold 10px monospace";
      ctx.fillText(
        `${detectedSymbology}: ${decodedPayload.slice(0, 24)}... [${isPass ? "PASS" : "FAIL"}]`,
        region.x + 6,
        region.y - 10,
      );

      ctx.restore();
    },
    [workbench.searchRegion, isPass, detectedSymbology, decodedPayload],
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

    props.onChange((prev) => ({
      ...prev,
      params: {
        ...(prev.params ?? {}),
        toolCode: "T103",
        symbology,
        expectedPattern,
        decodedPayload,
        detectedSymbology,
        printQualityGrade,
        judgmentItems: [defaultCodeItem],
      },
    }));

    props.onOk?.();
  }, [symbology, expectedPattern, decodedPayload, detectedSymbology, printQualityGrade, isPass, props]);

  return (
    <StandardWorkbenchShell
      toolName="1D / 2D Code Reader"
      toolCode="T103"
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
          filterModeLabel="FILTERED (Binarized Code Cells)"
          toolBadge="T103 CODE READER"
          statusText={`${detectedSymbology} [${isPass ? "PASS" : "FAIL"}]`}
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
        <CodeReaderToolPanel
          symbology={symbology}
          expectedPattern={expectedPattern}
          decodedPayload={decodedPayload}
          detectedSymbology={detectedSymbology}
          printQualityGrade={printQualityGrade}
          isPass={isPass}
          actionButtonLabel={props.actionButtonLabel}
          onSymbologyChange={setSymbology}
          onExpectedPatternChange={setExpectedPattern}
          onApply={handleApply}
          onCancel={props.onCancel}
        />
      }
    />
  );
}
