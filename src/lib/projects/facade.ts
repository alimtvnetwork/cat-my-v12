import { ClientLogger } from "@/lib/observability/client-logger";
// Project repository facade (Plan 42 follow-up).
//
// Applies the SDK-facade pattern from spec/21-app/52-sdk-facade-pattern.md to
// the browser storage layer. Business logic (zustand store, routes, tests)
// never talks to `localStorage`, `indexedDB`, or a future server API
// directly — it goes through `ProjectRepositoryFacade`. The concrete
// implementation can be swapped (IndexedDB today, Lovable Cloud tomorrow)
// without touching a single caller.
//
// Naming (§4 of spec 52, TypeScript port):
//   - Facade class: `<Vendor><Domain>SdkFacade` -> `IndexedDbProjectRepositoryFacade`
//   - Domain object: `Cat<Concept>` -> not needed here; we serialize plain
//     JSON strings on the wire, callers keep their own domain types.
//   - Factory: `make<Vendor>Facade(cfg)` -> `makeProjectRepositoryFacade()`.
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type { StateStorage } from "zustand/middleware";
import { broadcastFacadeWrite } from "./broadcast";

/**
 * The single seam every persistence-touching module goes through. Return
 * types are primitives / plain JSON so no vendor object (IDBRequest,
 * Supabase row, fetch Response) can leak into business code.
 */
export interface ProjectRepositoryFacade {
  readonly kind: "indexeddb" | "localstorage" | "memory" | "remote";
  readItem(key: string): Promise<string | null>;
  writeItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** IndexedDB implementation via `idb-keyval`. Default in the browser. */
class IndexedDbProjectRepositoryFacade implements ProjectRepositoryFacade {
  readonly kind = "indexeddb" as const;
  async readItem(key: string): Promise<string | null> {
    try {
      const raw = await idbGet<string | undefined>(key);

      return typeof raw === "string" ? raw : null;
    } catch (err) {
      ClientLogger.warn("[projects/facade] indexeddb read failed", key, err);

      return null;
    }
  }

  async writeItem(key: string, value: string): Promise<void> {
    try {
      await idbSet(key, value);
    } catch (err) {
      ClientLogger.error("[projects/facade] indexeddb write failed", key, err);

      throw err;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await idbDel(key);
    } catch (err) {
      ClientLogger.warn("[projects/facade] indexeddb delete failed", key, err);
    }
  }
}

/** In-memory fallback (SSR, vitest node env, private-mode IDB blocked). */
class MemoryProjectRepositoryFacade implements ProjectRepositoryFacade {
  readonly kind = "memory" as const;
  private readonly mem = new Map<string, string>();
  async readItem(key: string): Promise<string | null> {
    return this.mem.get(key) ?? null;
  }

  async writeItem(key: string, value: string): Promise<void> {
    this.mem.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.mem.delete(key);
  }
}

let cached: ProjectRepositoryFacade | null = null;

/**
 * Factory. Picks the best backend available at call time.
 * Business code should NEVER `new` a facade directly.
 */
export function makeProjectRepositoryFacade(): ProjectRepositoryFacade {
  if (cached) return cached;

  if (typeof indexedDB === "undefined") {
    cached = new MemoryProjectRepositoryFacade();
  } else {
    cached = new IndexedDbProjectRepositoryFacade();
  }

  return cached;
}

/** Test-only override. Not exported from the barrel. */
export function __setProjectRepositoryFacadeForTests(f: ProjectRepositoryFacade | null): void {
  cached = f;
}

/**
 * Adapter that lets zustand's `persist` middleware speak to the facade.
 * Also handles a one-shot migration from the pre-facade `localStorage`
 * key so existing users don't lose their projects when we swap backends.
 */
export function createFacadeStateStorage(): StateStorage {
  const facade = makeProjectRepositoryFacade();

  return {
    getItem: async (name) => {
      const fromFacade = await facade.readItem(name);

      if (fromFacade !== null) return fromFacade;
      // Legacy localStorage payload — migrate once, then delete.
      if (typeof window !== "undefined" && window.localStorage) {
        const legacy = window.localStorage.getItem(name);

        if (legacy !== null) {
          ClientLogger.info("[projects/facade] migrating legacy localStorage payload", name);
          await facade.writeItem(name, legacy);
          try {
            window.localStorage.removeItem(name);
          } catch {
            /* ignore */
          }

          return legacy;
        }
      }

      return null;
    },
    setItem: async (name, value) => {
      await facade.writeItem(name, value);
      broadcastFacadeWrite(name, "set");
    },
    removeItem: async (name) => {
      await facade.removeItem(name);
      broadcastFacadeWrite(name, "remove");
    },
  };
}
