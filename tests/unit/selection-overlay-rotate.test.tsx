// @vitest-environment jsdom
// Contract: every selected rectangular ROI exposes FOUR rotate handles
// (one per corner), each drives the same rotate pointer sequence, and
// none of them collide with the eight resize handles or the position /
// size badges. Regression: the user has repeatedly flagged that
// rotating from nw / se / sw either did nothing or triggered a resize.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { SelectionOverlay } from "@/components/editor/canvas/SelectionOverlay";
import { computeRotation } from "@/lib/editor/rotation";
import type { EditorRule } from "@/lib/editor/types";

vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => "/rules/r1",
  Link: () => null,
}));

// jsdom does not implement pointer capture. The rotate handler calls
// setPointerCapture / releasePointerCapture on the target; stub them
// so the pointer sequence completes without throwing.
beforeAll(() => {
  if (!(Element.prototype as unknown as { setPointerCapture?: unknown }).setPointerCapture) {
    (
      Element.prototype as unknown as { setPointerCapture: (id: number) => void }
    ).setPointerCapture = () => {};
  }
  if (
    !(Element.prototype as unknown as { releasePointerCapture?: unknown }).releasePointerCapture
  ) {
    (
      Element.prototype as unknown as { releasePointerCapture: (id: number) => void }
    ).releasePointerCapture = () => {};
  }
});

function rect(over: Partial<EditorRule> & { id: string; name: string }): EditorRule {
  return {
    kind: "R",
    isHidden: false,
    isLocked: false,
    x: 40,
    y: 60,
    width: 220,
    height: 140,
    ...over,
  };
}

function renderOverlay(
  rule: EditorRule,
  extra?: {
    onResize?: (id: string, r: { x: number; y: number; width: number; height: number }) => void;
    onRotate?: (id: string, deg: number) => void;
  },
) {
  useRulesStore.getState().replaceAll([rule], [rule.id], []);
  return render(
    <SelectionOverlay
      rules={[rule]}
      selectedIds={[rule.id]}
      viewport={{ panX: 0, panY: 0, zoom: 1 }}
      canvasSize={{ width: 800, height: 600 }}
      contextMenu={null}
      onCloseContextMenu={() => {}}
      onResize={extra?.onResize ?? (() => {})}
      onAction={() => {}}
      onChangeKind={() => {}}
      onRotate={extra?.onRotate}
    />,
  );
}

