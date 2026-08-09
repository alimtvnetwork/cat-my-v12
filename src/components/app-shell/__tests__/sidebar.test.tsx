// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, onClick }: { to: string; children: ReactNode; onClick?: () => void }) => (
    <a data-testid="tanstack-link" data-to={to} onClick={onClick}>
      {children}
    </a>
  ),
}));

import { AppShellSidebar } from "../sidebar";

describe("AppShellSidebar (Plan 63)", () => {
  afterEach(() => cleanup());

  it("mounts trigger with aria-expanded=false and gate class", () => {
    render(<AppShellSidebar />);
    const wrap = screen.getByTestId("app-shell-sidebar");
    expect(wrap.className).toContain("app-shell-sidebar-fab");
    const trigger = screen.getByTestId("app-shell-sidebar-trigger");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("flips aria-expanded to true when trigger clicked", () => {
    render(<AppShellSidebar />);
    const trigger = screen.getByTestId("app-shell-sidebar-trigger");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });
});
