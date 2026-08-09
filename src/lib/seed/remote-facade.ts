import type { CatSeedBundle, CatSeedBundleSlice } from "./types";
import { UiSeedSourceType, type UiSeedFacade } from "./facade";
import { parseCatSeedBundle } from "./schemas";

// Remote-backed UiSeedFacade. Stub for step 7: fetches a JSON payload
// from a configurable endpoint, validates it with parseCatSeedBundle,
// and caches the parsed value. Live update via subscribe() is a future
// concern (polling or SSE); today subscribe returns a no-op unsubscribe
// so callers can wire it unconditionally.
//
// Errors: any non-2xx response, network failure, or Zod validation
// failure rejects load() with an Error carrying the endpoint + status.
// SeedProvider (step 10) converts that into a CapturedError.

export interface RemoteUiSeedFacadeOptions {
  endpoint: string;
  /** Optional fetch override so tests can stub the network. */
  fetchImpl?: typeof fetch;
  /** Optional request init (headers, credentials, signal). */
  init?: RequestInit;
}

export class RemoteUiSeedFacade implements UiSeedFacade {
  public readonly source: UiSeedSourceType = UiSeedSourceType.Remote;
  private cache: Promise<CatSeedBundle> | null = null;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: RemoteUiSeedFacadeOptions) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  load(): Promise<CatSeedBundle> {
    if (!this.cache) {
      this.cache = this.fetchBundle();
    }

    return this.cache;
  }

  private async fetchBundle(): Promise<CatSeedBundle> {
    const response = await this.fetchImpl(this.options.endpoint, {
      ...this.options.init,
      headers: {
        accept: "application/json",
        ...(this.options.init?.headers ?? {}),
      },
    });

    if (response.ok === false) {
      throw new Error(
        `RemoteUiSeedFacade: ${this.options.endpoint} returned ${response.status} ${response.statusText}`,
      );
    }

    const raw: unknown = await response.json();

    return parseCatSeedBundle(raw);
  }

  async getSlice<K extends CatSeedBundleSlice>(slice: K): Promise<CatSeedBundle[K]> {
    const bundle = await this.load();

    return bundle[slice];
  }

  /** No-op subscription until a live channel (polling/SSE) is added. */
  subscribe(_listener: (next: CatSeedBundle) => void): () => void {
    return () => {};
  }

  /** Test/dev hook: drop the cache so the next load() re-fetches. */
  invalidate(): void {
    this.cache = null;
  }
}
