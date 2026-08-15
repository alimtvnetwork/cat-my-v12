// Active program identity for the editor + runtime. Single-program today,
// but every downstream consumer (reference image store, EditorTopBar, future
// audit trail) reads program identity through this hook so multi-program
// support is a store change, not a consumer sweep.
//
// Persistence: active program identity survives page reload via localStorage
// key `ca.activeProgram.v1`. SSR-safe (guards window). Reads happen lazily
// inside the initializer so the module can be imported on the server without
// touching window.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createFacadeStateStorage } from "@/lib/projects/facade";
import { wireCrossTabRehydrate } from "@/lib/projects/cross-tab";

export const DEFAULT_PROGRAM_ID = "program-01";
const DEFAULT_PROGRAM_NAME = "Program 01";
import { StorageKey } from "@/lib/constants";

export interface ActiveProgram {
  id: string;
  name: string;
}

interface ProgramStore extends ActiveProgram {
  setActiveProgram: (program: ActiveProgram) => void;
}

// Plan 80 step 34: route persistence through the SDK facade (spec 21/52).
// Cross-tab `storage` event sync is intentionally dropped: IndexedDB writes
// via the facade don't fire the `storage` event. Multi-tab program switch
// is a rare operator flow and future BroadcastChannel work will restore it
// uniformly across every facade-backed store rather than per-store.
export const useProgramStore = create<ProgramStore>()(
  persist(
    (set) => ({
      id: DEFAULT_PROGRAM_ID,
      name: DEFAULT_PROGRAM_NAME,
      setActiveProgram: (program) => set({ id: program.id, name: program.name }),
    }),
    {
      name: StorageKey.ActiveProgram,
      storage: createJSONStorage(() => createFacadeStateStorage()),
      partialize: (s) => ({ id: s.id, name: s.name }),
      merge: (persisted, current) => {
        const src = (persisted ?? {}) as Record<string, unknown>;

        return {
          ...current,
          id: typeof src.id === "string" ? src.id : current.id,
          name: typeof src.name === "string" ? src.name : current.name,
        };
      },
    },
  ),
);

export function useActiveProgramId(): string {
  return useProgramStore((s) => s.id);
}

export function useActiveProgramName(): string {
  return useProgramStore((s) => s.name);
}

// Plan 80 step 41: cross-tab sync via BroadcastChannel.
wireCrossTabRehydrate(useProgramStore, StorageKey.ActiveProgram, "program-store");

export function getActiveProgram(): ActiveProgram {
  const { id, name } = useProgramStore.getState();

  return { id, name };
}

const PROGRAM_SEED: readonly ActiveProgram[] = [
  { id: DEFAULT_PROGRAM_ID, name: DEFAULT_PROGRAM_NAME },
  { id: "program-02", name: "Program 02" },
] as const;

export function listPrograms(): ActiveProgram[] {
  const active = getActiveProgram();
  const seen = new Set<string>();
  const out: ActiveProgram[] = [];
  for (const p of [...PROGRAM_SEED, active]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }

  return out;
}

export function getProgramById(id: string): ActiveProgram | undefined {
  return listPrograms().find((p) => p.id === id);
}
