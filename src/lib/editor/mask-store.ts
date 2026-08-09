// Per-rule mask image store. Rules can carry a `maskImageUrl` param
// (data URL or asset URL) plus `maskThreshold` (0..255) and
// `maskInvert` (boolean). This module loads each URL lazily, converts
// it into a grayscale->alpha offscreen canvas keyed by
// (url, threshold, invert), and lets the renderer subscribe to reload
// events when a new mask finishes decoding.
//
// The offscreen canvas has the SAME pixel dimensions as the source
// image. Callers scale it to the rule's rect at draw time.
//
// Performance notes:
//   - `prepare()` scans every pixel of the source image and is the
//     hot path during threshold slider drags. To keep the UI at 60fps
//     while the user scrubs, `getPreparedMask` returns the most
//     recently cached variant immediately and schedules the real
//     prepare on a short debounce. When the debounced prepare
//     finishes, subscribers are notified so the canvas repaints with
//     the exact mask.
//   - The per-URL variant cache is capped (LRU) so slider drags do
//     not leak hundreds of full-size canvases.

export interface PreparedMask {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

interface Entry {
  image: HTMLImageElement;
  ready: boolean;
  /**
   * LRU-ordered cache: on read/write we delete + re-insert so the
   * oldest key is always Map.keys().next().value. Capped at
   * MAX_VARIANTS.
   */
  variants: Map<string, PreparedMask>;
  /** Latest successful prepare, returned as a fallback while a new
   *  variant is being debounced/computed. */
  latest: PreparedMask | null;
  /** Debounced prepare state per URL. Only one pending prepare at a
   *  time; newer requests supersede older ones. */
  pendingKey: string | null;
  pendingTimer: ReturnType<typeof setTimeout> | null;
}

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

const MAX_VARIANTS = 8;
const PREPARE_DEBOUNCE_MS = 120;

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* ignore */
    }
  });
}

export function getPreparedMask(
  url: string,
  threshold: number,
  invert: boolean,
): PreparedMask | null {
  if (!url || typeof document === "undefined") return null;
  let entry = entries.get(url);

  if (!entry) {
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";
    entry = {
      image,
      ready: false,
      variants: new Map(),
      latest: null,
      pendingKey: null,
      pendingTimer: null,
    };
    entries.set(url, entry);
    image.onload = () => {
      const e = entries.get(url);

      if (e) {
        e.ready = true;
        e.variants.clear();
        e.latest = null;
        notify();
      }
    };
    image.onerror = () => {
      console.error("[mask-store] failed to load mask image", url.slice(0, 64));
    };
    image.src = url;

    return null;
  }

  if (!entry.ready) return null;
  const th = clamp255(threshold);
  const key = `${th}|${invert ? 1 : 0}`;
  const cached = entry.variants.get(key);

  if (cached) {
    // LRU touch so hot keys survive eviction during slider drags.
    entry.variants.delete(key);
    entry.variants.set(key, cached);

    return cached;
  }
  // Miss: schedule the heavy pixel scan on a debounce so rapid
  // slider changes don't stall the canvas. Return the previously
  // cached mask (if any) so rendering stays responsive; the canvas
  // will repaint via notify() once the exact mask is ready.
  schedulePrepare(url, entry, key, th, invert);

  return entry.latest;
}

// Bypasses the debounce and prepares the exact variant synchronously.
// Meant for "commit" moments in interactive controls: slider release
// (pointer/keyup), invert toggle, numeric commit. Keeps live drags
// smooth (debounced) while snapping the preview to the final value
// instantly.
export function flushPreparedMask(
  url: string,
  threshold: number,
  invert: boolean,
): PreparedMask | null {
  if (!url || typeof document === "undefined") return null;
  const entry = entries.get(url);

  if (!entry || !entry.ready) return null;

  if (entry.pendingTimer !== null) {
    clearTimeout(entry.pendingTimer);
    entry.pendingTimer = null;
    entry.pendingKey = null;
  }

  const th = clamp255(threshold);
  const key = `${th}|${invert ? 1 : 0}`;
  const cached = entry.variants.get(key);

  if (cached) {
    entry.variants.delete(key);
    entry.variants.set(key, cached);
    entry.latest = cached;
    notify();

    return cached;
  }

  const prepared = prepare(entry.image, th, invert);

  if (!prepared) return entry.latest;
  while (entry.variants.size >= MAX_VARIANTS) {
    const oldest = entry.variants.keys().next().value;

    if (oldest === undefined) break;
    entry.variants.delete(oldest);
  }

  entry.variants.set(key, prepared);
  entry.latest = prepared;
  notify();

  return prepared;
}

function schedulePrepare(
  url: string,
  entry: Entry,
  key: string,
  threshold: number,
  invert: boolean,
): void {
  // A newer request supersedes any in-flight timer.
  if (entry.pendingTimer !== null) {
    clearTimeout(entry.pendingTimer);
    entry.pendingTimer = null;
  }

  entry.pendingKey = key;
  entry.pendingTimer = setTimeout(() => {
    entry.pendingTimer = null;
    // Re-check: another consumer may have prepared this exact key
    // (or a newer key superseded us).
    if (entry.pendingKey !== key) return;
    entry.pendingKey = null;

    if (!entry.ready) return;

    if (entry.variants.has(key)) {
      notify();

      return;
    }

    const prepared = prepare(entry.image, threshold, invert);

    if (!prepared) return;
    // Evict oldest entries until we are under the cap.
    while (entry.variants.size >= MAX_VARIANTS) {
      const oldest = entry.variants.keys().next().value;

      if (oldest === undefined) break;
      entry.variants.delete(oldest);
    }

    entry.variants.set(key, prepared);
    entry.latest = prepared;
    notify();
  }, PREPARE_DEBOUNCE_MS);
}

function prepare(image: HTMLImageElement, threshold: number, invert: boolean): PreparedMask | null {
  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;

  if (w <= 0 || h <= 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, w, h);
  } catch (err) {
    console.error("[mask-store] getImageData failed (likely CORS)", err);

    return { canvas, width: w, height: h };
  }

  const buf = data.data;
  for (let i = 0; i < buf.length; i += 4) {
    // Grayscale luminance from RGB, ignore input alpha as an "empty" cue
    // by using the input alpha as a floor so fully-transparent pixels
    // stay transparent regardless of threshold direction.
    const r = buf[i];
    const g = buf[i + 1];
    const b = buf[i + 2];
    const a = buf[i + 3];
    const lum = (r * 299 + g * 587 + b * 114) / 1000;
    const on = invert ? lum <= threshold : lum >= threshold;
    const alpha = on && a > 0 ? 255 : 0;
    // Paint the shape as opaque white so callers can tint it if needed.
    buf[i] = 255;
    buf[i + 1] = 255;
    buf[i + 2] = 255;
    buf[i + 3] = alpha;
  }

  ctx.putImageData(data, 0, 0);

  return { canvas, width: w, height: h };
}

function clamp255(n: number): number {
  if (Number.isFinite(n) === false) return 128;

  if (n < 0) return 0;

  if (n > 255) return 255;

  return Math.round(n);
}
