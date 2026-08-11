// Plan 80 steps 17 + 18. Canvas prefs facade (browser IndexedDB via idb-keyval).
//
// Root cause the facade fixes, in one sentence: Grid & Adjust panes hold
// their state in local React `useState`, so every route change (or even
// re-mount of the Properties palette) resets the operator's grid density,
// snap toggle, and brightness/contrast/gamma tweaks. Without a facade the
// panes cannot be persisted, replayed, or swapped for a real SDK later.
//
// Public surface (mirrors swatches/facade.ts patterns):
//   - `canvasPrefsFacade.get()` / `.setGrid(patch)` / `.setAdjust(patch)` / `.reset()`
//   - `useCanvasPrefs()` — subscribable hook backed by useSyncExternalStore.
//
// Every method is Promise-returning and best-effort: IDB errors are logged
// through `logger.warn` with a stable code and never surface to the UI.

import { useSyncExternalStore } from "react";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { logger } from "@/lib/editor/errors";

const KEY = "ca.v4.canvas-prefs.v1";

export type GridSpacing = 8 | 16 | 32 | 64;

export interface CanvasGridPrefs {
  show: boolean;
  snap: boolean;
  spacing: GridSpacing;
}

export interface CanvasAdjustPrefs {
  brightness: number; // -100 .. 100
  contrast: number; // -100 .. 100
  gamma: number; // 0.2 .. 3.0
}

export enum ImageChannelType {
  Rgb = "rgb",
  R = "r",
  G = "g",
  B = "b",
  A = "a",
}
export type ImageChannel = ImageChannelType;

export interface CanvasImagePrefs {
  channel: ImageChannel;
}

export interface CanvasPrefs {
  grid: CanvasGridPrefs;
  adjust: CanvasAdjustPrefs;
  image: CanvasImagePrefs;
}

export const DEFAULT_CANVAS_PREFS: CanvasPrefs = {
  grid: { show: true, snap: true, spacing: 16 },
  adjust: { brightness: 0, contrast: 0, gamma: 1 },
  image: { channel: ImageChannelType.Rgb },
};

function clampSpacing(n: unknown): GridSpacing {
  return n === 8 || n === 16 || n === 32 || n === 64 ? n : 16;
}

function clampNum(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;

  return Math.min(max, Math.max(min, v));
}

function normalize(raw: unknown): CanvasPrefs {
  const r = (raw ?? {}) as Partial<CanvasPrefs>;
  const g = (r.grid ?? {}) as Partial<CanvasGridPrefs>;
  const a = (r.adjust ?? {}) as Partial<CanvasAdjustPrefs>;
  const i = (r.image ?? {}) as Partial<CanvasImagePrefs>;
  const ch: ImageChannel =
    i.channel === ImageChannelType.R ||
    i.channel === ImageChannelType.G ||
    i.channel === ImageChannelType.B ||
    i.channel === ImageChannelType.A
      ? i.channel
      : ImageChannelType.Rgb;

  return {
    grid: {
      show: typeof g.show === "boolean" ? g.show : DEFAULT_CANVAS_PREFS.grid.show,
      snap: typeof g.snap === "boolean" ? g.snap : DEFAULT_CANVAS_PREFS.grid.snap,
      spacing: clampSpacing(g.spacing),
    },
    adjust: {
      brightness: clampNum(a.brightness, -100, 100, 0),
      contrast: clampNum(a.contrast, -100, 100, 0),
      gamma: clampNum(a.gamma, 0.2, 3, 1),
    },
    image: { channel: ch },
  };
}

let cache: CanvasPrefs = { ...DEFAULT_CANVAS_PREFS };
let isLoaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) {
    try {
      l();
    } catch (err) {
      logger.warn("W_UI_CANVAS_PREFS_LISTENER_THREW", {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

async function ensureLoaded(): Promise<void> {
  if (isLoaded) return;
  try {
    const raw = await idbGet<CanvasPrefs | undefined>(KEY);
    cache = normalize(raw);
  } catch (err) {
    logger.warn("W_UI_CANVAS_PREFS_LOAD_FAILED", {
      message: err instanceof Error ? err.message : String(err),
    });
  } finally {
    isLoaded = true;
    emit();
  }
}

async function persist(): Promise<void> {
  try {
    await idbSet(KEY, cache);
  } catch (err) {
    logger.warn("W_UI_CANVAS_PREFS_PERSIST_FAILED", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export const canvasPrefsFacade = {
  async get(): Promise<CanvasPrefs> {
    await ensureLoaded();

    return cache;
  },
  async setGrid(patch: Partial<CanvasGridPrefs>): Promise<void> {
    await ensureLoaded();
    cache = normalize({ ...cache, grid: { ...cache.grid, ...patch } });
    logger.info("I_UI_CANVAS_PREFS_GRID_SET", { ...patch });
    emit();
    void persist();
  },
  async setAdjust(patch: Partial<CanvasAdjustPrefs>): Promise<void> {
    await ensureLoaded();
    cache = normalize({ ...cache, adjust: { ...cache.adjust, ...patch } });
    logger.info("I_UI_CANVAS_PREFS_ADJUST_SET", { ...patch });
    emit();
    void persist();
  },
  async setImage(patch: Partial<CanvasImagePrefs>): Promise<void> {
    await ensureLoaded();
    cache = normalize({ ...cache, image: { ...cache.image, ...patch } });
    logger.info("I_UI_CANVAS_PREFS_IMAGE_SET", { ...patch });
    emit();
    void persist();
  },
  async reset(): Promise<void> {
    cache = { ...DEFAULT_CANVAS_PREFS };
    logger.info("I_UI_CANVAS_PREFS_RESET", {});
    emit();
    void persist();
  },
  getSnapshot(): CanvasPrefs {
    return cache;
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb);
    void ensureLoaded();

    return () => {
      listeners.delete(cb);
    };
  },
};

export function useCanvasPrefs(): CanvasPrefs {
  return useSyncExternalStore(
    canvasPrefsFacade.subscribe,
    canvasPrefsFacade.getSnapshot,
    canvasPrefsFacade.getSnapshot,
  );
}