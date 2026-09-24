import { useEffect, useRef, useState } from "react";
import { openCameraStream, type LiveCameraStream } from "@/lib/camera/live-capture";

export function useCameraStream(isOpen: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<LiveCameraStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isDisposed = false;

    async function initCamera() {
      setErrorText(null);
      setIsReady(false);
      const res = await openCameraStream();

      if (isDisposed) {
        if (res.ok) res.stream.close();

        return;
      }

      if (!res.ok) {
        setErrorText(res.error.message);

        return;
      }

      streamRef.current = res.stream;
      if (videoRef.current) {
        videoRef.current.srcObject = res.stream.stream;
        videoRef.current.play().catch(() => {});
        setIsReady(true);
      }
    }

    void initCamera();

    return () => {
      isDisposed = true;
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  return { videoRef, isReady, errorText };
}
