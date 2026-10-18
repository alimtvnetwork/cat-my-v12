import React, { useState } from "react";
import { StandardToolShell, ToolTabItem } from "../StandardToolShell";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import { JudgmentConditionsTab } from "../tabs/JudgmentConditionsTab";
import { ImageEnhanceTab } from "../tabs/ImageEnhanceTab";
import { DisplaySettingsTab } from "../tabs/DisplaySettingsTab";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";

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

export function StandardOcr2Tool(props: StandardOcr2ToolProps): React.JSX.Element {
  const [fontFamily, setFontFamily] = useState<OcrFontFamilyType>(OcrFontFamilyType.StandardSans);
  const [characterCount, setCharacterCount] = useState<number>(OCR_DEFAULT_CHARACTER_COUNT);
  const [expectedFormat, setExpectedFormat] = useState<string>(OCR_DEFAULT_EXPECTED_FORMAT);
  const [minConfidence, setMinConfidence] = useState<number>(OCR_DEFAULT_MIN_CONFIDENCE);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrJudgment, setOcrJudgment] = useState<OcrJudgment | null>(null);

  const runRecognition = async (): Promise<void> => {
    const source = props.imageSource?.() ?? null;

    if (!source) {
      setOcrError("No image available for recognition");
      return;
    }

    setOcrRunning(true);
    setOcrError(null);
    setOcrJudgment(null);

    try {
      // Dynamic import keeps the tesseract WASM bundle out of the initial chunk.
      const { recognizeMarking, judgeMarkingRecognition } = await import("@/lib/vision/ocr");
      const recognition = await recognizeMarking(source);
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

  const tabs: ToolTabItem[] = [
    {
      id: "region",
      label: "Text Reading Region",
      content: <InspectionRegionTab />,
    },
    {
      id: "detection",
      label: "Character Segmentation & Recognition",
      content: (
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

            {props.imageSource && (
              <div className="pt-1 space-y-2">
                <button
                  type="button"
                  onClick={runRecognition}
                  disabled={ocrRunning}
                  className="px-3 py-1.5 rounded bg-ca-accent text-white text-xs font-semibold disabled:opacity-50"
                >
                  {ocrRunning ? "Recognizing…" : "Run recognition"}
                </button>

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
            )}
          </div>
        </div>
      ),
    },
    {
      id: "judgment",
      label: "OCR Judgment Limits",
      content: (
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
      ),
    },
    {
      id: "enhance",
      label: "Image Enhancement",
      content: <ImageEnhanceTab />,
    },
    {
      id: "display",
      label: "Display Settings",
      content: <DisplaySettingsTab />,
    },
  ];

  return (
    <StandardToolShell
      toolName="OCR2 Optical Character Recognition Tool"
      toolKindId="T13-OCR2"
      tabs={tabs}
      settings={props.settings}
      onChangeSettings={props.onChange}
      onEvaluate={props.onEvaluate}
      onCancel={props.onCancel}
      onOk={props.onOk}
      onSettings={props.onSettings}
      onRegisterImage={props.onRegisterImage}
      onOriginPoint={props.onOriginPoint}
      onDisplay={props.onDisplay}
      onRefresh={props.onRefresh}
    />
  );
}
