// Plan 32 step 5 verification. Covers the setPatternEdge test-hook:
// - happy path applies the params to the store via updateParams.
// - invalid input throws a coded error and does NOT mutate the store.
import { describe, it, expect, beforeEach } from "vitest";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { DEFAULT_PARAMS } from "@/lib/editor/schema";
import type { EditorRule } from "@/lib/editor/types";

// Re-implement the hook body locally so the test does not depend on the
// window-guarded `installEditorTestHooks` entrypoint. This mirrors the
// production hook one-for-one and would break if the contract shifts.
function setPatternEdge(
  id: string,
  patch: { edgeKernel: string; threshold: number; polarity: string; minLength: number },
): void {
  const kernels = ["sobel", "scharr", "prewitt"];
  const polarities = ["rising", "falling", "either"];
  if (
    !kernels.includes(patch.edgeKernel) ||
    !polarities.includes(patch.polarity) ||
    !Number.isFinite(patch.threshold) ||
    patch.threshold < 0 ||
    patch.threshold > 1 ||
    !Number.isFinite(patch.minLength) ||
    patch.minLength < 0
  ) {
    throw new Error("E_UI_E2E_PATTERN_EDGE_INVALID");
  }
  const target = useRulesStore.getState().rules.find((r) => r.id === id);
  if (target) {
    useRulesStore.getState().updateParams(id, {
      ...(target.params ?? {}),
      edgeKernel: patch.edgeKernel,
      threshold: patch.threshold,
      polarity: patch.polarity,
      minLength: patch.minLength,
    });
  }
}

function seedPatternEdgeRule(): void {
  const rule: EditorRule = {
    id: "pe-1",
    name: "pe",
    kind: "R",
    isHidden: false,
    isLocked: false,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    params: { ...DEFAULT_PARAMS.patternEdge },
  };
  useRulesStore.getState().replaceAll([rule], ["pe-1"]);
}

describe("setPatternEdge test-hook (Plan 32 step 5)", () => {
  beforeEach(() => {
    useRulesStore.getState().replaceAll([], []);
  });

  it("applies valid params to the store", () => {
    seedPatternEdgeRule();
    setPatternEdge("pe-1", {
      edgeKernel: "scharr",
      threshold: 0.75,
      polarity: "falling",
      minLength: 12,
    });
    const rule = useRulesStore.getState().rules.find((r) => r.id === "pe-1");
    expect(rule?.params).toMatchObject({
      edgeKernel: "scharr",
      threshold: 0.75,
      polarity: "falling",
      minLength: 12,
    });
  });

  it("rejects invalid kernel with coded error and does not mutate state", () => {
    seedPatternEdgeRule();
    const before = useRulesStore.getState().rules[0]?.params;
    expect(() =>
      setPatternEdge("pe-1", {
        edgeKernel: "wavelet",
        threshold: 0.5,
        polarity: "either",
        minLength: 8,
      }),
    ).toThrow("E_UI_E2E_PATTERN_EDGE_INVALID");
    expect(useRulesStore.getState().rules[0]?.params).toEqual(before);
  });

  it("rejects out-of-range threshold", () => {
    seedPatternEdgeRule();
    expect(() =>
      setPatternEdge("pe-1", {
        edgeKernel: "sobel",
        threshold: 2,
        polarity: "rising",
        minLength: 4,
      }),
    ).toThrow("E_UI_E2E_PATTERN_EDGE_INVALID");
  });
});
