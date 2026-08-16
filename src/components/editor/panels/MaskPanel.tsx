import { ClientLogger } from "@/lib/observability/client-logger";
// Custom image-based shape mask for a rule's ROI. Lets the user upload
// or paste an image whose luminance defines which pixels inside the
// rule's bounding rect are considered "inside" the ROI.
//
// Stored on rule.params:
//   - maskImageUrl:  data URL (from FileReader) or absolute URL
//   - maskThreshold: 0..255 grayscale threshold (default 128)
//   - maskInvert:    boolean, flips which side of the threshold is "in"
//   - maskOffsetX:   -1..1 fraction of ROI width, translates the mask
//                    (0 = centered on the ROI)
//   - maskOffsetY:   -1..1 fraction of ROI height (0 = centered)
//   - maskScale:     0.1..4 multiplier (1 = mask covers the ROI exactly)
//   - maskRotationDeg: -180..180 degrees, rotates around the ROI center
//
// The Python worker consumes these to build an actual pixel mask; see
// spec/21-app/62-rule-mask-image.md.
import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, RotateCcw, Trash2 } from "lucide-react";
import type { EditorRule, EditorRuleParams } from "@/lib/editor/types";
import {
  flushPreparedMask,
  getPreparedMask,
  subscribe as subscribeMask,
} from "@/lib/editor/mask-store";
import { parseSvgSource } from "@/components/editor/design-mode/svg-import";

export interface MaskPanelProps {
  rule: EditorRule;
  onUpdateParams: (id: string, params: EditorRuleParams) => void;
}

interface MaskValues {
  url: string;
  threshold: number;
  invert: boolean;
  offsetX: number;
  offsetY: number;
  scale: number;
  rotationDeg: number;
}

// eslint-disable-next-line react-refresh/only-export-components -- read helper is colocated with the panel that owns its schema.
export function readMask(rule: EditorRule): MaskValues {
  const p = rule.params ?? {};
  const url = typeof p.maskImageUrl === "string" ? p.maskImageUrl : "";
  const rawT = typeof p.maskThreshold === "number" ? p.maskThreshold : 128;
  const threshold = clamp255(rawT);
  const invert = p.maskInvert === true;
  const offsetX = typeof p.maskOffsetX === "number" ? clampRange(p.maskOffsetX, -1, 1) : 0;
  const offsetY = typeof p.maskOffsetY === "number" ? clampRange(p.maskOffsetY, -1, 1) : 0;
  const scale = typeof p.maskScale === "number" ? clampRange(p.maskScale, 0.1, 4) : 1;
  const rotationDeg =
    typeof p.maskRotationDeg === "number" ? clampRange(p.maskRotationDeg, -180, 180) : 0;

  return { url, threshold, invert, offsetX, offsetY, scale, rotationDeg };
}

