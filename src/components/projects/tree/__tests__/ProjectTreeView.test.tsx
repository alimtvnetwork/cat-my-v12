// @vitest-environment jsdom
// Plan 03 step 2. Component tests for the project tree view.
// Spec: 02-spec/21-app/81-project-recipe-rule-tree-view.md §4, §11 (AC2, AC3).

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useRecipeStore } from "@/lib/recipes/store";
import { asRecipeId } from "@/lib/recipes/model";
import type { RuleId } from "@/lib/rules/model";
import { ProjectTreeView } from "../ProjectTreeView";
import { TreeNodeKindType } from "@/lib/recipes/tree-types";

vi.mock("@/lib/rules/useRulesLibrary", () => ({
  useRulesLibrary: () => ({
    rules: [
      { id: "rule-1", name: "Pin 1 Orientation", isCategory: false },
      { id: "rule-2", name: "Pocket Presence", isCategory: false },
      { id: "rule-3", name: "Solder Bridge", isCategory: false },
    ],
    byId: (id: string) =>
      ({ "rule-1": "Pin 1 Orientation", "rule-2": "Pocket Presence", "rule-3": "Solder Bridge" })[
        id
      ] ?? null,
  }),
}));

const STAMP = "2026-10-11T00:00:00.000Z";

function seedStore(): void {
  useRecipeStore.setState({
    recipes: {
      "recipe-a": {
        id: asRecipeId("recipe-a"),
        projectId: "project-1",
        name: "Incoming Inspection",
        sortOrder: 0,
        ruleIds: ["rule-1", "rule-2"] as RuleId[],
        isEnabled: true,
        createdAt: STAMP,
        updatedAt: STAMP,
      },
      "recipe-b": {
        id: asRecipeId("recipe-b"),
        projectId: "project-1",
        name: "Final Check",
        sortOrder: 1,
        ruleIds: ["rule-3"] as RuleId[],
        isEnabled: true,
        createdAt: STAMP,
        updatedAt: STAMP,
      },
    },
  });
}

describe("ProjectTreeView", () => {
  beforeEach(() => {
    window.localStorage.clear();
    seedStore();
  });

  afterEach(() => {
    cleanup();
    useRecipeStore.setState({ recipes: {} });
  });

  it("renders three depths with depth badges and counts", () => {
    render(
      <ProjectTreeView
        projectId="project-1"
        projectName="Demo Project"
        selection={null}
        onSelectNode={() => undefined}
      />,
    );

    expect(screen.getByText("Demo Project")).toBeTruthy();
    expect(screen.getByText("Incoming Inspection")).toBeTruthy();
    expect(screen.getByText("Final Check")).toBeTruthy();
    expect(screen.getByText("Pin 1 Orientation")).toBeTruthy();
    expect(screen.getByText("Solder Bridge")).toBeTruthy();

    const badges = document.querySelectorAll('span[aria-hidden="true"]');
    const badgeTexts = Array.from(badges).map((b) => b.textContent);
    expect(badgeTexts).toContain("L0");
    expect(badgeTexts).toContain("L1");
    expect(badgeTexts).toContain("L2");

    expect(screen.getByText("2 recipes · 3 rules")).toBeTruthy();
  });

  it("collapses a recipe and hides its rules", () => {
    render(
      <ProjectTreeView
        projectId="project-1"
        projectName="Demo Project"
        selection={null}
        onSelectNode={() => undefined}
      />,
    );

    fireEvent.click(screen.getByLabelText("Collapse Incoming Inspection"));

    expect(screen.queryByText("Pin 1 Orientation")).toBeNull();
    expect(screen.getByText("Final Check")).toBeTruthy();
  });

  it("notifies selection on row click", () => {
    const onSelectNode = vi.fn();

    render(
      <ProjectTreeView
        projectId="project-1"
        projectName="Demo Project"
        selection={null}
        onSelectNode={onSelectNode}
      />,
    );

    fireEvent.click(screen.getByText("Final Check"));

    expect(onSelectNode).toHaveBeenCalledWith({
      kind: TreeNodeKindType.Recipe,
      id: "recipe-b",
    });
  });

  it("persists expand state across remounts", () => {
    const props = {
      projectId: "project-1",
      projectName: "Demo Project",
      selection: null,
      onSelectNode: () => undefined,
    };
    const { unmount } = render(<ProjectTreeView {...props} />);

    fireEvent.click(screen.getByLabelText("Collapse Incoming Inspection"));
    unmount();
    render(<ProjectTreeView {...props} />);

    expect(screen.queryByText("Pin 1 Orientation")).toBeNull();
  });
});
