import { useEffect, useMemo, useRef, useState } from "react";
import { fetchCameraDefaults } from "@/lib/camera/capture-bridge";

/**
 * Live camera setup preview with lighting-enhancement and darkening/contrast
 * controls. Renders a live webcam feed (via getUserMedia) when available; when
 * no camera is granted, falls back to a synthetic test pattern so operators
 * can still tune the filter chain offline. All adjustments are applied client-
 * side via CSS `filter` on a <video>/<canvas> element - no vendor SDK calls.
 */
export type CameraSetupControls = {
  /** 0.5 - 2.0, multiplicative on luminance. */
  brightness: number;
  /** 0.5 - 2.0, contrast around mid-gray. */
  contrast: number;
  /** -100 - 100, additive shift toward black (negative = darker). */
  exposure: number;
  /** 0 - 100, unsharp-mask style edge boost applied via saturate+contrast. */
  enhance: number;
  /** 0 - 200, saturation percentage (100 = passthrough). */
  saturation: number;
  /** 0 - 100, sensor gain / ISO multiplier (worker-side; UI stores value only). */
  gain?: number;
  /** Camera point-of-view preset id. Consumed by the vendor SDK via IPC. */
  povId?: string;
};

// eslint-disable-next-line react-refresh/only-export-components -- default snapshot is part of the preview's own contract.
export const DEFAULT_CAMERA_CONTROLS: CameraSetupControls = {
  brightness: 1.0,
  contrast: 1.0,
  exposure: 0,
  enhance: 0,
  saturation: 100,
  gain: 0,
  povId: "top-down",
};

// eslint-disable-next-line react-refresh/only-export-components -- preset list is authored alongside the preview that renders it.
export const POV_PRESETS: readonly { id: string; label: string }[] = [
  { id: "top-down", label: "Top-down (0 deg)" },
  { id: "tilt-30", label: "Tilt 30 deg" },
  { id: "tilt-45", label: "Tilt 45 deg" },
  { id: "side", label: "Side (90 deg)" },
  { id: "custom", label: "Custom" },
];

type Props = {
  /** localStorage key so each screen (camera / lighting) persists its own tuning. */
  storageKey: string;
  /** Extra label rendered above the sliders (e.g. "Lighting enhancement"). */
  heading?: string;
  /**
   * Fires on every controls mutation after hydration. The lighting
   * settings route uses this to mirror edits into `useLightingStore`
   * so other surfaces (setup landing readout, future HUD panels) see
   * live values without reloading. Not called during the initial
   * hydration render.
   */
  onControlsChange?: (controls: CameraSetupControls) => void;
};

function loadControls(key: string): CameraSetupControls {
  if (typeof window === "undefined") return DEFAULT_CAMERA_CONTROLS;
  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) return DEFAULT_CAMERA_CONTROLS;
    const parsed = JSON.parse(raw) as Partial<CameraSetupControls>;

    return { ...DEFAULT_CAMERA_CONTROLS, ...parsed };
  } catch {
    return DEFAULT_CAMERA_CONTROLS;
  }
}

function buildFilter(c: CameraSetupControls): string {
  // exposure maps -100..100 -> brightness delta -0.5..+0.5
  const expo = 1 + c.exposure / 200;
  const enhanceContrast = 1 + c.enhance / 200;

  return [
    `brightness(${(c.brightness * expo).toFixed(3)})`,
    `contrast(${(c.contrast * enhanceContrast).toFixed(3)})`,
    `saturate(${c.saturation}%)`,
  ].join(" ");
}

