// @vitest-environment jsdom
// PatternEdgePanel tests, Plan 32 slice 2.
// Anchored by spec/24-app-ui-design-system/05-rule-controller.md matrix row
// "PatternEdge" and ParamsPatternEdge in src/lib/editor/schema.ts.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PatternEdgePanel } from "@/components/editor/panels/PatternEdgePanel";
import { DEFAULT_PARAMS } from "@/lib/editor/schema";

describe("PatternEdgePanel", () => {
  afterEach(() => cleanup());

  it("renders defaults from DEFAULT_PARAMS.patternEdge", () => {
    render(<PatternEdgePanel value={DEFAULT_PARAMS.patternEdge} onChange={() => {}} />);
    expect((screen.getByTestId("pattern-edge-kernel") as HTMLSelectElement).value).toBe("sobel");
    expect((screen.getByTestId("pattern-edge-polarity") as HTMLSelectElement).value).toBe("rising");
    expect((screen.getByTestId("pattern-edge-threshold") as HTMLInputElement).value).toBe("0.5");
    expect((screen.getByTestId("pattern-edge-min-length") as HTMLInputElement).value).toBe("8");
  });

  it("emits kernel change through normalizer", () => {
    const onChange = vi.fn();
    render(<PatternEdgePanel value={DEFAULT_PARAMS.patternEdge} onChange={onChange} />);
    fireEvent.change(screen.getByTestId("pattern-edge-kernel"), { target: { value: "scharr" } });
    expect(onChange).toHaveBeenCalledWith({ edgeKernel: "scharr" });
  });

  it("clamps minLength to >= 1 integer", () => {
    const onChange = vi.fn();
    render(<PatternEdgePanel value={DEFAULT_PARAMS.patternEdge} onChange={onChange} />);
    fireEvent.change(screen.getByTestId("pattern-edge-min-length"), { target: { value: "-3" } });
    expect(onChange).toHaveBeenCalledWith({ minLength: 1 });
  });

  it("surfaces threshold-out-of-range alert", () => {
    render(
      <PatternEdgePanel
        value={{ ...DEFAULT_PARAMS.patternEdge, threshold: 1.5 }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("alert").textContent).toMatch(/between 0 and 1/i);
  });

  it("respects disabled prop", () => {
    render(<PatternEdgePanel value={DEFAULT_PARAMS.patternEdge} onChange={() => {}} disabled />);
    const kernel = screen.getByTestId("pattern-edge-kernel") as HTMLSelectElement;
    const fieldset = kernel.closest("fieldset") as HTMLFieldSetElement;
    expect(fieldset.disabled).toBe(true);
  });
});