export function MaskPanel({ rule, onUpdateParams }: MaskPanelProps) {
  const value = readMask(rule);
  const fileId = useId();
  const thId = useId();
  const offXId = useId();
  const offYId = useId();
  const scaleId = useId();
  const rotId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const disabled = rule.isLocked;
  const [svgError, setSvgError] = useState<string | null>(null);
  const sourceKind =
    typeof rule.params?.maskSourceKind === "string" ? rule.params.maskSourceKind : "raster";

  const patch = (partial: Partial<MaskValues>, extra: Partial<Record<string, unknown>> = {}) => {
    const next: MaskValues = { ...value, ...partial };
    onUpdateParams(rule.id, {
      ...(rule.params ?? {}),
      maskImageUrl: next.url,
      maskThreshold: next.threshold,
      maskInvert: next.invert,
      maskOffsetX: next.offsetX,
      maskOffsetY: next.offsetY,
      maskScale: next.scale,
      maskRotationDeg: next.rotationDeg,
      ...extra,
    });
  };

  const onPick = (file: File | null | undefined) => {
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      ClientLogger.warn("[MaskPanel] mask image too large (>4 MB), rejected");

      return;
    }
    // Step 26 (RE-10 UI): route .svg files through parseSvgSource so
    // rule.params carries both the raster preview (as a data URL) and
    // the canonical svg/svgPath/viewBox that the Mask primitive
    // (src/lib/editor/mask/primitive.ts) validates. Non-SVG files keep
    // the legacy raster path.
    const isSvg = /svg\+xml$/i.test(file.type) || /\.svg$/i.test(file.name);

    if (isSvg) {
      void file.text().then((text) => {
        try {
          const parsed = parseSvgSource(text);
          const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;
          ClientLogger.info("[MaskPanel] SVG mask accepted", {
            fileName: file.name,
            source: parsed.source,
            viewBox: [parsed.viewBoxW, parsed.viewBoxH],
            bytes: text.length,
          });
          setSvgError(null);
          patch(
            { url: dataUrl },
            {
              maskSourceKind: "svg",
              maskSvg: text,
              maskSvgPath: parsed.svgPath,
              maskViewBoxW: parsed.viewBoxW,
              maskViewBoxH: parsed.viewBoxH,
            },
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          ClientLogger.error("[MaskPanel] SVG mask rejected", { fileName: file.name, error: msg });
          setSvgError(msg);
        }
      });

      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";

      if (dataUrl) {
        setSvgError(null);
        patch(
          { url: dataUrl },
          {
            maskSourceKind: "raster",
            // Clear any prior SVG payload when switching sources.
            maskSvg: undefined,
            maskSvgPath: undefined,
            maskViewBoxW: undefined,
            maskViewBoxH: undefined,
          },
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const clear = () => {
    setSvgError(null);
    patch(
      { url: "" },
      {
        maskSourceKind: undefined,
        maskSvg: undefined,
        maskSvgPath: undefined,
        maskViewBoxW: undefined,
        maskViewBoxH: undefined,
      },
    );
  };

  // Commit hook for "snap to final value" moments. The mask-store
  // returns the last cached variant during live drags (debounced) so
  // scrubbing stays at 60fps. On slider release / numeric commit /
  // invert toggle we bypass the debounce so the preview locks to the
  // exact new value instantly.
  const flushMask = (over: Partial<MaskValues> = {}) => {
    if (!value.url) return;
    const next = { ...value, ...over };
    flushPreparedMask(next.url, next.threshold, next.invert);
  };

  const resetTransform = () => patch({ offsetX: 0, offsetY: 0, scale: 1, rotationDeg: 0 });

  const transformDirty =
    value.offsetX !== 0 || value.offsetY !== 0 || value.scale !== 1 || value.rotationDeg !== 0;

  return (
    <section aria-label="Rule shape mask" className="editor-mask-panel">
      <header className="editor-mask-panel-head">
        <span className="editor-mask-panel-title">
          Shape mask {value.url ? `(${sourceKind === "svg" ? "SVG" : "raster"})` : "(off)"}
        </span>
        <span className="editor-mask-panel-actions">
          <label
            htmlFor={fileId}
            className={`editor-mask-upload ${
              disabled ? "pointer-events-none opacity-50" : "cursor-pointer"
            }`}
          >
            <ImagePlus size={12} aria-hidden /> {value.url ? "Replace" : "Upload"}
          </label>
          <input
            ref={fileRef}
            id={fileId}
            type="file"
            accept="image/*,.svg,image/svg+xml"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              onPick(e.target.files?.[0]);
              // Reset so the same file can be re-picked after clearing.
              e.target.value = "";
            }}
          />
          {value.url ? (
            <button
              type="button"
              aria-label="Remove mask"
              title="Remove mask"
              onClick={clear}
              disabled={disabled}
              className="editor-mask-icon-button"
            >
              <Trash2 size={12} />
            </button>
          ) : null}
        </span>
      </header>
      {svgError ? (
        <p
          role="alert"
          className="rounded-sm border border-ca-err/40 bg-ca-err/10 px-hmi-2 py-hmi-1 text-hmi-caption text-ca-err"
        >
          SVG mask rejected: {svgError}
        </p>
      ) : null}

      {value.url ? (
        <>
          <div className="flex items-start gap-hmi-2">
            <MaskThumbnail url={value.url} threshold={value.threshold} invert={value.invert} />
            <p className="text-hmi-caption text-ca-ink-muted">
              Pixels brighter than the threshold count as inside the ROI. Enable Invert if your mask
              is drawn with black on a light background. The thumbnail updates live as you scrub.
            </p>
          </div>

          <label
            htmlFor={thId}
            className="flex flex-col gap-hmi-1 text-hmi-caption text-ca-ink-muted"
          >
            <span className="flex items-center justify-between">
              <span>Threshold</span>
              <span aria-hidden className="text-ca-ink-muted/70">
                ({value.threshold} / 255)
              </span>
            </span>
            <span className="flex items-center gap-hmi-2">
              <input
                id={thId}
                type="range"
                min={0}
                max={255}
                step={1}
                value={value.threshold}
                disabled={disabled}
                onChange={(e) => patch({ threshold: clamp255(Number(e.target.value)) })}
                onPointerUp={() => flushMask()}
                onKeyUp={() => flushMask()}
                className="flex-1"
                aria-label="Mask threshold"
              />
              <input
                type="number"
                min={0}
                max={255}
                step={1}
                value={value.threshold}
                disabled={disabled}
                onChange={(e) => patch({ threshold: clamp255(Number(e.target.value)) })}
                onBlur={() => flushMask()}
                className="w-16 bg-ca-panel-2 border border-ca-border px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink"
                aria-label="Mask threshold value"
              />
              <button
                type="button"
                onClick={() => {
                  patch({ threshold: 128 });
                  flushMask({ threshold: 128 });
                }}
                disabled={disabled || value.threshold === 128}
                title="Reset threshold to 128"
                aria-label="Reset threshold to 128"
                className="inline-flex h-7 w-7 items-center justify-center border border-ca-border bg-ca-panel text-ca-ink hover:bg-ca-panel-2 disabled:opacity-40"
              >
                <RotateCcw size={11} aria-hidden />
              </button>
            </span>
          </label>

          <label className="inline-flex items-center gap-hmi-2 text-hmi-caption text-ca-ink-muted">
            <input
              type="checkbox"
              checked={value.invert}
              disabled={disabled}
              onChange={(e) => {
                patch({ invert: e.target.checked });
                flushMask({ invert: e.target.checked });
              }}
            />
            Invert mask (dark pixels count as inside)
          </label>

          <div className="mt-hmi-1 flex flex-col gap-hmi-2 border-t border-ca-border pt-hmi-2">
            <div className="flex items-center justify-between">
              <span className="text-hmi-caption uppercase tracking-widest text-ca-ink-muted">
                Transform (ROI-relative)
              </span>
              <button
                type="button"
                onClick={resetTransform}
                disabled={disabled || !transformDirty}
                title="Reset mask transform"
                aria-label="Reset mask transform"
                className="inline-flex items-center gap-1 border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-hmi-caption text-ca-ink hover:bg-ca-panel-2 disabled:opacity-40"
              >
                <RotateCcw size={11} aria-hidden /> Reset
              </button>
            </div>

            <TransformRow
              id={offXId}
              label="Offset X"
              suffix={`${(value.offsetX * 100).toFixed(0)}% of width`}
              min={-1}
              max={1}
              step={0.01}
              displayScale={100}
              displaySuffix="%"
              value={value.offsetX}
              disabled={disabled}
              onChange={(v) => patch({ offsetX: clampRange(v, -1, 1) })}
            />
            <TransformRow
              id={offYId}
              label="Offset Y"
              suffix={`${(value.offsetY * 100).toFixed(0)}% of height`}
              min={-1}
              max={1}
              step={0.01}
              displayScale={100}
              displaySuffix="%"
              value={value.offsetY}
              disabled={disabled}
              onChange={(v) => patch({ offsetY: clampRange(v, -1, 1) })}
            />
            <TransformRow
              id={scaleId}
              label="Scale"
              suffix={`${value.scale.toFixed(2)}x`}
              min={0.1}
              max={4}
              step={0.01}
              displayScale={1}
              displaySuffix="x"
              value={value.scale}
              disabled={disabled}
              onChange={(v) => patch({ scale: clampRange(v, 0.1, 4) })}
            />
            <TransformRow
              id={rotId}
              label="Rotate"
              suffix={`${value.rotationDeg.toFixed(0)}°`}
              min={-180}
              max={180}
              step={1}
              displayScale={1}
              displaySuffix="°"
              value={value.rotationDeg}
              disabled={disabled}
              onChange={(v) => patch({ rotationDeg: clampRange(v, -180, 180) })}
            />
          </div>
        </>
      ) : (
        <p className="editor-mask-empty">
          No mask. Upload a black-and-white image to define a custom ROI shape (e.g. a circle, a
          polygon, a carrier-tape pocket outline).
        </p>
      )}
    </section>
  );
}

interface TransformRowProps {
  id: string;
  label: string;
  suffix: string;
  min: number;
  max: number;
  step: number;
  displayScale: number;
  displaySuffix: string;
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
}

function TransformRow({
  id,
  label,
  suffix,
  min,
  max,
  step,
  displayScale,
  displaySuffix,
  value,
  disabled,
  onChange,
}: TransformRowProps) {
  const numMin = Math.round(min * displayScale);
  const numMax = Math.round(max * displayScale);
  const numStep = step * displayScale >= 1 ? 1 : step * displayScale;

  return (
    <label htmlFor={id} className="flex flex-col gap-hmi-1 text-hmi-caption text-ca-ink-muted">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span aria-hidden className="text-ca-ink-muted/70">
          {suffix}
        </span>
      </span>
      <span className="flex items-center gap-hmi-2">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
          aria-label={label}
        />
        <span className="inline-flex items-center gap-1">
          <input
            type="number"
            min={numMin}
            max={numMax}
            step={numStep}
            value={Number((value * displayScale).toFixed(displayScale === 1 ? 2 : 0))}
            disabled={disabled}
            onChange={(e) => {
              const raw = Number(e.target.value);

              if (Number.isFinite(raw) === false) return;
              onChange(raw / displayScale);
            }}
            className="w-16 bg-ca-panel-2 border border-ca-border px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink"
            aria-label={`${label} value`}
          />
          <span aria-hidden className="text-ca-ink-muted/70">
            {displaySuffix}
          </span>
        </span>
      </span>
    </label>
  );
}

function clamp255(n: number): number {
  if (Number.isFinite(n) === false) return 128;

  if (n < 0) return 0;

  if (n > 255) return 255;

  return Math.round(n);
}

function clampRange(n: number, lo: number, hi: number): number {
  if (Number.isFinite(n) === false) return lo;

  if (n < lo) return lo;

  if (n > hi) return hi;

  return n;
}

// Live preview of the exact thresholded mask that the canvas renderer
// will use. Subscribes to mask-store so it repaints whenever a new
// variant lands (debounced during drags, immediate on commit via
// flushPreparedMask). Zebra background makes transparency obvious.
function MaskThumbnail({
  url,
  threshold,
  invert,
}: {
  url: string;
  threshold: number;
  invert: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Nudge a re-render whenever the store publishes a new prepared
    // variant so the thumbnail catches up after the debounced prep.
    return subscribeMask(() => setTick((t) => (t + 1) & 0xffff));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const prepared = getPreparedMask(url, threshold, invert);

    if (!prepared) return;
    // Fit the source mask into the thumbnail preserving aspect ratio.
    const cw = canvas.width;
    const ch = canvas.height;
    const sw = prepared.width;
    const sh = prepared.height;
    const s = Math.min(cw / sw, ch / sh);
    const dw = sw * s;
    const dh = sh * s;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    ctx.drawImage(prepared.canvas, dx, dy, dw, dh);
  }, [url, threshold, invert, tick]);

  return (
    <div
      className="h-16 w-16 shrink-0 border border-ca-border bg-[repeating-conic-gradient(#2a2a2a_0%_25%,#1c1c1c_0%_50%)_50%/8px_8px]"
      aria-label="Live mask preview"
      title="Live thresholded preview"
    >
      <canvas ref={canvasRef} width={64} height={64} className="h-full w-full" />
    </div>
  );
}
