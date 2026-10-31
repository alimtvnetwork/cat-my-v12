import { ClientLogger } from "@/lib/observability/client-logger";
import { ErrorSourceType } from "@/lib/errors/error-record";
/**
 * Plan 64 steps 62-64: PaletteState registry.
 *
 * Persists per-palette dock/float/min/max state to localStorage. DB-backed
 * per-user persistence is scheduled with the `saveRule` server-fn migration
 * (Plan 64 step 85) so both writes share one migration/lockfile bump.
 *
 * See 02-spec/24-app-ui-design-system/41-panel-docking-model.md.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createFacadeStateStorage } from "@/lib/projects/facade";
import { reportError } from "@/lib/errors/error-bus";

export enum PaletteIdType {
  Layers = "layers",
  Preview = "preview",
  Tools = "tools",
  Userfunctions = "userFunctions",
}
export type PaletteId = PaletteIdType;
export enum PaletteModeType {
  Docked = "docked",
  Floating = "floating",
  Minimized = "minimized",
  Maximized = "maximized",
  Hidden = "hidden",
}
export type PaletteMode = PaletteModeType;

export interface PaletteState {
  id: PaletteId;
  mode: PaletteMode;
  x: number;
  y: number;
  w: number;
  h: number;
}

// NOTE: keep the same key the facade adapter has been migrating (Plan 80
// step 33). `createFacadeStateStorage` reads legacy `ca-hmi:palette.layout.v1`
// implicitly? No: the previous store used `loadJson/saveJson` which prefixes
// with `ca-hmi:`, so the legacy key on disk is `ca-hmi:palette.layout.v1`.
// We keep that exact name here so the facade one-shot migration picks it up.
const STORE_KEY = "ca-hmi:palette.layout.v1";

const DEFAULTS: Readonly<Record<PaletteId, PaletteState>> = {
  layers: { id: PaletteIdType.Layers, mode: PaletteModeType.Docked, x: 0, y: 0, w: 280, h: 480 },
  preview: { id: PaletteIdType.Preview, mode: PaletteModeType.Docked, x: 0, y: 0, w: 640, h: 480 },
  tools: { id: PaletteIdType.Tools, mode: PaletteModeType.Docked, x: 0, y: 0, w: 240, h: 480 },
  userFunctions: {
    id: PaletteIdType.Userfunctions,
    mode: PaletteModeType.Hidden,
    x: 0,
    y: 0,
    w: 320,
    h: 400,
  },
};

interface PaletteStore {
  states: Record<PaletteId, PaletteState>;
  hydrated: boolean;
  hydrate: () => void;
  set: (id: PaletteId, patch: Partial<PaletteState>) => void;
  reset: () => void;
  // Bridge contract (spec 03 §1.2 defect 1) for the Window menu worker
  // (WindowMenu / WindowMenubarGroup own the workspace system): palette
  // ids intentionally overlap workspace registry titles but are distinct
  // panels — workspace "tools" is the icon ribbon, palette "Tools" is the
  // rule-kind palette; workspace "layers" is the layer stack, palette
  // "layers" has no frame; "userFunctions" exists only here. Call restore
  // / restoreHidden from the Window menu so a palette hidden in this
  // store gains a restore path in the other system. No third store: both
  // systems keep their own state, these actions are the seam.
  restore: (id: PaletteId) => void;
  restoreHidden: () => void;
}

// Defect 3 (spec 03 §1.2): persisted layout is untrusted input. A stale
// or corrupted `ca-hmi:palette.layout.v1` used to merge straight over the
// defaults, so an off-screen floating palette or an unknown mode survived
// every restart until Reset Layout. Every field below is validated on
// load; an invalid field falls back to its default with a logged warning,
// and a valid user layout passes through untouched. Hidden is a valid mode
// and is never discarded here (its restore path is the PaletteFrame strip).
function isPaletteMode(value: unknown): value is PaletteMode {
  return (
    typeof value === "string" &&
    (Object.values(PaletteModeType) as string[]).includes(value)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizePaletteGeometry(
  fallback: PaletteState,
  stored: Partial<PaletteState>,
): Pick<PaletteState, "x" | "y" | "w" | "h"> {
  const x = isFiniteNumber(stored.x) ? stored.x : fallback.x;
  const y = isFiniteNumber(stored.y) ? stored.y : fallback.y;
  const w = isFiniteNumber(stored.w) && stored.w > 0 ? stored.w : fallback.w;
  const h = isFiniteNumber(stored.h) && stored.h > 0 ? stored.h : fallback.h;

  if (stored.x !== undefined && x !== stored.x) {
    ClientLogger.warn("[palette-store] discarding invalid palette geometry", {
      panelId: fallback.id,
      field: "x",
      value: stored.x,
    });
  }

  if (stored.y !== undefined && y !== stored.y) {
    ClientLogger.warn("[palette-store] discarding invalid palette geometry", {
      panelId: fallback.id,
      field: "y",
      value: stored.y,
    });
  }

  if (stored.w !== undefined && w !== stored.w) {
    ClientLogger.warn("[palette-store] discarding invalid palette geometry", {
      panelId: fallback.id,
      field: "w",
      value: stored.w,
    });
  }

  if (stored.h !== undefined && h !== stored.h) {
    ClientLogger.warn("[palette-store] discarding invalid palette geometry", {
      panelId: fallback.id,
      field: "h",
      value: stored.h,
    });
  }

  return { x, y, w, h };
}

function sanitizePaletteEntry(
  fallback: PaletteState,
  stored: Partial<PaletteState> | undefined,
): PaletteState {
  if (stored === undefined || stored === null || typeof stored !== "object") {
    return { ...fallback };
  }

  let mode = fallback.mode;

  if (stored.mode !== undefined) {
    if (isPaletteMode(stored.mode)) {
      mode = stored.mode;
    } else {
      ClientLogger.warn("[palette-store] discarding unknown palette mode", {
        panelId: fallback.id,
        mode: stored.mode,
      });

      mode = fallback.mode;
    }
  }

  const geometry = sanitizePaletteGeometry(fallback, stored);
  let rectX = geometry.x;
  let rectY = geometry.y;

  // Only floating geometry is positional: docked / minimized / maximized
  // frames ignore x/y, so an off-screen x/y there is inert and kept.
  if (mode === PaletteModeType.Floating && typeof window !== "undefined") {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isOffScreen =
      rectX >= viewportWidth ||
      rectY >= viewportHeight ||
      rectX + geometry.w <= 0 ||
      rectY + geometry.h <= 0;

    if (isOffScreen) {
      ClientLogger.warn("[palette-store] resetting off-screen floating palette", {
        panelId: fallback.id,
        x: rectX,
        y: rectY,
        w: geometry.w,
        h: geometry.h,
      });

      rectX = fallback.x;
      rectY = fallback.y;
    }
  }

  return { id: fallback.id, mode, x: rectX, y: rectY, w: geometry.w, h: geometry.h };
}

function mergeStates(
  loaded: Partial<Record<PaletteId, Partial<PaletteState>>> | undefined,
): Record<PaletteId, PaletteState> {
  const merged: Record<PaletteId, PaletteState> = { ...DEFAULTS };

  if (!loaded) return merged;

  if (typeof loaded === "object" && Array.isArray(loaded) === false) {
    for (const key of Object.keys(loaded)) {
      if ((Object.keys(DEFAULTS) as string[]).includes(key) === false) {
        ClientLogger.warn("[palette-store] discarding unknown palette id", { panelId: key });
      }
    }
  }

  for (const k of Object.keys(DEFAULTS) as PaletteId[]) {
    merged[k] = sanitizePaletteEntry(DEFAULTS[k], loaded[k]);
  }

  return merged;
}

// Plan 80 step 33: route persistence through the SDK facade (spec 21/52).
// The legacy `loadJson/saveJson` helpers wrote a raw payload at the same
// key; `merge` below accepts both the raw payload and the zustand
// `{ state: { states }, version }` envelope so no operator loses their
// palette layout across the upgrade. Persistence failures still emit
// `E_LAYOUT_PERSIST_FAILED` through the error bus via a custom storage
// wrapper so quota-exceeded / serialize errors surface as toasts.
function makeInstrumentedStorage() {
  const inner = createFacadeStateStorage();

  return {
    getItem: async (name: string) => inner.getItem(name),
    setItem: async (name: string, value: string) => {
      try {
        await inner.setItem(name, value);
      } catch (err) {
        reportError(ErrorSourceType.Manual, err, {
          code: "E_LAYOUT_PERSIST_FAILED",
          panelId: "*",
          reason: err instanceof Error ? err.name : "UnknownError",
          storageKey: name,
        });
        ClientLogger.warn("[palette-store] persist failed", err);

        throw err;
      }
    },
    removeItem: async (name: string) => inner.removeItem(name),
  };
}

export const usePaletteStore = create<PaletteStore>()(
  persist(
    (set, get) => ({
      states: DEFAULTS,
      hydrated: false,
      hydrate: () => {
        // Kept for API compatibility with existing callers. Persist
        // middleware hydrates automatically; we just flip the flag once.
        if (get().hydrated) return;
        set({ hydrated: true });
      },
      set: (id, patch) => {
        const next = { ...get().states, [id]: { ...get().states[id], ...patch, id } };
        set({ states: next });
      },
      reset: () => {
        set({ states: { ...DEFAULTS } });
        ClientLogger.info("[palette-store] layout reset to defaults");
      },
      restore: (id) => {
        set({
          states: {
            ...get().states,
            [id]: { ...get().states[id], mode: PaletteModeType.Docked, id },
          },
        });
      },
      restoreHidden: () => {
        const states = get().states;
        const next: Record<PaletteId, PaletteState> = { ...states };

        for (const k of Object.keys(states) as PaletteId[]) {
          if (states[k].mode === PaletteModeType.Hidden) {
            next[k] = { ...states[k], mode: PaletteModeType.Docked };
          }
        }

        set({ states: next });
      },
    }),
    {
      name: STORE_KEY,
      storage: createJSONStorage(() => makeInstrumentedStorage()),
      partialize: (s) => ({ states: s.states }),
      merge: (persisted, current) => {
        const src = (persisted ?? {}) as Record<string, unknown>;
        // Legacy shape: raw `Record<PaletteId, PaletteState>` at the top.
        // New shape: `{ states: Record<PaletteId, PaletteState> }`.
        const loaded =
          src.states && typeof src.states === "object"
            ? (src.states as Partial<Record<PaletteId, Partial<PaletteState>>>)
            : (src as Partial<Record<PaletteId, Partial<PaletteState>>>);

        return { ...current, states: mergeStates(loaded), hydrated: true };
      },
    },
  ),
);

// Plan 80 step 41: cross-tab sync via BroadcastChannel.
import { wireCrossTabRehydrate } from "@/lib/projects/cross-tab";
wireCrossTabRehydrate(usePaletteStore, STORE_KEY, "palette-store");
