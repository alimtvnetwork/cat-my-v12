import { describe, it, expect, vi, beforeEach } from "vitest";
import { useBackendMode } from "../mode";
import { BackendModeType } from "../BackendModeType";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("useBackendMode", () => {
  beforeEach(() => {
    useBackendMode.setState({ mode: BackendModeType.Seed, baseUrl: "http://localhost:8000" });
  });

  it("defaults to seed and localhost:8000", () => {
    const state = useBackendMode.getState();
    expect(state.mode).toBe(BackendModeType.Seed);
    expect(state.baseUrl).toBe("http://localhost:8000");
  });

  it("updates mode", () => {
    useBackendMode.getState().setMode(BackendModeType.Backend);
    expect(useBackendMode.getState().mode).toBe(BackendModeType.Backend);
  });

  it("updates baseUrl if valid", () => {
    useBackendMode.getState().setBaseUrl("http://localhost:9000");
    expect(useBackendMode.getState().baseUrl).toBe("http://localhost:9000");
  });

  it("falls back to seed mode if baseUrl is invalid", () => {
    useBackendMode.getState().setMode(BackendModeType.Backend);
    useBackendMode.getState().setBaseUrl("not-a-url");
    expect(useBackendMode.getState().mode).toBe(BackendModeType.Seed);
    expect(useBackendMode.getState().baseUrl).toBe("not-a-url");
  });
});
