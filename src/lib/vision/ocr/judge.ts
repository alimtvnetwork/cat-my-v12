/**
 * OCR judgment — applies the OCR2 tool's judgment criteria to a
 * recognition result.
 *
 * Spec T106 (comprehensive vision tools specification, section 5) pass
 * rule for the exact-string path:
 *   PASS iff Levenshtein(readString, expectedString) == 0
 *          AND meanConfidencePct >= minConfidencePct.
 *
 * Backward compatibility for regex callers: callers that do not supply
 * an exact `expectedString` keep the legacy behaviour — the cleaned text
 * must match the `expectedFormat` regex. When `expectedString` IS
 * supplied (non-empty), the exact-match criterion replaces the format
 * criterion: the pass decision is driven by the Levenshtein distance,
 * not by regex matching. The character-count criterion is unchanged and
 * still applies when configured (it is redundant with an exact match,
 * which already implies equal length, but it stays for callers that
 * configure a count without an expected string).
 *
 * The Levenshtein comparison is exact and case-sensitive on the cleaned
 * strings it is given (recognition.text is already whitespace-collapsed
 * by the engine); this function does not fold case or trim, so a caller
 * that wants a lenient comparison must normalize before judging.
 */
import type {
  OcrCriterionResult,
  OcrEngineOptions,
  OcrJudgment,
  OcrRecognitionResult,
} from "./types";

/**
 * Levenshtein edit distance: the minimum number of single-character
 * insertions, deletions, or substitutions needed to turn `a` into `b`.
 * Computed over Unicode code points (Array.from) so astral characters
 * count as one character, not two UTF-16 code units. Runs in O(n*m)
 * time and O(min(n, m)) space using two DP rows.
 */
export function levenshteinDistance(a: string, b: string): number {
  const aChars = Array.from(a);
  const bChars = Array.from(b);

  if (aChars.length === 0) {
    return bChars.length;
  }

  if (bChars.length === 0) {
    return aChars.length;
  }

  // Keep the shorter string on the row axis to bound memory.
  const [short, long] = aChars.length <= bChars.length ? [aChars, bChars] : [bChars, aChars];

  let previous = new Array<number>(short.length + 1);
  let current = new Array<number>(short.length + 1);

  for (let j = 0; j <= short.length; j += 1) {
    previous[j] = j;
  }

  for (let i = 1; i <= long.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= short.length; j += 1) {
      const substitutionCost = long[i - 1] === short[j - 1] ? 0 : 1;

      current[j] = Math.min(
        previous[j] + 1, // deletion
        current[j - 1] + 1, // insertion
        previous[j - 1] + substitutionCost, // substitution (or match)
      );
    }

    [previous, current] = [current, previous];
  }

  return previous[short.length];
}

function judgeExactString(text: string, expectedString: string | undefined): OcrCriterionResult {
  if (!expectedString || expectedString.trim() === "") {
    return { key: "exact-match", passed: true, detail: "No expected string configured" };
  }

  const distance = levenshteinDistance(text, expectedString);
  const passed = distance === 0;

  return {
    key: "exact-match",
    passed,
    detail: passed
      ? `"${text}" exactly matches expected "${expectedString}" (Levenshtein distance 0)`
      : `"${text}" differs from expected "${expectedString}" (Levenshtein distance ${distance})`,
  };
}

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
  const hasExpectedString =
    options.expectedString !== undefined && options.expectedString.trim() !== "";

  // Exact-string path (spec T106) replaces the regex path when an
  // expected string is supplied; otherwise the legacy format criterion
  // is kept so existing regex callers are unaffected.
  const stringCriterion = hasExpectedString
    ? judgeExactString(recognition.text, options.expectedString)
    : judgeFormat(recognition.text, options.expectedFormat);

  const criteria = [
    stringCriterion,
    judgeConfidence(recognition.meanConfidence, options.minConfidence),
    judgeCharacterCount(recognition.text, options.expectedCharacterCount),
  ];

  return {
    passed: criteria.every((c) => c.passed),
    criteria,
    recognition,
  };
}
