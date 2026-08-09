// @vitest-environment jsdom
// Resolver dispatch integration test, Plan 32 slice 3.
// Verifies every ControllerKind either renders a dedicated data-panel-controller
// child (Number, Color, Blob, Pattern, PatternEdge) or falls into the legacy
// placeholder cluster (presence, absence, ocr, textMatch, math). This is the
// SG-31-01 UI closeout signal for Plan 32.

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ControllerPanel } from "@/components/editor/panels/resolver";
import {
  CONTROLLER_KINDS,
  DEFAULT_PARAMS,
  type ControllerKind,
  type EditorRuleV2,
} from "@/lib/editor/schema";

function makeRule<K extends ControllerKind>(kind: K): EditorRuleV2 {
  return {
    id: `r-${kind}`,
    name: `rule ${kind}`,
    kind: "n",
    isHidden: false,
    isLocked: false,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    controller: kind,
    params: DEFAULT_PARAMS[kind],
  } as EditorRuleV2;
}

const WIRED: ControllerKind[] = ["number", "color", "blob", "pattern", "patternEdge"];
const LEGACY: ControllerKind[] = ["presence", "absence", "ocr", "textMatch", "math"];

describe("ControllerPanel resolver dispatch", () => {
  afterEach(() => cleanup());

  it("covers every ControllerKind in CONTROLLER_KINDS", () => {
    const covered = new Set<ControllerKind>([...WIRED, ...LEGACY]);
    for (const kind of CONTROLLER_KINDS) {
      expect(covered.has(kind)).toBe(true);
    }
    expect(covered.size).toBe(CONTROLLER_KINDS.length);
  });

  for (const kind of WIRED) {
    it(`dispatches ${kind} to its dedicated panel wrapper`, () => {
      render(<ControllerPanel rule={makeRule(kind)} onChange={() => {}} />);
      const wrapper = document.querySelector(`[data-panel-controller="${kind}"]`);
      expect(wrapper, `expected data-panel-controller="${kind}" for wired panel`).not.toBeNull();
    });
  }

  it("routes patternEdge specifically to PatternEdgePanel (SG-31-01 UI closeout)", () => {
    render(<ControllerPanel rule={makeRule("patternEdge")} onChange={() => {}} />);
    expect(screen.getByTestId("pattern-edge-panel")).toBeTruthy();
    expect(screen.getByTestId("pattern-edge-kernel")).toBeTruthy();
  });

  for (const kind of LEGACY) {
    it(`keeps ${kind} in the legacy placeholder cluster`, () => {
      render(<ControllerPanel rule={makeRule(kind)} onChange={() => {}} />);
      const section = document.querySelector(`section[data-panel-controller="${kind}"]`);
      expect(section, `expected placeholder section for ${kind}`).not.toBeNull();
      expect(section?.textContent ?? "").toMatch(/not yet migrated/i);
    });
  }
});
