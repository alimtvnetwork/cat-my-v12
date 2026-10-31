// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { useProjectStore } from "@/lib/projects/store";

afterEach(() => {
  cleanup();
});

if (typeof global.ResizeObserver === "undefined") {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
}

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: any) => opts,
  Link: ({ to, children, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ invalidate: () => {} }),
  useNavigate: () => () => {},
  notFound: () => new Error("Not Found"),
}));

vi.mock("@tanstack/react-start", () => ({
  useServerFn: () => async () => ({ ok: true }),
}));

vi.mock("@/lib/run-project.functions", () => ({
  runProject: vi.fn(),
}));

vi.mock("@/hooks/useRunning", () => ({
  useRunning: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    isRunning: false,
  }),
}));

vi.mock("@/hooks/useAutoEvaluate", () => ({
  evaluateCurrentVision: vi.fn(),
  useAutoEvaluate: vi.fn(),
}));

describe("ProjectOverview route smoke test", () => {
  beforeEach(() => {
    // Seed project store
    useProjectStore.setState({
      projects: {
        "proj-1": {
          id: "proj-1",
          name: "Test Inspection Project",
          createdAt: Date.now(),
          rulesetIds: ["rs-1"],
          deviceId: "dev-test-1",
        },
      },
      rulesets: {
        "rs-1": {
          id: "rs-1",
          projectId: "proj-1",
          name: "Test Ruleset",
          imageRef: "/sample.png",
          rules: [
            {
              id: "rule-1",
              name: "Greyscale Pattern Match",
              kind: "R" as any,
              x: 100,
              y: 100,
              width: 200,
              height: 200,
              isHidden: false,
              isLocked: false,
              params: {
                toolCode: "T102",
              },
            },
          ],
        },
      },
    });
  });

  it("renders ProjectOverview without infinite re-render loop", async () => {
    const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const mod = await import("@/routes/projects/$projectId/index");
    const RouteComponent = (mod.Route as any).component;

    // Mock Route.useParams
    (mod.Route as any).useParams = () => ({ projectId: "proj-1" });
    (mod.Route as any).useSearch = () => ({});

    render(
      <QueryClientProvider client={queryClient}>
        <RouteComponent />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Test Inspection Project")).toBeTruthy();
  });

  it("allows switching to image source tab without error", async () => {
    const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const mod = await import("@/routes/projects/$projectId/index");
    const RouteComponent = (mod.Route as any).component;

    (mod.Route as any).useParams = () => ({ projectId: "proj-1" });
    (mod.Route as any).useSearch = () => ({});

    render(
      <QueryClientProvider client={queryClient}>
        <RouteComponent />
      </QueryClientProvider>,
    );

    // The sidebar tab was renamed from "Image & Source" to "Source"
    // (55c8ffbf, 2026-10-31); the tab identity is unchanged
    // (data-automation-id btn-sidebar-tab-source, panel heading
    // "Image & Camera Source" below).
    const sourceTabButton = screen.getByRole("button", { name: "Source" });
    expect(sourceTabButton).toBeTruthy();
    fireEvent.click(sourceTabButton);

    expect(screen.getByText(/Image & Camera Source/i)).toBeTruthy();
  });
});
