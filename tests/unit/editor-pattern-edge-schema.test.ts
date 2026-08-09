// Plan 32 slice 1 (SG-31-01). Locks the PatternEdge schema entry: default
// params, kind membership, migration path preserves user-supplied fields,
// invalid enum values fall back to defaults.
//
// This test intentionally sits at the schema layer only. Panel scaffold,
// resolver dispatch, and e2e hooks land in Plan 32 slice 2/3.

import { describe, expect, it } from "vitest";
import {
  CONTROLLER_KINDS,
  DEFAULT_PARAMS,
  PATTERN_EDGE_KERNELS,
  PATTERN_EDGE_POLARITIES,
  isControllerKind,
  normalizePatternEdgeKernel,
  normalizePatternEdgePolarity,
  type ControllerParamsByKind,
  type EditorRuleV1,
} from "@/lib/editor/schema";
import { migrateRuleV1ToV2 } from "@/lib/editor/migrations";

const geom = { x: 0, y: 0, width: 10, height: 10 };
const base = { isHidden: false, isLocked: false, family: "rect" as const, ...geom };

function v1(params: EditorRuleV1["params"]): EditorRuleV1 {
  return { id: "r-pe", name: "PatternEdge rule", kind: "R", ...base, params };
}

describe("PatternEdge schema (SG-31-01, Plan 32 slice 1)", () => {
  it("registers patternEdge as a controller kind", () => {
    expect(isControllerKind("patternEdge")).toBe(true);
    expect(CONTROLLER_KINDS).toContain("patternEdge");
  });

  it("default params expose the four spec-required fields", () => {
    const d = DEFAULT_PARAMS.patternEdge;
    expect(d.edgeKernel).toBe("sobel");
    expect(d.threshold).toBe(0.5);
    expect(d.polarity).toBe("rising");
    expect(d.minLength).toBe(8);
  });

  it("kernel and polarity are constrained to declared enums", () => {
    expect(PATTERN_EDGE_KERNELS).toEqual(["sobel", "scharr", "prewitt"]);
    expect(PATTERN_EDGE_POLARITIES).toEqual(["rising", "falling", "either"]);
  });

  it("normalize helpers reject unknown values by returning defaults", () => {
    expect(normalizePatternEdgeKernel("laplacian")).toBe("sobel");
    expect(normalizePatternEdgeKernel(null)).toBe("sobel");
    expect(normalizePatternEdgeKernel("scharr")).toBe("scharr");
    expect(normalizePatternEdgePolarity("sideways")).toBe("rising");
    expect(normalizePatternEdgePolarity("either")).toBe("either");
  });

  it("migration preserves valid user-supplied patternEdge params", () => {
    const raw = v1({
      // ControllerKind hint via v1 declared field.
      // migrations.ts::inferController falls back to isControllerKind.
      // We attach the discriminator via a v2-shaped input path:
    });
    const asV2 = migrateRuleV1ToV2({
      ...raw,
      controller: "patternEdge",
      params: { edgeKernel: "scharr", threshold: 0.7, polarity: "falling", minLength: 16 },
    } as unknown as EditorRuleV1);
    expect(asV2.controller).toBe("patternEdge");
    const p = asV2.params as ControllerParamsByKind["patternEdge"];
    expect(p.edgeKernel).toBe("scharr");
    expect(p.threshold).toBe(0.7);
    expect(p.polarity).toBe("falling");
    expect(p.minLength).toBe(16);
  });

  it("v1 -> v2 migration sanitizes invalid enum values to defaults", () => {
    // Route via v1 shape (no `controller` discriminator) so pickParams runs.
    // inferController picks up `params.kind = "patternEdge"`.
    const asV2 = migrateRuleV1ToV2(
      v1({
        kind: "patternEdge",
        edgeKernel: "laplacian",
        threshold: "nope" as unknown as number,
        polarity: "sideways",
        minLength: -1,
      } as unknown as EditorRuleV1["params"]),
    );
    expect(asV2.controller).toBe("patternEdge");
    const p = asV2.params as ControllerParamsByKind["patternEdge"];
    expect(p.edgeKernel).toBe("sobel");
    expect(p.threshold).toBe(0.5);
    expect(p.polarity).toBe("rising");
    // `-1` is numeric-finite so num() keeps it. Documents current contract:
    // minLength range clamping is the panel layer's responsibility, not the
    // migration's; Plan 32 slice 2 will add UI-side clamping.
    expect(p.minLength).toBe(-1);
  });
});
