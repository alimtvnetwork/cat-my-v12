// Plan 71 Step 15: error history persistence.
//
// The Zustand `useErrorStore` is in-memory only. To satisfy
// spec/03-error-manage/02-error-architecture/04-error-modal/05-error-history-persistence.md
// we snapshot the bounded FIFO to durable browser storage via the shared
// SDK facade (spec/21-app/52-sdk-facade-pattern.md) so history survives
// reloads. IndexedDB is used in the browser (private-mode / SSR fall back
// to the in-memory implementation). No React Query API surface yet, we
// stay behind the same facade so the eventual backend swap only touches
// this file, not any call site.
import type { CapturedError } from "@/types/errors";
import { makeProjectRepositoryFacade } from "@/lib/projects/facade";
const HISTORY_KEY = "lovable:error-history:v1";
const MAX_HISTORY = 50;
function facade() {
  return makeProjectRepositoryFacade();
}
export async function loadErrorHistory(): Promise<CapturedError[]> {
  try {
    const raw = await facade().readItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) === false) return [];
    // Trust-but-verify: the shape is app-owned; drop anything without an id.
    return parsed.filter(
      (e): e is CapturedError =>
        !!e && typeof e === "object" && typeof (e as { id?: unknown }).id === "string",
    );
  } catch (err) {
    console.warn("[errors/history] load failed", err);

    return [];
  }
}
export async function saveErrorHistory(history: CapturedError[]): Promise<void> {
  try {
    const trimmed = history.slice(0, MAX_HISTORY);
    await facade().writeItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error("[errors/history] save failed", err);
  }
}
export async function clearPersistedErrorHistory(): Promise<void> {
  try {
    await facade().removeItem(HISTORY_KEY);
  } catch (err) {
    console.warn("[errors/history] clear failed", err);
  }
}
export const __ERROR_HISTORY_STORAGE_KEY = HISTORY_KEY;
export const __ERROR_HISTORY_MAX = MAX_HISTORY;