describe("SelectionOverlay: rotate handles on all four corners", () => {
  afterEach(() => {
    cleanup();
    useRulesStore.getState().replaceAll([], [], []);
  });

  it("renders one rotate handle per corner (ne, nw, se, sw)", () => {
    const r = rect({ id: "r1", name: "Focus" });
    const view = renderOverlay(r);
    // "ne" keeps the legacy stable testid used by upstream tests; the
    // other three corners are namespaced.
    expect(view.queryAllByTestId("rule-rotate-handle").length).toBe(1);
    expect(view.queryAllByTestId("rule-rotate-handle-nw").length).toBe(1);
    expect(view.queryAllByTestId("rule-rotate-handle-se").length).toBe(1);
    expect(view.queryAllByTestId("rule-rotate-handle-sw").length).toBe(1);
  });

  it("positions every rotate handle OUTSIDE the ROI bounding rect", () => {
    const r = rect({ id: "r1", name: "Focus" });
    const view = renderOverlay(r);
    // With viewport {0,0,1} the ROI on screen is [40..260] x [60..200].
    // Corner rotate handles sit at (halfW+14, halfH+14) offsets from
    // the ROI centre, i.e. 14px OUTSIDE every edge.
    const bounds = { left: 40, top: 60, right: 260, bottom: 200 };
    const handles = [
      view.getByTestId("rule-rotate-handle"),
      view.getByTestId("rule-rotate-handle-nw"),
      view.getByTestId("rule-rotate-handle-se"),
      view.getByTestId("rule-rotate-handle-sw"),
    ];
    for (const el of handles) {
      const left = parseFloat((el as HTMLElement).style.left);
      const top = parseFloat((el as HTMLElement).style.top);
      const outside =
        left <= bounds.left || left >= bounds.right || top <= bounds.top || top >= bounds.bottom;
      expect(outside).toBe(true);
    }
  });

  it("does NOT overlap any of the eight resize handles", () => {
    const r = rect({ id: "r1", name: "Focus" });
    const view = renderOverlay(r);
    const rotate = [
      view.getByTestId("rule-rotate-handle"),
      view.getByTestId("rule-rotate-handle-nw"),
      view.getByTestId("rule-rotate-handle-se"),
      view.getByTestId("rule-rotate-handle-sw"),
    ].map((el) => ({
      left: parseFloat((el as HTMLElement).style.left),
      top: parseFloat((el as HTMLElement).style.top),
    }));
    // Resize handles use aria-label "Resize <id>" and no testid.
    const resize = Array.from(
      view.container.querySelectorAll<HTMLElement>('[aria-label^="Resize "]'),
    ).map((el) => ({
      left: parseFloat(el.style.left),
      top: parseFloat(el.style.top),
    }));
    expect(resize.length).toBe(8);
    for (const rot of rotate) {
      for (const res of resize) {
        const dx = rot.left - res.left;
        const dy = rot.top - res.top;
        // Rotate grip (20px) + resize grip (12px) = 16px combined half-
        // extent. 14px offset gives a >=14px centre-to-centre gap at
        // every corner; require strictly non-coincident centres and a
        // safe visual separation.
        expect(Math.hypot(dx, dy)).toBeGreaterThan(10);
      }
    }
  });

  it.each(["", "-nw", "-se", "-sw"])(
    "pointerdown on the %s corner starts a rotate drag (not a resize)",
    (suffix) => {
      const onResize = vi.fn();
      const onRotate = vi.fn();
      const r = rect({ id: "r1", name: "Focus" });
      const view = renderOverlay(r, { onResize, onRotate });
      const testId = `rule-rotate-handle${suffix}`;
      const handle = view.getByTestId(testId);
      // Simulate a rotate drag: press on the handle, move, release.
      fireEvent.pointerDown(handle, { pointerId: 1, clientX: 300, clientY: 40 });
      // While the drag is active the live θ badge must be visible.
      expect(view.queryAllByTestId("rule-rotate-live-badge").length).toBe(1);
      fireEvent.pointerMove(handle, { pointerId: 1, clientX: 320, clientY: 60 });
      fireEvent.pointerUp(handle, { pointerId: 1, clientX: 320, clientY: 60 });
      // A rotate handle must NEVER trigger a resize; the two gestures
      // are strictly separated by handler.
      expect(onResize).not.toHaveBeenCalled();
      // The live badge is torn down on pointer-up so subsequent iterations
      // start from a clean slate.
      expect(view.queryAllByTestId("rule-rotate-live-badge").length).toBe(0);
    },
  );
});

describe("computeRotation: identical delta from any starting corner", () => {
  // Simulate grabbing the rotate handle at each of the four corners of
  // an axis-aligned ROI centred at the origin (half-w=110, half-h=70,
  // +14px offset per corner, matching SelectionOverlay). Every corner
  // must produce the SAME rotation delta for the same pointer travel,
  // otherwise the "rotate from any corner" affordance is a lie.
  const halfW = 110;
  const halfH = 70;
  const corners = {
    ne: { x: +halfW + 14, y: -halfH - 14 },
    nw: { x: -halfW - 14, y: -halfH - 14 },
    se: { x: +halfW + 14, y: +halfH + 14 },
    sw: { x: -halfW - 14, y: +halfH + 14 },
  } as const;

  // Rotate each start point by +30° (cw) around the origin to build a
  // matching move point. The expected delta is therefore +30°.
  function rotatePoint(p: { x: number; y: number }, deg: number) {
    const rad = (deg * Math.PI) / 180;
    return {
      x: p.x * Math.cos(rad) - p.y * Math.sin(rad),
      y: p.x * Math.sin(rad) + p.y * Math.cos(rad),
    };
  }

  it.each(Object.entries(corners))(
    "yields +30° delta when dragging from the %s corner",
    (_id, start) => {
      const end = rotatePoint(start, 30);
      const a0 = Math.atan2(start.y, start.x);
      const a1 = Math.atan2(end.y, end.x);
      const deg = computeRotation({ startAngle: 0, a0, a1, snapStep: 0 });
      expect(deg).toBeCloseTo(30, 5);
    },
  );
});
