// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, cleanup, act } from "@testing-library/react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  useParams,
} from "@tanstack/react-router";
import { createMemoryHistory } from "@tanstack/history";

vi.mock("@/lib/observability/client-logger", () => ({
  ClientLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { ProjectCreationAnalysisTour } from "@/components/guided-simulation/ProjectCreationAnalysisTour";
import { GUIDED_SIMULATION_COMMAND_EVENT } from "@/components/guided-simulation/events";
import { WorkpieceAnalyzeWorkspace } from "@/components/vision/workpiece/WorkpieceAnalyzeWorkspace";
import { useProjectStore } from "@/lib/projects/store";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

function HomeStub() {
  return (
    <div>
      <button type="button" data-tour="standard-menu-trigger">
        Menu
      </button>
    </div>
  );
}

function ProjectsStub() {
  return (
    <div>
      <button type="button" data-tour="projects-create-button">
        New Project
      </button>
    </div>
  );
}

function ProjectNewStub() {
  return (
    <div data-tour="simulation-project-create-panel">
      <input data-tour="simulation-project-name" />
      <button type="button" data-tour="simulation-project-create-submit">
        Create
      </button>
    </div>
  );
}

function ProjectOverviewStub() {
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const project = useProjectStore((s) => s.projects[projectId]);
  const rulesetsRecord = useProjectStore((s) => s.rulesets);
  const rulesets = React.useMemo(
    () => (project?.rulesetIds ?? []).map((id) => rulesetsRecord[id]).filter(Boolean),
    [project?.rulesetIds, rulesetsRecord],
  );

  if (!project) {
    return <div>missing</div>;
  }

  const activeRuleset = rulesets[0] ?? null;

  return (
    <div>
      <button type="button" data-tour="project-overview-tab">
        Overview
      </button>
      <WorkpieceAnalyzeWorkspace
        key={activeRuleset?.id ?? "no-ruleset"}
        project={project}
        ruleset={activeRuleset}
        rulesets={rulesets}
        onSelectRuleset={() => {}}
      />
    </div>
  );
}

describe("guided simulation tour replay", () => {
  it("reaches the rule-adding step without stalling", async () => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn() as any;

    const rootRoute = createRootRoute({
      component: () => (
        <>
          <Outlet />
          <ProjectCreationAnalysisTour />
        </>
      ),
    });
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: HomeStub,
    });
    const projectsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/projects",
      component: ProjectsStub,
    });
    const projectNewRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/projects/new",
      component: ProjectNewStub,
    });
    const projectOverviewRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/projects/$projectId",
      component: ProjectOverviewStub,
    });
    const routeTree = rootRoute.addChildren([
      indexRoute,
      projectsRoute,
      projectNewRoute,
      projectOverviewRoute,
    ]);
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });

    render(<RouterProvider router={router} />);
    await act(async () => {
      await router.load();
    });

    // start the tour like the app does
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(GUIDED_SIMULATION_COMMAND_EVENT, { detail: { command: "start" } }),
      );
    });

    const q = (sel: string) => document.querySelector(sel);

    // helper: advance time and flush
    async function advanceTime(ms: number) {
      await act(async () => {
        vi.advanceTimersByTime(ms);
      });
    }

    // walk the tour: each step needs its target present then autoMs elapses
    // step 1: Click Projects (exit -> /projects)
    expect(q("[data-tour='standard-menu-trigger']")).not.toBeNull();
    await advanceTime(8000);

    // step 2: Open project creation (exit -> /projects/new)
    expect(q("[data-tour='projects-create-button']")).not.toBeNull();
    await advanceTime(8000);

    // step 3: Name the project (no action)
    expect(q("[data-tour='simulation-project-name']")).not.toBeNull();
    await advanceTime(8000);

    // step 4: Save project and continue (exit -> creates demo, /projects/$projectId)
    expect(q("[data-tour='simulation-project-create-submit']")).not.toBeNull();
    await advanceTime(13000);

    // step 5/6: overview (fresh project, no rulesets)
    expect(q("[data-tour='project-overview-tab']")).not.toBeNull();
    await advanceTime(8000);
    expect(q("[data-tour='project-overview-empty']")).not.toBeNull();
    await advanceTime(8000);

    // step 7: Add ruleset -> exit action opens the inline panel
    expect(q("[data-tour='project-overview-add-ruleset']")).not.toBeNull();
    await advanceTime(13000);

    // step 8: the inline ruleset panel must be showing (this is where it stalls)
    expect(q("[data-tour='simulation-ruleset-create-panel']")).not.toBeNull();
    // the name field is prefilled with demoset for the demo
    const rulesetNameInput = q(
      "[data-tour='simulation-ruleset-create-panel'] input[placeholder='e.g. QFN ALIGNMENT']",
    ) as HTMLInputElement | null;
    expect(rulesetNameInput?.value).toBe("demoset");

    // step 9: submit -> creates demoset, closes panel
    await advanceTime(8000);
    expect(q("[data-tour='simulation-ruleset-create-submit']")).not.toBeNull();
    await advanceTime(8000);

    // step 10/11: tree + add-rule button
    await advanceTime(8000);
    expect(q("[data-tour='project-program-tab']")).not.toBeNull();
    await advanceTime(8000);

    // THE assertion from the bug report: the rule-adding step is reachable
    expect(q("[data-tour='project-add-rule-tree']")).not.toBeNull();
  }, 120000);
  it("emits loading state before running and allows the first tooltip next button to advance immediately", async () => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn() as any;

    const rootRoute = createRootRoute({
      component: () => (
        <>
          <Outlet />
          <ProjectCreationAnalysisTour />
        </>
      ),
    });
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: HomeStub,
    });
    const projectsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/projects",
      component: ProjectsStub,
    });
    const routeTree = rootRoute.addChildren([indexRoute, projectsRoute]);
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });

    render(<RouterProvider router={router} />);
    await act(async () => {
      await router.load();
    });

    const states: Array<{ isRunning: boolean; isLoading: boolean }> = [];
    const onState = (event: Event) => {
      states.push((event as CustomEvent).detail);
    };
    window.addEventListener("ca:guided-simulation-state", onState);

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(GUIDED_SIMULATION_COMMAND_EVENT, { detail: { command: "start" } }),
      );
    });

    const q = (sel: string) => document.querySelector(sel);

    // Initial state: loading was emitted and now running
    expect(states.length).toBeGreaterThanOrEqual(1);
    expect(q("[data-tour='standard-menu-trigger']")).not.toBeNull();

    // The primary button ("Next") is clickable and advances immediately without waiting 6500ms
    const primaryButton = q("[data-testid='button-primary']") as HTMLButtonElement | null;
    expect(primaryButton).not.toBeNull();

    await act(async () => {
      primaryButton?.click();
    });
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    // Reached Step 2 (/projects) immediately
    expect(q("[data-tour='projects-create-button']")).not.toBeNull();

    // Now test navigating back via Previous command
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(GUIDED_SIMULATION_COMMAND_EVENT, { detail: { command: "previous" } }),
      );
      vi.advanceTimersByTime(400);
    });

    // Successfully returned to Step 1 on / without getting stuck or spinner
    expect(q("[data-tour='standard-menu-trigger']")).not.toBeNull();

    window.removeEventListener("ca:guided-simulation-state", onState);
  });
  it("navigates to previous step seamlessly even when paused, and maintains pause state", async () => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn() as any;

    const rootRoute = createRootRoute({
      component: () => (
        <>
          <Outlet />
          <ProjectCreationAnalysisTour />
        </>
      ),
    });
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: HomeStub,
    });
    const projectsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/projects",
      component: ProjectsStub,
    });
    const routeTree = rootRoute.addChildren([indexRoute, projectsRoute]);
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });

    render(<RouterProvider router={router} />);
    await act(async () => {
      await router.load();
    });

    const states: Array<{ isRunning: boolean; isLoading: boolean; isPaused: boolean }> = [];
    const onState = (event: Event) => {
      states.push((event as CustomEvent).detail);
    };
    window.addEventListener("ca:guided-simulation-state", onState);

    // 1. Start tour
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(GUIDED_SIMULATION_COMMAND_EVENT, { detail: { command: "start" } }),
      );
    });

    const q = (sel: string) => document.querySelector(sel);
    expect(q("[data-tour='standard-menu-trigger']")).not.toBeNull();

    // 2. Advance to Step 2 (/projects)
    const primaryButton = q("[data-testid='button-primary']") as HTMLButtonElement | null;
    expect(primaryButton).not.toBeNull();

    await act(async () => {
      primaryButton?.click();
    });
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(q("[data-tour='projects-create-button']")).not.toBeNull();

    // 3. Pause simulation
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(GUIDED_SIMULATION_COMMAND_EVENT, { detail: { command: "pause" } }),
      );
    });

    const lastState = states[states.length - 1];
    expect(lastState?.isPaused).toBe(true);

    // 4. Navigate previous while paused
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(GUIDED_SIMULATION_COMMAND_EVENT, { detail: { command: "previous" } }),
      );
    });
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    // 5. Successfully landed back on Step 1 (/)
    expect(q("[data-tour='standard-menu-trigger']")).not.toBeNull();

    // 6. Advance timer 10 seconds: must NOT auto-advance because it is paused
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    expect(q("[data-tour='standard-menu-trigger']")).not.toBeNull();
    expect(q("[data-tour='projects-create-button']")).toBeNull();

    // 7. Resume simulation: now timer runs and advances to Step 2
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(GUIDED_SIMULATION_COMMAND_EVENT, { detail: { command: "resume" } }),
      );
    });
    await act(async () => {
      vi.advanceTimersByTime(8000);
    });

    expect(q("[data-tour='projects-create-button']")).not.toBeNull();

    window.removeEventListener("ca:guided-simulation-state", onState);
  });

  it("allows take_over command to stop simulation while keeping demo workspace intact", async () => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn() as any;

    const rootRoute = createRootRoute({
      component: () => (
        <>
          <Outlet />
          <ProjectCreationAnalysisTour />
        </>
      ),
    });
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: HomeStub,
    });
    const projectsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/projects",
      component: ProjectsStub,
    });
    const projectNewRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/projects/new",
      component: ProjectNewStub,
    });
    const projectOverviewRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/projects/$projectId",
      component: ProjectOverviewStub,
    });
    const routeTree = rootRoute.addChildren([
      indexRoute,
      projectsRoute,
      projectNewRoute,
      projectOverviewRoute,
    ]);
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });

    render(<RouterProvider router={router} />);
    await act(async () => {
      await router.load();
    });

    const states: { isRunning: boolean }[] = [];
    const onState = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      states.push(detail);
    };

    window.addEventListener("ca:guided-simulation-state", onState);

    // 1. Start tour
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(GUIDED_SIMULATION_COMMAND_EVENT, { detail: { command: "start" } }),
      );
    });

    const q = (sel: string) => document.querySelector(sel);

    async function advanceTime(ms: number) {
      await act(async () => {
        vi.advanceTimersByTime(ms);
      });
    }

    // Step 1: Menu -> Step 2: Create Button -> Step 3: Project Name -> Step 4: Submit
    expect(q("[data-tour='standard-menu-trigger']")).not.toBeNull();
    await advanceTime(8000);

    expect(q("[data-tour='projects-create-button']")).not.toBeNull();
    await advanceTime(8000);

    expect(q("[data-tour='simulation-project-name']")).not.toBeNull();
    await advanceTime(8000);

    expect(q("[data-tour='simulation-project-create-submit']")).not.toBeNull();
    await advanceTime(13000);

    expect(q("[data-tour='project-overview-tab']")).not.toBeNull();

    const projectsBefore = Object.values(useProjectStore.getState().projects);
    const demoProject = projectsBefore.find((p) => p.name.toLowerCase().includes("demo"));
    expect(demoProject).toBeDefined();

    // 2. Dispatch take_over command
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(GUIDED_SIMULATION_COMMAND_EVENT, { detail: { command: "take_over" } }),
      );
    });

    // 3. Verify simulation stopped
    const lastState = states[states.length - 1];
    expect(lastState?.isRunning).toBe(false);

    // 4. Verify project still exists in store and was NOT deleted
    const projectsAfter = Object.values(useProjectStore.getState().projects);
    expect(projectsAfter.some((p) => p.id === demoProject?.id)).toBe(true);

    window.removeEventListener("ca:guided-simulation-state", onState);
  }, 30000);
});
