import { ClientLogger } from "@/lib/observability/client-logger";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  clearReferenceImage,
  getReferenceImage,
  setReferenceImage,
  subscribe,
} from "@/lib/stores/reference-image-store";
import { useSampleLibrary } from "@/lib/editor/useSampleLibrary";
import {
  buildCaptureRequest,
  CameraCaptureError,
  CameraErrorKindType,
  captureReferenceFromCamera,
  type CameraErrorKind,
  type CaptureRequest,
} from "@/lib/camera/capture-bridge";
import {
  addCaptureToHistory,
  type CaptureHistoryEntry,
  getCaptureHistory,
  removeCaptureFromHistory,
  subscribeCaptureHistory,
} from "@/lib/stores/capture-history-store";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

// Per-shot override form state. Each numeric slot holds a string so the
// input stays fully controlled while the user is typing (including "-"
// and "0."); the capture handler parses and drops blanks / NaN so the
// persisted preset value passes through untouched for that field.
interface OverrideForm {
  povId: string;
  brightness: string;
  contrast: string;
  exposure: string;
  gain: string;
  enhance: string;
  saturation: string;
}

const EMPTY_OVERRIDES: OverrideForm = {
  povId: "",
  brightness: "",
  contrast: "",
  exposure: "",
  gain: "",
  enhance: "",
  saturation: "",
};

const NUMERIC_OVERRIDE_FIELDS: {
  key: Exclude<keyof OverrideForm, "povId">;
  label: string;
  step: number;
  hint: string;
}[] = [
  { key: "brightness", label: "Brightness", step: 1, hint: "one-shot" },
  { key: "contrast", label: "Contrast", step: 1, hint: "one-shot" },
  { key: "exposure", label: "Exposure", step: 1, hint: "one-shot" },
  { key: "gain", label: "Gain", step: 1, hint: "one-shot" },
  { key: "enhance", label: "Enhance", step: 1, hint: "one-shot" },
  { key: "saturation", label: "Saturation", step: 1, hint: "one-shot" },
];

function buildOverridesFromForm(form: OverrideForm): CaptureRequest {
  const out: CaptureRequest = {};
  const povId = form.povId.trim();

  if (povId.length > 0) out.povId = povId;
  for (const { key } of NUMERIC_OVERRIDE_FIELDS) {
    const raw = form[key].trim();

    if (raw.length === 0) continue;
    const num = Number(raw);

    if (Number.isFinite(num)) out[key] = num;
  }

  return out;
}

function countActiveOverrides(form: OverrideForm): number {

  return Object.values(buildOverridesFromForm(form)).filter((v) => v !== undefined).length;
}

interface CaptureErrorState {
  kind: CameraErrorKind | "upload";
  title: string;
  message: string;
  retryable: boolean;
  showCameraSettings: boolean;
}

const CAMERA_ERROR_META: Record<
  CameraErrorKind,
  { title: string; retryable: boolean; showCameraSettings: boolean }
> = {
  unavailable: {
    title: "No camera detected",
    retryable: true,
    showCameraSettings: true,
  },
  timeout: {
    title: "Camera did not respond",
    retryable: true,
    showCameraSettings: true,
  },
  sdk: {
    title: "Camera SDK failure",
    retryable: true,
    showCameraSettings: true,
  },
  network: {
    title: "Capture service unreachable",
    retryable: true,
    showCameraSettings: false,
  },
  invalid: {
    title: "Invalid capture request",
    retryable: false,
    showCameraSettings: true,
  },
};

