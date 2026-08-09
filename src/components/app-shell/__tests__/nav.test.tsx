// @vitest-environment jsdom
import type { ReactNode } from "react";
import { RunStatusType } from "@/types/run/RunStatus";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a data-testid="tanstack-link" data-to={to} className={className}>
      {children}
    </a>
  ),
  useRouterState: () => "/",
}));

vi.mock("@/lib/run-store", () => ({
  useRunStore: (sel: (s: { status: string }) => unknown) => sel({ status: RunStatusType.Idle }),
}));

import { AppShellNav } from "../nav";

describe("AppShellNav (Plan 63)", () => {
  afterEach(() => cleanup());

  it("mounts under app-shell testid with a global-nav wrapper class", () => {
    render(<AppShellNav />);
    const el = screen.getByTestId("app-shell-nav");
    expect(el.className).toContain("app-shell-nav-global");
    expect(el.getAttribute("aria-label")).toBe("Global navigation");
  });

  it("renders every internal link via TanStack Link (zero raw <a href>)", () => {
    render(<AppShellNav />);
    const links = screen.getAllByTestId("tanstack-link");
    expect(links.length).toBeGreaterThanOrEqual(9);
    for (const l of links) {
      expect(l.getAttribute("data-to")).toMatch(/^\//);
    }
  });
});
