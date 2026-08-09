// Preview-mode store shared between the canvas viewport and the right-hand
// inspector settings block. Controls how the reference image is presented
// during rule authoring / validation preview:
//
//   - "off": everything crisp, no blur. The operator sees the raw image.
//   - "selection": crisp reveal only inside currently-selected rule ROIs;
//                  everything else is blurred/dimmed (classic spotlight).
//   - "all-rules": crisp reveal inside every visible rule ROI; everything
//                  else is blurred/dimmed. Rules whose acceptance says
//                  the target should be ABSENT are not revealed crisp;
//                  instead a warning cross is drawn over their ROI so
//                  the operator can visualize "this must not be present
//                  here".
//
// `peekAll` is a transient override that forces the whole reference image
// to render crisp regardless of the active mode. It exists so the operator
// can double-click the background (or hit the "Peek full image" button)
// to see the raw image, then click again to return to the previous mode.
//
// The chosen mode persists across sessions via localStorage. `peekAll`
// does not: it is meant to be a temporary override.

export enum EditorPreviewModeType {
  Off = "off",
  Selection = "selection",
  AllRules = "all-rules",
}
export type EditorPreviewMode = EditorPreviewModeType;

export interface PreviewModeState {
  mode: EditorPreviewMode;
  peekAll: boolean;
  /**
   * When true, the canvas overlays a debug pass on top of the preview
   * so operators can visually verify:
   *   - the mask alpha channel (tinted magenta over each ROI),
   *   - the spotlight clipping region (dashed cyan outline of each
   *     rule that is currently receiving a crisp reveal),
   *   - the final effective ROI (green wash where the mask alpha is
   *     non-zero, i.e. the pixels the worker will actually evaluate).
   * Persisted alongside the mode so it survives reloads.
   */
  debugOverlay: boolean;
}

import { StorageKey } from "@/lib/constants";
import { makeProjectRepositoryFacade } from "@/lib/projects/facade";
const STORAGE_KEY = StorageKey.EditorPreviewMode;
const DEBUG_STORAGE_KEY = StorageKey.EditorPreviewDebugOverlay;
const DEFAULT_MODE: EditorPreviewMode = EditorPreviewModeType.Selection;

type Listener = (value: PreviewModeState) => void;
const listeners = new Set<Listener>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// SSR-safe: always start with defaults on both server and client so the
// first client render matches server-rendered HTML. Real localStorage
// values are folded in by `hydrateFromStorage()`, which callers must
// invoke from a client-only effect (see CanvasViewport). Reading
// localStorage in this module's top-level state caused a hydration
// mismatch on the "Preview: <mode>" button (root cause of the incident
// in preview-mode-store.ts:71 prior to this change).
let state: PreviewModeState = {
  mode: DEFAULT_MODE,
  peekAll: false,
  debugOverlay: false,
};
let isHydrated = false;
let hydrating: Promise<void> | null = null;

async function readLegacyThenFacade(key: string): Promise<string | null> {
  const facade = makeProjectRepositoryFacade();
  let raw = await facade.readItem(key);

  if (raw === null && isBrowser()) {
    try {
      const legacy = window.localStorage.getItem(key);

      if (legacy !== null) {
        console.info("[preview-mode-store] migrating legacy localStorage payload", key);
        await facade.writeItem(key, legacy);
        window.localStorage.removeItem(key);
        raw = legacy;
      }
    } catch {
      /* ignore */
    }
  }

  return raw;
}

export function hydrateFromStorage(): void {
  if (isHydrated || hydrating || isBrowser() === false) return;
  hydrating = (async () => {
    try {
      const [rawMode, rawDebug] = await Promise.all([
        readLegacyThenFacade(STORAGE_KEY),
        readLegacyThenFacade(DEBUG_STORAGE_KEY),
      ]);
      let mode: EditorPreviewMode = state.mode;

      if (
        rawMode === EditorPreviewModeType.Off ||
        rawMode === EditorPreviewModeType.Selection ||
        rawMode === EditorPreviewModeType.AllRules
      )
        mode = rawMode;
      const debugOverlay = rawDebug === "1";

      if (mode !== state.mode || debugOverlay !== state.debugOverlay) {
        state = { ...state, mode, debugOverlay };
        emit();
      }
    } catch (err) {
      console.warn("[preview-mode-store] hydrate failed", err);
    } finally {
      isHydrated = true;
    }
  })();
}

function persistMode(mode: EditorPreviewMode): void {
  if (isBrowser() === false) return;
  makeProjectRepositoryFacade()
    .writeItem(STORAGE_KEY, mode)
    .catch((err) => console.warn("[preview-mode-store] persist mode failed", err));
}

function emit(): void {
  const snap = state;
  listeners.forEach((cb) => cb(snap));
}

export function getPreviewState(): PreviewModeState {
  return state;
}

export function setPreviewMode(mode: EditorPreviewMode): void {
  if (state.mode === mode) return;
  state = { ...state, mode };
  persistMode(mode);
  emit();
}

export function setPeekAll(peek: boolean): void {
  if (state.peekAll === peek) return;
  state = { ...state, peekAll: peek };
  emit();
}

export function togglePeekAll(): void {
  setPeekAll(!state.peekAll);
}

export function setDebugOverlay(enabled: boolean): void {
  if (state.debugOverlay === enabled) return;
  state = { ...state, debugOverlay: enabled };

  if (isBrowser()) {
    makeProjectRepositoryFacade()
      .writeItem(DEBUG_STORAGE_KEY, enabled ? "1" : "0")
      .catch((err) => console.warn("[preview-mode-store] persist debug failed", err));
  }

  emit();
}

export function toggleDebugOverlay(): void {
  setDebugOverlay(!state.debugOverlay);
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb);

  return () => {
    listeners.delete(cb);
  };
}
