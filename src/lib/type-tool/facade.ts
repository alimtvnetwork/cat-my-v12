// Plan 80 steps 19 + 20. Type tool state facade (IndexedDB via idb-keyval).
//
// Root cause: Properties palette Type & Paragraph panes stored family / size /
// weight / align / lineHeight in local React state, so every palette or route
// remount reset the operator's typography setup. A single persisted facade
// owns the state, clamps it, and is swappable for the real SDK later.

import { useSyncExternalStore } from "react";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { logger } from "@/lib/editor/errors";

const KEY = "ca.v4.type-tool.v1";

export enum TypeWeightType {
  V400 = "400",
  V500 = "500",
  V600 = "600",
  V700 = "700",
}
export type TypeWeight = TypeWeightType;
export enum TypeAlignType {
  Left = "left",
  Center = "center",
  Right = "right",
  Justify = "justify",
}
export type TypeAlign = TypeAlignType;

export interface TypeToolPrefs {
  family: string;
  size: number; // 8..96 px
  weight: TypeWeight;
  align: TypeAlign;
  lineHeight: number; // 1.0..2.5
}

export const TYPE_FAMILIES = ["Sora", "Source Sans 3", "JetBrains Mono", "system-ui"] as const;
const WEIGHTS: readonly TypeWeight[] = [
  TypeWeightType.V400,
  TypeWeightType.V500,
  TypeWeightType.V600,
  TypeWeightType.V700,
];
const ALIGNS: readonly TypeAlign[] = [
  TypeAlignType.Left,
  TypeAlignType.Center,
  TypeAlignType.Right,
  TypeAlignType.Justify,
];

export const DEFAULT_TYPE_PREFS: TypeToolPrefs = {
  family: "Sora",
  size: 14,
  weight: TypeWeightType.V500,
  align: TypeAlignType.Left,
  lineHeight: 1.4,
};

function clampNum(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;

  return Math.min(max, Math.max(min, v));
}

function normalize(raw: unknown): TypeToolPrefs {
  const r = (raw ?? {}) as Partial<TypeToolPrefs>;

  return {
    family:
      typeof r.family === "string" && r.family.length > 0 ? r.family : DEFAULT_TYPE_PREFS.family,
    size: clampNum(r.size, 8, 96, DEFAULT_TYPE_PREFS.size),
    weight: WEIGHTS.includes(r.weight as TypeWeight)
      ? (r.weight as TypeWeight)
      : DEFAULT_TYPE_PREFS.weight,
    align: ALIGNS.includes(r.align as TypeAlign)
      ? (r.align as TypeAlign)
      : DEFAULT_TYPE_PREFS.align,
    lineHeight: clampNum(r.lineHeight, 1, 2.5, DEFAULT_TYPE_PREFS.lineHeight),
  };
}

let cache: TypeToolPrefs = { ...DEFAULT_TYPE_PREFS };
let isLoaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) {
    try {
      l();
    } catch (err) {
      logger.warn("W_UI_TYPE_TOOL_LISTENER_THREW", {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

async function ensureLoaded(): Promise<void> {
  if (isLoaded) return;
  try {
    const raw = await idbGet<TypeToolPrefs | undefined>(KEY);
    cache = normalize(raw);
  } catch (err) {
    logger.warn("W_UI_TYPE_TOOL_LOAD_FAILED", {
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
    logger.warn("W_UI_TYPE_TOOL_PERSIST_FAILED", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export const typeToolFacade = {
  async get(): Promise<TypeToolPrefs> {
    await ensureLoaded();

    return cache;
  },
  async set(patch: Partial<TypeToolPrefs>): Promise<void> {
    await ensureLoaded();
    cache = normalize({ ...cache, ...patch });
    logger.info("I_UI_TYPE_TOOL_SET", { ...patch });
    emit();
    void persist();
  },
  async reset(): Promise<void> {
    cache = { ...DEFAULT_TYPE_PREFS };
    logger.info("I_UI_TYPE_TOOL_RESET", {});
    emit();
    void persist();
  },
  getSnapshot(): TypeToolPrefs {

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

export function useTypeToolPrefs(): TypeToolPrefs {

  return useSyncExternalStore(
    typeToolFacade.subscribe,
    typeToolFacade.getSnapshot,
    typeToolFacade.getSnapshot,
  );
}
