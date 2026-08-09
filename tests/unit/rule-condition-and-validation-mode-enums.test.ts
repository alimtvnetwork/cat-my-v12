// Plan 42 steps 7-10 verification. Enum-only smoke tests locking literal
// values and guard behavior. No logic under test yet.
import { describe, it, expect } from "vitest";
import { ConditionType, ALL_CONDITION_TYPES, isConditionType } from "@/types/rules/ConditionType";
import {
  PresenceModeType as PresenceMode,
  ALL_PRESENCE_MODES,
  isPresenceMode,
} from "@/types/rules/PresenceModeType";
import { ColorMode, ALL_COLOR_MODES, isColorMode } from "@/types/rules/ColorMode";
import {
  ValidationMode,
  ALL_VALIDATION_MODES,
  DEFAULT_VALIDATION_MODE,
  isValidationMode,
} from "@/types/ruleset/ValidationMode";

describe("ConditionType", () => {
  it("has three families with stable values", () => {
    expect(ALL_CONDITION_TYPES).toEqual([
      ConditionType.SameImage,
      ConditionType.Presence,
      ConditionType.Color,
    ]);
    expect(isConditionType("color")).toBe(true);
    expect(isConditionType("edge")).toBe(false);
  });
});

describe("PresenceMode", () => {
  it("is Present/Absent only", () => {
    expect(ALL_PRESENCE_MODES).toEqual([
      PresenceMode.Present,
      PresenceMode.Absent,
      PresenceMode.Ignore,
    ]);
    expect(isPresenceMode("absent")).toBe(true);
    expect(isPresenceMode("missing")).toBe(false);
  });
});

describe("ColorMode", () => {
  it("covers Current/Dense2/Dense3/Picked", () => {
    expect(ALL_COLOR_MODES).toEqual([
      ColorMode.Current,
      ColorMode.Dense2,
      ColorMode.Dense3,
      ColorMode.Picked,
    ]);
    expect(isColorMode("dense-2")).toBe(true);
    expect(isColorMode("dense-4")).toBe(false);
  });
});

describe("ValidationMode", () => {
  it("defaults to Parallel and rejects junk", () => {
    expect(DEFAULT_VALIDATION_MODE).toBe(ValidationMode.Parallel);
    expect(ALL_VALIDATION_MODES).toEqual([ValidationMode.Parallel, ValidationMode.Sequential]);
    expect(isValidationMode("sequential")).toBe(true);
    expect(isValidationMode("serial")).toBe(false);
  });
});
