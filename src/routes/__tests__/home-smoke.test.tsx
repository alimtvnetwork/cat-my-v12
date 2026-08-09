// Smoke tests for the home route. Verifies the layout scaffolding
// (top-nav shell + workflow tiles) survives rebuilds, and that the
// pending / error fallbacks stay predictable.
import { describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: unknown) => opts,
  Link: ({
    to,
    children,
    ...rest
  }: { to: string; children: ReactNode } & Record<string, unknown>) => (
    <a href={to} data-link-to={to} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ invalidate: () => {} }),
  useNavigate: () => () => {},
}));

vi.mock("@/components/hmi", () => ({
  HmiShell: ({ title, children }: { title: string; children: ReactNode }) => (
    <div data-testid="hmi-shell" data-title={title}>
      <nav data-testid="top-nav" aria-label="Primary">
        <a href="/setup">Setup</a>
        <a href="/projects">Projects</a>
        <a href="/run">Run</a>
        <a href="/ai-testing">AI testing</a>
      </nav>
      <main>{children}</main>
    </div>
  ),
}));

import { HomePending, HomeError, HomeErrorBoundary } from "@/components/home/HomeBoundaries";

async function renderIndex(): Promise<string> {
  const mod = await import("../index");
  const route = mod.Route as unknown as { component: () => ReactElement };

  return renderToStaticMarkup(<route.component />);
}

describe("home route smoke", () => {
  it("renders the shell with a Home title and the top navigation", async () => {
    const html = await renderIndex();
    expect(html).toContain('data-testid="hmi-shell"');
    expect(html).toContain('data-title="Home"');
    expect(html).toContain('data-testid="top-nav"');
  });

  it("renders one card per workflow with its label and heading", async () => {
    // Cards moved from `<Link>` wrappers to `role="group"` groups whose
    // QuickAction buttons navigate imperatively. The stable contract is now
    // aria-label on the group plus the visible <h2> label.
    const html = await renderIndex();
    for (const label of ["Setup", "Projects", "Trial run", "AI testing"]) {
      expect(html).toContain(`aria-label="${label}"`);
      expect(html.toLowerCase()).toContain(label.toLowerCase());
    }
  });

  it("exposes route boundary handlers", async () => {
    const mod = await import("../index");
    const route = mod.Route as unknown as Record<string, unknown>;
    expect(typeof route.pendingComponent).toBe("function");
    expect(typeof route.errorComponent).toBe("function");
    expect(typeof route.notFoundComponent).toBe("function");
  });

  it("pending fallback keeps the shell mounted", () => {
    const html = renderToStaticMarkup(<HomePending />);
    expect(html).toContain('data-testid="hmi-shell"');
    expect(html.toLowerCase()).toContain("loading");
  });

  it("error fallback surfaces the message and retry action", () => {
    const html = renderToStaticMarkup(<HomeError error={new Error("boom-42")} reset={() => {}} />);
    expect(html).toContain("boom-42");
    expect(html.toLowerCase()).toContain("try again");
    expect(html).toContain('role="alert"');
  });

  it("client error boundary derives fallback state from a thrown error", () => {
    const next = (
      HomeErrorBoundary as unknown as {
        getDerivedStateFromError: (e: Error) => { error: Error };
      }
    ).getDerivedStateFromError(new Error("child-boom"));
    expect(next.error).toBeInstanceOf(Error);
    expect(next.error.message).toBe("child-boom");
  });
});
