// Plan 80 step 48: user-facing copy for every `E_CAMERA_*` code.
//
// One-sentence contract: turn a `CameraCapabilityError` into a stable
// `{ title, help, actionable }` triple the ImageSamples surface (and any
// future capture surface) can render inline without branching on raw
// DOMException names.

import type { CameraCapabilityError, CameraCapabilityErrorCode } from "./capability";

export interface CameraPermissionMessage {
  /** One-line summary, safe for a banner headline. */
  title: string;
  /** Short remediation hint, one to two sentences. */
  help: string;
  /**
   * True when the user can plausibly fix it in-browser (grant permission,
   * plug the camera in, close the other app). False for hard failures
   * (insecure origin, unsupported browser) where no in-app retry helps.
   */
  actionable: boolean;
}

const MESSAGES: Record<CameraCapabilityErrorCode, CameraPermissionMessage> = {
  E_CAMERA_UNSUPPORTED: {
    title: "Camera not supported here",
    help: "This browser or origin cannot access cameras. Open the app over https or on localhost, or try a modern Chromium/Firefox/Safari build.",
    actionable: false,
  },
  E_CAMERA_PERMISSION_DENIED: {
    title: "Camera permission denied",
    help: "Grant camera access in your browser's site settings, then click Retry. On macOS/Windows also check that the browser itself has camera permission at the OS level.",
    actionable: true,
  },
  E_CAMERA_NOT_FOUND: {
    title: "No camera detected",
    help: "Plug in a webcam or enable a built-in camera, then click Retry. Devices hot-plug live: the picker refreshes automatically.",
    actionable: true,
  },
  E_CAMERA_IN_USE: {
    title: "Camera is in use by another app",
    help: "Close other tabs, video calls, or apps that hold the camera (Zoom, Teams, OBS), then click Retry.",
    actionable: true,
  },
  E_CAMERA_CONSTRAINT: {
    title: "Requested camera settings unavailable",
    help: "The bound camera setting asks for a resolution or device this hardware cannot provide. Adjust the camera setting, or click Retry with defaults.",
    actionable: true,
  },
  E_CAMERA_ABORTED: {
    title: "Capture aborted",
    help: "The capture was cancelled before it completed. Click Retry to try again.",
    actionable: true,
  },
  E_CAMERA_UNKNOWN: {
    title: "Camera capture failed",
    help: "An unexpected error occurred while acquiring the camera. Click Retry, and if it keeps failing open the Error History panel for details.",
    actionable: true,
  },
};

export function messageForCameraError(error: CameraCapabilityError): CameraPermissionMessage {
  return MESSAGES[error.code] ?? MESSAGES.E_CAMERA_UNKNOWN;
}

/** Convenience: for logging / tests, the raw table. Do NOT mutate. */
export const CAMERA_PERMISSION_MESSAGES: Readonly<
  Record<CameraCapabilityErrorCode, CameraPermissionMessage>
> = MESSAGES;