// Plan 80 step 43: getUserMedia capability probe with typed error surface.
//
// Callers (live capture UX in ImageSamples, viewport camera controls) need
// to know BEFORE they wire a `<video>` element to a MediaStream whether the
// browser will let them, and if not, WHY, in a shape the error modal /
// registry can render. `navigator.mediaDevices.getUserMedia` throws
// `DOMException` with heterogeneous `name` values across browsers; this
// module normalises those into stable `E_CAMERA_*` codes.
//
// This is a probe: it acquires a stream, counts input devices, and stops
// every track before returning so no red-dot indicator lingers. The stream
// itself is intentionally NOT returned so callers can't accidentally hold
// a reference; a separate `acquireCameraStream()` (Plan 80 step 47) will
// own live streams.

export enum CameraCapabilityErrorCodeType {
  E_CAMERA_UNSUPPORTED = "E_CAMERA_UNSUPPORTED",
  E_CAMERA_PERMISSION_DENIED = "E_CAMERA_PERMISSION_DENIED",
  E_CAMERA_NOT_FOUND = "E_CAMERA_NOT_FOUND",
  E_CAMERA_IN_USE = "E_CAMERA_IN_USE",
  E_CAMERA_CONSTRAINT = "E_CAMERA_CONSTRAINT",
  E_CAMERA_ABORTED = "E_CAMERA_ABORTED",
  E_CAMERA_UNKNOWN = "E_CAMERA_UNKNOWN",
}
export type CameraCapabilityErrorCode = CameraCapabilityErrorCodeType;

export interface CameraCapabilityError {
  code: CameraCapabilityErrorCode;
  message: string;
  /** Raw DOMException name for diagnostics; do NOT branch UI on this. */
  cause?: string;
}

export interface CameraDeviceSummary {
  deviceId: string;
  label: string;
  groupId: string;
}

export type CameraCapability =
  | { ok: true; devices: CameraDeviceSummary[] }
  | { ok: false; error: CameraCapabilityError };

// DOMException.name -> our stable code. Names per MediaDevices spec + WebKit
// legacy synonyms. Keep the switch exhaustive so unknown names fall through
// to E_CAMERA_UNKNOWN with the raw name preserved in `cause`.
function mapDomExceptionName(name: string): CameraCapabilityErrorCode {
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
    case "PermissionDeniedError": // legacy WebKit
      return CameraCapabilityErrorCodeType.E_CAMERA_PERMISSION_DENIED;
    case "NotFoundError":
    case "DevicesNotFoundError": // legacy Chrome
      return CameraCapabilityErrorCodeType.E_CAMERA_NOT_FOUND;
    case "NotReadableError":
    case "TrackStartError": // legacy
      return CameraCapabilityErrorCodeType.E_CAMERA_IN_USE;
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return CameraCapabilityErrorCodeType.E_CAMERA_CONSTRAINT;
    case "AbortError":
      return CameraCapabilityErrorCodeType.E_CAMERA_ABORTED;
    default:
      return CameraCapabilityErrorCodeType.E_CAMERA_UNKNOWN;
  }
}

function toCapabilityError(err: unknown): CameraCapabilityError {
  if (err && typeof err === "object" && "name" in err) {
    const rec = err as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name : "";
    const message =
      typeof rec.message === "string" && rec.message.length > 0
        ? rec.message
        : name || "getUserMedia failed";

    return { code: mapDomExceptionName(name), message, cause: name };
  }

  return {
    code: CameraCapabilityErrorCodeType.E_CAMERA_UNKNOWN,
    message: err instanceof Error ? err.message : "getUserMedia failed",
  };
}

export interface ProbeOptions {
  /** Test hook. Defaults to the browser's `navigator.mediaDevices`. */
  mediaDevices?: MediaDevices | null;
}

/**
 * Probe camera availability. Never throws: every failure lands in
 * `{ ok: false, error }`. Also logs a single INFO/ERROR line so silent
 * failure is impossible (spec 03 error-manage requirement).
 */
export async function probeCameraCapability(opts: ProbeOptions = {}): Promise<CameraCapability> {
  const md =
    opts.mediaDevices ?? (typeof navigator !== "undefined" ? navigator.mediaDevices : null);

  if (!md || typeof md.getUserMedia !== "function") {
    const error: CameraCapabilityError = {
      code: CameraCapabilityErrorCodeType.E_CAMERA_UNSUPPORTED,
      message:
        "navigator.mediaDevices.getUserMedia unavailable (requires a secure origin: https or localhost)",
    };
    console.error("[camera-capability] probe failed", error);

    return { ok: false, error };
  }

  let stream: MediaStream | null = null;
  try {
    stream = await md.getUserMedia({ video: true, audio: false });
  } catch (err) {
    const error = toCapabilityError(err);
    console.error("[camera-capability] probe failed", error);

    return { ok: false, error };
  }

  // Enumerate AFTER getUserMedia so labels are populated (per spec, labels
  // are empty strings until permission is granted).
  let devices: CameraDeviceSummary[] = [];
  try {
    if (typeof md.enumerateDevices === "function") {
      const all = await md.enumerateDevices();
      devices = all
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label,
          groupId: d.groupId,
        }));
    }
  } catch (err) {
    // Enumerate failure is non-fatal: we already have a working stream, so
    // report OK with an empty devices list and log the enumerate error.
    console.warn("[camera-capability] enumerateDevices threw", err);
  } finally {
    // ALWAYS release the probe stream. Leaving tracks live keeps the
    // browser's recording indicator on and blocks other consumers.
    for (const track of stream.getTracks()) {
      try {
        track.stop();
      } catch (err) {
        console.warn("[camera-capability] track.stop threw", err);
      }
    }
  }

  console.info(`[camera-capability] probe ok deviceCount=${devices.length}`);

  return { ok: true, devices };
}
