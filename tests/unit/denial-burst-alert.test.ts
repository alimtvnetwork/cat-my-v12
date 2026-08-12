import { execSync } from "child_process";
import { describe, it, expect } from "vitest";

describe("Denial burst alert", () => {
  it("fires on first crossing, no re-fire while above in same window, re-fires after window reset, never below threshold", () => {
    // We defer the real execution to the python test since the emit site is in Python.
    const out = execSync("python -m pytest tests/unit/test_denial_burst_alert.py").toString();
    expect(out).toContain("passed");
  });
});
