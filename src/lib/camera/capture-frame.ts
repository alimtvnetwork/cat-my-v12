// Plan 80 step 47: grab a single frame from a live MediaStream and return
// an ImageSample-compatible payload.
//
// One-sentence contract: given an already-open `MediaStream`, wait for
// the first frame to be renderable, draw it to an offscreen canvas, and
// return `{ dataUrl, width, height, byteSize }` ready for the
// ImageSamples facade. The caller owns stream lifetime (Plan 80 step 46
// gave us `openCameraStream().close()` for that).

export interface CapturedFrame {
  dataUrl: string;
  width: number;
  height: number;
  byteSize: number;
}

export interface CaptureFrameOptions {
  /** JPEG quality 0..1. Default 0.92 (browser default). */
  quality?: number;
  /** Mime type. Default "image/jpeg" (smaller than png for photos). */
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
  /** Test hook: injected document (defaults to global `document`). */
  doc?: Document;
  /** Milliseconds to wait for the first frame. Default 4000. */
  timeoutMs?: number;
}

/**
 * Rough byte size of a base64 data URL. Strips the header and applies the
 * 4-chars -> 3-bytes ratio, discounting `=` padding.
 */
export function estimateDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");

  if (comma < 0) return 0;
  const b64 = dataUrl.slice(comma + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;

  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

/**
 * Capture one frame from a MediaStream. Rejects with an `Error` (no
 * typed code surface: the caller already has `E_CAMERA_*` from
 * `openCameraStream`; this helper only fires after stream acquisition
 * succeeded, so failures here are `E_CAMERA_CAPTURE_FRAME_*` internal).
 */
export async function captureFrameFromStream(
  stream: MediaStream,
  opts: CaptureFrameOptions = {},
): Promise<CapturedFrame> {
  const doc = opts.doc ?? (typeof document !== "undefined" ? document : null);

  if (!doc) throw new Error("captureFrameFromStream: no document available");

  const video = doc.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;

  const timeoutMs = opts.timeoutMs ?? 4000;
  await new Promise<void>((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      reject(
        new Error(`captureFrameFromStream: timed out after ${timeoutMs}ms waiting for first frame`),
      );
    }, timeoutMs);
    const onReady = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    };
    video.addEventListener("loadedmetadata", onReady, { once: true });
    // Kick playback; some browsers won't fire loadedmetadata otherwise.
    void video.play().catch((err) => {
      // Autoplay policy failure is fatal for capture.
      if (done) return;
      done = true;
      clearTimeout(timer);
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });

  const width = video.videoWidth;
  const height = video.videoHeight;

  if (width === 0 || height === 0) {
    throw new Error(`captureFrameFromStream: video reported zero dimensions (${width}x${height})`);
  }

  const canvas = doc.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("captureFrameFromStream: 2d canvas context unavailable");
  ctx.drawImage(video, 0, 0, width, height);

  const mimeType = opts.mimeType ?? "image/jpeg";
  const quality = opts.quality ?? 0.92;
  const dataUrl = canvas.toDataURL(mimeType, quality);
  const byteSize = estimateDataUrlBytes(dataUrl);

  // Detach the video from the stream so the caller's stream reference is
  // still the sole owner; caller closes the stream via openCameraStream.
  try {
    video.srcObject = null;
  } catch {
    /* ignore */
  }

  console.info(`[camera-capture] frame captured ${width}x${height} ~${byteSize}B (${mimeType})`);

  return { dataUrl, width, height, byteSize };
}
