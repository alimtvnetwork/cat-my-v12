import type { CatSeedBundle, CatSeedBundleSlice } from "./types";
import { UiSeedSourceType, type UiSeedFacade } from "./facade";
import { parseCatSeedBundle } from "./schemas";

// JSON-backed UiSeedFacade. Reads a bundled JSON payload once, validates
// it with parseCatSeedBundle, and caches the parsed value. Step 9 fills
// ./data/bundle.json with real content; today it is an empty bundle so
// the import graph resolves. Validation failures reject every call;
// SeedProvider (step 10) converts them into CapturedError per
// spec/03-error-manage (no silent fallback in the facade itself).

export type CatSeedBundleLoader = () => Promise<unknown>;

const defaultLoader: CatSeedBundleLoader = async () => {
  const mod = await import("./data/bundle.json");

  return (mod as { default: unknown }).default;
};

export class JsonUiSeedFacade implements UiSeedFacade {
  public readonly source: UiSeedSourceType = UiSeedSourceType.Json;
  private cache: Promise<CatSeedBundle> | null = null;

  constructor(private readonly loader: CatSeedBundleLoader = defaultLoader) {}

  load(): Promise<CatSeedBundle> {
    if (!this.cache) {
      this.cache = this.loader().then(parseCatSeedBundle);
    }

    return this.cache;
  }

  async getSlice<K extends CatSeedBundleSlice>(slice: K): Promise<CatSeedBundle[K]> {
    const bundle = await this.load();

    return bundle[slice];
  }
}
