import React, { useCallback, useEffect, useState } from "react";
import { Camera, RefreshCw, Upload } from "lucide-react";
import { OcrCanvas } from "../../ocr/OcrCanvas";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import { JudgmentConditionsTab } from "../tabs/JudgmentConditionsTab";
import { ImageEnhanceTab } from "../tabs/ImageEnhanceTab";
import { DisplaySettingsTab } from "../tabs/DisplaySettingsTab";
import { ImageSourceType, PatternSearchSettings } from "@/domain/vision/pattern-search";
import { ShapeType } from "@/domain/vision/shapes";
import { readImageFile, type WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";

import {
  OcrFontFamilyType,
  OCR_FONT_FAMILY_OPTIONS,
  OCR_DEFAULT_CHARACTER_COUNT,
  OCR_MIN_CHARACTER_COUNT,
  OCR_MAX_CHARACTER_COUNT,
  OCR_DEFAULT_EXPECTED_FORMAT,
  OCR_DEFAULT_MIN_CONFIDENCE,
  OCR_MIN_CONFIDENCE_PERCENT,
  OCR_MAX_CONFIDENCE_PERCENT,
} from "../constants";
import type { OcrJudgment, OcrPixelBuffer } from "@/lib/vision/ocr/types";

export interface StandardOcr2ToolProps {
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
  /**
   * Optional source of the marking ROI pixels. When provided, the
   * recognition tab offers a "Run recognition" button backed by the real
   * OCR engine (@/lib/vision/ocr).
   */
  imageSource?: () => OcrPixelBuffer | null;
}

/**
 * OCR2 tool configure page, reimplemented following the WhiteBoxMarkingTool
 * (Greyscale) pattern: left canvas draws decoded RGBA pixels directly
 * (no <img> tag), right panel holds the configuration tabs, bottom bar has
 * the actions. This fixes the broken StandardCanvas image display.
 */
export function StandardOcr2Tool(props: StandardOcr2ToolProps): React.JSX.Element {
  const [fontFamily, setFontFamily] = useState<OcrFontFamilyType>(OcrFontFamilyType.StandardSans);
  const [characterCount, setCharacterCount] = useState<number>(OCR_DEFAULT_CHARACTER_COUNT);
  const [expectedFormat, setExpectedFormat] = useState<string>(OCR_DEFAULT_EXPECTED_FORMAT);
  const [minConfidence, setMinConfidence] = useState<number>(OCR_DEFAULT_MIN_CONFIDENCE);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrJudgment, setOcrJudgment] = useState<OcrJudgment | null>(null);
  const [textRegion, setTextRegion] = useState({ x: 50, y: 50, width: 200, height: 150 });
  const [source, setSource] = useState<WhiteBoxMarkingInput | null>(null);
  const [activeTabId, setActiveTabId] = useState<string>("region");
  const [message, setMessage] = useState<string>("");

  // Load a previously-registered image (persisted as data URL in settings).
  useEffect(() => {
    const ref = props.settings.imageRef;

    if (!ref || source) return;

    // Skip invalid persisted values from the old no-op register button.
    if (
      typeof ref === "string" &&
      ref.length > 0 &&
      !ref.startsWith("data:") &&
      !ref.startsWith("blob:") &&
      !ref.startsWith("http") &&
      !ref.startsWith("/")
    ) {
      props.onChange((s) => ({ ...s, imageRef: undefined }));

      return;
    }

    let cancelled = false;
    const img = new Image();

    img.onload = () => {
      if (cancelled) return;

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (!cancelled) {
        setSource({ width: canvas.width, height: canvas.height, rgba: imgData.data });
      }
    };
    img.src = ref;

    return () => {
      cancelled = true;
      img.onload = null;
    };
    // Run when imageRef changes; source guard prevents loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.settings.imageRef]);

  const handleImageFileChange = useCallback(
    async (file: File | undefined) => {
      if (!file) return;

      try {
        // Decode directly to RGBA (Greyscale pattern) — no URL loading.
        const input = await readImageFile(file);
        setSource(input);
        setMessage(`Loaded "${file.name}" (${input.width}×${input.height}).`);

        // Persist as data URL so the image survives reloads, and notify parent.
        const reader = new FileReader();

        reader.onload = () => {
          const dataUrl = typeof reader.result === "string" ? reader.result : "";

          if (dataUrl) {
            props.onChange((s) => ({
              ...s,
              imageRef: dataUrl,
              view: { ...s.view, source: ImageSourceType.File },
            }));
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Failed to load image");
      }
    },
    [props.onChange],
  );

  const cropRegionPixels = useCallback((): OcrPixelBuffer | null => {
    if (!source) return null;

    const sx = Math.max(0, Math.min(source.width - 1, Math.round(textRegion.x)));
    const sy = Math.max(0, Math.min(source.height - 1, Math.round(textRegion.y)));
    const sw = Math.max(1, Math.min(source.width - sx, Math.round(textRegion.width)));
    const sh = Math.max(1, Math.min(source.height - sy, Math.round(textRegion.height)));

    const data = new Uint8ClampedArray(sw * sh * 4);

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const srcIdx = ((sy + y) * source.width + (sx + x)) * 4;
        const dstIdx = (y * sw + x) * 4;
        data[dstIdx] = source.rgba[srcIdx];
        data[dstIdx + 1] = source.rgba[srcIdx + 1];
        data[dstIdx + 2] = source.rgba[srcIdx + 2];
        data[dstIdx + 3] = source.rgba[srcIdx + 3];
      }
    }

    return { data, width: sw, height: sh };
  }, [source, textRegion]);

  const runRecognition = async (): Promise<void> => {
    const pixelSource = props.imageSource?.() ?? cropRegionPixels();

    if (!pixelSource) {
      setOcrError("No image available for recognition — register an image first");

      return;
    }

    setOcrRunning(true);
    setOcrError(null);
    setOcrJudgment(null);

    try {
      // Dynamic import keeps the tesseract WASM bundle out of the initial chunk.
      const { recognizeMarking, judgeMarkingRecognition } = await import("@/lib/vision/ocr");
      const recognition = await recognizeMarking(pixelSource);
      setOcrJudgment(
        judgeMarkingRecognition(recognition, {
          expectedFormat,
          minConfidence,
          expectedCharacterCount: characterCount,
        }),
      );
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : "Recognition failed");
    } finally {
      setOcrRunning(false);
    }
  };

  const tabs = [
    { id: "region", label: "Text Reading Region" },
    { id: "detection", label: "Character Segmentation & Recognition" },
    { id: "judgment", label: "OCR Judgment Limits" },
    { id: "enhance", label: "Image Enhancement" },
    { id: "display", label: "Display Settings" },
  ];

  const renderTabContent = (): React.JSX.Element => {
    switch (activeTabId) {
      case "detection":
        return (
          <div className="space-y-4 text-xs font-sans text-ca-ink">
            <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
              <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
                Font Model & Segmentation
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ocr-font-family" className="text-ca-ink-muted block mb-1">
                    Font Model Library
                  </label>
                  <select
                    id="ocr-font-family"
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value as OcrFontFamilyType)}
                    className="w-full bg-ca-bg border border-ca-border px-2 py-1 rounded text-ca-ink"
                  >
                    {OCR_FONT_FAMILY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ocr-char-count" className="text-ca-ink-muted block mb-1">
                    Expected Character Count
                  </label>
                  <input
                    id="ocr-char-count"
                    type="number"
                    min={OCR_MIN_CHARACTER_COUNT}
                    max={OCR_MAX_CHARACTER_COUNT}
                    value={characterCount}
                    onChange={(e) => setCharacterCount(Number(e.target.value))}
                    className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ocr-expected-format" className="text-ca-ink-muted block mb-1">
                  Lexicon / Regex Format Filter
                </label>
                <input
                  id="ocr-expected-format"
                  type="text"
                  value={expectedFormat}
                  onChange={(e) => setExpectedFormat(e.target.value)}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>

              <div className="pt-1 space-y-2">
                <button
                  type="button"
                  onClick={runRecognition}
                  disabled={ocrRunning || !source}
                  className="px-3 py-1.5 rounded bg-ca-accent text-white text-xs font-semibold disabled:opacity-50"
                >
                  {ocrRunning ? "Recognizing…" : "Run recognition"}
                </button>

                {!source && (
                  <div className="text-xs text-ca-ink-muted">
                    Register an image to enable recognition.
                  </div>
                )}

                {ocrError && <div className="text-xs text-red-400 font-mono">{ocrError}</div>}

                {ocrJudgment && (
                  <div className="p-2 bg-ca-bg border border-ca-border rounded space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm text-ca-ink">
                        {ocrJudgment.recognition.text || "(no text)"}
                      </span>
                      <span
                        className={`text-xs font-bold ${ocrJudgment.passed ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {ocrJudgment.passed ? "PASS" : "FAIL"}
                      </span>
                    </div>
                    <div className="text-ca-ink-muted font-mono">
                      Mean confidence: {ocrJudgment.recognition.meanConfidence}%
                    </div>
                    <ul className="space-y-0.5">
                      {ocrJudgment.criteria.map((criterion) => (
                        <li
                          key={criterion.key}
                          className={`font-mono ${criterion.passed ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {criterion.passed ? "✓" : "✗"} {criterion.key}: {criterion.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case "judgment":
        return (
          <div className="space-y-4">
            <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
              <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-xs">
                Character Confidence Threshold
              </div>
              <div className="text-xs">
                <label htmlFor="ocr-min-confidence" className="text-ca-ink-muted block mb-1">
                  Min Recognition Confidence (%)
                </label>
                <input
                  id="ocr-min-confidence"
                  type="number"
                  min={OCR_MIN_CONFIDENCE_PERCENT}
                  max={OCR_MAX_CONFIDENCE_PERCENT}
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
            </div>
            <JudgmentConditionsTab />
          </div>
        );
      case "enhance":
        return <ImageEnhanceTab />;
      case "display":
        return <DisplaySettingsTab />;
      case "region":
      default:
        return (
          <div className="space-y-4">
            <div className="p-3 bg-ca-panel-2 border border-ca-border rounded">
              <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-xs mb-3">
                Inspection Region
              </div>
              <InspectionRegionTab
                inspectionRegion={{ shape: ShapeType.Rectangle, geometry: textRegion }}
                onChangeInspectionRegion={(region) => {
                  const geometry = region.geometry;

                  if (geometry) {
                    setTextRegion({
                      x: Math.round(geometry.x ?? 50),
                      y: Math.round(geometry.y ?? 50),
                      width: Math.max(1, Math.round(geometry.width ?? 200)),
                      height: Math.max(1, Math.round(geometry.height ?? 150)),
                    });
                  }
                }}
              />
            </div>
            <div className="text-xs text-ca-ink-muted px-1">
              Drag the green box on the canvas to position the text region, or edit the values
              above.
            </div>
          </div>
        );
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#080b0f] text-white font-sans select-none">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-[#2a3138]">
        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#1a2230] border border-[#2a3a55] text-cyan-300">
          T13-OCR2
        </span>
        <span className="text-sm font-bold tracking-wide">
          OCR2 OPTICAL CHARACTER RECOGNITION TOOL
        </span>
      </div>

      <div className="flex h-full min-h-0 min-w-[1024px] flex-col">
        {/* Main Workspace (Left Canvas + Right Panel) */}
        <div className="flex min-h-0 flex-1 gap-2 p-2 pb-0">
          {/* Left: Canvas */}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-[#2a3138] bg-[#0b0f14] shadow-sm">
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px] p-6">
              <OcrCanvas
                source={source}
                textRegion={textRegion}
                onTextRegionChange={setTextRegion}
              />
            </div>
          </div>

          {/* Right: Settings Panel with tabs */}
          <div
            data-tour="rule-config-controls"
            className="flex w-[400px] shrink-0 flex-col overflow-hidden rounded border border-[#2a3138] bg-[#11161b] shadow-sm"
          >
            {/* Tab bar */}
            <div className="flex flex-wrap gap-1 p-2 border-b border-[#2a3138] bg-[#0d1117]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-2.5 py-1.5 text-[11px] font-semibold rounded transition-colors ${
                    activeTabId === tab.id
                      ? "bg-[#00ff9d] text-black"
                      : "bg-[#1a2230] text-ca-ink-muted hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Tab content */}
            <div className="flex-1 overflow-y-auto min-h-0 p-2">{renderTabContent()}</div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="m-2 flex h-12 shrink-0 items-center justify-between rounded border border-[#2a3138] bg-[#171b20] px-3 shadow-sm">
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 rounded border border-[#3c4650] bg-[#20262d] px-4 py-1.5 text-xs font-bold uppercase text-white transition-colors hover:border-ca-select hover:bg-[#2a3138]">
              <Upload size={14} />
              Register Image
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
                onChange={(e) => {
                  void handleImageFileChange(e.target.files?.[0]);
                  e.target.value = "";
                }}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              onClick={() => void runRecognition()}
              disabled={ocrRunning || !source}
              className="flex items-center gap-2 rounded bg-[#00ff9d] px-4 py-1.5 text-xs font-bold uppercase text-black shadow-sm transition hover:brightness-110 disabled:opacity-50"
            >
              <RefreshCw size={14} className={ocrRunning ? "animate-spin" : ""} />
              {ocrRunning ? "Recognizing" : "Run"}
            </button>
            <button
              type="button"
              onClick={() => props.onEvaluate?.()}
              className="flex items-center gap-2 rounded border border-[#3c4650] bg-[#20262d] px-4 py-1.5 text-xs font-bold uppercase text-white transition-colors hover:border-cyan-400 hover:bg-cyan-950/20"
            >
              <Camera size={14} />
              Evaluate Rule
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-ca-ink-muted mr-2">{message}</span>
            <button
              type="button"
              onClick={() => props.onCancel?.()}
              className="rounded border border-[#3c4650] bg-[#20262d] px-4 py-1.5 text-xs font-bold uppercase text-white hover:bg-[#2a3138]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => props.onOk?.()}
              className="rounded bg-[#00ff9d] px-6 py-1.5 text-xs font-bold uppercase text-black hover:brightness-110"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
