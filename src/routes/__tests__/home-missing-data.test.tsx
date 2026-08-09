// Simulates missing / failing home data and asserts every fallback renders
// without throwing: route pendingComponent, errorComponent, notFoundComponent,
// and the client HomeErrorBoundary catching a child render error.
import { describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: unknown) => opts,
  Link: ({ to, children }: { to: string; children: ReactNode }) => (
    <a href={to} data-link-to={to}>
      {children}
    </a>
  ),
  useRouter: () => ({ invalidate: () => {} }),
}));

vi.mock("@/components/hmi", () => ({
  HmiShell: ({ title, children }: { title: string; children: ReactNode }) => (
    <div data-testid="hmi-shell" data-title={title}>
      {children}
    </div>
  ),
}));

// Avoid touching real localStorage during the diagnostics record write.
vi.mock("@/lib/diagnostics/home-error-log", () => ({
  recordHomeError: vi.fn(() => ({ at: "", message: "", stack: null, failedPlanIds: [] })),
}));

import { HomeErrorBoundary } from "@/components/home/HomeBoundaries";

type RouteOpts = {
  pendingComponent: () => ReactElement;
  errorComponent: (p: { error: Error; reset: () => void }) => ReactElement;
  notFoundComponent: () => ReactElement;
};

async function loadRoute(): Promise<RouteOpts> {
  const mod = await import("../index");

  return mod.Route as unknown as RouteOpts;
}

describe("home route: missing data fallbacks", () => {
  it("pendingComponent renders loading UI without throwing", async () => {
    const { pendingComponent: Pending } = await loadRoute();
    const html = renderToStaticMarkup(<Pending />);
    expect(html).toContain('data-testid="hmi-shell"');
    expect(html.toLowerCase()).toContain("loading");
  });

  it("errorComponent renders fallback for a thrown loader error", async () => {
    const { errorComponent: ErrorC } = await loadRoute();
    const html = renderToStaticMarkup(
      <ErrorC error={new Error("loader-missing")} reset={() => {}} />,
    );
    expect(html).toContain("loader-missing");
    expect(html).toContain('role="alert"');
    expect(html.toLowerCase()).toContain("try again");
  });

  it("notFoundComponent renders without throwing", async () => {
    const { notFoundComponent: NotFound } = await loadRoute();
    const html = renderToStaticMarkup(<NotFound />);
    expect(html).toContain('role="alert"');
    expect(html.toLowerCase()).toContain("not found");
  });

  it("HomeErrorBoundary derives error state and renders the fallback UI", () => {
    const Boundary = HomeErrorBoundary as unknown as {
      getDerivedStateFromError: (e: Error) => { error: Error };
      prototype: { render: () => ReactElement };
    };
    const next = Boundary.getDerivedStateFromError(new Error("child-crash"));
    expect(next.error.message).toBe("child-crash");

    // Render the boundary with pre-seeded error state to confirm the fallback
    // path produces the alert UI without crashing.
    const instance = { state: next, props: { children: null }, setState: () => {} };
    const html = renderToStaticMarkup(Boundary.prototype.render.call(instance));
    expect(html).toContain("child-crash");
    expect(html).toContain('role="alert"');
  });
});
