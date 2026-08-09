import { EditorRuleKindType } from "@/lib/editor/types";
// @vitest-environment jsdom
// Regression: the on-canvas ROI label ("KIND name") must NOT be drawn
// inside the shape when a rule is selected. The floating badge stack
// in SelectionOverlay already owns the primary name chip above the
// ROI, so drawing the same label in-shape produces the duplicate the
// user has flagged repeatedly (Plan 100 Phase I).
import { describe, it, expect } from "vitest";
import { renderFrame } from "@/lib/editor/render/frame";
import type { EditorRule, RenderState } from "@/lib/editor/types";

interface Recorder {
  texts: string[];
  fills: string[];
  fillRects: Array<{ x: number; y: number; w: number; h: number; fill: string }>;
}

// Build a minimal, side-effect-free Canvas 2D context that records the
// arguments passed to `fillText`. Every other method / property is a
// no-op so `renderFrame` can execute end-to-end in jsdom without a
// real 2D context (jsdom ships no canvas backend).
function makeStubContext(): { ctx: CanvasRenderingContext2D; rec: Recorder } {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 300;
  document.body.appendChild(canvas);
  const rec: Recorder = { texts: [], fills: [], fillRects: [] };
  const target: Record<string, unknown> = { canvas };
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(t, prop) {
      if (prop === "canvas") return canvas;
      if (prop === "fillText") {
        return (text: string) => {
          rec.texts.push(String(text));
        };
      }
      if (prop === "fillRect") {
        return (x: number, y: number, w: number, h: number) => {
          rec.fillRects.push({ x, y, w, h, fill: String(t.fillStyle ?? "") });
        };
      }
      if (prop === "measureText") {
        return (text: string) => ({ width: String(text).length * 8 });
      }
      if (prop === "createLinearGradient" || prop === "createRadialGradient") {
        return () => ({ addColorStop: () => {} });
      }
      // Recorded property writes so the renderer never crashes reading
      // back a value it just set (e.g. `ctx.fillStyle`).
      if (typeof prop === "string" && prop in t) {
        return (t as Record<string, unknown>)[prop];
      }

      // Default: no-op function. Covers every drawing primitive
      // renderFrame calls (fillRect, strokeRect, beginPath, save, ...).
      return () => undefined;
    },
    set(t, prop, value) {
      if (prop === "fillStyle" && typeof value === "string") rec.fills.push(value);
      (t as Record<string, unknown>)[prop as string] = value;

      return true;
    },
  };
  const ctx = new Proxy(target, handler) as unknown as CanvasRenderingContext2D;

  return { ctx, rec };
}

function rule(over: Partial<EditorRule> & { id: string; name: string }): EditorRule {
  return {
    kind: EditorRuleKindType.R,
    isHidden: false,
    isLocked: false,
    x: 20,
    y: 30,
    width: 200,
    height: 120,
    ...over,
  };
}

function baseState(rules: EditorRule[], selectedIds: string[]): RenderState {
  return {
    size: { width: 400, height: 300 },
    dpr: 1,
    viewport: { panX: 0, panY: 0, zoom: 1 },
    imageBounds: { x: 0, y: 0, width: 400, height: 300 },
    rules,
    selectedIds,
    hoverId: null,
    pendingShape: null,
  };
}

describe("renderFrame: in-shape ROI label", () => {
  it("draws the label once when the rule is NOT selected", () => {
    const { ctx, rec } = makeStubContext();
    const r = rule({ id: "r1", name: "MyROI" });
    renderFrame(ctx, baseState([r], []));
    const hits = rec.texts.filter((t) => t.includes("MyROI"));
    expect(hits.length).toBe(1);
    // Prefix is "<KIND> <name>" per drawRuleLabel.
    expect(hits[0]).toBe("R MyROI");
  });

  it("does NOT draw the in-shape label when the rule IS selected", () => {
    const { ctx, rec } = makeStubContext();
    const r = rule({ id: "r1", name: "SelectedROI" });
    renderFrame(ctx, baseState([r], ["r1"]));
    const hits = rec.texts.filter((t) => t.includes("SelectedROI"));
    expect(hits).toEqual([]);
  });

  it("only suppresses the label for the selected rule, not siblings", () => {
    const { ctx, rec } = makeStubContext();
    const a = rule({ id: "a", name: "Alpha", x: 10, y: 10 });
    const b = rule({ id: "b", name: "Bravo", x: 220, y: 10 });
    renderFrame(ctx, baseState([a, b], ["a"]));
    expect(rec.texts.some((t) => t.includes("Alpha"))).toBe(false);
    expect(rec.texts.filter((t) => t.includes("Bravo")).length).toBe(1);
  });

  it("does not wash the inside of a selected circle ROI", () => {
    const { ctx, rec } = makeStubContext();
    const r = rule({ id: "c1", name: "CleanCircle", kind: EditorRuleKindType.C });
    renderFrame(ctx, baseState([r], ["c1"]));
    expect(
      rec.fillRects.some((f) => f.x === r.x && f.y === r.y && f.w === r.width && f.h === r.height),
    ).toBe(false);
  });
});
