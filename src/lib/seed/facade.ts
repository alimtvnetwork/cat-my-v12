// UiSeedFacade: the ONLY seam UI code uses to read demo/starter data.
//
// Backing implementations (JSON, memory, remote) live in sibling files and
// are selected by `makeUiSeedFacade` (Plan 72 step 8). Consumers must never
// import a JSON file or an implementation module directly — grep for
// `src/lib/seed/data` from `src/**` MUST return only the JSON facade.
//
// Contract:
//   - `load()` is idempotent and cache-friendly. It MUST validate the
//     payload against `parseCatSeedBundle` and reject on failure. Callers
//     translate rejection into a `CapturedError` (spec/03-error-manage).
//   - `getSlice()` returns a stable reference for a given slice within a
//     single facade instance so React `useSyncExternalStore` selectors
//     stay referentially stable.
//   - `subscribe()` is optional (remote facades only). JSON/memory
//     facades may return a no-op unsubscribe.

import type { CatSeedBundle, CatSeedBundleSlice } from "./types";

export enum UiSeedSourceType {
  Json = "json",
  Memory = "memory",
  Remote = "remote",
}

export interface UiSeedFacade {
  /** Which backing implementation this instance uses. */
  readonly source: UiSeedSourceType;
  /** Load (and validate) the full bundle. Repeated calls resolve the cached value. */
  load(): Promise<CatSeedBundle>;
  /** Read a single slice. Rejects with the same error as `load()` on invalid data. */
  getSlice<K extends CatSeedBundleSlice>(slice: K): Promise<CatSeedBundle[K]>;
  /** Optional live update channel; defaults to no-op for static facades. */
  subscribe?(listener: (next: CatSeedBundle) => void): () => void;
}

export interface UiSeedFacadeOptions {
  /** Override the auto-detected source; useful in tests and Storybook. */
  source?: UiSeedSourceType;
}
