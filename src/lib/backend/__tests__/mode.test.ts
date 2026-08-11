import { describe, it, expect, vi, beforeEach } from "vitest";
import { useBackendMode } from "../mode";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("useBackendMode", () => {
  beforeEach(() => {
    useBackendMode.setState({ mode: "seed", baseUrl: "http://localhost:8000" });
  });

  it("defaults to seed and localhost:8000", () => {
    const state = useBackendMode.getState();
    expect(state.mode).toBe("seed");
    expect(state.baseUrl).toBe("http://localhost:8000");
  });

  it("updates mode", () => {
    useBackendMode.getState().setMode("backend");
    expect(useBackendMode.getState().mode).toBe("backend");
  });

  it("updates baseUrl if valid", () => {
    useBackendMode.getState().setBaseUrl("http://localhost:9000");
    expect(useBackendMode.getState().baseUrl).toBe("http://localhost:9000");
  });

  it("falls back to seed mode if baseUrl is invalid", () => {
    useBackendMode.getState().setMode("backend");
    useBackendMode.getState().setBaseUrl("not-a-url");
    expect(useBackendMode.getState().mode).toBe("seed");
    expect(useBackendMode.getState().baseUrl).toBe("not-a-url");
  });
});
