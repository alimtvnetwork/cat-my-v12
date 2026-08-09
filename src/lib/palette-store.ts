import { ErrorSourceType } from "@/lib/errors/error-record";
/**
 * Plan 64 steps 62-64: PaletteState registry.
 *
 * Persists per-palette dock/float/min/max state to localStorage. DB-backed
 * per-user persistence is scheduled with the `saveRule` server-fn migration
 * (Plan 64 step 85) so both writes share one migration/lockfile bump.
 *
 * See spec/24-app-ui-design-system/41-panel-docking-model.md.
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
}

function mergeStates(
  loaded: Partial<Record<PaletteId, Partial<PaletteState>>> | undefined,
): Record<PaletteId, PaletteState> {
  const merged: Record<PaletteId, PaletteState> = { ...DEFAULTS };

  if (!loaded) return merged;
  for (const k of Object.keys(DEFAULTS) as PaletteId[]) {
    merged[k] = { ...DEFAULTS[k], ...(loaded[k] ?? {}), id: k };
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
        console.warn("[palette-store] persist failed", err);

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
        console.info("[palette-store] layout reset to defaults");
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
