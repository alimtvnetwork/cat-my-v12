import { describe, it, expect, vi } from "vitest";
import { validateBundleLoud } from "../validate-bundle-loud";
import { SeedBundleValidationError } from "../schemas-v2";
import bundleV2 from "../data/bundle.v2.json";

function makeLogger() {
  return {
    error: vi.fn(),
    group: vi.fn(),
    groupEnd: vi.fn(),
    info: vi.fn(),
  };
}

describe("validateBundleLoud", () => {
  it("returns parsed bundle and logs OK for the shipped bundle", () => {
    const logger = makeLogger();
    const out = validateBundleLoud(bundleV2, { logger });
    expect(out.schemaVersion).toBeDefined();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("OK"));
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("logs grouped error lines and rethrows on duplicate ids", () => {
    const logger = makeLogger();
    const bad = structuredClone(bundleV2) as typeof bundleV2;
    // Duplicate a rule id.
    (bad.rules as unknown[]).push(bad.rules[0]);
    const onError = vi.fn();
    expect(() => validateBundleLoud(bad, { logger, onError, source: "test-bundle" })).toThrow(
      SeedBundleValidationError,
    );
    expect(logger.group).toHaveBeenCalledWith(expect.stringContaining("test-bundle"));
    expect(logger.error).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    const call = logger.error.mock.calls.map((c) => c[0]).join("\n");
    expect(call).toMatch(/\[integrity\]|\[shape\]|\[reference\]/);
  });

  it("logs and rethrows on missing required field", () => {
    const logger = makeLogger();
    const bad = structuredClone(bundleV2) as typeof bundleV2;
    delete (bad.samples[0] as Record<string, unknown>).projectId;
    expect(() => validateBundleLoud(bad, { logger })).toThrow(SeedBundleValidationError);
    const combined = logger.error.mock.calls.map((c) => c[0]).join("\n");
    expect(combined).toMatch(/samples\[0\]\.projectId/);
  });
});