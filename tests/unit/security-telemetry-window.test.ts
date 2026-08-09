// Plan 33 slice 2 (Plan 48 step 2): unit coverage for the pure helpers used
// by `getDenialBurstWindow`. We do NOT boot Supabase or exercise the
// createServerFn wrapper end-to-end here: that requires a live JWT and worker
// runtime and is covered by manual QA once Plan 51 dashboard ships. What we
// pin down deterministically is the input-clamp contract (HOURS_MIN..HOURS_MAX
// default HOURS_DEFAULT) and the typed error shape (E_SEC_ROLE_DENIED with a
// correlation id). Both are the pieces most likely to regress silently.

import { describe, it, expect } from "vitest";
import {
  clampHours,
  DENIAL_CODES,
  DenialTelemetryError,
  HOURS_DEFAULT,
  HOURS_MAX,
  HOURS_MIN,
} from "@/lib/security-telemetry.functions";

describe("clampHours", () => {
  it("defaults to HOURS_DEFAULT when input is undefined or NaN", () => {
    expect(clampHours(undefined)).toBe(HOURS_DEFAULT);
    expect(clampHours("abc")).toBe(HOURS_DEFAULT);
    expect(clampHours(Number.NaN)).toBe(HOURS_DEFAULT);
  });
  it("clamps below HOURS_MIN to HOURS_MIN", () => {
    expect(clampHours(0)).toBe(HOURS_MIN);
    expect(clampHours(-42)).toBe(HOURS_MIN);
  });
  it("clamps above HOURS_MAX to HOURS_MAX", () => {
    expect(clampHours(999)).toBe(HOURS_MAX);
    expect(clampHours(HOURS_MAX + 1)).toBe(HOURS_MAX);
  });
  it("floors floats and passes valid ints through", () => {
    expect(clampHours(24.9)).toBe(24);
    expect(clampHours(1)).toBe(1);
    expect(clampHours(HOURS_MAX)).toBe(HOURS_MAX);
  });
});

describe("DENIAL_CODES", () => {
  it("covers the four spec-40 denial codes and no extras", () => {
    expect(new Set(DENIAL_CODES)).toEqual(
      new Set([
        "E_SEC_ROLE_DENIED",
        "E_SEC_NOAUTH",
        "E_SEC_DENIAL_BURST",
        "W_SEC_BURST_APPROACHING",
      ]),
    );
  });
});

describe("DenialTelemetryError", () => {
  it("carries E_SEC_ROLE_DENIED plus the correlation id", () => {
    const err = new DenialTelemetryError("corr-xyz");
    expect(err.code).toBe("E_SEC_ROLE_DENIED");
    expect(err.correlationId).toBe("corr-xyz");
    expect(err.name).toBe("DenialTelemetryError");
    expect(err).toBeInstanceOf(Error);
  });
});
