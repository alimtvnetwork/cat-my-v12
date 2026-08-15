/**
 * Plan 79 step 39: snap toggle + grid pitch, subscribable via
 * useSyncExternalStore so both the SelectionOverlay resize path and
 * future HUD toggles read from the same source of truth.
 */

import { useSyncExternalStore } from "react";
import type { SnapConfig } from "./snap";
import {
  DEFAULT_SNAP,
  DEFAULT_ALIGN_TOLERANCE_PX,
  MIN_ALIGN_TOLERANCE_PX,
  MAX_ALIGN_TOLERANCE_PX,
} from "./snap";
import { makeProjectRepositoryFacade } from "@/lib/projects/facade";

const STORAGE_KEY = "editor.snap.v1";
type Listener = () => void;

let state: SnapConfig = { ...DEFAULT_SNAP };
const listeners = new Set<Listener>();
let isHydrated = false;
let hydrating: Promise<void> | null = null;

function parsePersisted(raw: string | null): SnapConfig {
  if (!raw) return { ...DEFAULT_SNAP };
  try {
    const parsed = JSON.parse(raw) as Partial<SnapConfig>;
    const rawTol = parsed.alignTolerancePx;
    const tol =
      typeof rawTol === "number" && Number.isFinite(rawTol) && rawTol > 0
        ? Math.min(MAX_ALIGN_TOLERANCE_PX, Math.max(MIN_ALIGN_TOLERANCE_PX, Math.round(rawTol)))
        : DEFAULT_ALIGN_TOLERANCE_PX;

    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_SNAP.enabled,
      gridPx:
        typeof parsed.gridPx === "number" && parsed.gridPx > 0
          ? Math.round(parsed.gridPx)
          : DEFAULT_SNAP.gridPx,
      alignTolerancePx: tol,
      debug: typeof parsed.debug === "boolean" ? parsed.debug : DEFAULT_SNAP.debug,
      showGuides:
        typeof parsed.showGuides === "boolean" ? parsed.showGuides : DEFAULT_SNAP.showGuides,
    };
  } catch (err) {
    console.warn("[snap-store] failed to parse persisted snap prefs", err);

    return { ...DEFAULT_SNAP };
  }
}

async function hydrateOnce(): Promise<void> {
  if (isHydrated) return;

  if (hydrating) return hydrating;

  if (typeof window === "undefined") {
    isHydrated = true;

    return;
  }

  const facade = makeProjectRepositoryFacade();
  hydrating = (async () => {
    try {
      let raw = await facade.readItem(STORAGE_KEY);
      // One-shot migration from pre-facade localStorage key.
      if (raw === null && typeof window !== "undefined") {
        try {
          const legacy = window.localStorage.getItem(STORAGE_KEY);

          if (legacy) {
            console.info("[snap-store] migrating legacy localStorage payload");
            await facade.writeItem(STORAGE_KEY, legacy);
            window.localStorage.removeItem(STORAGE_KEY);
            raw = legacy;
          }
        } catch {
          /* ignore */
        }
      }

      const next = parsePersisted(raw);
      state = next;
    } catch (err) {
      console.warn("[snap-store] hydrate failed", err);
    } finally {
      isHydrated = true;
      emit();
    }
  })();

  return hydrating;
}

function writePersisted(next: SnapConfig): void {
  if (typeof window === "undefined") return;
  const facade = makeProjectRepositoryFacade();
  facade
    .writeItem(STORAGE_KEY, JSON.stringify(next))
    .catch((err) => console.warn("[snap-store] failed to persist snap prefs", err));
}

function emit(): void {
  for (const l of listeners) l();
}

export function getSnapState(): SnapConfig {
  if (!isHydrated && typeof window !== "undefined") void hydrateOnce();

  return state;
}

export function setSnapEnabled(next: boolean): void {
  state = { ...state, enabled: next };
  writePersisted(state);
  console.info("[snap-store] enabled", { enabled: next });
  emit();
}

export function setSnapGrid(gridPx: number): void {
  if (Number.isFinite(gridPx) === false || gridPx <= 0) {
    console.warn("[snap-store] invalid gridPx rejected", { gridPx });

    return;
  }

  state = { ...state, gridPx: Math.round(gridPx) };
  writePersisted(state);
  console.info("[snap-store] grid", { gridPx: state.gridPx });
  emit();
}

export function setSnapAlignTolerance(px: number): void {
  if (Number.isFinite(px) === false || px <= 0) {
    console.warn("[snap-store] invalid alignTolerancePx rejected", { px });

    return;
  }

  const clamped = Math.min(
    MAX_ALIGN_TOLERANCE_PX,
    Math.max(MIN_ALIGN_TOLERANCE_PX, Math.round(px)),
  );
  state = { ...state, alignTolerancePx: clamped };
  writePersisted(state);
  console.info("[snap-store] alignTolerance", { alignTolerancePx: clamped });
  emit();
}

export function setSnapDebug(next: boolean): void {
  state = { ...state, debug: next };
  writePersisted(state);
  console.info("[snap-store] debug", { debug: next });
  emit();
}

export function setSnapShowGuides(next: boolean): void {
  state = { ...state, showGuides: next };
  writePersisted(state);
  console.info("[snap-store] showGuides", { showGuides: next });
  emit();
}

export function subscribeSnap(listener: Listener): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

export function useSnap(): SnapConfig {
  return useSyncExternalStore(subscribeSnap, getSnapState, () => DEFAULT_SNAP);
}

/** Test-only: reset in-memory state. */
export function __resetSnapStoreForTests(): void {
  state = { ...DEFAULT_SNAP };
  isHydrated = false;
  listeners.clear();
}
