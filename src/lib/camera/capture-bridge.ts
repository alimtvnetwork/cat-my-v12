// Camera capture bridge. The UI calls captureReferenceFromCamera(),
// which POSTs to /api/camera/capture. That server route forwards to
// the Python worker exposing the vendor SDK (Pylon, Spinnaker, Vimba)
// at CAMERA_WORKER_URL. When no worker is configured or the worker
// is unreachable, the route responds 503 and this bridge throws
// CameraUnavailableError so the UI can fall back to the sample
// gallery.
//
// Persisted controls: /settings/camera writes CameraSetupControls into
// localStorage under StorageKey.CameraControls (see CameraPreview).
// readPersistedCameraControls() below reads that entry so the capture
// request always carries the configured POV, brightness, contrast,
// exposure, gain, and lighting-enhancement values. Explicit fields on
// the incoming CaptureRequest win over the stored ones so callers can
// override on a per-shot basis.
//
// HTTP contract:
//   POST /api/camera/capture
//   -> request:  { povId?, brightness?, contrast?, exposure?, gain?,
//                  enhance?, saturation? }
//   -> 200:      { dataUrl: string, width: number, height: number }
//   -> 503:      { error: "camera-unavailable", message: string }

import { setLastCaptureRequest } from "./last-capture-request-store";
import { withGesture, nextGestureId } from "@/lib/editor/errors";
import { HttpMethod, StorageKey } from "@/lib/constants";
import { beFetch, EnvelopeError } from "@/lib/be-fetch";

export const CAMERA_CONTROLS_STORAGE_KEY: string = StorageKey.CameraControls;

/**
 * Flatten a CaptureRequest into primitive log fields. Missing controls
 * are emitted as `null` so the operator can distinguish "not sent" from
 * "sent as zero", and the field set is stable across every shot for
 * easy grep / dashboarding.
 */
function captureRequestFields(
  request: CaptureRequest,
  extra: Record<string, string | number | boolean | null> = {},
): Record<string, string | number | boolean | null> {

  return {
    povId: request.povId ?? null,
    brightness: request.brightness ?? null,
    contrast: request.contrast ?? null,
    exposure: request.exposure ?? null,
    gain: request.gain ?? null,
    enhance: request.enhance ?? null,
    saturation: request.saturation ?? null,
    ...extra,
  };
}

export interface CaptureRequest {
  povId?: string;
  brightness?: number;
  contrast?: number;
  exposure?: number;
  gain?: number;
  enhance?: number;
  saturation?: number;
}

export interface CaptureResult {
  dataUrl: string;
  width: number;
  height: number;
  source: "camera" | "stub";
}

/**
 * Read the persisted camera setup from localStorage. Returns an empty
 * object when nothing is stored (or when running server-side), so the
 * caller can spread it into a CaptureRequest without conditionals.
 */
export function readPersistedCameraControls(
  storageKey: string = CAMERA_CONTROLS_STORAGE_KEY,
): CaptureRequest {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<CaptureRequest>;
    const out: CaptureRequest = {};

    if (typeof parsed.povId === "string") out.povId = parsed.povId;

    if (typeof parsed.brightness === "number") out.brightness = parsed.brightness;

    if (typeof parsed.contrast === "number") out.contrast = parsed.contrast;

    if (typeof parsed.exposure === "number") out.exposure = parsed.exposure;

    if (typeof parsed.gain === "number") out.gain = parsed.gain;

    if (typeof parsed.enhance === "number") out.enhance = parsed.enhance;

    if (typeof parsed.saturation === "number") out.saturation = parsed.saturation;

    return out;
  } catch {

    return {};
  }
}

/**
 * Merge persisted camera controls with any explicit overrides on the
 * incoming request. Explicit fields always win.
 */
