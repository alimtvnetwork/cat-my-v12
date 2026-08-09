import type { CatSeedBundle, CatSeedBundleSlice } from "./types";
import { UiSeedSourceType, type UiSeedFacade } from "./facade";
import { parseCatSeedBundle } from "./schemas";

// In-memory UiSeedFacade for tests, Storybook, and dev fixtures.
// Accepts either a validated CatSeedBundle or a raw payload; raw payloads
// go through parseCatSeedBundle so the memory backing enforces the same
// contract as JsonUiSeedFacade. subscribe() lets tests push new bundles
// to exercise live-update paths that the JSON facade cannot reach.

export const EMPTY_CAT_SEED_BUNDLE: CatSeedBundle = {
  version: "0.0.0-memory",
  projects: [],
  categories: [],
  ruleTemplates: [],
  toolPresets: [],
  sampleImages: [],
  programs: [],
};

export class MemoryUiSeedFacade implements UiSeedFacade {
  public readonly source: UiSeedSourceType = UiSeedSourceType.Memory;
  private bundle: CatSeedBundle;
  private listeners = new Set<(next: CatSeedBundle) => void>();

  constructor(initial: CatSeedBundle | unknown = EMPTY_CAT_SEED_BUNDLE) {
    this.bundle = this.coerce(initial);
  }

  private coerce(raw: CatSeedBundle | unknown): CatSeedBundle {
    // Fast path: identity object; still validate to catch drift in tests.
    return parseCatSeedBundle(raw);
  }

  load(): Promise<CatSeedBundle> {
    return Promise.resolve(this.bundle);
  }

  getSlice<K extends CatSeedBundleSlice>(slice: K): Promise<CatSeedBundle[K]> {
    return Promise.resolve(this.bundle[slice]);
  }

  /** Test hook: replace the bundle and notify subscribers. */
  setBundle(next: CatSeedBundle | unknown): void {
    this.bundle = this.coerce(next);
    for (const listener of this.listeners) {
      listener(this.bundle);
    }
  }

  subscribe(listener: (next: CatSeedBundle) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}
