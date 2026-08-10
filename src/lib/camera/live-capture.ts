import { CameraCapabilityErrorCodeType } from "@/lib/camera/capability";
// Plan 80 step 46: live camera capture lifecycle helpers.
//
// `probeCameraCapability` (step 43) is one-shot: it acquires, enumerates,
// then releases. Live capture (step 47 will consume this) needs two extra
// primitives:
//   1. `watchCameraDevices(cb)` - subscribe to hot-plug events so the UI
//      can refresh a device picker without a manual refresh.
//   2. `openCameraStream(constraints)` - acquire a MediaStream AND own its
//      teardown, so callers cannot leak tracks (the recording indicator
//      staying on after unmount was the reported failure mode).
//
// Errors funnel through the same `E_CAMERA_*` code surface as
// `capability.ts` so the error modal renders one stable taxonomy.
import { type CameraCapabilityError, type CameraDeviceSummary } from "./capability";

// Local mirror of the DOMException.name -> code map from capability.ts.
// Kept private so live-capture stays a self-contained module; if the
// mapping ever diverges, the shared taxonomy in capability.ts wins.
function mapDomExceptionName(name: string): CameraCapabilityError["code"] {
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
    case "PermissionDeniedError":
      return CameraCapabilityErrorCodeType.E_CAMERA_PERMISSION_DENIED;
    case "NotFoundError":
    case "DevicesNotFoundError":
      return CameraCapabilityErrorCodeType.E_CAMERA_NOT_FOUND;
    case "NotReadableError":
    case "TrackStartError":
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

// ---------- device-change subscription ----------

export interface WatchDevicesOptions {
  /** Test hook. Defaults to `navigator.mediaDevices`. */
  mediaDevices?: MediaDevices | null;
  /**
   * When true, invoke the listener once with the current device list
   * immediately after subscribing (mirrors React effect ergonomics).
   * Defaults to `true`.
   */
  emitImmediately?: boolean;
}

export type Unsubscribe = () => void;

/**
 * Subscribe to hot-plug (USB webcam plug/unplug, iPad continuity camera
 * toggle) via `MediaDevices.ondevicechange`. Returns an unsubscribe fn.
 * Callers MUST unsubscribe on unmount, else the listener leaks across
 * component lifetimes.
 *
 * The listener receives `videoinput`-only device summaries. Enumerate
 * failures are surfaced as an empty list + a console.warn (never throw:
 * device-change is a soft signal, not a fatal path).
 */
export function watchCameraDevices(
  listener: (devices: CameraDeviceSummary[]) => void,
  opts: WatchDevicesOptions = {},
): Unsubscribe {
  const md =
    opts.mediaDevices ?? (typeof navigator !== "undefined" ? navigator.mediaDevices : null);

  if (!md || typeof md.enumerateDevices !== "function") {
    console.warn(
      "[camera-live] watchCameraDevices: mediaDevices unavailable, listener will never fire",
    );

    return () => {};
  }

  let isDisposed = false;
  async function refresh(): Promise<void> {
    if (isDisposed) return;
    try {
      const all = await md!.enumerateDevices();

      if (isDisposed) return;
      const devices = all
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label,
          groupId: d.groupId,
        }));
      listener(devices);
    } catch (err) {
      console.warn("[camera-live] enumerateDevices threw", err);

      if (!isDisposed) listener([]);
    }
  }

  const handler = () => {
    console.info("[camera-live] devicechange event received");
    void refresh();
  };

  // Prefer addEventListener (spec) over ondevicechange assignment so we
  // never stomp another consumer's handler on the same MediaDevices.
  if (typeof md.addEventListener === "function") {
    md.addEventListener("devicechange", handler);
  } else {
    (md as { ondevicechange: EventListener | null }).ondevicechange = handler;
  }

  if (opts.emitImmediately !== false) void refresh();

  return () => {
    isDisposed = true;

    if (typeof md.removeEventListener === "function") {
      md.removeEventListener("devicechange", handler);
    } else {
      const withProp = md as { ondevicechange: EventListener | null };

      if (withProp.ondevicechange === handler) withProp.ondevicechange = null;
    }
  };
}

// ---------- stream lifecycle wrapper ----------

export interface OpenCameraStreamOptions {
  constraints?: MediaStreamConstraints;
  /** Test hook. Defaults to `navigator.mediaDevices`. */
  mediaDevices?: MediaDevices | null;
}

export interface LiveCameraStream {
  /** The live MediaStream. Attach to a `<video>` element's `srcObject`. */
  stream: MediaStream;
  /**
   * Idempotent teardown: stops every track and detaches the `onended`
   * handler. Safe to call multiple times; subsequent calls no-op.
   */
  close: () => void;
  /**
   * Fires when any track ends externally (user revokes permission, USB
   * yank, OS sleep). UI should re-probe on this signal.
   */
  onExternalEnd: (cb: () => void) => Unsubscribe;
}

export type OpenCameraResult =
  { ok: true; isFail: false; stream: LiveCameraStream } | { ok: false; isFail: true; error: CameraCapabilityError };

/**
 * Acquire a live MediaStream with owned teardown. Every track stops on
 * `close()`; external `ended` events fan out to `onExternalEnd`
 * subscribers. Errors normalise through the same `E_CAMERA_*` codes as
 * `probeCameraCapability`.
 */
export async function openCameraStream(
  opts: OpenCameraStreamOptions = {},
): Promise<OpenCameraResult> {
  const md =
    opts.mediaDevices ?? (typeof navigator !== "undefined" ? navigator.mediaDevices : null);

  if (!md || typeof md.getUserMedia !== "function") {
    const error: CameraCapabilityError = {
      code: CameraCapabilityErrorCodeType.E_CAMERA_UNSUPPORTED,
      message:
        "navigator.mediaDevices.getUserMedia unavailable (requires a secure origin: https or localhost)",
    };
    console.error("[camera-live] openCameraStream failed", error);

    return { ok: false, isFail: true, error };
  }

  let raw: MediaStream;
  try {
    raw = await md.getUserMedia(opts.constraints ?? { video: true, audio: false });
  } catch (err) {
    const error = toCapabilityError(err);
    console.error("[camera-live] openCameraStream failed", error);

    return { ok: false, isFail: true, error };
  }

  let isClosed = false;
  const endedSubs = new Set<() => void>();
  const tracks = raw.getTracks();

  const onTrackEnded = () => {
    if (isClosed) return;
    console.info("[camera-live] track ended externally, notifying subscribers");
    for (const cb of endedSubs) {
      try {
        cb();
      } catch (err) {
        console.warn("[camera-live] onExternalEnd subscriber threw", err);
      }
    }
  };
  for (const t of tracks) t.addEventListener("ended", onTrackEnded);

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    for (const t of tracks) {
      try {
        t.removeEventListener("ended", onTrackEnded);
      } catch {
        /* ignore */
      }

      try {
        t.stop();
      } catch (err) {
        console.warn("[camera-live] track.stop threw", err);
      }
    }

    endedSubs.clear();
    console.info(`[camera-live] stream closed (${tracks.length} track(s))`);
  };

  const onExternalEnd = (cb: () => void): Unsubscribe => {
    endedSubs.add(cb);

    return () => {
      endedSubs.delete(cb);
    };
  };

  console.info(`[camera-live] stream opened (${tracks.length} track(s))`);

  return { ok: true, isFail: false, stream: { stream: raw, close, onExternalEnd } };
}
