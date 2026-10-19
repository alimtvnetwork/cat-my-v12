// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";

vi.mock("@/lib/observability/client-logger", () => ({
  ClientLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { WorkpieceAnalyzeWorkspace } from "../WorkpieceAnalyzeWorkspace";
import { addRulesetPanelBus } from "@/lib/editor/selection/add-ruleset-panel-bus";
import { useProjectStore } from "@/lib/projects/store";
import type { Project } from "@/lib/projects/types";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("tour ruleset inline flow replay", () => {
  const mockProject: Project = {
    id: "proj-tour",
    name: "demo",
    createdAt: Date.now(),
    rulesetIds: [],
    deviceId: "dev-1",
    cameraName: "cam",
  };

  beforeEach(() => {
    useProjectStore.setState((s) => ({
      projects: { ...s.projects, [mockProject.id]: mockProject },
      rulesets: {},
    }));
  });

  it("opens the inline ruleset panel when the tour emits bus open", async () => {
    render(
      <WorkpieceAnalyzeWorkspace
        project={mockProject}
        ruleset={null}
        rulesets={[]}
        onSelectRuleset={vi.fn()}
      />,
    );

    // no-ruleset card is showing
    expect(document.querySelector("[data-tour='project-overview-add-ruleset']")).not.toBeNull();

    // tour action: go-ruleset-create
    await act(async () => {
      addRulesetPanelBus.emit({ type: "open" });
    });

    // the inline panel (step 8 target) appears
    expect(document.querySelector("[data-tour='simulation-ruleset-create-panel']")).not.toBeNull();
    expect(document.querySelector("[data-tour='simulation-ruleset-create-submit']")).not.toBeNull();
  });
});
