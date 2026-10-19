// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
import { InspectionHierarchyTree } from "../InspectionHierarchyTree";
import type { Project, RuleSet } from "@/lib/projects/types";
import type { EditorRule } from "@/lib/editor/types";
import { EditorRuleKindType, EditorToolFamilyType } from "@/lib/editor/types";
import { useValidationStore, ValidationStatusType } from "@/lib/editor/validation-store";
import { useLightingStore } from "@/lib/lighting/store";

describe("InspectionHierarchyTree", () => {
  const mockProject: Project = {
    id: "proj-1",
    name: "Bottle Line Inspection",
    createdAt: Date.now(),
    rulesetIds: ["rs-1"],
    deviceId: "DUT-Station-4",
    cameraName: "GigE Sony Sensor 4K",
  };

  const mockRule1: EditorRule = {
    id: "rule-1",
    name: "Pin 1 Orientation Config",
    kind: EditorRuleKindType.C,
    family: EditorToolFamilyType.Rect,
    isHidden: false,
    isLocked: false,
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    params: {
      toolCode: "T105",
    },
  };

  const mockRule2: EditorRule = {
    id: "rule-2",
    name: "Greyscale Pattern Match 24-Box",
    kind: EditorRuleKindType.R,
    family: EditorToolFamilyType.Rect,
    isHidden: false,
    isLocked: false,
    x: 50,
    y: 50,
    width: 300,
    height: 300,
    params: {
      toolCode: "T102",
    },
  };

  const mockRuleset: RuleSet = {
    id: "rs-1",
    projectId: "proj-1",
    name: "Carrier Tape Inspection V1",
    rules: [mockRule1, mockRule2],
  };

  beforeEach(() => {
    useLightingStore.getState().reset();
    useValidationStore.getState().mergeResults(
      "rs-1",
      {
        "rule-1": {
          status: ValidationStatusType.Pass,
          score: 1.0,
          message: "All 24 elements matched (100%)",
          stub: false,
        },
      },
      "Carrier Tape Inspection V1",
    );
  });

  /** Opens the ⋮ options menu for the rule row at the given index. */
  function openRuleMenu(index: number) {
    const menuButtons = screen.getAllByTitle("Rule options");
    fireEvent.click(menuButtons[index]);
  }

  it("renders hierarchy starting at device with the project name in the header", () => {
    render(
      <InspectionHierarchyTree
        project={mockProject}
        ruleset={mockRuleset}
        rules={[mockRule1, mockRule2]}
        selectedRuleId="rule-1"
        onSelectRule={vi.fn()}
      />,
    );

    // Header shows the project name (no separate project row, no search box)
    expect(screen.getByText("Bottle Line Inspection")).toBeTruthy();
    expect(screen.queryByPlaceholderText("Search...")).toBeNull();
    expect(screen.queryByText(/Project:/i)).toBeNull();

    // Level 1: Device (Circuit / IC DUT)
    expect(screen.getByText(/Device: DUT-Station-4/i)).toBeTruthy();
    expect(screen.getByText(/IC Package \/ Board DUT/i)).toBeTruthy();
    expect(screen.getByText(/IC Loaded/i)).toBeTruthy();

    // Level 2: RuleSet
    expect(screen.getByText(/RuleSet: Carrier Tape Inspection V1/i)).toBeTruthy();

    // Level 3: Rules with name + catalog tool image + code (no result badges)
    expect(screen.getByText("Pin 1 Orientation Config")).toBeTruthy();
    expect(screen.getByText("Greyscale Pattern Match 24-Box")).toBeTruthy();
    expect(screen.getByTestId("tool-graphic-T105")).toBeTruthy();
    expect(screen.getByTestId("tool-graphic-T102")).toBeTruthy();
    expect(screen.getByText("T105")).toBeTruthy();
    expect(screen.getByText("T102")).toBeTruthy();
    expect(screen.queryByText(/PASS/)).toBeNull();

    // Camera / light subtree toggles live in the options menu
    openRuleMenu(0);
    expect(screen.getByText("Camera settings")).toBeTruthy();
    expect(screen.getByText("Light settings")).toBeTruthy();
  });

  it("resolves catalog images from rule names when no toolCode is stored", () => {
    const legacyRule = {
      ...mockRule1,
      id: "rule-legacy",
      name: "Rule 3: Laser Marking OCR",
      params: {},
    };

    render(
      <InspectionHierarchyTree
        project={mockProject}
        ruleset={mockRuleset}
        rules={[legacyRule]}
        selectedRuleId="rule-legacy"
        onSelectRule={vi.fn()}
      />,
    );

    // Own catalog image (T106), not the shared default graphic
    expect(screen.getByTestId("tool-graphic-T106")).toBeTruthy();
    // "Rule 3:" prefix stripped, only the rule name shown
    expect(screen.getByText("Laser Marking OCR")).toBeTruthy();
    expect(screen.queryByText("Rule 3: Laser Marking OCR")).toBeNull();
    // No index numbering beside the rule
    expect(screen.queryByText("[1]")).toBeNull();
  });

  it("supports hiding and deleting rules from the options dropdown", () => {
    const handleToggleHidden = vi.fn();
    const handleDeleteRule = vi.fn();

    render(
      <InspectionHierarchyTree
        project={mockProject}
        ruleset={mockRuleset}
        rules={[mockRule1, mockRule2]}
        selectedRuleId="rule-1"
        onSelectRule={vi.fn()}
        onToggleHidden={handleToggleHidden}
        onDeleteRule={handleDeleteRule}
      />,
    );

    openRuleMenu(0);
    fireEvent.click(screen.getByText("Hide overlay"));
    expect(handleToggleHidden).toHaveBeenCalledWith("rule-1");

    openRuleMenu(0);
    fireEvent.click(screen.getByText("Delete rule"));
    expect(handleDeleteRule).toHaveBeenCalledWith("rule-1");
  });

  it("supports moving rules up and down from the options dropdown", () => {
    const handleReorderRule = vi.fn();

    render(
      <InspectionHierarchyTree
        project={mockProject}
        ruleset={mockRuleset}
        rules={[mockRule1, mockRule2]}
        selectedRuleId="rule-1"
        onSelectRule={vi.fn()}
        onReorderRule={handleReorderRule}
      />,
    );

    // First rule can only move down, second rule can only move up
    openRuleMenu(0);
    expect(screen.queryByText("Move up")).toBeNull();
    fireEvent.click(screen.getByText("Move down"));
    expect(handleReorderRule).toHaveBeenCalledWith("rule-1", "down");

    openRuleMenu(1);
    expect(screen.queryByText("Move down")).toBeNull();
    fireEvent.click(screen.getByText("Move up"));
    expect(handleReorderRule).toHaveBeenCalledWith("rule-2", "up");
  });

  it("calls onMoveRule with the drop index when a rule is dragged onto another", () => {
    const handleMoveRule = vi.fn();

    render(
      <InspectionHierarchyTree
        project={mockProject}
        ruleset={mockRuleset}
        rules={[mockRule1, mockRule2]}
        selectedRuleId="rule-1"
        onSelectRule={vi.fn()}
        onMoveRule={handleMoveRule}
      />,
    );

    const rows = screen.getAllByTitle("Rule options").map((btn) => {
      let node: HTMLElement | null = btn as HTMLElement;
      // climb to the draggable row
      while (node && !node.hasAttribute("draggable")) {
        node = node.parentElement;
      }

      return node as HTMLElement;
    });

    // Drag rule-1 onto the lower half of rule-2's row => move to the end.
    // (fireEvent.drop does not carry clientY in this jsdom setup, so the
    // drop event is built manually.)
    fireEvent.dragStart(rows[0]);
    fireEvent.dragOver(rows[1], { clientY: 1 });

    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvent, "clientY", { value: 1 });
    fireEvent(rows[1], dropEvent);

    expect(handleMoveRule).toHaveBeenCalledWith("rule-1", 1);
  });

  it("calls onSelectRule when a rule is clicked", () => {
    const handleSelect = vi.fn();
    render(
      <InspectionHierarchyTree
        project={mockProject}
        ruleset={mockRuleset}
        rules={[mockRule1, mockRule2]}
        selectedRuleId="rule-1"
        onSelectRule={handleSelect}
      />,
    );

    fireEvent.click(screen.getByText("Greyscale Pattern Match 24-Box"));
    expect(handleSelect).toHaveBeenCalledWith("rule-2");
  });

  it("opens the tool configuration on double click", () => {
    const handleConfigure = vi.fn();
    render(
      <InspectionHierarchyTree
        project={mockProject}
        ruleset={mockRuleset}
        rules={[mockRule1, mockRule2]}
        selectedRuleId="rule-1"
        onSelectRule={vi.fn()}
        onConfigureRule={handleConfigure}
      />,
    );

    fireEvent.doubleClick(screen.getByText("Pin 1 Orientation Config"));
    expect(handleConfigure).toHaveBeenCalledWith("rule-1");
  });

  it("opens the tool configuration from the options dropdown", () => {
    const handleConfigure = vi.fn();
    render(
      <InspectionHierarchyTree
        project={mockProject}
        ruleset={mockRuleset}
        rules={[mockRule1, mockRule2]}
        selectedRuleId="rule-1"
        onSelectRule={vi.fn()}
        onConfigureRule={handleConfigure}
      />,
    );

    openRuleMenu(1);
    fireEvent.click(screen.getByText("Configure tool"));
    expect(handleConfigure).toHaveBeenCalledWith("rule-2");
  });

  it("updates live light parameters per rule via subtree sliders", () => {
    const handleUpdateLightSettings = vi.fn();
    render(
      <InspectionHierarchyTree
        project={mockProject}
        ruleset={mockRuleset}
        rules={[mockRule1, mockRule2]}
        selectedRuleId="rule-1"
        onSelectRule={vi.fn()}
        onUpdateLightSettings={handleUpdateLightSettings}
      />,
    );

    openRuleMenu(0);
    fireEvent.click(screen.getByText("Light settings"));

    expect(screen.getByText(/Light Settings: Pin 1 Orientation Config/i)).toBeTruthy();
    expect(screen.getByText("Intensity")).toBeTruthy();
    expect(screen.getByText("Channel")).toBeTruthy();
    expect(screen.getByText("Strobe Pulse Mode")).toBeTruthy();

    // Change intensity slider
    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[0], { target: { value: "95" } });

    expect(handleUpdateLightSettings).toHaveBeenCalledWith(
      "rule-1",
      expect.objectContaining({ intensity: 95 }),
    );
  });

  it("supports editing dedicated camera settings per rule", () => {
    const handleUpdateCameraSettings = vi.fn();
    render(
      <InspectionHierarchyTree
        project={mockProject}
        ruleset={mockRuleset}
        rules={[mockRule1, mockRule2]}
        selectedRuleId="rule-1"
        onSelectRule={vi.fn()}
        onUpdateCameraSettings={handleUpdateCameraSettings}
      />,
    );

    openRuleMenu(0);
    fireEvent.click(screen.getByText("Camera settings"));

    expect(screen.getByText(/Camera Settings: Pin 1 Orientation Config/i)).toBeTruthy();
    expect(screen.getByText(/Exposure Time/i)).toBeTruthy();
    expect(screen.getByText(/Analog Gain/i)).toBeTruthy();
    expect(screen.getByText(/White Balance/i)).toBeTruthy();
    expect(screen.getByText(/Gamma/i)).toBeTruthy();

    // Adjust exposure slider inside the camera settings subpanel
    const sliders = screen.getAllByRole("slider");
    // Change first slider (which is exposure)
    fireEvent.change(sliders[0], { target: { value: "30000" } });

    expect(handleUpdateCameraSettings).toHaveBeenCalledWith(
      "rule-1",
      expect.objectContaining({ exposureUs: 30000 }),
    );
  });

  it("invokes onAddRuleClick when add rule buttons are clicked in header or footer", () => {
    const handleAddRuleClick = vi.fn();
    render(
      <InspectionHierarchyTree
        project={mockProject}
        ruleset={mockRuleset}
        rules={[mockRule1, mockRule2]}
        selectedRuleId="rule-1"
        onSelectRule={vi.fn()}
        onAddRuleClick={handleAddRuleClick}
      />,
    );

    const headerAddBtn = screen.getByTitle("Add rule from tools");
    fireEvent.click(headerAddBtn);
    expect(handleAddRuleClick).toHaveBeenCalledTimes(1);

    const footerAddBtn = screen.getByRole("button", { name: /\+ Add Rule/i });
    fireEvent.click(footerAddBtn);
    expect(handleAddRuleClick).toHaveBeenCalledTimes(2);
  });
});