export function buildCaptureRequest(
  overrides: CaptureRequest = {},
  storageKey: string = CAMERA_CONTROLS_STORAGE_KEY,
): CaptureRequest {
  const persisted = readPersistedCameraControls(storageKey);

  return { ...persisted, ...overrides };
}

export async function captureReferenceFromCamera(
  overrides: CaptureRequest = {},
  storageKey: string = CAMERA_CONTROLS_STORAGE_KEY,
): Promise<CaptureResult> {
  // Build the full request so the vendor SDK sees the operator's
  // configured POV / brightness / contrast / exposure / gain rather
  // than whatever the camera booted with.
  const request = buildCaptureRequest(overrides, storageKey);
  setLastCaptureRequest(request);

  const capture = withGesture(nextGestureId("cam-capture"));
  const overrideKeys = Object.keys(overrides).sort().join(",");
  capture.info(
    "I_CAM_CAPTURE_REQUEST",
    captureRequestFields(request, {
      overrides: overrideKeys.length > 0 ? overrideKeys : null,
      timeoutMs: 12_000,
    }),
  );

  // Client-side timeout so a wedged worker never leaves the UI in a
  // permanent "Capturing…" state. The server route also enforces its
  // own 8s timeout; this guard runs 4s longer to let the server's
  // clearer error message win when possible.
  const controller = new AbortController();
  const timeoutMs = 12_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Plan 90 Step 104: use `beFetch` so the response is parsed as the
  // Universal Envelope and failures arrive as typed `EnvelopeError`
  // with `Errors.Code` = E_CAM_*. `suppressCapture: true` because the
  // Reference Image card renders inline, contextual guidance for every
  // camera error kind; funnelling a "no camera attached" preflight
  // through the GlobalErrorModal would be noise.
  try {
    const env = await beFetch<{ dataUrl: string; width: number; height: number }>(
      "/api/camera/capture",
      {
        method: HttpMethod.Post,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      },
      { suppressCapture: true },
    );
    clearTimeout(timeoutId);
    const shot = env.Results[0];

    if (
      !shot ||
      typeof shot.dataUrl !== "string" ||
      typeof shot.width !== "number" ||
      typeof shot.height !== "number"
    ) {
      capture.error(
        "E_CAM_CAPTURE_BAD_PAYLOAD",
        captureRequestFields(request, { status: env.Status.Code }),
      );

      throw new CameraCaptureError(
        CameraErrorKindType.Sdk,
        "Capture service returned an invalid payload.",
      );
    }

    capture.info(
      "I_CAM_CAPTURE_OK",
      captureRequestFields(request, {
        status: env.Status.Code,
        width: shot.width,
        height: shot.height,
      }),
    );

    return {
      dataUrl: shot.dataUrl,
      width: shot.width,
      height: shot.height,
      source: "camera",
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (EnvelopeError.is(err)) {
      const { kind, level, logCode } = mapEnvelopeErrorToCamera(err);
      capture[level](
        logCode,
        captureRequestFields(request, {
          status: err.responseStatus,
          code: err.code,
          message: err.backendMessage,
          correlationId: err.correlationId,
        }),
      );

      throw new CameraCaptureError(kind, err.backendMessage);
    }

    if (err instanceof DOMException && err.name === "AbortError") {
      capture.warn("W_CAM_CAPTURE_TIMEOUT", captureRequestFields(request, { timeoutMs }));

      throw new CameraCaptureError(
        CameraErrorKindType.Timeout,
        `Capture timed out after ${Math.round(timeoutMs / 1000)}s. The camera or worker may be busy.`,
      );
    }

    if (err instanceof CameraCaptureError) throw err;
    capture.error(
      "E_CAM_CAPTURE_NETWORK",
      captureRequestFields(request, {
        message: err instanceof Error ? err.message : "unknown",
      }),
    );

    throw new CameraCaptureError(
      CameraErrorKindType.Network,
      "Could not reach the capture service. Check the network.",
    );
  }
}

/**
 * Translate an `Errors.Code` from the camera capture envelope into the
 * inline-error `kind` the Reference Image card already renders. Kept
 * next to the request so any new server-side code lands here first.
 */
function mapEnvelopeErrorToCamera(err: EnvelopeError): {
  kind: CameraErrorKind;
  level: "warn" | "error";
  logCode: string;
} {
  switch (err.code) {
    case "E_CAM_UNAVAILABLE":

      return {
        kind: CameraErrorKindType.Unavailable,
        level: "warn",
        logCode: "W_CAM_CAPTURE_UNAVAILABLE",
      };
    case "E_CAM_TIMEOUT":

      return { kind: CameraErrorKindType.Timeout, level: "warn", logCode: "W_CAM_CAPTURE_TIMEOUT" };
    case "E_CAM_INVALID":

      return { kind: CameraErrorKindType.Invalid, level: "warn", logCode: "W_CAM_CAPTURE_INVALID" };
    case "E_CAM_SDK":

      return { kind: CameraErrorKindType.Sdk, level: "error", logCode: "E_CAM_CAPTURE_SDK" };
    case "E_BE_UNAVAILABLE":

      return {
        kind: CameraErrorKindType.Network,
        level: "error",
        logCode: "E_CAM_CAPTURE_NETWORK",
      };
    default:

      return { kind: CameraErrorKindType.Sdk, level: "error", logCode: "E_CAM_CAPTURE_HTTP" };
  }
}

export enum CameraErrorKindType {
  Unavailable = "unavailable",
  Timeout = "timeout",
  Sdk = "sdk",
  Network = "network",
  Invalid = "invalid",
}
export type CameraErrorKind = CameraErrorKindType; // request rejected as malformed

export class CameraCaptureError extends Error {
  readonly kind: CameraErrorKind;
  constructor(kind: CameraErrorKind, message: string) {
    super(message);
    this.name = "CameraCaptureError";
    this.kind = kind;
  }
}

/**
 * Back-compat alias: earlier callers threw / caught this as a plain
 * "unavailable" error. New code should catch CameraCaptureError and
 * branch on `.kind`.
 */
export class CameraUnavailableError extends CameraCaptureError {
  constructor(message: string) {
    super(CameraErrorKindType.Unavailable, message);
    this.name = "CameraUnavailableError";
  }
}

/**
 * Result of GET /api/camera/defaults. `source` distinguishes a real
 * worker response from the local fallback so the UI can label the
 * "Reset camera controls" action ("worker defaults" vs "built-in
 * defaults").
 */
export interface CameraDefaultsResult {
  source: "worker" | "fallback";
  reason?: string;
  defaults: CaptureRequest;
}

/**
 * Fetch the current worker default camera controls. Never throws: on
 * any transport, envelope, or shape error the caller receives a
 * `fallback` result with the UI's built-in defaults so the "Reset"
 * button always works. Uses `beFetch` so the response is parsed as a
 * Universal Envelope and the same correlation id ties browser + server
 * logs together; `suppressCapture` keeps the fallback path out of the
 * GlobalErrorModal because a missing worker is expected, not an error.
 */
export async function fetchCameraDefaults(): Promise<CameraDefaultsResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const env = await beFetch<CameraDefaultsResult>(
      "/api/camera/defaults",
      {
        method: HttpMethod.Get,
        headers: { accept: "application/json" },
        signal: controller.signal,
      },
      { suppressCapture: true },
    );
    const payload = env.Results[0];
    const defaults =
      payload && typeof payload.defaults === "object" && payload.defaults !== null
        ? (payload.defaults as CaptureRequest)
        : {};
    const source: CameraDefaultsResult["source"] =
      payload?.source === "worker" ? "worker" : "fallback";

    return { source, reason: payload?.reason, defaults };
  } catch {

    return { source: "fallback", reason: "client-error", defaults: {} };
  } finally {
    clearTimeout(timeoutId);
  }
}
