import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 71 Step 7: Zustand store for the Global Error Modal.
// Spec: spec/03-error-manage/02-error-architecture/04-error-modal/03-error-modal-reference.md §3
//       spec/03-error-manage/02-error-architecture/04-error-modal/06-suppress-global-error.md
//
// Responsibilities (minimum for this step; deeper enrichment lands in later steps):
//   - Hold the currently visible error (`currentError`) and a bounded FIFO queue.
//   - Provide `captureError` / `captureException` factories that build a
//     `CapturedError` and commit it to the queue.
//   - Provide `openErrorModal` / `closeErrorModal` toggles and queue nav helpers.
//   - Provide `dismissCurrent` and `clearHistory` for the notice + modal footer.
//
// Observability: every mutation logs a single structured line so silent
// swallowing is impossible even before the modal is mounted (Step 9).

import { create } from "zustand";

import { buildCapturedError, type CapturedError, type CaptureMeta } from "@/types/errors";
import { loadErrorHistory, saveErrorHistory, clearPersistedErrorHistory } from "../errors/history-facade";

const MAX_HISTORY = 50;

export interface ErrorStoreState {
  currentError: CapturedError | null;
  history: CapturedError[]; // newest first
  isOpen: boolean;
  isHistoryDrawerOpen: boolean;

  captureError: (err: unknown, meta?: CaptureMeta, code?: string) => CapturedError;
  captureException: (err: unknown, meta?: CaptureMeta) => CapturedError;
  commit: (captured: CapturedError) => void;
  openErrorModal: (captured?: CapturedError) => void;
  closeErrorModal: () => void;
  openHistoryDrawer: () => void;
  closeHistoryDrawer: () => void;
  dismissCurrent: () => void;
  next: () => void;
  prev: () => void;
  clearHistory: () => void;
  hydrateFromStorage: () => Promise<void>;
}

function log(op: string, e: CapturedError | null): void {
  if (!e) {
    ClientLogger.info(`[errorStore] ${op}`);

    return;
  }

  ClientLogger.info(
    `[errorStore] ${op} cid=${e.correlationId} id=${e.id} code=${e.code} level=${e.level} msg=${e.message}`,
  );
}

export const useErrorStore = create<ErrorStoreState>((set, get) => ({
  currentError: null,
  history: [],
  isOpen: false,
  isHistoryDrawerOpen: false,

  captureError: (err, meta, code) => {
    const captured = buildCapturedError(err, meta, code);
    get().commit(captured);

    return captured;
  },

  captureException: (err, meta) => {
    const captured = buildCapturedError(err, meta, "E_UNCAUGHT");
    get().commit(captured);

    return captured;
  },

  commit: (captured) => {
    log("commit", captured);
    set((s) => {
      const nextHistory = [captured, ...s.history].slice(0, MAX_HISTORY);

      return {
        history: nextHistory,
        currentError: captured,
      };
    });
    // Fire-and-forget persistence (facade already logs on failure).
    void saveErrorHistory(useErrorStore.getState().history);
  },

  openErrorModal: (captured) => {
    if (captured) {
      log("open", captured);
      set((s) => {
        const alreadyInHistory = s.history.some((h) => h.id === captured.id);

        return {
          currentError: captured,
          isOpen: true,
          history: alreadyInHistory ? s.history : [captured, ...s.history].slice(0, MAX_HISTORY),
        };
      });

      return;
    }

    log("open", get().currentError);
    // Plan 83 backlog #26: opening the modal from a global hotkey has no
    // captured argument. If nothing is currently selected, fall back to the
    // most recent history entry so the History drawer is actually visible;
    // Dialog only renders when `currentError` is truthy.
    set((s) => ({
      isOpen: true,
      currentError: s.currentError ?? s.history[0] ?? null,
    }));
  },

  closeErrorModal: () => {
    log("close", get().currentError);
    set({ isOpen: false });
  },

  openHistoryDrawer: () => {
    ClientLogger.info(`[errorStore] openHistoryDrawer count=${get().history.length}`);
    set({ isHistoryDrawerOpen: true });
  },

  closeHistoryDrawer: () => {
    ClientLogger.info("[errorStore] closeHistoryDrawer");
    set({ isHistoryDrawerOpen: false });
  },

  dismissCurrent: () => {
    log("dismiss", get().currentError);
    set({ currentError: null, isOpen: false });
  },

  next: () => {
    const { currentError, history } = get();

    if (!currentError || history.length === 0) return;
    const idx = history.findIndex((h) => h.id === currentError.id);

    if (idx === -1 || idx === history.length - 1) return;
    const target = history[idx + 1];
    log("next", target);
    set({ currentError: target });
  },

  prev: () => {
    const { currentError, history } = get();

    if (!currentError || history.length === 0) return;
    const idx = history.findIndex((h) => h.id === currentError.id);

    if (idx <= 0) return;
    const target = history[idx - 1];
    log("prev", target);
    set({ currentError: target });
  },

  clearHistory: () => {
    log("clearHistory", null);
    set({ history: [], currentError: null, isOpen: false });
    void clearPersistedErrorHistory();
  },

  hydrateFromStorage: async () => {
    const persisted = await loadErrorHistory();

    if (persisted.length === 0) return;
    set((s) => {
      // Merge preserves in-memory captures that happened before hydration
      // resolved (e.g. an early window `error` event).
      const seen = new Set(s.history.map((h) => h.id));
      const merged = [...s.history, ...persisted.filter((p) => seen.has(p.id) === false)].slice(
        0,
        MAX_HISTORY,
      );
      ClientLogger.info(`[errorStore] hydrateFromStorage merged=${merged.length}`);

      return { history: merged };
    });
  },
}));

// Test hook: not exported from the barrel; consumed by unit tests only.
export function __resetErrorStoreForTest(): void {
  useErrorStore.setState({ currentError: null, history: [], isOpen: false });
}
