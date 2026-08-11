// Plan 79 step 45. Image samples facade (IndexedDB via ProjectRepositoryFacade).
//
// Root cause this module fixes, in one sentence: the V4 project editor's
// Image Samples section had no persistence, so uploads did not survive a
// reload and could not be listed / renamed / deleted.
//
// Contract mirrors mic-settings/facade.ts: CRUD + subscribe, all writes go
// through the shared IndexedDB seam, and hydration is lazy + idempotent.

import { ImageSampleSchema, ImageSampleValidationError, type ImageSample } from "./model";
import { makeProjectRepositoryFacade, type ProjectRepositoryFacade } from "@/lib/projects/facade";
import { parseFacadeRows, serializeFacadeRows } from "@/lib/facade/contracts";

const STORAGE_KEY = "ca:image-samples:v1";

function newCorrelationId(): string {
  return Math.random().toString(36).slice(2, 10).padEnd(8, "0");
}

export interface ImageSamplesFacade {
  listAll(): ImageSample[];
  listByProject(projectId: string): ImageSample[];
  get(id: string): ImageSample | undefined;
  /**
   * Plan 82 step 1. Return the next contiguous `orderIndex` for a project
   * so newly saved samples land at the end of the persisted order without
   * colliding with an existing index (which used to happen after a delete
   * left gaps in the sequence).
   */
  nextOrderIndex(projectId: string): number;
  save(entry: ImageSample): Promise<ImageSample>;
  remove(id: string): Promise<void>;
  /**
   * Plan 80 step 14. Persist a new ordering for a project's samples.
   * `orderedIds` must contain every id from `listByProject(projectId)`.
   * Any id passed that does not belong to `projectId` is ignored with a warn.
   */
  reorder(projectId: string, orderedIds: readonly string[]): Promise<void>;
  subscribe(listener: () => void): () => void;
  __hydrate(): Promise<void>;
}

class IndexedDbImageSamplesFacade implements ImageSamplesFacade {
  private map = new Map<string, ImageSample>();
  private listeners = new Set<() => void>();
  private hydrated = false;
  private hydrating: Promise<void> | null = null;

  constructor(private readonly repo: ProjectRepositoryFacade) {}

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  private async ensureHydrated(): Promise<void> {
    if (this.hydrated) return;

    if (this.hydrating) return this.hydrating;
    this.hydrating = (async () => {
      const raw = await this.repo.readItem(STORAGE_KEY);
      for (const row of parseFacadeRows<ImageSample>(
        raw,
        ImageSampleSchema,
        "image-samples/facade",
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

  listAll(): ImageSample[] {
    return Array.from(this.map.values());
  }

  listByProject(projectId: string): ImageSample[] {
    return this.listAll()
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => {
        // Plan 80 step 14: orderIndex asc when present, missing sorts last;
        // fall back to capturedAt desc so brand-new uploads land on top.
        const ao = a.orderIndex ?? Number.POSITIVE_INFINITY;
        const bo = b.orderIndex ?? Number.POSITIVE_INFINITY;

        if (ao !== bo) return ao - bo;

        return a.capturedAt < b.capturedAt ? 1 : -1;
      });
  }

  get(id: string): ImageSample | undefined {
    return this.map.get(id);
  }

  nextOrderIndex(projectId: string): number {
    let max = -1;
    for (const row of this.map.values()) {
      if (row.projectId !== projectId) continue;

      if (typeof row.orderIndex === "number" && row.orderIndex > max) {
        max = row.orderIndex;
      }
    }

    return max + 1;
  }

  async save(entry: ImageSample): Promise<ImageSample> {
    await this.ensureHydrated();
    const parsed = ImageSampleSchema.safeParse(entry);

    if (parsed.success === false) {
      const cid = newCorrelationId();
      console.error("[image-samples/facade] save validation failed", {
        cid,
        issues: parsed.error.issues,
      });

      throw new ImageSampleValidationError(parsed.error.issues, cid);
    }

    this.map.set(parsed.data.id, parsed.data);
    await this.persist();
    this.notify();

    return parsed.data;
  }

  async remove(id: string): Promise<void> {
    await this.ensureHydrated();
    const removed = this.map.get(id);
    this.map.delete(id);
    // Plan 82 step 1: after a delete the surviving project samples may have
    // a non-contiguous orderIndex sequence (0, 2, 3). Compact it in place so
    // subsequent uploads using `nextOrderIndex()` cannot collide, and so the
    // persisted order round-trips deterministically after a refresh.
    if (removed) this.compactProjectOrder(removed.projectId);
    await this.persist();
    this.notify();
  }

  private compactProjectOrder(projectId: string): void {
    const rows = this.listByProject(projectId);
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];

      if (row.orderIndex !== i) {
        this.map.set(row.id, { ...row, orderIndex: i });
      }
    }
  }

  async reorder(projectId: string, orderedIds: readonly string[]): Promise<void> {
    await this.ensureHydrated();
    let hasChanged = false;
    const seen = new Set<string>();
    for (let i = 0; i < orderedIds.length; i += 1) {
      const id = orderedIds[i];
      const row = this.map.get(id);

      if (!row) {
        console.warn("[image-samples/facade] reorder: unknown id", { id, projectId });
        continue;
      }

      if (row.projectId !== projectId) {
        console.warn("[image-samples/facade] reorder: id not in project", {
          id,
          projectId,
          rowProjectId: row.projectId,
        });
        continue;
      }

      seen.add(id);

      if (row.orderIndex !== i) {
        this.map.set(id, { ...row, orderIndex: i });
        hasChanged = true;
      }
    }
    // Plan 82 step 1: append any project rows the caller forgot, so the
    // sequence stays contiguous and authoritative. Prevents a stale
    // orderIndex from surviving a reorder that missed a row.
    let tail = seen.size;
    for (const row of this.map.values()) {
      if (row.projectId !== projectId || seen.has(row.id)) continue;

      if (row.orderIndex !== tail) {
        this.map.set(row.id, { ...row, orderIndex: tail });
        hasChanged = true;
      }

      tail += 1;
    }

    if (hasChanged) {
      await this.persist();
      this.notify();
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    void this.ensureHydrated().then(() => listener());

    return () => {
      this.listeners.delete(listener);
    };
  }
}

let cached: ImageSamplesFacade | null = null;

export function makeImageSamplesFacade(): ImageSamplesFacade {
  if (cached) return cached;
  cached = new IndexedDbImageSamplesFacade(makeProjectRepositoryFacade());

  return cached;
}

export function __setImageSamplesFacadeForTests(f: ImageSamplesFacade | null): void {
  cached = f;
}