// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import type { EditorRule } from "@/lib/editor/types";

function makeRule(overrides: Partial<EditorRule> = {}): EditorRule {
  return {
    id: "rule-1",
    name: "U12 package outline",
    kind: "C",
    isHidden: false,
    isLocked: false,
    x: 470,
    y: 176,
    width: 156,
    height: 130,
    params: {
      acceptanceConditions: JSON.stringify([
        { id: "ac-1", presence: "present", targetColor: "", similarityPct: 80 },
        { id: "ac-2", presence: "ignore", targetColor: "", similarityPct: 60 },
      ]),
    },
    ...overrides,
  };
}

describe("PropertiesPanel layout contract", () => {
  afterEach(() => cleanup());

  it("renders Bounds before Acceptance with visible coordinate controls", () => {
    render(
      <PropertiesPanel
        rules={[makeRule()]}
        selectedIds={["rule-1"]}
        imageBounds={{ x: 0, y: 0, width: 1280, height: 720 }}
        onRename={vi.fn()}
        onSetKind={vi.fn()}
        onUpdateParams={vi.fn()}
        onSetBounds={vi.fn()}
        onSetHidden={vi.fn()}
        onSetLocked={vi.fn()}
      />,
    );

    const boundsCard = screen.getByTestId("properties-bounds-card");
    const acceptanceCard = screen.getByTestId("properties-acceptance-card");
    const boundsBody = screen.getByTestId("properties-bounds-body");

    expect(boundsCard.compareDocumentPosition(acceptanceCard)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(
      (within(boundsBody).getByRole("spinbutton", { name: "X" }) as HTMLInputElement).value,
    ).toBe("470");
    expect(
      (within(boundsBody).getByRole("spinbutton", { name: "Y" }) as HTMLInputElement).value,
    ).toBe("176");
    expect(
      (within(boundsBody).getByRole("spinbutton", { name: "W" }) as HTMLInputElement).value,
    ).toBe("156");
    expect(
      (within(boundsBody).getByRole("spinbutton", { name: "H" }) as HTMLInputElement).value,
    ).toBe("130");
    expect(
      (within(boundsBody).getByRole("button", { name: "Lock aspect ratio" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("keeps Acceptance controls inside a compact panel body", () => {
    render(
      <PropertiesPanel
        rules={[makeRule()]}
        selectedIds={["rule-1"]}
        imageBounds={{ x: 0, y: 0, width: 1280, height: 720 }}
        onRename={vi.fn()}
        onSetKind={vi.fn()}
        onUpdateParams={vi.fn()}
        onSetBounds={vi.fn()}
        onSetHidden={vi.fn()}
        onSetLocked={vi.fn()}
      />,
    );

    const acceptanceBody = screen.getByTestId("properties-acceptance-body");
    expect(within(acceptanceBody).getByTestId("properties-acceptance-panel")).toBeTruthy();
    expect(
      (within(acceptanceBody).getByRole("button", { name: "Add condition" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(within(acceptanceBody).getAllByRole("listitem")).toHaveLength(2);
  });
});
