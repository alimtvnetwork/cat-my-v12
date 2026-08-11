import { EditorRuleKindType } from "@/lib/editor/types";
// @vitest-environment jsdom
// Plan 66 step 12 (RE-09): LayersToolbar Import SVG button.
// Verifies the button is gated correctly, that a picked file is parsed
// through parseSvgSource and forwarded to the onImportSvg callback with
// the raw text + parsed path, and that parse errors surface an alert
// instead of silently no-oping.

import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { LayersToolbar } from "../LayersToolbar";
import type { EditorRule } from "@/lib/editor/types";

afterEach(() => cleanup());

function rule(id: string, over: Partial<EditorRule> = {}): EditorRule {
  return {
    id,
    name: `Rule ${id}`,
    kind: EditorRuleKindType.R,
    isHidden: false,
    isLocked: false,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    params: {},
    ...over,
  };
}

function baseProps(overrides: Partial<React.ComponentProps<typeof LayersToolbar>> = {}) {
  return {
    rules: [rule("a"), rule("b")],
    groups: [],
    selectedIds: ["a"],
    onGroup: vi.fn(),
    onUngroup: vi.fn(),
    onMerge: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
}

const TRIANGLE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<path d="M 10 10 L 90 10 L 50 90 Z"/></svg>';

describe("LayersToolbar RE-09 SVG import", () => {
  it("hides the import button when onImportSvg is not wired", () => {
    render(<LayersToolbar {...baseProps()} />);
    expect(screen.queryByLabelText(/import svg/i)).toBeNull();
    expect(screen.queryByTestId("layers-import-svg-file")).toBeNull();
  });

  it("disables the button when nothing is selected", () => {
    const onImportSvg = vi.fn();
    render(<LayersToolbar {...baseProps({ selectedIds: [], onImportSvg })} />);
    const btn = screen.getByLabelText(/import svg|select at least one/i);
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("disables the button when the only selected rule is locked", () => {
    const onImportSvg = vi.fn();
    render(
      <LayersToolbar
        {...baseProps({
          rules: [rule("a", { isLocked: true })],
          selectedIds: ["a"],
          onImportSvg,
        })}
      />,
    );
    const btn = screen.getByLabelText(/import svg|select at least one/i);
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("parses a picked SVG and forwards the payload to onImportSvg", async () => {
    const onImportSvg = vi.fn();
    render(<LayersToolbar {...baseProps({ onImportSvg })} />);
    const input = screen.getByTestId("layers-import-svg-file") as HTMLInputElement;
    const file = new File([TRIANGLE_SVG], "triangle.svg", { type: "image/svg+xml" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(onImportSvg).toHaveBeenCalledTimes(1));
    const payload = onImportSvg.mock.calls[0][0];
    expect(payload.fileName).toBe("triangle.svg");
    expect(payload.source).toBe("path");
    expect(payload.svgPath).toBe("M 10 10 L 90 10 L 50 90 Z");
    expect(payload.viewBoxW).toBe(100);
    expect(payload.viewBoxH).toBe(100);
    expect(payload.svg).toBe(TRIANGLE_SVG);
  });

  it("surfaces a parse error via a role='alert' badge and does NOT invoke the callback", async () => {
    const onImportSvg = vi.fn();
    render(<LayersToolbar {...baseProps({ onImportSvg })} />);
    const input = screen.getByTestId("layers-import-svg-file") as HTMLInputElement;
    // <path> with a relative command 'm' is rejected by parseSvgSource.
    const bad =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">' +
      '<path d="m 0 0 l 1 1"/></svg>';
    const file = new File([bad], "bad.svg", { type: "image/svg+xml" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
    expect(onImportSvg).not.toHaveBeenCalled();
  });
});