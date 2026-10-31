import { useCallback, useEffect, useRef, useState } from "react";
import { openCameraStream, type LiveCameraStream } from "@/lib/camera/live-capture";

/** Watchdog: if the browser camera permission prompt pends (or hides
 *  behind the fullscreen --app window), the UI must not sit on
 *  "CONNECTING CAMERA" forever (spec 54 §21, screenshot bg2jMNWxHjkn). */
const CAMERA_PERMISSION_WATCHDOG_MS = 15000;

export function useCameraStream(isOpen: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<LiveCameraStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isPermissionPending, setIsPermissionPending] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setAttempt((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let isDisposed = false;
    let watchdog: ReturnType<typeof setTimeout> | null = null;

    async function initCamera() {
      setErrorText(null);
      setIsPermissionPending(false);
      setIsReady(false);
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }

      watchdog = setTimeout(() => {
        if (isDisposed) return;
        // Still waiting on getUserMedia: surface guidance instead of
        // spinning on "CONNECTING CAMERA" forever. The operator retries
        // by re-selecting Live Camera (which re-runs this effect) or
        // via the retry() affordance exposed by this hook.
        setIsPermissionPending(true);
        setErrorText(
          "Camera permission still pending — allow camera access in the browser and retry.",
        );
      }, CAMERA_PERMISSION_WATCHDOG_MS);

      const res = await openCameraStream();

      if (watchdog !== null) {
        clearTimeout(watchdog);
        watchdog = null;
      }

      if (isDisposed) {
        if (res.ok) res.stream.close();

        return;
      }

      if (!res.ok) {
        setIsPermissionPending(false);
        setErrorText(res.error.message);

        return;
      }

      streamRef.current = res.stream;
      // Readiness is decoupled from the video element: a live stream
      // with a not-yet-mounted video must not strand isReady false
      // forever (the old code set it only inside `if (videoRef.current)`).
      // A late permission grant also clears the watchdog guidance.
      setIsPermissionPending(false);
      setErrorText(null);
      setIsReady(true);
    }

    void initCamera();

    return () => {
      isDisposed = true;
      if (watchdog !== null) {
        clearTimeout(watchdog);
      }
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
    };
  }, [isOpen, attempt]);

  // Attach the acquired stream to the video element in a separate
  // effect, so attach no longer depends on the ref being present at
  // getUserMedia resolve time.
  useEffect(() => {
    if (!isReady || streamRef.current === null) return;
    const video = videoRef.current;

    if (!video) return;

    if (video.srcObject !== streamRef.current.stream) {
      video.srcObject = streamRef.current.stream;
    }

    video.play().catch(() => {});
  }, [isReady, isOpen]);

  return { videoRef, isReady, errorText, isPermissionPending, retry };
}
