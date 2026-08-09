import { describe, expect, it, beforeEach } from "vitest";
import {
  BRUTE_FORCE_THRESHOLD,
  recordDenial,
  resetDenialCountersForTests,
  verifyToken,
} from "@/lib/security/health-token";

describe("verifyToken", () => {
  it("returns true on exact match", () => {
    expect(verifyToken("abc123", "abc123")).toBe(true);
  });
  it("returns false on mismatch of equal length", () => {
    expect(verifyToken("abc123", "abc124")).toBe(false);
  });
  it("returns false on length mismatch", () => {
    expect(verifyToken("abc", "abcd")).toBe(false);
    expect(verifyToken("abcd", "abc")).toBe(false);
  });
  it("returns false on empty vs non-empty", () => {
    expect(verifyToken("", "x")).toBe(false);
    expect(verifyToken("x", "")).toBe(false);
  });
  it("returns true on empty vs empty", () => {
    expect(verifyToken("", "")).toBe(true);
  });
});

describe("recordDenial", () => {
  beforeEach(() => resetDenialCountersForTests());
  it("returns false below threshold", () => {
    for (let i = 0; i < BRUTE_FORCE_THRESHOLD; i += 1) {
      expect(recordDenial("1.2.3.4", 1_000)).toBe(false);
    }
  });
  it("returns true once threshold is crossed", () => {
    for (let i = 0; i < BRUTE_FORCE_THRESHOLD; i += 1) recordDenial("1.2.3.4", 1_000);
    expect(recordDenial("1.2.3.4", 1_000)).toBe(true);
  });
  it("isolates buckets per source", () => {
    for (let i = 0; i <= BRUTE_FORCE_THRESHOLD; i += 1) recordDenial("a", 1_000);
    expect(recordDenial("b", 1_000)).toBe(false);
  });
  it("resets after the window elapses", () => {
    for (let i = 0; i <= BRUTE_FORCE_THRESHOLD; i += 1) recordDenial("c", 1_000);
    expect(recordDenial("c", 1_000 + 60_001)).toBe(false);
  });
});
