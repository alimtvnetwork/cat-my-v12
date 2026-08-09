// @vitest-environment jsdom
// Regression tests for AddressBar query-param sanitation (v3.858.0).
//
// Locks two invariants for the titlebar chip:
//   1. Every `__lovable_*` (and the `e2e`) param is stripped from the
//      visible URL, even when several coexist and even when the router
//      hands us a `searchStr` with a leading `?`.
//   2. The rendered value never contains `??` — the raw `?` prefix on
//      `searchStr` must not survive alongside the reconstructed
//      `?<params>` suffix.
//
// We stub the router hooks and the project store so the component runs
// headless and we can assert against the input `value` directly.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

let mockPathname = "/setup/roi";
let mockSearchStr = "";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
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
  useProjectStore: (
    selector: (s: {
      projects: Record<string, unknown>;
      rulesets: Record<string, unknown>;
    }) => unknown,
  ) => selector({ projects: {}, rulesets: {} }),
}));

import { AddressBar } from "../AddressBar";

function getValue(container: HTMLElement): string {
  const input = container.querySelector<HTMLInputElement>(
    "input[aria-label='Current route address']",
  );

  if (!input) throw new Error("address bar input not found");

  return input.value;
}

describe("AddressBar query-param sanitation", () => {
  beforeEach(() => {
    cleanup();
    mockPathname = "/setup/roi";
    mockSearchStr = "";
  });

  it("strips a single __lovable_* param and leaves no query suffix", () => {
    mockSearchStr = "?__lovable_sha=abc123";
    const { container } = render(<AddressBar />);
    const value = getValue(container);
    expect(value).toBe("/setup/roi");
    expect(value).not.toContain("__lovable");
    expect(value).not.toContain("??");
  });

  it("strips every __lovable_* and e2e param while preserving real ones", () => {
    mockSearchStr = "?project=alpha&__lovable_sha=abc&__lovable_token=xyz&e2e=1&ruleset=beta";
    const { container } = render(<AddressBar />);
    const value = getValue(container);
    expect(value).not.toMatch(/__lovable/);
    expect(value).not.toMatch(/(^|[?&])e2e=/);
    expect(value).toContain("project=alpha");
    expect(value).toContain("ruleset=beta");
    expect(value).not.toContain("??");
    expect((value.match(/\?/g) ?? []).length).toBe(1);
  });

  it("collapses a doubled `?` prefix on searchStr (no `??` ever renders)", () => {
    mockSearchStr = "??project=alpha";
    const { container } = render(<AddressBar />);
    const value = getValue(container);
    expect(value).toBe("/setup/roi?project=alpha");
    expect(value).not.toContain("??");
  });

  it("renders bare pathname when only __lovable_* params are present", () => {
    mockSearchStr = "?__lovable_sha=abc&__lovable_token=xyz";
    const { container } = render(<AddressBar />);
    const value = getValue(container);
    expect(value).toBe("/setup/roi");
    expect(value).not.toContain("?");
  });

  it("handles searchStr without a leading `?`", () => {
    mockSearchStr = "project=alpha&__lovable_sha=abc";
    const { container } = render(<AddressBar />);
    const value = getValue(container);
    expect(value).toBe("/setup/roi?project=alpha");
    expect(value).not.toContain("__lovable");
    expect(value).not.toContain("??");
  });
});
