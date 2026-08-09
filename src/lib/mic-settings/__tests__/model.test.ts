// Plan 79 step 12. MicSettings model tests.
import { describe, it, expect } from "vitest";
import {
  MicSettingsSchema,
  isMicSettings,
  MicSettingsReferencedError,
  MicSettingsValidationError,
} from "../model";

const iso = "2026-07-18T00:00:00.000Z";
const base = { id: "m-1", name: "Default", params: {}, createdAt: iso, updatedAt: iso };

describe("MicSettingsSchema", () => {
  it("parses a minimal record", () => {
    const p = MicSettingsSchema.parse(base);
    expect(p.name).toBe("Default");
    expect(p.params).toEqual({});
  });

  it("rejects empty name", () => {
    expect(MicSettingsSchema.safeParse({ ...base, name: "" }).success).toBe(false);
  });

  it("rejects overlong notes", () => {
    expect(MicSettingsSchema.safeParse({ ...base, notes: "x".repeat(501) }).success).toBe(false);
  });

  it("passes opaque params through", () => {
    const p = MicSettingsSchema.parse({
      ...base,
      params: { gain: 12, mode: "auto" },
    });
    expect(p.params.gain).toBe(12);
  });
});

describe("guards + errors", () => {
  it("isMicSettings filters non-records", () => {
    expect(isMicSettings(null)).toBe(false);
    expect(isMicSettings(base)).toBe(true);
  });

  it("MicSettingsReferencedError carries referrers", () => {
    const e = new MicSettingsReferencedError({ projects: ["p-1", "p-2"] }, "c1");
    expect(e.code).toBe("E_MIC_REFERENCED");
    expect(e.referrers.projects).toHaveLength(2);
  });

  it("MicSettingsValidationError carries issues", () => {
    const r = MicSettingsSchema.safeParse({ ...base, name: "" });
    if (r.success) throw new Error("expected fail");
    const e = new MicSettingsValidationError(r.error.issues, "c2");
    expect(e.code).toBe("E_MIC_SCHEMA");
  });
});
