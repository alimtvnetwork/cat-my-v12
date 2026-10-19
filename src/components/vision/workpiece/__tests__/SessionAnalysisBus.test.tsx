// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";

vi.mock("@/lib/observability/client-logger", () => ({
  ClientLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { WorkpieceAnalyzeWorkspace } from "../WorkpieceAnalyzeWorkspace";
import { sessionAnalysisBus } from "@/lib/editor/selection/session-analysis-bus";
import { useProjectStore } from "@/lib/projects/store";
import { useValidationStore } from "@/lib/editor/validation-store";
import type { Project, RuleSet } from "@/lib/projects/types";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("session analysis bus (tour results)", () => {
  it("shows tour-written results once the bus lifts the stale-result gate", async () => {
    const project: Project = {
      id: "proj-1",
      name: "demo",
      createdAt: Date.now(),
      rulesetIds: ["rs-1"],
      deviceId: "dev-1",
      cameraName: "cam",
    };
    const ruleset: RuleSet = {
      id: "rs-1",
      projectId: "proj-1",
      name: "demoset",
      rules: [],
      overrideMode: "direct",
    };

    useProjectStore.setState((s) => ({
      projects: { ...s.projects, [project.id]: project },
      rulesets: { ...s.rulesets, [ruleset.id]: ruleset },
    }));

    render(
      <WorkpieceAnalyzeWorkspace
        project={project}
        ruleset={ruleset}
        rulesets={[ruleset]}
        onSelectRuleset={vi.fn()}
      />,
    );

    // The tour writes results directly to the validation store...
    await act(async () => {
      useValidationStore
        .getState()
        .setResults("rs-1", { "rule-1": { status: "pass" } } as any, "Guided simulation");
    });

    // ...but the stale-result gate hides them until a session analysis ran.
    expect(document.querySelector("[data-tour='project-analysis-results']")).toBeNull();

    // The bus lifts the gate, like the Analyze button does.
    await act(async () => {
      sessionAnalysisBus.emit();
    });

    expect(document.querySelector("[data-tour='project-analysis-results']")).not.toBeNull();
  });
});
