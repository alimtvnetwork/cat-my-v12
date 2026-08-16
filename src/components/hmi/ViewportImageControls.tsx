import { ClientLogger } from "@/lib/observability/client-logger";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Layers, RotateCcw, X } from "lucide-react";
import { clearReferenceImage, setReferenceImage } from "@/lib/reference-image-store";
import {
  CAMERA_CONTROLS_STORAGE_KEY,
  SAMPLE_SELECTION_STORAGE_KEY,
  type SampleImage,
} from "@/lib/editor/sample-library";
import { useSampleLibrary } from "@/lib/editor/useSampleLibrary";

const MAX_BYTES = 4 * 1024 * 1024;

export function ViewportImageControls() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [povOpen, setPovOpen] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const { library, povMap } = useSampleLibrary();

  // Restore the last-picked sample after refresh so the operator reopens
  // the editor with the same POV framing they left on.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(SAMPLE_SELECTION_STORAGE_KEY);

      if (!raw) return;
      const sample = library.find((s) => s.id === raw);

      if (!sample) return;
      setSelectedSampleId(sample.id);
      setReferenceImage(sample.url);
    } catch (err) {
      ClientLogger.warn("[viewport-camera] restore sample failed", err);
    }
  }, [library]);

  useEffect(() => () => stopStream(), []);

  function stopStream(): void {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function onFile(file: File | null): void {
    setError(null);

    if (!file) return;

    if (file.type.startsWith("image/") === false) return setError("Image files only.");

    if (file.size > MAX_BYTES) return setError("Max 4 MB.");
    const reader = new FileReader();
    reader.onload = () => {
      const r = typeof reader.result === "string" ? reader.result : null;

      if (!r) return setError("Could not read file.");
      try {
        setReferenceImage(r);
      } catch {
        setError("Storage full.");
      }
    };
    reader.onerror = () => setError("Read failed.");
    reader.readAsDataURL(file);
  }

  async function openCamera(): Promise<void> {
    setError(null);
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      ClientLogger.error("[viewport-camera] getUserMedia failed", err);
      setError("Camera unavailable. Check permissions.");
    }
  }

  function closeCamera(): void {
    stopStream();
    setCameraOpen(false);
  }

  function capture(): void {
    const video = videoRef.current;

    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    try {
      setReferenceImage(canvas.toDataURL("image/jpeg", 0.9));
      closeCamera();
    } catch (err) {
      ClientLogger.error("[viewport-camera] capture store failed", err);
      setError("Could not save capture.");
    }
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-md border border-ca-border/60 bg-ca-panel/85 px-2.5 py-1.5 text-hmi-caption text-ca-ink backdrop-blur hover:bg-ca-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus";

  function pickSample(s: SampleImage): void {
    setError(null);
    try {
      setReferenceImage(s.url);
      setPovOpen(false);
      setSelectedSampleId(s.id);
      // Persist the pick so it survives refresh / editor reopen.
      try {
        window.localStorage.setItem(SAMPLE_SELECTION_STORAGE_KEY, s.id);
      } catch (err) {
        ClientLogger.warn("[viewport-camera] persist sample id failed", err);
      }
      // Sync POV-dependent slider values (brightness, contrast, exposure,
      // enhance, saturation, gain) so CameraPreview + capture pipeline
      // match the framing the operator just picked.
      const binding = povMap[s.id];

      if (binding) {
        try {
          window.localStorage.setItem(CAMERA_CONTROLS_STORAGE_KEY, JSON.stringify(binding));
          // Notify any live listener in the same tab (CameraPreview
          // reads on mount; other tabs get storage events for free).
          window.dispatchEvent(
            new StorageEvent("storage", {
              key: CAMERA_CONTROLS_STORAGE_KEY,
              newValue: JSON.stringify(binding),
            }),
          );
        } catch (err) {
          ClientLogger.warn("[viewport-camera] sync camera controls failed", err);
        }
      }
    } catch (err) {
      ClientLogger.error("[viewport-camera] setSample failed", err);
      setError("Could not switch sample.");
    }
  }

  return (
    <>
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => setPovOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={povOpen}
            aria-label="Change POV / pocket count"
            className={btn}
          >
            <Layers size={14} aria-hidden /> POV
          </button>
          {povOpen ? (
            <ul
              role="listbox"
              aria-label="Reference sample POV"
              className="absolute right-0 top-full mt-1 w-56 rounded-md border border-ca-border bg-ca-panel p-1 shadow-hmi-panel"
            >
              {library.map((s) => {
                const active = selectedSampleId === s.id;
                const pocketPart = s.pocketCount
                  ? `${s.pocketCount} pocket${s.pocketCount === 1 ? "" : "s"}`
                  : "PCB";
                const tip = `${pocketPart} - ${s.label} - ${s.fov}`;

                return (
                  <li key={s.id} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onClick={() => pickSample(s)}
                      title={tip}
                      aria-label={tip}
                      className={`group relative flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-hmi-caption text-ca-ink hover:bg-ca-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus ${
                        active ? "bg-ca-panel-2 ring-1 ring-ca-primary" : ""
                      }`}
                    >
                      <img
                        src={s.url}
                        alt=""
                        className="h-8 w-10 shrink-0 rounded-sm object-contain bg-ca-panel"
                      />
                      <span className="flex flex-col leading-tight">
                        <span>{s.label}</span>
                        <span className="text-ca-ink-muted">{s.fov}</span>
                      </span>
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute right-full top-1/2 z-20 mr-2 -translate-y-1/2 whitespace-nowrap rounded border border-ca-border bg-ca-panel px-2 py-1 text-hmi-caption text-ca-ink opacity-0 shadow-hmi-panel transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                      >
                        <span className="font-medium">{pocketPart}</span>
                        <span className="mx-1 text-ca-ink-muted">·</span>
                        <span>{s.label}</span>
                        <span className="mx-1 text-ca-ink-muted">·</span>
                        <span className="text-ca-ink-muted">{s.fov}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={btn}
          aria-label="Switch image"
        >
          <ImagePlus size={14} aria-hidden /> Switch image
        </button>
        <button type="button" onClick={openCamera} className={btn} aria-label="Capture from camera">
          <Camera size={14} aria-hidden /> Capture
        </button>
        <button
          type="button"
          onClick={() => clearReferenceImage()}
          className={btn}
          aria-label="Reset to sample"
        >
          <RotateCcw size={14} aria-hidden />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="sr-only"
          aria-label="Upload reference image"
          onChange={(e) => {
            onFile(e.target.files?.[0] ?? null);

            if (e.target) e.target.value = "";
          }}
        />
      </div>
      {error ? (
        <div
          className="absolute right-3 top-14 z-10 rounded border border-ca-ng/50 bg-ca-panel/90 px-2 py-1 text-hmi-caption text-ca-ng"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {cameraOpen ? (
        <div
          role="dialog"
          aria-label="Camera capture"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-ca-viewport/85 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-2xl rounded-md border border-ca-border bg-ca-panel p-hmi-3 shadow-hmi-panel">
            <div className="flex items-center justify-between pb-hmi-2">
              <h3 className="text-hmi-title font-semibold uppercase tracking-wide text-ca-ink">
                Capture image
              </h3>
              <button
                type="button"
                onClick={closeCamera}
                aria-label="Close camera"
                className="rounded p-1 text-ca-ink-muted hover:bg-ca-panel-2 hover:text-ca-ink"
              >
                <X size={14} />
              </button>
            </div>
            <div className="overflow-hidden rounded border border-ca-border bg-black">
              <video ref={videoRef} playsInline muted className="block h-auto w-full" />
            </div>
            <div className="mt-hmi-3 flex justify-end gap-hmi-2">
              <button
                type="button"
                onClick={closeCamera}
                className="inline-flex min-h-10 items-center rounded-md border border-ca-border px-hmi-4 py-hmi-2 text-hmi-body text-ca-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capture}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-ca-primary px-hmi-4 py-hmi-2 text-hmi-body font-medium text-ca-chrome-ink"
              >
                <Camera size={14} aria-hidden /> Capture frame
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
