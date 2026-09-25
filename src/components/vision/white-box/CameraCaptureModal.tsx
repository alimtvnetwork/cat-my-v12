import { Camera, RefreshCw, X } from "lucide-react";
import { useCameraStream } from "./useCameraStream";
import type { WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";

export interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (input: WhiteBoxMarkingInput) => void;
}

export function CameraCaptureModal({ isOpen, onClose, onCapture }: CameraCaptureModalProps): React.JSX.Element | null {
  const { videoRef, isReady, errorText } = useCameraStream(isOpen);

  function handleCapture(): void {
    const video = videoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;
    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    const img = ctx.getImageData(0, 0, video.videoWidth, video.videoHeight);
    onCapture({ width: video.videoWidth, height: video.videoHeight, rgba: img.data });
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex w-full max-w-lg flex-col rounded-lg border border-ca-border bg-ca-panel p-4 shadow-xl text-ca-ink">
        <div className="flex items-center justify-between border-b border-ca-border pb-2.5">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Camera className="h-4 w-4 text-ca-select" />
            <span>Live Camera Capture</span>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-ca-ink-muted hover:text-ca-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative my-3 aspect-video w-full overflow-hidden rounded border border-ca-border bg-black flex items-center justify-center">
          <video ref={videoRef} playsInline autoPlay muted className="h-full w-full object-contain" />
          {!isReady && !errorText && (
            <div className="absolute flex items-center gap-2 text-xs text-ca-ink-muted">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Connecting to camera stream...</span>
            </div>
          )}
          {errorText && (
            <div className="absolute p-4 text-center text-xs text-rose-400 font-mono">{errorText}</div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1 border-t border-ca-border">
          <button type="button" onClick={onClose} className="rounded border border-ca-border px-3 py-1.5 text-xs">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCapture}
            disabled={!isReady}
            className="rounded bg-ca-select px-4 py-1.5 text-xs font-semibold text-ca-bg disabled:opacity-50 hover:opacity-90"
          >
            Capture Frame
          </button>
        </div>
      </div>
    </div>
  );
}
