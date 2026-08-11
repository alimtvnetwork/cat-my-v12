import { EditorRuleKindType } from "@/lib/editor/types";
// Regression: each per-kind editor may render controls for its own kind only.
// If a control label from another kind's editor leaks in, the isolation invariant
// (rule.kind === "X" gate in each editor) is broken.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import type { EditorRule, EditorRuleKind } from "@/lib/editor/types";
import { OcrRuleEditor } from "../OcrRuleEditor";
import { CircleRuleEditor } from "../CircleRuleEditor";
import { RectRuleEditor } from "../RectRuleEditor";
import { TextRuleEditor } from "../TextRuleEditor";
import { MathRuleEditor } from "../MathRuleEditor";

const noop = () => {};

function makeRule(kind: EditorRuleKind): EditorRule {
  return {
    id: `rule-${kind}`,
    name: `Rule ${kind}`,
    kind,
    isHidden: false,
    isLocked: false,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    params: {},
  };
}

interface KindSpec {
  kind: EditorRuleKind;
  label: string; // aria-label unique to that editor's <section>
  ownLabels: string[]; // control labels that MUST appear
  render: (rule: EditorRule) => ReactElement;
}

// Shared calibration controls now render across every per-kind editor, so
// they are legitimately present in each and must be excluded from the
// cross-kind leak assertion (same treatment as "Edge threshold").
const SHARED_LABELS = ["Pass threshold"] as const;

const SPECS: KindSpec[] = [
  {
    kind: EditorRuleKindType.K,
    label: "OCR rule editor",
    ownLabels: [
      "Target text",
      "Matching mode",
      "Bounding behavior",
      "ROI padding (px)",
      ...SHARED_LABELS,
    ],
    render: (r) => <OcrRuleEditor rule={r} onChange={noop} />,
  },
  {
    kind: EditorRuleKindType.C,
    label: "Circle rule editor",
    ownLabels: [
      "Min radius (px)",
      "Max radius (px)",
      "Edge threshold",
      "Invert polarity",
      ...SHARED_LABELS,
    ],
    render: (r) => <CircleRuleEditor rule={r} onChange={noop} />,
  },
  {
    kind: EditorRuleKindType.R,
    label: "Rectangle rule editor",
    ownLabels: [
      "Min area (px",
      "Max area (px",
      "Orientation tolerance",
      "Edge threshold",
      ...SHARED_LABELS,
    ],
    render: (r) => <RectRuleEditor rule={r} onChange={noop} />,
  },
  {
    kind: EditorRuleKindType.S,
    label: "Text match rule editor",
    ownLabels: ["Regex pattern", "Flags", ...SHARED_LABELS],
    render: (r) => <TextRuleEditor rule={r} onChange={noop} />,
  },
  {
    kind: EditorRuleKindType.E,
    label: "Math rule editor",
    ownLabels: ["Expression", "Pass threshold"],
    render: (r) => <MathRuleEditor rule={r} onChange={noop} />,
  },
];

describe("per-kind editors: control isolation", () => {
  for (const spec of SPECS) {
    describe(`${spec.label} (kind "${spec.kind}")`, () => {
      it("renders its own controls for the matching kind", () => {
        const html = renderToStaticMarkup(spec.render(makeRule(spec.kind)));
        expect(html).toContain(`aria-label="${spec.label}"`);
        for (const label of spec.ownLabels) {
          expect(html).toContain(label);
        }
      });

      it("renders nothing for any other kind", () => {
        for (const other of SPECS) {
          if (other.kind === spec.kind) continue;
          const html = renderToStaticMarkup(spec.render(makeRule(other.kind)));
          expect(html).toBe("");
        }
      });

      it("does not leak controls that belong to other kinds", () => {
        const html = renderToStaticMarkup(spec.render(makeRule(spec.kind)));
        for (const other of SPECS) {
          if (other.kind === spec.kind) continue;
          // Section aria-label is unique per editor and a strong leak signal.
          expect(html).not.toContain(`aria-label="${other.label}"`);
          for (const foreign of other.ownLabels) {
            // Skip overlapping labels shared legitimately across kinds
            // (e.g. "Edge threshold" applies to both Circle and Rect).
            if (spec.ownLabels.includes(foreign)) continue;
            expect(html, `${spec.label} leaked "${foreign}" from ${other.label}`).not.toContain(
              foreign,
            );
          }
        }
      });
    });
  }
});