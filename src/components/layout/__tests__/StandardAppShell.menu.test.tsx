// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";
import { createMemoryHistory } from "@tanstack/history";

vi.mock("@/lib/observability/client-logger", () => ({
  ClientLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { StandardAppShell } from "../StandardAppShell";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function renderShell() {
  const rootRoute = createRootRoute({
    component: () => (
      <StandardAppShell title="Test">
        <Outlet />
      </StandardAppShell>
    ),
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <div>Home content</div>,
  });
  const projectsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/projects",
    component: () => <div>Projects content</div>,
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

  return router;
}

describe("StandardAppShell menu", () => {
  it("opens, shows a close button, and closes when the close button is clicked", async () => {
    const user = userEvent.setup();
    await renderShell();

    await user.click(screen.getByText("Menu"));

    expect(screen.getByLabelText("Close menu")).toBeTruthy();
    expect(screen.getByText("Projects")).toBeTruthy();

    await user.click(screen.getByLabelText("Close menu"));

    // Radix content is removed from the DOM when the controlled menu closes.
    expect(screen.queryByLabelText("Close menu")).toBeNull();
  });

  it("closes when clicking outside the menu", async () => {
    const user = userEvent.setup();
    await renderShell();

    await user.click(screen.getByText("Menu"));
    expect(screen.getByLabelText("Close menu")).toBeTruthy();

    await user.click(screen.getByText("Home content"));

    expect(screen.queryByLabelText("Close menu")).toBeNull();
  });

  it("closes when Escape is pressed while open", async () => {
    const user = userEvent.setup();
    await renderShell();

    await user.click(screen.getByText("Menu"));
    expect(screen.getByLabelText("Close menu")).toBeTruthy();

    await user.keyboard("{Escape}");

    expect(screen.queryByLabelText("Close menu")).toBeNull();
  });
});
