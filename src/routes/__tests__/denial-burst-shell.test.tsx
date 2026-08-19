// Plan 61 (Plan 36 slice-1): guards that
// `src/routes/admin.security.denial-burst.tsx` mounts inside `HmiShell`.
//
// The prior version of the route rendered bare `<div className="p-6">`
// containers, bypassing the app shell entirely. This test asserts every
// query-state branch (success, pending, error) wraps in `HmiShell` with the
// title "Denial-burst dashboard".
import { describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: unknown) => opts,
  useNavigate: () => () => {},
}));

vi.mock("@/components/hmi", () => ({
  HmiShell: ({ title, children }: { title: string; children: ReactNode }) => (
    <div data-testid="hmi-shell" data-title={title}>
      {children}
    </div>
  ),
}));

let mockQueryState: "pending" | "error" | "success" = "success";
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => {
    if (mockQueryState === "pending") {
      return { isPending: true, isError: false, data: undefined, error: null };
    }

    if (mockQueryState === "error") {
      return {
        isPending: false,
        isError: true,
        data: undefined,
        error: new Error("boom"),
      };
    }

    return {
      isPending: false,
      isError: false,
      data: { rows: [], hours: 24, cutoffIso: "2026-07-23T00:00:00Z", tuningVersion: "t1" },
      error: null,
    };
  },
}));

vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
}));

vi.mock("@/lib/security-telemetry.functions", () => ({
  getDenialBurstWindow: () => Promise.resolve({ rows: [] }),
}));

vi.mock("@/lib/denial-burst-query", () => ({
  computeBurstPercentiles: () => [],
}));

async function renderRoute(): Promise<string> {
  const mod = await import("../admin/security/denial-burst");
  const route = mod.Route as unknown as { component: () => ReactElement };

  return renderToStaticMarkup(<route.component />);
}

describe("denial-burst route shell contract", () => {
  it("wraps the success branch in HmiShell with the expected title", async () => {
    mockQueryState = "success";
    const html = await renderRoute();
    expect(html).toContain('data-testid="hmi-shell"');
    expect(html).toContain('data-title="Denial-burst dashboard"');
  });

  it("wraps the pending branch in HmiShell", async () => {
    mockQueryState = "pending";
    const html = await renderRoute();
    expect(html).toContain('data-testid="hmi-shell"');
    expect(html).toContain('data-testid="denial-burst-loading"');
  });

  it("wraps the error branch in HmiShell", async () => {
    mockQueryState = "error";
    const html = await renderRoute();
    expect(html).toContain('data-testid="hmi-shell"');
    expect(html).toContain('data-testid="denial-burst-error"');
  });
});
