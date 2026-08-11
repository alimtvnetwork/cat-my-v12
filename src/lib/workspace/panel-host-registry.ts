/**
 * Panel-host mount registry (plan 67 step 9).
 *
 * A tiny useSyncExternalStore counter incremented by every mounted
 * `DockableFrame` and decremented on unmount. Consumers (currently the
 * Window submenu in `TopMenuBar`) read `usePanelHostMounted()` to gate
 * their visibility on "at least one panel host is live in the tree",
 * which is stricter than a path check: a route that matches the editor
 * path but has not mounted any panel yet (during code-split, SSR, or a
 * transient error boundary) will not display Window commands that would
 * dispatch to nothing.
 *
 * The registry is intentionally framework-free: no zustand, no context.
 * That keeps it usable from any module without importing React state
 * plumbing and matches how other primitives in `src/lib/` are shaped.
 */
import { useSyncExternalStore } from "react";

let count = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

export function registerPanelHost(): () => void {
  count += 1;
  emit();
  let isReleased = false;

  return () => {
    if (isReleased) return;
    isReleased = true;
    count = Math.max(0, count - 1);
    emit();
  };
}

export function getPanelHostCount(): number {
  return count;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);

  return () => {
    listeners.delete(cb);
  };
}

export function usePanelHostMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => count > 0,
    () => false,
  );
}

/** Test-only reset. Not exported from the public barrel. */
export function __resetPanelHostRegistryForTests(): void {
  count = 0;
  listeners.clear();
}