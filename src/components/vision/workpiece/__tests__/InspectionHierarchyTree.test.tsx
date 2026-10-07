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

  it("renders complete hierarchy tree: project -> device -> ruleset -> rules + lighting", () => {
    render(
      <InspectionHierarchyTree
        project={mockProject}
        ruleset={mockRuleset}
        rules={[mockRule1, mockRule2]}
        selectedRuleId="rule-1"
        onSelectRule={vi.fn()}
      />,
    );

    // Level 1: Project
    expect(screen.getByText(/Project: Bottle Line Inspection/i)).toBeTruthy();

    // Level 2: Device (Circuit / IC DUT)
    expect(screen.getByText(/Device: DUT-Station-4/i)).toBeTruthy();
    expect(screen.getByText(/IC Package \/ Board DUT/i)).toBeTruthy();
    expect(screen.getByText(/IC Loaded/i)).toBeTruthy();

    // Level 3: RuleSet
    expect(screen.getByText(/RuleSet: Carrier Tape Inspection V1/i)).toBeTruthy();

    // Level 4: Rules & per-rule Camera / Light Subtrees
    expect(screen.getByText("Pin 1 Orientation Config")).toBeTruthy();
    expect(screen.getByText("Greyscale Pattern Match 24-Box")).toBeTruthy();
    expect(screen.getByText("T105")).toBeTruthy();
    expect(screen.getByText("T102")).toBeTruthy();
    expect(screen.getByText(/PASS/)).toBeTruthy();

    // Per-rule Camera and Light subtrees
    expect(screen.getAllByText("Camera Settings").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Light Settings").length).toBeGreaterThan(0);
  });

  it("supports hiding, deleting, and reordering rules directly in the tree", () => {
    const handleToggleHidden = vi.fn();
    const handleDeleteRule = vi.fn();
    const handleReorderRule = vi.fn();

    render(
      <InspectionHierarchyTree
        project={mockProject}
        ruleset={mockRuleset}
        rules={[mockRule1, mockRule2]}
        selectedRuleId="rule-1"
        onSelectRule={vi.fn()}
        onToggleHidden={handleToggleHidden}
        onDeleteRule={handleDeleteRule}
        onReorderRule={handleReorderRule}
      />,
    );

    const hideButtons = screen.getAllByTitle("Hide rule overlay");
    fireEvent.click(hideButtons[0]);
    expect(handleToggleHidden).toHaveBeenCalledWith("rule-1");

    const deleteButtons = screen.getAllByTitle("Delete rule");
    fireEvent.click(deleteButtons[0]);
    expect(handleDeleteRule).toHaveBeenCalledWith("rule-1");
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

  it("triggers onTuneRule when the tune button is clicked", () => {
    const handleTune = vi.fn();
    render(
      <InspectionHierarchyTree
        project={mockProject}
        ruleset={mockRuleset}
        rules={[mockRule1, mockRule2]}
        selectedRuleId="rule-1"
        onSelectRule={vi.fn()}
        onTuneRule={handleTune}
      />,
    );

    const tuneButtons = screen.getAllByTitle("Visual Tune this rule");
    expect(tuneButtons.length).toBeGreaterThan(0);
    fireEvent.click(tuneButtons[0]);
    expect(handleTune).toHaveBeenCalledWith("rule-1");
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

    const lightButtons = screen.getAllByTitle(/Light Settings:/i);
    expect(lightButtons.length).toBeGreaterThan(0);

    // Open light settings panel for rule-1
    fireEvent.click(lightButtons[0]);

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

  it("toggles tree collapsing into a minimal icon bar", () => {
    render(
      <InspectionHierarchyTree
        project={mockProject}
        ruleset={mockRuleset}
        rules={[mockRule1, mockRule2]}
        selectedRuleId="rule-1"
        onSelectRule={vi.fn()}
      />,
    );

    const collapseButton = screen.getByTitle("Collapse tree sidebar");
    fireEvent.click(collapseButton);

    expect(screen.getByTitle("Expand inspection hierarchy tree")).toBeTruthy();

    fireEvent.click(screen.getByTitle("Expand inspection hierarchy tree"));
    expect(screen.getByText(/Project: Bottle Line Inspection/i)).toBeTruthy();
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

    const cameraButtons = screen.getAllByTitle(/Camera Settings:/i);
    expect(cameraButtons.length).toBeGreaterThan(0);

    // Click camera button on first rule to open camera settings
    fireEvent.click(cameraButtons[0]);

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

    const footerAddBtn = screen.getByRole("button", { name: /^Add Rule$/i });
    fireEvent.click(footerAddBtn);
    expect(handleAddRuleClick).toHaveBeenCalledTimes(2);
  });
});
