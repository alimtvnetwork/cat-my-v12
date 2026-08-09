// @vitest-environment jsdom
/**
 * Plan 58 slice-2 gap #1: assert AgentLogo carries the class token that
 * lets `styles.css` hide it when the app-shell Titlebar is mounted, so
 * the "cat-my-ui" wordmark stops overlapping the Titlebar's own brand
 * ("Control Automation"). See `.lovable/memory/v2/plan35/40-slice-2.md`.
 *
 * Test is intentionally scoped to the class contract, not to a full DOM
 * gate (`body:has(...)` needs the real Titlebar mounted, which belongs
 * in the Playwright pass under `/tmp/browser/plan58/`). Vitest here
 * locks the CSS-hook contract so the runtime rule can't silently drift.
 */
import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import {
  RouterProvider,
  createRouter,
  createRootRoute,
  createMemoryHistory,
} from "@tanstack/react-router";
import { AgentLogo } from "../AgentLogo";

function renderInRouter() {
  const rootRoute = createRootRoute({ component: () => <AgentLogo /> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  return render(<RouterProvider router={router} />);
}

describe("AgentLogo", () => {
  it("exposes the .agent-logo-fixed hook so the titlebar can hide it via CSS", async () => {
    const { container } = renderInRouter();
    await waitFor(() => {
      expect(container.querySelector(".agent-logo-fixed")).not.toBeNull();
    });
  });

  it("keeps the cat-my-ui wordmark visible in the DOM (CSS controls display, not JSX)", async () => {
    const { findByTestId } = renderInRouter();
    const link = await findByTestId("agent-logo");
    expect(link.textContent).toContain("cat-my-ui");
  });
});
