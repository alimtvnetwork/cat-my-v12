// @vitest-environment jsdom
// Regression: for a selected rectangular ROI the SelectionOverlay must
// render exactly one name chip, one rotate handle, and one instance
// each of the position + size badges above the shape. The user has
// repeatedly flagged duplicated / missing badges (Plan 100 Phase I),
// so this test locks the badge stack contract at the DOM level.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { SelectionOverlay } from "@/components/editor/canvas/SelectionOverlay";
import type { EditorRule } from "@/lib/editor/types";

// `SelectionOverlay` reads the current pathname via `useRouterState` to
// scope the HUD-position preference per project. In an isolated unit
// test there is no TanStack Router context, so stub the module to
// return a stable string.
vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => "/rules/r1",
  Link: (props: Record<string, unknown>) => null,
}));

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

function renderOverlay(rule: EditorRule) {
  useRulesStore.getState().replaceAll([rule], [rule.id], []);
  return render(
    <SelectionOverlay
      rules={[rule]}
      selectedIds={[rule.id]}
      viewport={{ panX: 0, panY: 0, zoom: 1 }}
      canvasSize={{ width: 800, height: 600 }}
      contextMenu={null}
      onCloseContextMenu={() => {}}
      onResize={() => {}}
      onAction={() => {}}
      onChangeKind={() => {}}
    />,
  );
}

describe("SelectionOverlay: rectangle badge stack", () => {
  afterEach(() => {
    cleanup();
    useRulesStore.getState().replaceAll([], [], []);
  });

  it("renders exactly one name chip for the selected rectangle", () => {
    const r = rect({ id: "r1", name: "Focus Zone" });
    const { getAllByTestId } = renderOverlay(r);
    const chips = getAllByTestId("rule-name-chip");
    expect(chips.length).toBe(1);
    expect(chips[0].textContent).toContain("Focus Zone");
    // Kind glyph is rendered next to the name so operators see the
    // ROI type at a glance.
    expect(chips[0].textContent).toContain("R");
  });

  it("renders exactly one rotate handle above the top-right corner", () => {
    const r = rect({ id: "r1", name: "Focus Zone" });
    const { getAllByTestId } = renderOverlay(r);
    const handles = getAllByTestId("rule-rotate-handle");
    expect(handles.length).toBe(1);
  });

  it("renders exactly one position badge and one size badge", () => {
    const r = rect({ id: "r1", name: "Focus Zone" });
    const { getAllByTestId } = renderOverlay(r);
    expect(getAllByTestId("rule-position-badge").length).toBe(1);
    expect(getAllByTestId("rule-size-badge").length).toBe(1);
  });

  it("shows a rotation θ badge only when the rule is rotated", () => {
    const r = rect({ id: "r1", name: "Focus Zone" });
    useRulesStore.getState().replaceAll([r], [r.id], []);
    // Rotation is normalised through the reducer boundary; setting it
    // via the dedicated action guarantees the store observes 15° even
    // if `replaceAll` migrates the rule shape.
    useRulesStore.getState().setRuleRotation("r1", 15);
    const { queryAllByTestId } = render(
      <SelectionOverlay
        rules={[{ ...r, rotation: 15 }]}
        selectedIds={[r.id]}
        viewport={{ panX: 0, panY: 0, zoom: 1 }}
        canvasSize={{ width: 800, height: 600 }}
        contextMenu={null}
        onCloseContextMenu={() => {}}
        onResize={() => {}}
        onAction={() => {}}
        onChangeKind={() => {}}
      />,
    );
    expect(queryAllByTestId("rule-rotation-badge").length).toBe(1);
  });

  it("hides the rotation θ badge at 0°", () => {
    const r = rect({ id: "r1", name: "Focus Zone", rotation: 0 });
    const { queryAllByTestId } = renderOverlay(r);
    expect(queryAllByTestId("rule-rotation-badge").length).toBe(0);
  });
});
