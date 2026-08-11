// Plan 79 step 47. ImageSamples facade tests: CRUD, schema rejection,
// project scoping, rehydrate, and subscribe notification.
import { describe, it, expect, beforeEach } from "vitest";
import { makeImageSamplesFacade, __setImageSamplesFacadeForTests } from "../facade";
import { ImageSampleValidationError, type ImageSample } from "../model";
import {
  __setProjectRepositoryFacadeForTests,
  type ProjectRepositoryFacade,
} from "@/lib/projects/facade";

function memoryRepo(): ProjectRepositoryFacade {
  const s = new Map<string, string>();

  return {
    kind: "memory",
    async readItem(k) {
      return s.get(k) ?? null;
    },
    async writeItem(k, v) {
      s.set(k, v);
    },
    async removeItem(k) {
      s.delete(k);
    },
  };
}

const DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function sample(id: string, projectId: string, extra: Partial<ImageSample> = {}): ImageSample {
  return {
    id,
    projectId,
    name: `sample-${id}`,
    dataUrl: DATA_URL,
    width: 1,
    height: 1,
    byteSize: 128,
    capturedAt: "2026-07-18T00:00:00.000Z",
    source: "upload",
    ...extra,
  };
}

beforeEach(() => {
  __setImageSamplesFacadeForTests(null);
  __setProjectRepositoryFacadeForTests(memoryRepo());
});

describe("ImageSamplesFacade", () => {
  it("saves and lists all", async () => {
    const f = makeImageSamplesFacade();
    await f.save(sample("a", "p1"));
    await f.save(sample("b", "p2"));
    expect(f.listAll()).toHaveLength(2);
  });

  it("filters by project id", async () => {
    const f = makeImageSamplesFacade();
    await f.save(sample("a", "p1", { capturedAt: "2026-07-17T00:00:00.000Z" }));
    await f.save(sample("b", "p1", { capturedAt: "2026-07-18T00:00:00.000Z" }));
    await f.save(sample("c", "p2"));
    const p1 = f.listByProject("p1");
    expect(p1.map((s) => s.id)).toEqual(["b", "a"]); // newest first
  });

  it("rejects invalid schema", async () => {
    const f = makeImageSamplesFacade();
    await expect(f.save(sample("a", "p1", { name: "" }))).rejects.toBeInstanceOf(
      ImageSampleValidationError,
    );
    await expect(f.save(sample("a", "p1", { dataUrl: "not-a-data-url" }))).rejects.toBeInstanceOf(
      ImageSampleValidationError,
    );
  });

  it("removes an entry", async () => {
    const f = makeImageSamplesFacade();
    await f.save(sample("a", "p1"));
    await f.remove("a");
    expect(f.get("a")).toBeUndefined();
  });

  it("notifies subscribers on save", async () => {
    const f = makeImageSamplesFacade();
    let n = 0;
    const off = f.subscribe(() => (n += 1));
    await f.save(sample("a", "p1"));
    expect(n).toBeGreaterThanOrEqual(1);
    off();
  });

  it("rehydrates from storage", async () => {
    const repo = memoryRepo();
    __setProjectRepositoryFacadeForTests(repo);
    const f1 = makeImageSamplesFacade();
    await f1.save(sample("a", "p1"));
    __setImageSamplesFacadeForTests(null);
    __setProjectRepositoryFacadeForTests(repo);
    const f2 = makeImageSamplesFacade();
    await f2.__hydrate();
    expect(f2.listAll().map((s) => s.id)).toEqual(["a"]);
  });

  it("plan 80 step 14: reorder persists orderIndex and drives listByProject", async () => {
    const repo = memoryRepo();
    __setProjectRepositoryFacadeForTests(repo);
    const f = makeImageSamplesFacade();
    await f.save(sample("a", "p1", { capturedAt: "2026-07-17T00:00:00.000Z" }));
    await f.save(sample("b", "p1", { capturedAt: "2026-07-18T00:00:00.000Z" }));
    await f.save(sample("c", "p1", { capturedAt: "2026-07-19T00:00:00.000Z" }));

    await f.reorder("p1", ["a", "c", "b"]);
    expect(f.listByProject("p1").map((s) => s.id)).toEqual(["a", "c", "b"]);
    // Persisted orderIndex must round-trip through hydrate.
    __setImageSamplesFacadeForTests(null);
    __setProjectRepositoryFacadeForTests(repo);
    const f2 = makeImageSamplesFacade();
    await f2.__hydrate();
    expect(f2.listByProject("p1").map((s) => s.id)).toEqual(["a", "c", "b"]);
  });

  it("plan 80 step 14: reorder ignores ids that belong to a different project", async () => {
    const f = makeImageSamplesFacade();
    await f.save(sample("a", "p1"));
    await f.save(sample("x", "p2"));
    await f.reorder("p1", ["x", "a"]);
    // "x" is filtered by projectId, so "a" gets orderIndex 1 (loop position).
    // listByProject("p1") still only returns "a".
    expect(f.listByProject("p1").map((s) => s.id)).toEqual(["a"]);
  });

  it("plan 82 step 1: remove compacts orderIndex so next uploads do not collide", async () => {
    const repo = memoryRepo();
    __setProjectRepositoryFacadeForTests(repo);
    const f = makeImageSamplesFacade();
    await f.save(sample("a", "p1", { orderIndex: 0 }));
    await f.save(sample("b", "p1", { orderIndex: 1 }));
    await f.save(sample("c", "p1", { orderIndex: 2 }));
    await f.remove("b");
    // After compaction the surviving rows are contiguous 0..N-1.
    expect(f.listByProject("p1").map((s) => [s.id, s.orderIndex])).toEqual([
      ["a", 0],
      ["c", 1],
    ]);
    // nextOrderIndex must be max+1 = 2, not `listByProject.length` reused.
    expect(f.nextOrderIndex("p1")).toBe(2);
    // Round-trip through hydrate: the compacted order survives a refresh.
    __setImageSamplesFacadeForTests(null);
    __setProjectRepositoryFacadeForTests(repo);
    const f2 = makeImageSamplesFacade();
    await f2.__hydrate();
    expect(f2.listByProject("p1").map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("plan 82 step 1: nextOrderIndex ignores other projects and legacy missing indices", async () => {
    const f = makeImageSamplesFacade();
    await f.save(sample("a", "p1", { orderIndex: 5 }));
    await f.save(sample("b", "p1")); // legacy, no orderIndex
    await f.save(sample("z", "p2", { orderIndex: 99 })); // different project
    // Max known orderIndex within p1 is 5, so next is 6. p2 is ignored.
    expect(f.nextOrderIndex("p1")).toBe(6);
    expect(f.nextOrderIndex("p2")).toBe(100);
    expect(f.nextOrderIndex("p3")).toBe(0);
  });

  it("plan 82 step 1: reorder appends missing project rows so the sequence stays authoritative", async () => {
    const f = makeImageSamplesFacade();
    await f.save(sample("a", "p1", { orderIndex: 0 }));
    await f.save(sample("b", "p1", { orderIndex: 1 }));
    await f.save(sample("c", "p1", { orderIndex: 2 }));
    // Caller forgot "c" - facade must still keep the sequence contiguous
    // by appending it at the tail rather than leaving a stale index 2.
    await f.reorder("p1", ["b", "a"]);
    const rows = f.listByProject("p1");
    expect(rows.map((s) => s.id)).toEqual(["b", "a", "c"]);
    expect(rows.map((s) => s.orderIndex)).toEqual([0, 1, 2]);
  });
});