import { IntAliasNamespaceType } from "@/lib/ids/int-alias";
// @vitest-environment jsdom
// Regression test for AddressBar integer-alias round-trip.
//
// Locks: opaque real ids in the pathname are rendered to the user as
// small positive integers (e.g. `/projects/1/rulesets/1`), and when the
// operator commits an alias-form path the router receives the resolved
// real-id path (`/projects/proj-1/rulesets/rs-1`).

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { __resetIntAliasForTests, seedIntParams } from "@/lib/ids/int-alias";

let mockPathname = "/projects/proj-1/rulesets/rs-1";
let mockSearchStr = "";
const navigateMock = vi.fn(() => Promise.resolve());

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
  useRouterState: ({
    select,
  }: {
    select: (s: { location: { pathname: string; searchStr: string } }) => unknown;
  }) => select({ location: { pathname: mockPathname, searchStr: mockSearchStr } }),
}));

vi.mock("@/lib/editor/errors", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/projects/store", () => ({
  useProjectStore: (_selector: unknown) => ({}),
}));

import { AddressBar } from "../AddressBar";

function getInput(container: HTMLElement): HTMLInputElement {
  const el = container.querySelector<HTMLInputElement>("input[aria-label='Current route address']");

  if (!el) throw new Error("address bar input not found");

  return el;
}

describe("AddressBar integer-alias round-trip", () => {
  beforeEach(() => {
    cleanup();
    navigateMock.mockClear();
    __resetIntAliasForTests();
    // Deterministic seed so proj-1 -> 1, rs-1 -> 1.
    seedIntParams(IntAliasNamespaceType.Project, ["proj-1", "proj-2"]);
    seedIntParams(IntAliasNamespaceType.Ruleset, ["rs-1", "rs-2"]);
    mockPathname = "/projects/proj-1/rulesets/rs-1";
    mockSearchStr = "";
  });

  it("displays integer aliases when idle", () => {
    const { container } = render(<AddressBar />);
    const input = getInput(container);
    expect(input.value).toBe("/projects/1/rulesets/1");
  });

  it("resolves integer aliases back to real ids on Enter", () => {
    const { container } = render(<AddressBar />);
    const input = getInput(container);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "/projects/2/rulesets/2" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(navigateMock).toHaveBeenCalledWith({ to: "/projects/proj-2/rulesets/rs-2" });
  });

  it("passes legacy real-id paths through unchanged", () => {
    const { container } = render(<AddressBar />);
    const input = getInput(container);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "/projects/proj-2/rulesets/rs-2" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(navigateMock).toHaveBeenCalledWith({ to: "/projects/proj-2/rulesets/rs-2" });
  });

  it("no-ops when the committed value equals the displayed alias path", () => {
    const { container } = render(<AddressBar />);
    const input = getInput(container);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "/projects/1/rulesets/1" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
