import { SeedStatusType } from "@/lib/seed/provider";
import { useMemo } from "react";
import type { CatSeedBundle, CatSeedBundleSlice } from "./types";
import { useSeedContextOptional, type SeedStatus } from "./provider";

// Plan 72 step 12. Read a single slice from the loaded bundle with a
// stable reference so consumers can pass it straight into memoised
// selectors, TanStack Query keys, or FlatList-style renderers without
// triggering spurious re-renders.
//
// Semantics:
//   - `data` is `undefined` while `status` is `"idle"` or `"loading"`.
//   - On `"error"`, `data` is `undefined` and `error` carries the reason
//     (matches `useSeedContext`; callers decide whether to render a
//     boundary, fall back to an empty state, or bubble up).
//   - The returned tuple identity is stable across renders while the
//     underlying bundle reference is unchanged, so `useSeedSlice(k)`
//     inside `useMemo`/`useEffect` deps arrays behaves predictably.

export interface UseSeedSliceResult<K extends CatSeedBundleSlice> {
  data: CatSeedBundle[K] | undefined;
  status: SeedStatus;
  error: Error | null;
}

export function useSeedSlice<K extends CatSeedBundleSlice>(slice: K): UseSeedSliceResult<K> {
  // Degrade gracefully when no SeedProvider is mounted (isolated tests,
  // Storybook slots that don't wrap the provider). Returns `idle` +
  // undefined data, matching the "not yet loaded" state so callers can
  // reuse a single render path.
  const ctx = useSeedContextOptional();
  const bundle = ctx?.bundle ?? null;
  const status: SeedStatus = ctx?.status ?? SeedStatusType.Idle;
  const error = ctx?.error ?? null;

  // Memo keyed on the bundle reference (SeedProvider swaps it atomically
  // via setState) and the slice key. No structural comparison: any bundle
  // swap means the whole payload changed and downstream memos should
  // recompute anyway.
  return useMemo<UseSeedSliceResult<K>>(
    () => ({
      data: bundle ? bundle[slice] : undefined,
      status,
      error,
    }),
    [bundle, slice, status, error],
  );
}
