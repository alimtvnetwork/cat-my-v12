import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 67 step 16 (SU-04): lighting controls store.
//
// Client-only zustand store for lighting-setup values (exposure, gain,
// enhance, darken). Persisted to `localStorage` under
// `StorageKey.LightingControls`. No backend wiring yet: the vendor SDK
// bridge lands in a later slice; this store gives the UI a single source
// of truth so multiple surfaces (`/settings/lighting`, later HUD panels)
// stay in sync.
//
// Every mutator logs via `ClientLogger.info("[lighting-store] set", ...)` so
// misfires are observable in the console instead of silently persisted.
import { create } from "zustand";
import { StorageKey } from "@/lib/constants/storage";

export interface LightingControls {
  /** -100 to 100. Negative darkens, positive brightens. */
  exposure: number;
  /** 0 to 100. Sensor gain / ISO. */
  gain: number;
  /** 0 to 100. Edge enhance strength. */
  enhance: number;
  /** 0 to 100. Darken / black-level shift. */
  darken: number;
}

export const DEFAULT_LIGHTING_CONTROLS: LightingControls = {
  exposure: 0,
  gain: 0,
  enhance: 0,
  darken: 0,
};

export interface LightingStore extends LightingControls {
  setExposure: (value: number) => void;
  setGain: (value: number) => void;
  setEnhance: (value: number) => void;
  setDarken: (value: number) => void;
  reset: () => void;
  hydrate: () => void;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;

  return Math.max(min, Math.min(max, value));
}

function readPersisted(): Partial<LightingControls> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(StorageKey.LightingControls);

    if (!raw) return {};

    return JSON.parse(raw) as Partial<LightingControls>;
  } catch (err) {
    ClientLogger.warn("[lighting-store] failed to read persisted controls", err);

    return {};
  }
}

function persist(controls: LightingControls): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(StorageKey.LightingControls, JSON.stringify(controls));
  } catch (err) {
    ClientLogger.warn("[lighting-store] failed to persist controls", err);
  }
}

export const useLightingStore = create<LightingStore>((set, get) => ({
  ...DEFAULT_LIGHTING_CONTROLS,
  setExposure: (value) => {
    const next = clamp(value, -100, 100);
    ClientLogger.info("[lighting-store] set exposure", next);
    set({ exposure: next });
    persist({ ...get(), exposure: next });
  },
  setGain: (value) => {
    const next = clamp(value, 0, 100);
    ClientLogger.info("[lighting-store] set gain", next);
    set({ gain: next });
    persist({ ...get(), gain: next });
  },
  setEnhance: (value) => {
    const next = clamp(value, 0, 100);
    ClientLogger.info("[lighting-store] set enhance", next);
    set({ enhance: next });
    persist({ ...get(), enhance: next });
  },
  setDarken: (value) => {
    const next = clamp(value, 0, 100);
    ClientLogger.info("[lighting-store] set darken", next);
    set({ darken: next });
    persist({ ...get(), darken: next });
  },
  reset: () => {
    ClientLogger.info("[lighting-store] reset");
    set({ ...DEFAULT_LIGHTING_CONTROLS });
    persist(DEFAULT_LIGHTING_CONTROLS);
  },
  hydrate: () => {
    const persisted = readPersisted();

    if (Object.keys(persisted).length === 0) return;
    const merged: LightingControls = {
      exposure: clamp(persisted.exposure ?? 0, -100, 100),
      gain: clamp(persisted.gain ?? 0, 0, 100),
      enhance: clamp(persisted.enhance ?? 0, 0, 100),
      darken: clamp(persisted.darken ?? 0, 0, 100),
    };
    ClientLogger.info("[lighting-store] hydrate", merged);
    set(merged);
  },
}));
