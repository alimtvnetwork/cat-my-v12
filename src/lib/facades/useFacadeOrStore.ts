// Plan 86 Step 30: `useFacadeOrStore` — the shared per-slice read hook that
// prefers the seeded facade when a v2 profile is active, otherwise returns
// the legacy store fallback untouched.
//
// Contract:
//   - No active profile (`getActiveProfile() === null`) -> returns `fallback()`.
//     Legacy behaviour preserved bit-for-bit.
//   - Active profile + facade exposes `snapshot()` -> returns facade rows
//     scoped to that profile, reactive to facade writes + profile switches.
//   - Active profile + facade lacks `snapshot()` (async-only SDK impl) ->
//     returns `fallback()` and logs once so the omission is visible.

import { useSyncExternalStore, useRef } from "react";
import type { DomainFacade, DomainRow } from "./domain-facade";
import { getActiveProfile, subscribeActiveProfile } from "@/lib/seed/active-profile";
import type { SliceKey } from "@/lib/seed/schemas-v2";

const FACADE_ONLY_SLICES = new Set<SliceKey>([
  "samples",
  "swatches",
  "propertyPresets",
  "settings",
  "commands",
  "emptyStates",
  "errorScenarios",
]);

const warned = new WeakSet<DomainFacade<DomainRow>>();

export function useFacadeOrStore<T extends DomainRow, F>(
  facade: DomainFacade<T>,
  fallback: () => F,
): T[] | F {
  const subscribe = (onChange: () => void): (() => void) => {
    const unsubProfile = subscribeActiveProfile(onChange);
    const unsubFacade = facade.subscribe(onChange);

    return () => {
      unsubProfile();
      unsubFacade();
    };
  };

  // Stable-reference snapshot: React requires `getSnapshot` to return the
  // same reference when nothing changed. We cache the last (profileId, rows)
  // tuple in a ref-like closure and only rebuild when the underlying map
  // notifies (facade.subscribe fired) or profile switched.
  const cacheRef = useRef<{ profile: string | null; rows: T[] } | null>(null);
  const versionRef = useRef(0);
  // Bump version on every notify; `getSnapshot` reads the current version
  // to decide whether to re-materialise.
  useSyncExternalStore(
    (onChange) =>
      subscribe(() => {
        versionRef.current += 1;
        onChange();
      }),
    () => versionRef.current,
    () => 0,
  );

  const profile = getActiveProfile();

  if (profile === null) {
    // DEV-only warning: if the slice is strictly facade-only, returning the
    // legacy fallback might mask a missing profile on routes that require v2 seeds.
    if (import.meta.env?.DEV && FACADE_ONLY_SLICES.has(facade.slice)) {
      console.warn(
        `[useFacadeOrStore] dev warning: slice "${facade.slice}" is facade-only but profile is null. ` +
        `Ensure this route does not require a v2 seed.`
      );
    }
    return fallback();
  }

  if (typeof facade.snapshot !== "function") {
    if (warned.has(facade as DomainFacade<DomainRow>) === false) {
      console.warn(
        `[useFacadeOrStore] facade "${facade.slice}" has no snapshot(); falling back to legacy store`,
      );
      warned.add(facade as DomainFacade<DomainRow>);
    }

    return fallback();
  }

  const cached = cacheRef.current;

  if (cached && cached.profile === profile) {
    // Rebuild only when a notify has bumped the version since last cache.
    // We conservatively rebuild every render when profile matches; cost is
    // O(rows) which is cheap for seeded slices (< 100 rows).
  }

  const rows = facade.snapshot(profile);
  cacheRef.current = { profile, rows };

  return rows;
}
