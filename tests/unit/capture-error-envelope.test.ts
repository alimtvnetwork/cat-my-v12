// Plan 15 Step 12 - unit coverage for the capture error envelope and the
// device-selection parser. Anchors:
//   - src/lib/capture.shared.ts (CAPTURE_ERROR_CODES, toCaptureError,
//     parseCaptureErrorCode, parseDeviceSelection)
//   - spec/21-app/67-v2-discovery-contract.md Failure Taxonomy
import { describe, expect, it } from "vitest";

import {
  CAPTURE_ERROR_CODES,
  CaptureError,
  parseCaptureErrorCode,
  parseDeviceSelection,
  toCaptureError,
} from "@/lib/capture.shared";

describe("CAPTURE_ERROR_CODES", () => {
  it("locks the capture and audit export failure taxonomy", () => {
    expect([...CAPTURE_ERROR_CODES]).toEqual([
      "E_SEC_UNAUTH",
      "E_SEC_DENIED",
      "E_LIC_FEATURE_DENIED",
      "E_CFG_BAD_INPUT",
      "E_CFG_UNSUPPORTED_VENDOR",
      "E_CFG_UNKNOWN_DEVICE",
      "E_CAP_SDK_ABSENT",
      "E_CAP_ENUM_FAILED",
      "E_SEC_AUDIT_FAILED",
      "E_AUDIT_EXPORT_UNAUTHORIZED",
      "E_AUDIT_EXPORT_FEATURE_LOCKED",
      "E_AUDIT_EXPORT_WINDOW_TOO_WIDE",
      "E_AUDIT_EXPORT_SIZE_CAP",
      "E_AUDIT_EXPORT_EMPTY_WINDOW",
      "E_AUDIT_EXPORT_DISABLED",
      "E_AUDIT_EXPORT_COUNT_MISMATCH",
      "E_AUDIT_EXPORT_CHECKSUM_MISMATCH",
      "E_AUDIT_EXPORT_SCHEMA_UNSUPPORTED",
      "E_AUDIT_EXPORT_STORAGE_FAILED",
      "E_AUDIT_EXPORT_BAD_PATH",
      "E_AUDIT_EXPORT_SIGNED_URL_FAILED",
      "E_INTERNAL",
    ]);
  });
});

describe("toCaptureError", () => {
  it("passes CaptureError instances through", () => {
    const original = new CaptureError("E_SEC_DENIED", "admin required");
    expect(toCaptureError(original)).toBe(original);
  });

  it("recognizes a prefixed code from a plain Error", () => {
    const err = toCaptureError(new Error("E_CFG_UNKNOWN_DEVICE: pylon:missing"));
    expect(err.code).toBe("E_CFG_UNKNOWN_DEVICE");
    expect(err.message).toContain("pylon:missing");
  });

  it("falls back to E_INTERNAL for unrecognized strings", () => {
    const err = toCaptureError("boom");
    expect(err.code).toBe("E_INTERNAL");
    expect(err.message).toContain("boom");
  });
});

describe("parseCaptureErrorCode", () => {
  it("returns the leading code prefix", () => {
    expect(parseCaptureErrorCode("E_SEC_AUDIT_FAILED: rolled back")).toBe("E_SEC_AUDIT_FAILED");
  });

  it("defaults to E_INTERNAL for empty or unknown input", () => {
    expect(parseCaptureErrorCode("")).toBe("E_INTERNAL");
    expect(parseCaptureErrorCode("nope")).toBe("E_INTERNAL");
    expect(parseCaptureErrorCode(null)).toBe("E_INTERNAL");
  });
});

describe("parseDeviceSelection", () => {
  it("accepts a valid vendor + serial pair", () => {
    expect(parseDeviceSelection({ vendor: "pylon", serial: "24477108" })).toEqual({
      vendor: "pylon",
      serial: "24477108",
    });
  });

  it("rejects unknown keys with E_CFG_BAD_INPUT", () => {
    expect(() => parseDeviceSelection({ vendor: "pylon", serial: "1", extra: true })).toThrow(
      /E_CFG_BAD_INPUT/,
    );
  });

  it("rejects an unsupported vendor", () => {
    expect(() => parseDeviceSelection({ vendor: "nikon", serial: "1" })).toThrow(/E_CFG_BAD_INPUT/);
  });

  it("rejects an empty or malformed serial", () => {
    expect(() => parseDeviceSelection({ vendor: "pylon", serial: "" })).toThrow(/E_CFG_BAD_INPUT/);
    expect(() => parseDeviceSelection({ vendor: "pylon", serial: "bad serial!" })).toThrow(
      /E_CFG_BAD_INPUT/,
    );
  });
});
