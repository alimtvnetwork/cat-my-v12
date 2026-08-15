import { useState, useRef, useEffect } from "react";
import { Images, Upload, Video, ArrowUp, ArrowDown, Pencil, Trash2 } from "lucide-react";
import type { Project } from "@/lib/projects/store";
import { useImageSamples } from "@/lib/image-samples/useImageSamples";
import type { ImageSample } from "@/lib/image-samples/model";
import { openCameraStream, watchCameraDevices } from "@/lib/camera/live-capture";
import { captureFrameFromStream } from "@/lib/camera/capture-frame";
import {
  messageForCameraError,
  type CameraPermissionMessage,
} from "@/lib/camera/permission-messages";
import type { CameraCapabilityError } from "@/lib/camera/capability";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

const MAX_SAMPLE_BYTES = 8 * 1024 * 1024; // 8 MB guard for base64 payloads.

function readImageFile(
  file: File,
): Promise<{ dataUrl: string; width: number; height: number; byteSize: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        resolve({
          dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          byteSize: file.size,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function ImageSamplesSection({ project }: { project: Project }) {
  const { all, save, remove, reorder, nextOrderIndex } = useImageSamples(project.id);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [permError, setPermError] = useState<{
    message: CameraPermissionMessage;
    code: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraBound = Boolean(project.cameraSettingId);
  const [videoDeviceCount, setVideoDeviceCount] = useState<number | null>(null);
  const isNonCameraBound = !cameraBound;

  useEffect(() => {
    if (isNonCameraBound) {
      setVideoDeviceCount(null);

      return;
    }

    const unsub = watchCameraDevices((devices) => {
      setVideoDeviceCount(devices.length);
      console.info("[project-editor/samples] devices changed", {
        projectId: project.id,
        count: devices.length,
      });
    });

    return () => {
      unsub();
      setVideoDeviceCount(null);
    };
  }, [cameraBound, project.id]);
  const noDevices = cameraBound && videoDeviceCount === 0;

  async function onFiles(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      let nextIndex = nextOrderIndex();
      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/") === false) {
          throw new Error(`"${file.name}" is not an image (${file.type || "unknown"}).`);
        }

        if (file.size > MAX_SAMPLE_BYTES) {
          throw new Error(
            `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB; max is 8 MB.`,
          );
        }

        const { dataUrl, width, height, byteSize } = await readImageFile(file);
        const entry: ImageSample = {
          id: `img_${Math.random().toString(36).slice(2, 10)}`,
          projectId: project.id,
          name: file.name,
          dataUrl,
          width,
          height,
          byteSize,
          capturedAt: new Date().toISOString(),
          source: "upload",
          orderIndex: nextIndex,
        };
        nextIndex += 1;
        await save(entry);
        console.info("[project-editor/samples] uploaded", {
          projectId: project.id,
          id: entry.id,
          bytes: byteSize,
          dims: [width, height],
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[project-editor/samples] upload failed", e);
      setError(msg);
    } finally {
      setBusy(false);

      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRename(sample: ImageSample): Promise<void> {
    const next = window.prompt("Rename sample", sample.name);

    if (!next || next.trim() === "" || next.trim() === sample.name) return;
    try {
      await save({ ...sample, name: next.trim() });
      console.info("[project-editor/samples] renamed", { id: sample.id, name: next.trim() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[project-editor/samples] rename failed", e);
      setError(msg);
    }
  }

  async function onRemove(sample: ImageSample): Promise<void> {
    if (window.confirm(`Delete sample "${sample.name}"?`) === false) return;
    try {
      await remove(sample.id);
      console.info("[project-editor/samples] removed", { id: sample.id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[project-editor/samples] remove failed", e);
      setError(msg);
    }
  }

  async function onCaptureLive(): Promise<void> {
    if (capturing) return;
    setError(null);
    setPermError(null);
    setCapturing(true);
    const openResult = await openCameraStream();

    if (openResult.ok === false) {
      const err: CameraCapabilityError = openResult.error;
      console.error("[project-editor/samples] live capture: open failed", err);
      setPermError({ message: messageForCameraError(err), code: err.code });
      setCapturing(false);

      return;
    }

    const live = openResult.stream;
    try {
      const frame = await captureFrameFromStream(live.stream);
      const entry: ImageSample = {
        id: `img_${Math.random().toString(36).slice(2, 10)}`,
        projectId: project.id,
        name: `Capture ${new Date().toISOString().slice(0, 19).replace("T", " ")}`,
        dataUrl: frame.dataUrl,
        width: frame.width,
        height: frame.height,
        byteSize: frame.byteSize,
        capturedAt: new Date().toISOString(),
        source: "camera",
        orderIndex: nextOrderIndex(),
      };
      await save(entry);
      console.info("[project-editor/samples] captured from camera", {
        projectId: project.id,
        id: entry.id,
        dims: [frame.width, frame.height],
        bytes: frame.byteSize,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[project-editor/samples] live capture: frame failed", e);
      setError(msg);
    } finally {
      live.close();
      setCapturing(false);
    }
  }

  async function onMove(index: number, delta: -1 | 1): Promise<void> {
    const next = index + delta;

    if (next < 0 || next >= all.length) return;
    const ids = all.map((s) => s.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    try {
      await reorder(ids);
      console.info("[project-editor/samples] reordered", {
        projectId: project.id,
        from: index,
        to: next,
      });
    } catch (e) {
      console.error("[project-editor/samples] reorder failed", e);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onReorderTo(fromIndex: number, toIndex: number): Promise<void> {
    if (fromIndex < 0 || fromIndex >= all.length) return;
    const clampedTo = Math.max(0, Math.min(all.length, toIndex));
    const ids = all.map((s) => s.id);
    const [moved] = ids.splice(fromIndex, 1);
    const insertAt = clampedTo > fromIndex ? clampedTo - 1 : clampedTo;
    ids.splice(insertAt, 0, moved);

    if (ids.every((id, i) => id === all[i]!.id)) return;
    try {
      await reorder(ids);
      console.info("[project-editor/samples] reordered", {
        projectId: project.id,
        from: fromIndex,
        to: insertAt,
        via: "dnd-or-keyboard",
      });
    } catch (e) {
      console.error("[project-editor/samples] reorder failed", e);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <section
      aria-label="Image Samples"
      className="rounded-lg border border-ca-border bg-ca-panel p-hmi-4"
      data-testid="project-editor-image-samples"
    >
      <div className="flex items-center justify-between gap-hmi-3">
        <div className="flex items-center gap-hmi-2">
          <Images aria-hidden size={18} className="text-ca-ink-muted" />
          <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            Image Samples
          </h2>
          <span
            aria-label={`${all.length} samples`}
            className="inline-flex min-w-[2rem] justify-center rounded-md border border-ca-border bg-ca-panel-2 px-hmi-2 py-0.5 font-mono text-[13px] tabular-nums text-ca-ink"
          >
            {all.length}
          </span>
        </div>
        <div className="flex items-center gap-hmi-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-hmi-2 rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink transition hover:border-ca-select disabled:opacity-50"
            data-testid="samples-upload-btn"
          >
            <Upload aria-hidden size={16} />
            {busy ? "Uploading…" : "Upload"}
          </button>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={
                    cameraBound && !capturing && !noDevices ? () => void onCaptureLive() : undefined
                  }
                  aria-disabled={!cameraBound || capturing || noDevices}
                  aria-busy={capturing || undefined}
                  data-live-capture-disabled={!cameraBound || noDevices || undefined}
                  data-video-device-count={videoDeviceCount ?? undefined}
                  className={
                    "inline-flex items-center gap-hmi-2 rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink transition hover:border-ca-select " +
                    (!cameraBound || capturing || noDevices ? "opacity-50 cursor-not-allowed" : "")
                  }
                  data-testid="samples-capture-btn"
                >
                  <Video aria-hidden size={16} />
                  {capturing ? "Capturing…" : "Capture from live camera"}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {!cameraBound
                  ? "Bind a camera setting first, then live capture unlocks."
                  : noDevices
                    ? "No video input detected. Plug in a camera or grant permission."
                    : "Capture a single frame from your webcam via getUserMedia."}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => void onFiles(e.target.files)}
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-hmi-2 text-hmi-caption text-ca-ng">
          {error}
        </p>
      ) : null}
      {noDevices && !permError ? (
        <p
          role="status"
          aria-live="polite"
          data-testid="samples-no-devices-notice"
          className="mt-hmi-2 rounded-md border border-ca-border bg-ca-panel-2 p-hmi-2 text-hmi-caption text-ca-ink-muted"
        >
          No camera detected. Connect a device or grant browser permission and it will appear here
          automatically.
        </p>
      ) : null}
      {permError ? (
        <div
          role="alert"
          aria-live="polite"
          data-testid="samples-permission-banner"
          data-permission-code={permError.code}
          className="mt-hmi-2 flex items-start justify-between gap-hmi-3 rounded-md border border-ca-ng/40 bg-ca-ng/10 p-hmi-3 text-hmi-body text-ca-ink"
        >
          <div className="min-w-0">
            <p className="font-semibold">{permError.message.title}</p>
            <p className="mt-0.5 text-hmi-caption text-ca-ink-muted">{permError.message.help}</p>
            <p className="mt-1 font-mono text-[11px] text-ca-ink-muted">{permError.code}</p>
          </div>
          <div className="flex items-center gap-hmi-2">
            {permError.message.actionable ? (
              <button
                type="button"
                onClick={() => void onCaptureLive()}
                disabled={capturing}
                className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-1 text-hmi-caption text-ca-ink hover:border-ca-select disabled:opacity-50"
                data-testid="samples-permission-retry"
              >
                Retry
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setPermError(null)}
              aria-label="Dismiss camera permission notice"
              className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-hmi-caption text-ca-ink-muted hover:border-ca-select"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      {all.length === 0 ? (
        <p className="mt-hmi-3 rounded-md border border-dashed border-ca-border bg-ca-panel-2 p-hmi-3 text-hmi-body text-ca-ink-muted">
          No samples yet. Upload one or capture from the bound camera.
        </p>
      ) : (
        <ul className="mt-hmi-3 grid grid-cols-3 gap-hmi-3" data-testid="samples-grid">
          {all.map((s, i) => (
            <li
              key={s.id}
              className={
                "group relative flex flex-col overflow-hidden rounded-md border bg-ca-panel-2 transition hover:border-ca-select focus-within:border-ca-select outline-none focus-visible:ring-2 focus-visible:ring-ca-select " +
                (dragId === s.id ? "border-ca-select opacity-60 " : "border-ca-border ") +
                (dropIndex !== null &&
                (dropIndex === i || (dropIndex === all.length && i === all.length - 1))
                  ? "ring-2 ring-ca-select "
                  : "")
              }
              data-testid="sample-row"
              data-index={i}
              tabIndex={0}
              aria-label={`Sample ${i + 1} of ${all.length}: ${s.name}. Press Alt plus arrow keys to reorder.`}
              aria-grabbed={dragId === s.id || undefined}
              draggable
              onDragStart={(e) => {
                setDragId(s.id);
                e.dataTransfer.effectAllowed = "move";
                try {
                  e.dataTransfer.setData("text/plain", s.id);
                } catch {
                  /* Safari can throw on some MIME types; harmless */
                }
              }}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                const rect = (e.currentTarget as HTMLLIElement).getBoundingClientRect();
                const before = e.clientY - rect.top < rect.height / 2;
                setDropIndex(before ? i : i + 1);
              }}
              onDragLeave={() => {
              }}
              onDrop={(e) => {
                if (dragId === null) return;
                e.preventDefault();
                const fromIndex = all.findIndex((x) => x.id === dragId);
                const toIndex = dropIndex ?? i;
                setDragId(null);
                setDropIndex(null);
                void onReorderTo(fromIndex, toIndex);
              }}
              onDragEnd={() => {
                setDragId(null);
                setDropIndex(null);
              }}
              onKeyDown={(e) => {
                if (!e.altKey) return;

                if (KeyboardKeyType.isArrowUp(e.key) || KeyboardKeyType.isArrowLeft(e.key)) {
                  e.preventDefault();
                  void onMove(i, -1);
                } else if (
                  KeyboardKeyType.isArrowDown(e.key) ||
                  KeyboardKeyType.isArrowRight(e.key)
                ) {
                  e.preventDefault();
                  void onMove(i, 1);
                }
              }}
            >
              <div className="relative aspect-square h-24 w-full overflow-hidden bg-ca-panel">
                <img
                  src={s.dataUrl}
                  alt={s.name}
                  className="h-full w-full object-contain bg-ca-panel"
                  loading="lazy"
                />
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-1 bg-ca-panel/85 p-1 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
                  data-testid="sample-hover-actions"
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Move sample up"
                      onClick={() => void onMove(i, -1)}
                      disabled={i === 0}
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-ca-border bg-ca-panel text-ca-ink transition hover:border-ca-select disabled:opacity-40"
                      data-testid="sample-move-up"
                    >
                      <ArrowUp aria-hidden size={12} />
                    </button>
                    <button
                      type="button"
                      aria-label="Move sample down"
                      onClick={() => void onMove(i, 1)}
                      disabled={i === all.length - 1}
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-ca-border bg-ca-panel text-ca-ink transition hover:border-ca-select disabled:opacity-40"
                      data-testid="sample-move-down"
                    >
                      <ArrowDown aria-hidden size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Rename sample"
                      onClick={() => void onRename(s)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-ca-border bg-ca-panel text-ca-ink transition hover:border-ca-select"
                    >
                      <Pencil aria-hidden size={12} />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete sample"
                      onClick={() => void onRemove(s)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-ca-border bg-ca-panel text-ca-ng transition hover:border-ca-select"
                    >
                      <Trash2 aria-hidden size={12} />
                    </button>
                  </div>
                </div>
                <span
                  className="absolute bottom-1 left-1 inline-flex min-w-[1.25rem] justify-center rounded-sm border border-ca-border bg-ca-panel/85 px-1 py-0.5 font-mono text-[11px] tabular-nums text-ca-ink backdrop-blur-sm"
                  aria-hidden
                >
                  {i + 1}
                </span>
              </div>
              <div className="min-w-0 px-hmi-2 py-1">
                <p
                  className="truncate font-display text-hmi-caption font-semibold text-ca-ink"
                  title={s.name}
                >
                  {s.name}
                </p>
                <p className="truncate font-mono text-[11px] tabular-nums text-ca-ink-muted">
                  {s.width}×{s.height} · {(s.byteSize / 1024).toFixed(1)} KB
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
