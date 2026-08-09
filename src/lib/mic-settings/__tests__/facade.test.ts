// Plan 79 step 14. MicSettings facade tests: CRUD, schema rejection,
// referrer-guarded delete, subscribe, rehydrate.
import { describe, it, expect, beforeEach } from "vitest";
import { makeMicSettingsFacade, __setMicSettingsFacadeForTests } from "../facade";
import {
  MicSettingsReferencedError,
  MicSettingsValidationError,
  type MicSettings,
  type MicSettingsId,
} from "../model";
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

const iso = "2026-07-18T00:00:00.000Z";
function mic(id: string, extra: Partial<MicSettings> = {}): MicSettings {
  return {
    id: id as MicSettingsId,
    name: id.toUpperCase(),
    params: {},
    createdAt: iso,
    updatedAt: iso,
    ...extra,
  } as MicSettings;
}

beforeEach(() => {
  __setMicSettingsFacadeForTests(null);
  __setProjectRepositoryFacadeForTests(memoryRepo());
});

describe("MicSettingsFacade", () => {
  it("saves and lists", async () => {
    const f = makeMicSettingsFacade();
    await f.save(mic("a"));
    await f.save(mic("b"));
    expect(f.list()).toHaveLength(2);
  });

  it("rejects invalid schema", async () => {
    const f = makeMicSettingsFacade();
    await expect(f.save(mic("a", { name: "" }))).rejects.toBeInstanceOf(MicSettingsValidationError);
  });

  it("rejects delete when referrers exist", async () => {
    const f = makeMicSettingsFacade();
    await f.save(mic("a"));
    f.setReferrerResolver(() => ["p-1", "p-2"]);
    await expect(f.remove("a" as MicSettingsId)).rejects.toBeInstanceOf(MicSettingsReferencedError);
  });

  it("deletes when no referrers", async () => {
    const f = makeMicSettingsFacade();
    await f.save(mic("a"));
    f.setReferrerResolver(() => []);
    await f.remove("a" as MicSettingsId);
    expect(f.get("a" as MicSettingsId)).toBeUndefined();
  });

  it("notifies subscribers on save", async () => {
    const f = makeMicSettingsFacade();
    let n = 0;
    const off = f.subscribe(() => (n += 1));
    await f.save(mic("a"));
    expect(n).toBeGreaterThanOrEqual(1);
    off();
  });

  it("rehydrates from storage", async () => {
    const repo = memoryRepo();
    __setProjectRepositoryFacadeForTests(repo);
    const f1 = makeMicSettingsFacade();
    await f1.save(mic("a"));
    __setMicSettingsFacadeForTests(null);
    __setProjectRepositoryFacadeForTests(repo);
    const f2 = makeMicSettingsFacade();
    await f2.__hydrate();
    expect(f2.list().map((m) => m.id)).toEqual(["a"]);
  });
});
