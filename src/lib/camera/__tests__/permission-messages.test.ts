import { CameraCapabilityErrorCodeType } from "@/lib/camera/capability";
/** @vitest-environment jsdom */
// Plan 80 step 48: permission-message coverage.
import { describe, expect, it } from "vitest";
import { CAMERA_PERMISSION_MESSAGES, messageForCameraError } from "../permission-messages";
import type { CameraCapabilityErrorCode } from "../capability";

const ALL_CODES: CameraCapabilityErrorCode[] = [
  CameraCapabilityErrorCodeType.E_CAMERA_UNSUPPORTED,
  CameraCapabilityErrorCodeType.E_CAMERA_PERMISSION_DENIED,
  CameraCapabilityErrorCodeType.E_CAMERA_NOT_FOUND,
  CameraCapabilityErrorCodeType.E_CAMERA_IN_USE,
  CameraCapabilityErrorCodeType.E_CAMERA_CONSTRAINT,
  CameraCapabilityErrorCodeType.E_CAMERA_ABORTED,
  CameraCapabilityErrorCodeType.E_CAMERA_UNKNOWN,
];

describe("permission-messages", () => {
  it("every E_CAMERA_* code has a non-empty title + help entry", () => {
    for (const code of ALL_CODES) {
      const m = CAMERA_PERMISSION_MESSAGES[code];
      expect(m, code).toBeDefined();
      expect(m.title.length).toBeGreaterThan(0);
      expect(m.help.length).toBeGreaterThan(0);
    }
  });

  it("UNSUPPORTED is NOT actionable, all others ARE", () => {
    expect(CAMERA_PERMISSION_MESSAGES.E_CAMERA_UNSUPPORTED.actionable).toBe(false);
    for (const code of ALL_CODES.filter((c) => c !== "E_CAMERA_UNSUPPORTED")) {
      expect(CAMERA_PERMISSION_MESSAGES[code].actionable, code).toBe(true);
    }
  });

  it("messageForCameraError returns the correct entry per code", () => {
    for (const code of ALL_CODES) {
      const msg = messageForCameraError({ code, message: "x" });
      expect(msg).toBe(CAMERA_PERMISSION_MESSAGES[code]);
    }
  });

  it("messageForCameraError falls back to UNKNOWN for an unrecognised code", () => {
    const msg = messageForCameraError({
      code: "E_NOT_A_REAL_CODE" as unknown as CameraCapabilityErrorCode,
      message: "",
    });
    expect(msg).toBe(CAMERA_PERMISSION_MESSAGES.E_CAMERA_UNKNOWN);
  });
});
