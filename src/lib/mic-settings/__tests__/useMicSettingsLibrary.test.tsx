// @vitest-environment jsdom
// Plan 79 step 19 coverage.

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMicSettingsLibrary } from "../useMicSettingsLibrary";
import { makeMicSettingsFacade, __setMicSettingsFacadeForTests } from "../facade";
import { MicSettingsReferencedError, type MicSettings, type MicSettingsId } from "../model";
import {
  __setProjectRepositoryFacadeForTests,
  type ProjectRepositoryFacade,
} from "@/lib/projects/facade";

function memoryRepo(): ProjectRepositoryFacade {
  const store = new Map<string, string>();

  return {
    kind: "memory",
    async readItem(k) {
      return store.get(k) ?? null;
    },
    async writeItem(k, v) {
      store.set(k, v);
    },
    async removeItem(k) {
      store.delete(k);
    },
  };
}

const iso = "2026-07-18T00:00:00.000Z";
function mic(id: string, name = id.toUpperCase()): MicSettings {
  return {
    id: id as MicSettingsId,
    name,
    params: {},
    createdAt: iso,
    updatedAt: iso,
  } as MicSettings;
}

beforeEach(() => {
  __setMicSettingsFacadeForTests(null);
  __setProjectRepositoryFacadeForTests(memoryRepo());
});

describe("useMicSettingsLibrary", () => {
  it("starts empty and populates via save()", async () => {
    const { result } = renderHook(() => useMicSettingsLibrary());
    expect(result.current.all).toEqual([]);
    await act(async () => {
      await result.current.save(mic("m-1"));
    });
    await waitFor(() => expect(result.current.all).toHaveLength(1));
    expect(result.current.byId("m-1" as MicSettingsId)?.name).toBe("M-1");
  });

  it("byId returns undefined for unknown ids", async () => {
    const { result } = renderHook(() => useMicSettingsLibrary());
    expect(result.current.byId("missing" as MicSettingsId)).toBeUndefined();
  });

  it("re-throws MicSettingsReferencedError when a project binds the row", async () => {
    const f = makeMicSettingsFacade();
    f.setReferrerResolver((id) => (id === ("m-1" as MicSettingsId) ? ["p-1"] : []));
    await f.save(mic("m-1"));
    const { result } = renderHook(() => useMicSettingsLibrary());
    await waitFor(() => expect(result.current.all).toHaveLength(1));
    await expect(result.current.remove("m-1" as MicSettingsId)).rejects.toBeInstanceOf(
      MicSettingsReferencedError,
    );
  });
});
