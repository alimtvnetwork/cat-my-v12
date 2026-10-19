import { describe, expect, it } from "vitest";
import { judgeMarkingRecognition } from "../judge";
import type { OcrRecognitionResult } from "../types";

function makeRecognition(text: string, meanConfidence: number): OcrRecognitionResult {
  return { text, rawText: text, meanConfidence, characters: [], processingMs: 0 };
}

describe("judgeMarkingRecognition", () => {
  it("passes when all configured criteria are met", () => {
    const judgment = judgeMarkingRecognition(makeRecognition("MEGA324", 92), {
      expectedFormat: "^[A-Z0-9]+$",
      minConfidence: 80,
      expectedCharacterCount: 7,
    });

    expect(judgment.passed).toBe(true);
    expect(judgment.criteria.every((c) => c.passed)).toBe(true);
  });

  it("fails the format criterion on mismatch", () => {
    const judgment = judgeMarkingRecognition(makeRecognition("MEGA-324", 92), {
      expectedFormat: "^[A-Z0-9]+$",
    });

    expect(judgment.passed).toBe(false);
    expect(judgment.criteria.find((c) => c.key === "format")?.passed).toBe(false);
  });

  it("fails the confidence criterion below threshold", () => {
    const judgment = judgeMarkingRecognition(makeRecognition("MEGA324", 55), {
      minConfidence: 80,
    });

    expect(judgment.passed).toBe(false);
    expect(judgment.criteria.find((c) => c.key === "confidence")?.passed).toBe(false);
  });

  it("fails the character count criterion on wrong length", () => {
    const judgment = judgeMarkingRecognition(makeRecognition("MEGA32", 95), {
      expectedCharacterCount: 7,
    });

    expect(judgment.passed).toBe(false);
    expect(judgment.criteria.find((c) => c.key === "character-count")?.passed).toBe(false);
  });

  it("passes unconfigured criteria and handles invalid regex safely", () => {
    const judgment = judgeMarkingRecognition(makeRecognition("ABC", 99), {
      expectedFormat: "([",
    });

    expect(judgment.criteria.find((c) => c.key === "format")?.passed).toBe(false);
    expect(judgment.criteria.find((c) => c.key === "confidence")?.passed).toBe(true);
    expect(judgment.criteria.find((c) => c.key === "character-count")?.passed).toBe(true);
  });
});
