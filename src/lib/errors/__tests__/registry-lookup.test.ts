// Plan 71 Step 11: registry lookup coverage.
import { describe, it, expect, vi } from "vitest";
import { lookupErrorCode, listRegisteredErrorCodes } from "../registry";

describe("lookupErrorCode", () => {
  it("returns typed meta for registered E9003", () => {
    const meta = lookupErrorCode("E9003");
    expect(meta.code).toBe("E9003");
    expect(meta.label).toMatch(/API/i);
    expect(meta.category).toBe("worker");
    expect(meta.retryable).toBe(true);
  });

  it("falls back to E_UNKNOWN when code is empty", () => {
    const meta = lookupErrorCode(undefined);
    expect(meta.code).toBe("E_UNKNOWN");
  });

  it("synthesizes a stub and logs a miss for unregistered codes", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const meta = lookupErrorCode("E9999");
    expect(meta.code).toBe("E9999");
    expect(meta.label).toBe("E9999");
    expect(meta.category).toBe("unknown");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[errorRegistry] miss code=E9999"));
    spy.mockRestore();
  });

  it("lists all registered entries", () => {
    const all = listRegisteredErrorCodes();
    expect(all.length).toBeGreaterThanOrEqual(6);
    expect(all.find((m) => m.code === "E9003")).toBeDefined();
  });
});