export function ReferenceImageCard(): React.JSX.Element | null {
  const [current, setCurrent] = useState<string | null>(() => getReferenceImage());
  const [error, setError] = useState<CaptureErrorState | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [history, setHistory] = useState<CaptureHistoryEntry[]>(() => getCaptureHistory());
  const [overrides, setOverrides] = useState<OverrideForm>(EMPTY_OVERRIDES);
  const [overridesOpen, setOverridesOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { library: sampleLibrary } = useSampleLibrary();

  useEffect(() => {

    return () => {
      if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current);
    };
  }, []);

  const armDelete = (id: string) => {
    if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current);
    setPendingDeleteId(id);
    pendingDeleteTimer.current = setTimeout(() => {
      setPendingDeleteId((cur) => (cur === id ? null : cur));
    }, 3000);
  };

  const cancelDelete = () => {
    if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current);
    setPendingDeleteId(null);
  };

  const confirmDelete = (id: string) => {
    if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current);
    setPendingDeleteId(null);
    removeCaptureFromHistory(id);
  };
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => subscribe(setCurrent), []);
  useEffect(() => subscribeCaptureHistory(setHistory), []);

  const setUploadError = (message: string) =>
    setError({
      kind: "upload",
      title: "Upload failed",
      message,
      retryable: false,
      showCameraSettings: false,
    });

  const onFile = (file: File | null) => {
    setError(null);

    if (!file) return;

    if (file.type.startsWith("image/") === false) {
      setUploadError("File must be an image (PNG or JPEG).");

      return;
    }

    if (file.size > MAX_BYTES) {
      setUploadError(`Image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Max 4 MB.`);

      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setUploadError("Could not read the selected file.");
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;

      if (result === null) {
        setUploadError("Unexpected file reader result.");

        return;
      }

      try {
        setReferenceImage(result);
      } catch {
        setUploadError("Storage quota exceeded. Use a smaller image.");
      }
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    clearReferenceImage();

    if (inputRef.current) inputRef.current.value = "";
  };

  const capture = async () => {
    if (capturing) return;
    setError(null);
    setCapturing(true);
    // Snapshot the persisted camera controls so the vendor SDK captures a
    // frame that matches the operator's configured POV / brightness /
    // contrast / exposure / gain / lighting, then layer any per-shot
    // overrides on top. Overrides are transient: they never touch the
    // persisted preset in localStorage.
    const perShot = buildOverridesFromForm(overrides);
    const request = buildCaptureRequest(perShot);
    ClientLogger.info("[ReferenceImageCard] capture request", request, {
      overrides: Object.keys(perShot),
    });
    try {
      // Pass the raw per-shot overrides so the bridge can log which
      // fields were overridden vs. taken from the persisted preset.
      const shot = await captureReferenceFromCamera(perShot);
      setReferenceImage(shot.dataUrl);
      addCaptureToHistory({
        dataUrl: shot.dataUrl,
        width: shot.width,
        height: shot.height,
        povId: request.povId,
      });
    } catch (err) {
      if (err instanceof CameraCaptureError) {
        const meta = CAMERA_ERROR_META[err.kind];
        setError({ kind: err.kind, message: err.message, ...meta });
      } else {
        setError({
          kind: CameraErrorKindType.Sdk,
          title: "Camera capture failed",
          message:
            err instanceof Error && err.message
              ? err.message
              : "Unexpected error while capturing from the camera.",
          retryable: true,
          showCameraSettings: true,
        });
      }
    } finally {
      setCapturing(false);
    }
  };

  const overrideCount = countActiveOverrides(overrides);
  const setOverrideField = (key: keyof OverrideForm, value: string) =>
    setOverrides((prev) => ({ ...prev, [key]: value }));
  const clearOverrides = () => setOverrides(EMPTY_OVERRIDES);

  return (
    <section className="space-y-hmi-2 max-w-lg" aria-labelledby="reference-image-heading">
      <h2
        id="reference-image-heading"
        className="text-hmi-title uppercase tracking-wide text-ca-ink"
      >
        Reference image
      </h2>
      <p className="text-hmi-body text-ca-ink-muted">
        Photograph of the board or part shown behind rule layers in the setup canvas and beneath the
        live viewport. Stored locally in this browser. PNG or JPEG, 4 MB max.
      </p>
      <div className="border border-ca-border rounded-md overflow-hidden bg-ca-panel">
        {current ? (
          <img
            src={current}
            alt="Reference image preview"
            className="block h-40 w-full object-contain bg-ca-panel"
          />
        ) : (
          <div className="flex h-40 items-center justify-center text-hmi-body text-ca-ink-muted">
            Using the shipped PCB sample
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-hmi-3">
        <label className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink cursor-pointer">
          Upload image
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button
          type="button"
          onClick={reset}
          disabled={current === null}
          className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink disabled:opacity-50"
        >
          Reset to sample
        </button>
        <button
          type="button"
          onClick={() => void capture()}
          disabled={capturing}
          aria-busy={capturing}
          className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink disabled:opacity-60"
          title={
            overrideCount > 0
              ? `Capture with ${overrideCount} one-shot override${overrideCount === 1 ? "" : "s"} on top of the persisted preset`
              : "Capture a fresh frame using the persisted camera preset (POV, brightness, contrast, exposure, gain)"
          }
        >
          {capturing
            ? "Capturing…"
            : overrideCount > 0
              ? `Capture (${overrideCount} override${overrideCount === 1 ? "" : "s"})`
              : "Capture from camera"}
        </button>
      </div>
      <div className="border border-ca-border rounded-md bg-ca-panel">
        <button
          type="button"
          onClick={() => setOverridesOpen((v) => !v)}
          aria-expanded={overridesOpen}
          aria-controls="capture-overrides-body"
          className="flex w-full items-center justify-between gap-hmi-2 px-hmi-3 py-hmi-2 text-left text-hmi-body text-ca-ink"
        >
          <span>One-shot overrides</span>
          <span className="text-hmi-caption text-ca-ink-muted">
            {overrideCount > 0 ? `${overrideCount} active` : "off, using preset"}
            <span className="ml-hmi-2">{overridesOpen ? "▾" : "▸"}</span>
          </span>
        </button>
        {overridesOpen && (
          <div
            id="capture-overrides-body"
            className="border-t border-ca-border p-hmi-3 space-y-hmi-2"
          >
            <p className="text-hmi-caption text-ca-ink-muted">
              Values here apply to the next capture only and do not modify your persisted preset.
              Leave a field blank to keep the preset value for that control.
            </p>
            <label className="flex items-center gap-hmi-2 text-hmi-caption text-ca-ink">
              <span className="w-24 shrink-0">POV</span>
              <input
                type="text"
                value={overrides.povId}
                onChange={(e) => setOverrideField("povId", e.target.value)}
                placeholder="preset"
                className="min-h-8 flex-1 border border-ca-border bg-ca-viewport px-hmi-2 text-ca-ink"
                aria-label="POV override for the next capture"
              />
            </label>
            {NUMERIC_OVERRIDE_FIELDS.map((f) => (
              <label
                key={f.key}
                className="flex items-center gap-hmi-2 text-hmi-caption text-ca-ink"
              >
                <span className="w-24 shrink-0">{f.label}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  step={f.step}
                  value={overrides[f.key]}
                  onChange={(e) => setOverrideField(f.key, e.target.value)}
                  placeholder="preset"
                  className="min-h-8 flex-1 border border-ca-border bg-ca-viewport px-hmi-2 text-ca-ink tabular-nums"
                  aria-label={`${f.label} override for the next capture`}
                />
              </label>
            ))}
            <div className="flex items-center justify-end gap-hmi-2 pt-hmi-1">
              <button
                type="button"
                onClick={clearOverrides}
                disabled={overrideCount === 0}
                className="inline-flex items-center min-h-8 px-hmi-3 py-hmi-1 border border-ca-border text-hmi-caption text-ca-ink disabled:opacity-50"
              >
                Clear overrides
              </button>
            </div>
          </div>
        )}
      </div>
      {history.length > 0 && (
        <div className="space-y-hmi-2" aria-labelledby="capture-history-heading">
          <div className="flex items-baseline justify-between gap-hmi-2">
            <h3
              id="capture-history-heading"
              className="text-hmi-body uppercase tracking-wide text-ca-ink-muted"
            >
              Recent captures
            </h3>
            <span className="text-hmi-caption text-ca-ink-muted">{history.length} saved</span>
          </div>
          <ul
            className="flex gap-hmi-2 overflow-x-auto pb-hmi-1"
            role="list"
            aria-label="Recent camera captures"
          >
            {history.map((h) => {
              const active = current === h.dataUrl;
              const when = new Date(h.capturedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <li key={h.id} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setReferenceImage(h.dataUrl)}
                    aria-pressed={active}
                    aria-label={`Use capture from ${when}${h.povId ? `, POV ${h.povId}` : ""}`}
                    title={`Captured ${when}${h.povId ? ` — POV ${h.povId}` : ""}`}
                    className={`flex flex-col gap-hmi-1 border p-hmi-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus ${
                      active
                        ? "border-ca-primary bg-ca-primary/10"
                        : "border-ca-border bg-ca-panel hover:border-ca-primary"
                    }`}
                  >
                    <img src={h.dataUrl} alt="" className="h-14 w-20 object-contain bg-ca-panel" />
                    <span className="text-hmi-caption text-ca-ink-muted">{when}</span>
                  </button>
                  {pendingDeleteId === h.id ? (
                    <div
                      className="absolute top-0 right-0 inline-flex items-center gap-hmi-1 border border-ca-ng bg-ca-panel px-hmi-1 text-hmi-caption"
                      role="group"
                      aria-label={`Confirm remove capture from ${when}`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(h.id);
                        }}
                        aria-label={`Confirm remove capture from ${when}`}
                        className="text-ca-ng hover:underline"
                      >
                        Delete?
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelDelete();
                        }}
                        aria-label="Cancel remove"
                        className="text-ca-ink-muted hover:text-ca-ink"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        armDelete(h.id);
                      }}
                      aria-label={`Remove capture from ${when}`}
                      className="absolute top-0 right-0 inline-flex h-5 w-5 items-center justify-center border border-ca-border bg-ca-panel text-hmi-caption text-ca-ink-muted hover:text-ca-ng"
                    >
                      ×
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="space-y-hmi-2">
        <h3 className="text-hmi-body uppercase tracking-wide text-ca-ink-muted">Sample gallery</h3>
        <p className="text-hmi-caption text-ca-ink-muted">
          Pick a built-in sample. Carrier-tape variants show different pocket counts, matching your
          camera field of view (FOV).
        </p>
        <div
          className="flex items-center gap-hmi-2"
          role="group"
          aria-label="Carrier-tape pocket count"
        >
          <span className="text-hmi-caption text-ca-ink-muted">Pockets</span>
          {[1, 2, 3, 4].map((n) => {
            const match = sampleLibrary.find(
              (s) => s.category === "carrier-tape" && s.pocketCount === n,
            );
            const active = match ? current === match.url : false;

            return (
              <button
                key={n}
                type="button"
                disabled={!match}
                onClick={() => match && setReferenceImage(match.url)}
                aria-pressed={active}
                title={match ? `Use ${match.label} (${match.fov})` : `No ${n}-pocket sample`}
                className={`inline-flex items-center justify-center min-h-8 min-w-8 px-hmi-2 border text-hmi-body disabled:opacity-40 ${
                  active
                    ? "border-ca-primary bg-ca-primary/10 text-ca-ink"
                    : "border-ca-border text-ca-ink hover:border-ca-primary"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-hmi-2">
          {sampleLibrary.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setReferenceImage(s.url);
              }}
              className="flex flex-col gap-hmi-1 border border-ca-border bg-ca-panel p-hmi-1 text-left hover:border-ca-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
              aria-label={`Use ${s.label}`}
            >
              <img src={s.url} alt="" className="h-16 w-full object-contain bg-ca-panel" />
              <span className="text-hmi-caption text-ca-ink">{s.label}</span>
              <span className="text-hmi-caption text-ca-ink-muted">{s.fov}</span>
            </button>
          ))}
        </div>
      </div>
      {error && (
        <div
          className="border border-ca-ng bg-ca-ng/10 p-hmi-3 space-y-hmi-2"
          role="alert"
          aria-live="polite"
          data-error-kind={error.kind}
        >
          <div className="flex items-baseline justify-between gap-hmi-2">
            <p className="text-hmi-body text-ca-ng uppercase tracking-wide">{error.title}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-hmi-caption text-ca-ink-muted hover:text-ca-ink"
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          </div>
          <p className="text-hmi-caption text-ca-ink">{error.message}</p>
          <div className="flex flex-wrap items-center gap-hmi-2">
            {error.retryable && (
              <button
                type="button"
                onClick={() => void capture()}
                disabled={capturing}
                className="inline-flex items-center min-h-8 px-hmi-3 py-hmi-1 border border-ca-border text-hmi-caption text-ca-ink disabled:opacity-60"
              >
                {capturing ? "Retrying…" : "Retry capture"}
              </button>
            )}
            {error.showCameraSettings && (
              <Link
                to="/settings/camera"
                className="inline-flex items-center min-h-8 px-hmi-3 py-hmi-1 border border-ca-border text-hmi-caption text-ca-ink"
              >
                Open camera settings
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
