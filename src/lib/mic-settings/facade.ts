// Plan 79 step 14. MicSettings facade (fake IndexedDB implementation).
//
// Contract: .lovable/pending-facades/03-mic-settings-facade.md
// Model:    src/lib/mic-settings/model.ts
// Storage seam: reused from src/lib/projects/facade.ts.
//
// CRUD only. Referrer guard against project bindings is resolved lazily via
// an injected callback so this module has zero dep on the projects module
// (avoids a cycle: projects will import this facade in step 16).

import {
  MicSettingsSchema,
  MicSettingsReferencedError,
  MicSettingsValidationError,
  type MicSettings,
  type MicSettingsId,
} from "./model";
import { makeProjectRepositoryFacade, type ProjectRepositoryFacade } from "@/lib/projects/facade";
import { parseFacadeRows, serializeFacadeRows, type AsyncCrudFacade } from "@/lib/facade/contracts";

const STORAGE_KEY = "ca:mic-settings:v1";

function newCorrelationId(): string {
  return Math.random().toString(36).slice(2, 10).padEnd(8, "0");
}

export type MicSettingsReferrerResolver = (id: MicSettingsId) => string[];

export interface MicSettingsFacade extends AsyncCrudFacade<MicSettingsId, MicSettings> {
  /** Inject the project referrer resolver (set once at app bootstrap). */
  setReferrerResolver(fn: MicSettingsReferrerResolver | null): void;
}

class IndexedDbMicSettingsFacade implements MicSettingsFacade {
  private map = new Map<MicSettingsId, MicSettings>();
  private listeners = new Set<() => void>();
  private hydrated = false;
  private hydrating: Promise<void> | null = null;
  private resolveReferrers: MicSettingsReferrerResolver = () => [];

  constructor(private readonly repo: ProjectRepositoryFacade) {}

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  private async ensureHydrated(): Promise<void> {
    if (this.hydrated) return;

    if (this.hydrating) return this.hydrating;
    this.hydrating = (async () => {
      const raw = await this.repo.readItem(STORAGE_KEY);
      for (const row of parseFacadeRows<MicSettings>(
        raw,
        MicSettingsSchema,
        "mic-settings/facade",
      )) {
        this.map.set(row.id, row);
      }

      this.hydrated = true;
    })();

    return this.hydrating;
  }

  private async persist(): Promise<void> {
    await this.repo.writeItem(STORAGE_KEY, serializeFacadeRows(Array.from(this.map.values())));
  }

  async __hydrate(): Promise<void> {
    this.hydrated = false;
    this.hydrating = null;
    this.map.clear();
    await this.ensureHydrated();
    this.notify();
  }

  setReferrerResolver(fn: MicSettingsReferrerResolver | null): void {
    this.resolveReferrers = fn ?? (() => []);
  }

  list(): MicSettings[] {
    return Array.from(this.map.values());
  }

  get(id: MicSettingsId): MicSettings | undefined {
    return this.map.get(id);
  }

  async save(entry: MicSettings): Promise<MicSettings> {
    await this.ensureHydrated();
    const parsed = MicSettingsSchema.safeParse(entry);

    if (parsed.success === false) {
      throw new MicSettingsValidationError(parsed.error.issues, newCorrelationId());
    }

    this.map.set(parsed.data.id, parsed.data);
    await this.persist();
    this.notify();

    return parsed.data;
  }

  async remove(id: MicSettingsId): Promise<void> {
    await this.ensureHydrated();
    const projects = this.resolveReferrers(id);

    if (projects.length > 0) {
      throw new MicSettingsReferencedError({ projects }, newCorrelationId());
    }

    this.map.delete(id);
    await this.persist();
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    void this.ensureHydrated().then(() => listener());

    return () => {
      this.listeners.delete(listener);
    };
  }
}

let cached: MicSettingsFacade | null = null;

export function makeMicSettingsFacade(): MicSettingsFacade {
  if (cached) return cached;
  cached = new IndexedDbMicSettingsFacade(makeProjectRepositoryFacade());

  return cached;
}

export function __setMicSettingsFacadeForTests(f: MicSettingsFacade | null): void {
  cached = f;
}
