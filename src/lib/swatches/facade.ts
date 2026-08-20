// Plan 79 step 31. Swatches facade (browser IndexedDB via idb-keyval).
//
// Root cause the facade fixes, in one sentence: the Properties palette
// "Brush & swatches" tab needs a persistent color source that survives
// reloads and can later be swapped for the real SDK; without a facade
// the tab either hardcodes colors or leaks storage details into UI.
//
// Public surface:
//   - `listSwatches()` / `addSwatch(hex)` / `removeSwatch(hex)` /
//     `resetSwatches()` — all Promise-returning and best-effort.
//   - `useSwatches()` — subscribable hook backed by useSyncExternalStore.
//
// A matching TODO lives at `.lovable/pending-facades/06-swatches-facade.md`
// describing the real SDK swap.

import { useSyncExternalStore } from "react";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { logger } from "@/lib/editor/errors";

const KEY = "ca.v4.swatches.v1";

/** 12 defaults spanning the CA HMI accent palette + neutrals. */
export const DEFAULT_SWATCHES: readonly string[] = [
  "#0ea5e9",
  "#22c55e",
  "#eab308",
  "#ef4444",
  "#a855f7",
  "#f97316",
  "#14b8a6",
  "#ec4899",
  "#64748b",
  "#111827",
  "#f5f5f5",
  "#ffffff",
];

let cache: string[] = [...DEFAULT_SWATCHES];
let isLoaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) {
    try {
      l();
    } catch (err) {
      logger.warn("W_UI_SWATCHES_LISTENER_THREW", {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

async function ensureLoaded(): Promise<void> {
  if (isLoaded) return;
  try {
    const raw = await idbGet<string[] | undefined>(KEY);

    if (Array.isArray(raw) && raw.every((s) => typeof s === "string")) {
      cache = raw.slice(0, 64);
    }
  } catch (err) {
    logger.warn("W_UI_SWATCHES_LOAD_FAILED", {
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
    logger.warn("W_UI_SWATCHES_PERSIST_FAILED", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

function normalize(hex: string): string | null {
  const trimmed = hex.trim().toLowerCase();

  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/.test(trimmed) ? trimmed : null;
}

export const swatchesFacade = {
  async list(): Promise<readonly string[]> {
    await ensureLoaded();

    return cache;
  },
  async add(hex: string): Promise<boolean> {
    await ensureLoaded();
    const norm = normalize(hex);

    if (!norm) {
      logger.warn("W_UI_SWATCHES_INVALID", { hex });

      return false;
    }

    if (cache.includes(norm)) return false;
    cache = [norm, ...cache].slice(0, 64);
    logger.info("I_UI_SWATCHES_ADD", { hex: norm });
    emit();
    void persist();

    return true;
  },
  async remove(hex: string): Promise<boolean> {
    await ensureLoaded();
    const norm = normalize(hex);

    if (!norm) return false;
    const next = cache.filter((c) => c !== norm);

    if (next.length === cache.length) return false;
    cache = next;
    logger.info("I_UI_SWATCHES_REMOVE", { hex: norm });
    emit();
    void persist();

    return true;
  },
  async reset(): Promise<void> {
    cache = [...DEFAULT_SWATCHES];
    logger.info("I_UI_SWATCHES_RESET", {});
    emit();
    void persist();
  },
  getSnapshot(): readonly string[] {
    return cache;
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb);
    // Kick a load if we haven't yet; hook consumers get the async result via emit().
    void ensureLoaded();

    return () => {
      listeners.delete(cb);
    };
  },
};

export function useSwatches(): readonly string[] {
  return useSyncExternalStore(
    swatchesFacade.subscribe,
    swatchesFacade.getSnapshot,
    swatchesFacade.getSnapshot,
  );
}
