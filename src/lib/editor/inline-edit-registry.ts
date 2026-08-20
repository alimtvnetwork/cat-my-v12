import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 100 Phase C step 22: dirty-state registry for the shared InlineEdit
// primitive. Each active editor that holds an unsaved draft registers a
// token here; the module attaches a single `beforeunload` handler that
// blocks tab/window close (and full page reloads) while any editor is
// dirty. Route-level guards read `isAnyInlineEditDirty()` to prompt on
// navigation.
//
// The registry is intentionally tiny and side-effect-free until the first
// consumer subscribes, so SSR / test environments do not pay for it.

export type DirtyToken = symbol;

const dirty = new Set<DirtyToken>();
const listeners = new Set<() => void>();
let isBeforeUnloadBound = false;

function emit() {
  for (const l of listeners) {
    try {
      l();
    } catch (err) {
      ClientLogger.error("[inline-edit-registry] listener threw", err);
    }
  }
}

function ensureBeforeUnload() {
  if (isBeforeUnloadBound) return;

  if (typeof window === "undefined") return;
  isBeforeUnloadBound = true;
  window.addEventListener("beforeunload", (e: BeforeUnloadEvent) => {
    if (dirty.size === 0) return;
    // Standard idiom: setting returnValue triggers the browser's native
    // "Leave site?" prompt. Message text is ignored by modern browsers.
    e.preventDefault();
    e.returnValue = "";
    ClientLogger.warn("[inline-edit-registry] blocked unload; dirty editors:", dirty.size);
  });
}

export function markInlineEditDirty(token: DirtyToken): void {
  ensureBeforeUnload();

  if (dirty.has(token)) return;
  dirty.add(token);
  emit();
}

export function clearInlineEditDirty(token: DirtyToken): void {
  if (dirty.delete(token) === false) return;
  emit();
}

export function isAnyInlineEditDirty(): boolean {
  return dirty.size > 0;
}

export function subscribeInlineEditDirty(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/** Test-only: reset internal state. */
export function __resetInlineEditRegistry(): void {
  dirty.clear();
  listeners.clear();
}
