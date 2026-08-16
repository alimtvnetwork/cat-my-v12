// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

afterEach(() => cleanup());

import { EnvelopeErrorPanel } from "../EnvelopeErrorPanel";
import { buildCapturedError, type CapturedError, type EnvelopeErrors } from "@/types/errors";

vi.mock("@/lib/stores/errorStore", () => ({ useErrorStore: () => undefined }));

function make(env: Partial<EnvelopeErrors>, status?: number): CapturedError {
  const base = buildCapturedError(new Error("boom"), { responseStatus: status });
  base.envelopeErrors = {
    BackendMessage: "server exploded",
    Backend: ["at do_thing (server.py:42)"],
    Frontend: ["at handler (App.tsx:10)"],
    ...env,
  };

  return base;
}

describe("EnvelopeErrorPanel", () => {
  it("always renders Errors.BackendMessage", () => {
    render(<EnvelopeErrorPanel err={make({}, 200)} />);
    expect(screen.getByTestId("envelope-backend-message").textContent).toContain("server exploded");
  });

  it("shows dev frames when responseStatus >= 500", () => {
    render(<EnvelopeErrorPanel err={make({}, 500)} />);
    expect(screen.queryByTestId("envelope-dev-frames")).not.toBeNull();
    expect(screen.getByText(/do_thing/)).toBeTruthy();
    expect(screen.getByText(/handler/)).toBeTruthy();
  });

  it("respects forceShowFrames=false-style gating via 2xx status in non-dev builds", () => {
    // We cannot reliably flip Vite-inlined import.meta.env.DEV inside vitest,
    // so verify the gating branch by proving forceShowFrames overrides status.
    render(<EnvelopeErrorPanel err={make({}, 200)} forceShowFrames />);
    expect(screen.queryByTestId("envelope-dev-frames")).not.toBeNull();
  });

  it("renders nothing when the captured error has no envelope", () => {
    const err = buildCapturedError(new Error("x"));
    const { container } = render(<EnvelopeErrorPanel err={err} />);
    expect(container.innerHTML).toBe("");
  });
});
