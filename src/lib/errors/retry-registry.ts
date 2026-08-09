// Plan 82 Phase H: retry registry.
//
// `CapturedError` is a plain serializable record (persisted to IndexedDB,
// copied to clipboard as JSON) so we cannot store retry callbacks on it.
// This module holds retry functions in a module-scoped Map keyed by the
// error's correlation id, so the modal can offer a "Retry" button without
// polluting the persisted shape. Entries are cleared on successful retry
// or when the caller unregisters (e.g. component unmount).

export type RetryFn = () => void | Promise<void>;

interface Entry {
  fn: RetryFn;
  /** Optional human label shown on the retry button. */
  label?: string;
  /** Optional scope tag propagated to the History filter. */
  scope?: string;
  registeredAt: number;
}

const entries = new Map<string, Entry>();

export function registerRetry(
  correlationId: string,
  fn: RetryFn,
  opts: { label?: string; scope?: string } = {},
): void {
  if (!correlationId) return;
  entries.set(correlationId, {
    fn,
    label: opts.label,
    scope: opts.scope,
    registeredAt: Date.now(),
  });
  notify();
}

export function getRetry(correlationId: string): Entry | undefined {
  return entries.get(correlationId);
}

export function hasRetry(correlationId: string): boolean {
  return entries.has(correlationId);
}

export function clearRetry(correlationId: string): void {
  if (entries.delete(correlationId)) notify();
}

/** Test hook. */
export function __resetRetryRegistryForTest(): void {
  entries.clear();
  notify();
}

/** Simple subscription so React components can re-render when the set changes. */
const listeners = new Set<() => void>();
export function subscribeRetryRegistry(fn: () => void): () => void {
  listeners.add(fn);

  return () => {
    listeners.delete(fn);
  };
}

function notify(): void {
  for (const l of listeners) l();
}
