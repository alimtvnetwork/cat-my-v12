/**
 * OCR judgment — applies the OCR2 tool's judgment criteria to a
 * recognition result:
 *
 * - Extracted String Match: cleaned text matches the expected regex format.
 * - Min Character Confidence %: mean confidence meets the threshold.
 * - Character Count Check: cleaned text length matches the expected count.
 */
import type {
  OcrCriterionResult,
  OcrEngineOptions,
  OcrJudgment,
  OcrRecognitionResult,
} from "./types";

function judgeFormat(text: string, expectedFormat: string | undefined): OcrCriterionResult {
  if (!expectedFormat || expectedFormat.trim() === "") {
    return { key: "format", passed: true, detail: "No format filter configured" };
  }

  let pattern: RegExp;

  try {
    pattern = new RegExp(expectedFormat);
  } catch {
    return { key: "format", passed: false, detail: `Invalid regex: ${expectedFormat}` };
  }

  const passed = pattern.test(text);

  return {
    key: "format",
    passed,
    detail: passed
      ? `"${text}" matches ${expectedFormat}`
      : `"${text}" does not match ${expectedFormat}`,
  };
}

function judgeConfidence(
  meanConfidence: number,
  minConfidence: number | undefined,
): OcrCriterionResult {
  const threshold = minConfidence ?? 0;

  if (threshold <= 0) {
    return { key: "confidence", passed: true, detail: "No confidence threshold configured" };
  }

  const passed = meanConfidence >= threshold;

  return {
    key: "confidence",
    passed,
    detail: passed
      ? `${meanConfidence}% ≥ ${threshold}%`
      : `${meanConfidence}% < ${threshold}% minimum`,
  };
}

function judgeCharacterCount(
  text: string,
  expectedCount: number | null | undefined,
): OcrCriterionResult {
  if (expectedCount === null || expectedCount === undefined) {
    return { key: "character-count", passed: true, detail: "No character count configured" };
  }

  const passed = text.length === expectedCount;

  return {
    key: "character-count",
    passed,
    detail: passed
      ? `${text.length} characters as expected`
      : `Found ${text.length} characters, expected ${expectedCount}`,
  };
}

export function judgeMarkingRecognition(
  recognition: OcrRecognitionResult,
  options: OcrEngineOptions = {},
): OcrJudgment {
  const criteria = [
    judgeFormat(recognition.text, options.expectedFormat),
    judgeConfidence(recognition.meanConfidence, options.minConfidence),
    judgeCharacterCount(recognition.text, options.expectedCharacterCount),
  ];

  return {
    passed: criteria.every((c) => c.passed),
    criteria,
    recognition,
  };
}
