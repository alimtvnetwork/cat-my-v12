// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { clampPillPos, loadPillPos, savePillPos } from "@/lib/running-pill-position";

describe("clampPillPos", () => {
  it("clamps inside the viewport with margin", () => {
    expect(clampPillPos({ x: -100, y: -100 }, 1000, 800)).toEqual({ x: 4, y: 4 });
    // 1000 - 240 - 4 = 756; 800 - 40 - 4 = 756
    expect(clampPillPos({ x: 9999, y: 9999 }, 1000, 800)).toEqual({ x: 756, y: 756 });
  });
  it("keeps a valid position untouched", () => {
    expect(clampPillPos({ x: 100, y: 200 }, 1200, 900)).toEqual({ x: 100, y: 200 });
  });
});

describe("loadPillPos / savePillPos", () => {
  beforeEach(() => window.localStorage.clear());
  it("round-trips a persisted position", () => {
    savePillPos({ x: 42, y: 84 });
    expect(loadPillPos()).toEqual({ x: 42, y: 84 });
  });
  it("returns null on malformed JSON", () => {
    window.localStorage.setItem("ca.running-pill.pos.v1", "{not-json");
    expect(loadPillPos()).toBeNull();
  });
});
