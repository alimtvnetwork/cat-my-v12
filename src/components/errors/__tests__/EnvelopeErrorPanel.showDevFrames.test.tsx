// @vitest-environment jsdom
/**
 * Plan 90 Step 146: user toggle for developer stack frames.
 *
 * Root cause guarded (one sentence): without a test, a future refactor
 * of `EnvelopeErrorPanel`'s gating precedence could silently reintroduce
 * frame leaks when the operator has explicitly opted out.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

afterEach(() => {
  cleanup();
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
});

// Force `useHydrated` to return true synchronously so useEffect reconcile
// runs on first tick under jsdom (matches the client-only render path used
// by `beFetch` -> `EnvelopeErrorBoundary`).
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@tanstack/react-router");

  return { ...actual, useHydrated: () => true };
});

vi.mock("@/lib/stores/errorStore", () => ({ useErrorStore: () => undefined }));

import { EnvelopeErrorPanel } from "../EnvelopeErrorPanel";
import { SHOW_DEV_FRAMES_KEY } from "@/hooks/use-show-dev-frames";
import { buildCapturedError, type CapturedError, type EnvelopeErrors } from "@/types/errors";

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

describe("EnvelopeErrorPanel + useShowDevFrames (Step 146)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("hides dev frames even on 5xx when the toggle is off", async () => {
    window.localStorage.setItem(SHOW_DEV_FRAMES_KEY, "false");
    render(<EnvelopeErrorPanel err={make({}, 500)} />);
    // useEffect reconciles from storage on mount; flush it.
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByTestId("envelope-dev-frames")).toBeNull();
    const hint = screen.getByTestId("envelope-frames-hidden-hint");
    expect(hint.textContent ?? "").toMatch(/Show developer stack frames/);
    // Backend message still visible - operator can triage.
    expect(screen.getByTestId("envelope-backend-message").textContent).toContain("server exploded");
  });

  it("shows dev frames on 5xx when the toggle is on (default)", async () => {
    // No localStorage write - default is `true`.
    render(<EnvelopeErrorPanel err={make({}, 500)} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByTestId("envelope-dev-frames")).not.toBeNull();
    expect(screen.getByText(/do_thing/)).toBeTruthy();
  });

  it("forceShowFrames overrides the toggle (test escape hatch)", async () => {
    window.localStorage.setItem(SHOW_DEV_FRAMES_KEY, "false");
    render(<EnvelopeErrorPanel err={make({}, 500)} forceShowFrames />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByTestId("envelope-dev-frames")).not.toBeNull();
  });
});