export function CameraPreview({ storageKey, heading, onControlsChange }: Props): React.JSX.Element | null {
  // SSR-safe: default first, hydrate persisted controls after mount so the
  // filter/CSS values render identically on the first client paint (same
  // hydration-mismatch class as preview-mode-store.ts).
  const [controls, setControls] = useState<CameraSetupControls>(DEFAULT_CAMERA_CONTROLS);
  const [controlsHydrated, setControlsHydrated] = useState(false);
  useEffect(() => {
    setControls(loadControls(storageKey));
    setControlsHydrated(true);
  }, [storageKey]);
  const [status, setStatus] = useState<"idle" | "live" | "denied" | "unavailable">("idle");
  // Reset-camera-controls UX state. `resetting` disables the button
  // while we round-trip to the worker; `resetStatus` carries a short
  // note ("Restored worker defaults" vs "Worker unavailable, restored
  // built-in defaults") that auto-clears after a few seconds.
  const [resetting, setResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isControlsUnhydrated = !controlsHydrated;

  useEffect(() => {
    if (isControlsUnhydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(controls));
    onControlsChange?.(controls);
  }, [controls, storageKey, controlsHydrated, onControlsChange]);

  useEffect(() => {
    let isCancelled = false;
    const media = navigator.mediaDevices;

    if (!media?.getUserMedia) {
      setStatus("unavailable");

      return;
    }

    media
      .getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
      .then((s) => {
        if (isCancelled) {
          s.getTracks().forEach((t) => t.stop());

          return;
        }

        streamRef.current = s;

        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => undefined);
        }

        setStatus("live");
      })
      .catch(() => {
        if (!isCancelled) setStatus("denied");
      });

    return () => {
      isCancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const filter = useMemo(() => buildFilter(controls), [controls]);

  const set = <K extends keyof CameraSetupControls>(k: K, v: CameraSetupControls[K]) =>
    setControls((prev) => ({ ...prev, [k]: v }));

  // Reset persisted POV + slider values back to whatever the worker
  // currently reports as its defaults. If the worker is unreachable or
  // returns a bad payload the endpoint falls back to the UI's built-in
  // defaults so the button always resets something predictable, and we
  // annotate the status line with the resolved source.
  const resetToWorkerDefaults = async () => {
    if (resetting) return;
    setResetting(true);
    setResetStatus(null);
    try {
      const result = await fetchCameraDefaults();
      const merged: CameraSetupControls = {
        ...DEFAULT_CAMERA_CONTROLS,
        ...(typeof result.defaults.brightness === "number"
          ? { brightness: result.defaults.brightness }
          : {}),
        ...(typeof result.defaults.contrast === "number"
          ? { contrast: result.defaults.contrast }
          : {}),
        ...(typeof result.defaults.exposure === "number"
          ? { exposure: result.defaults.exposure }
          : {}),
        ...(typeof result.defaults.enhance === "number"
          ? { enhance: result.defaults.enhance }
          : {}),
        ...(typeof result.defaults.saturation === "number"
          ? { saturation: result.defaults.saturation }
          : {}),
        ...(typeof result.defaults.gain === "number" ? { gain: result.defaults.gain } : {}),
        ...(typeof result.defaults.povId === "string" ? { povId: result.defaults.povId } : {}),
      };
      setControls(merged);
      setResetStatus(
        result.source === "worker"
          ? "Restored worker defaults."
          : `Worker unavailable (${result.reason ?? "unknown"}). Restored built-in defaults.`,
      );
    } finally {
      setResetting(false);
    }
  };

  // Auto-clear the status line so it doesn't linger.
  useEffect(() => {
    if (resetStatus === null) return;
    const id = window.setTimeout(() => setResetStatus(null), 4000);

    return () => window.clearTimeout(id);
  }, [resetStatus]);

  return (
    <div className="grid gap-hmi-4 md:grid-cols-[minmax(0,1fr)_320px] p-hmi-4">
      <div className="relative bg-ca-viewport border border-ca-border overflow-hidden aspect-video">
        {status === "live" ? (
          <video
            data-testid="camera-preview-settled"
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-contain bg-ca-panel"
            style={{ filter }}
          />
        ) : (
          <div
            data-testid="camera-preview-settled"
            className="w-full h-full grid place-items-center text-hmi-caption text-ca-ink-muted"
            style={{
              filter,
              background:
                "repeating-linear-gradient(45deg, oklch(0.28 0.01 264) 0 12px, oklch(0.22 0.01 264) 12px 24px)",
            }}
          >
            {status === "denied"
              ? "Camera access denied. Adjustments preview against test pattern."
              : status === "unavailable"
                ? "No camera device. Adjustments preview against test pattern."
                : "Initializing preview..."}
          </div>
        )}
        <div className="absolute top-hmi-2 left-hmi-2 px-hmi-2 py-hmi-1 bg-ca-chrome text-ca-chrome-ink text-hmi-badge uppercase tracking-wider">
          {status === "live" ? "Live" : "Preview"}
        </div>
      </div>

      <div className="flex flex-col gap-hmi-3 bg-ca-panel border border-ca-border p-hmi-3">
        {heading ? <div className="text-hmi-header text-ca-ink">{heading}</div> : null}

        <label className="flex flex-col gap-hmi-1">
          <span className="flex justify-between text-hmi-body text-ca-ink">
            <span>Point of view (POV)</span>
          </span>
          <select
            value={controls.povId ?? "top-down"}
            onChange={(e) => set("povId", e.target.value)}
            className="min-h-9 border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink"
          >
            {POV_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <Slider
          label="Brightness (lighting enhance)"
          min={0.5}
          max={2}
          step={0.01}
          value={controls.brightness}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={(v) => set("brightness", v)}
        />
        <Slider
          label="Contrast"
          min={0.5}
          max={2}
          step={0.01}
          value={controls.contrast}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={(v) => set("contrast", v)}
        />
        <Slider
          label="Exposure / darken"
          min={-100}
          max={100}
          step={1}
          value={controls.exposure}
          format={(v) => (v > 0 ? `+${v}` : `${v}`)}
          onChange={(v) => set("exposure", v)}
        />
        <Slider
          label="Edge enhance"
          min={0}
          max={100}
          step={1}
          value={controls.enhance}
          format={(v) => `${v}`}
          onChange={(v) => set("enhance", v)}
        />
        <Slider
          label="Saturation"
          min={0}
          max={200}
          step={1}
          value={controls.saturation}
          format={(v) => `${v}%`}
          onChange={(v) => set("saturation", v)}
        />
        <Slider
          label="Gain / ISO"
          min={0}
          max={100}
          step={1}
          value={controls.gain ?? 0}
          format={(v) => `${v}`}
          onChange={(v) => set("gain", v)}
        />

        <div className="mt-hmi-2 flex flex-col gap-hmi-1">
          <div className="flex gap-hmi-2">
            <button
              type="button"
              onClick={() => void resetToWorkerDefaults()}
              disabled={resetting}
              aria-busy={resetting}
              className="flex-1 px-hmi-3 py-hmi-1 border border-ca-border text-hmi-body text-ca-ink hover:bg-ca-panel-2 disabled:opacity-60"
              title="Fetch the vendor worker's current defaults and clear the persisted POV / slider values back to them"
            >
              {resetting ? "Resetting…" : "Reset camera controls"}
            </button>
            <button
              type="button"
              onClick={() => {
                setControls(DEFAULT_CAMERA_CONTROLS);
                setResetStatus("Restored built-in defaults.");
              }}
              className="px-hmi-3 py-hmi-1 border border-ca-border text-hmi-body text-ca-ink hover:bg-ca-panel-2"
              title="Restore the UI's built-in defaults without contacting the worker"
            >
              Built-in
            </button>
          </div>
          <div
            className="text-hmi-caption text-ca-ink-muted min-h-4"
            role="status"
            aria-live="polite"
          >
            {resetStatus ?? ""}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Slider as TokenSlider } from "@/components/ui/slider";

type SliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
};

function Slider({ label, min, max, step, value, format, onChange }: SliderProps) {
  return (
    <label className="flex flex-col gap-hmi-2">
      <span className="flex justify-between text-hmi-body text-ca-ink">
        <span>{label}</span>
        <span className="font-hmi-mono text-ca-ink-muted">{format(value)}</span>
      </span>
      <div className="h-6 flex items-center">
        <TokenSlider
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={(vals) => onChange(vals[0])}
        />
      </div>
    </label>
  );
}
