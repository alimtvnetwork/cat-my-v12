// Plan 43 slice-2 step 1 verification: HTTP-method + storage-key registry
// smoke tests. Locks the literal values so a future rename fails loud.
import { describe, it, expect } from "vitest";
import { HttpMethod, ALL_HTTP_METHODS, isHttpMethod } from "@/lib/constants/http";
import { StorageKey, ALL_STORAGE_KEYS, isStorageKey } from "@/lib/constants/storage";

describe("HttpMethod registry", () => {
  it("exposes the seven standard methods", () => {
    expect(ALL_HTTP_METHODS).toEqual([
      HttpMethod.Get,
      HttpMethod.Post,
      HttpMethod.Put,
      HttpMethod.Patch,
      HttpMethod.Delete,
      HttpMethod.Head,
      HttpMethod.Options,
    ]);
  });
  it("guard accepts known verbs and rejects junk", () => {
    expect(isHttpMethod("GET")).toBe(true);
    expect(isHttpMethod("get")).toBe(false); // case-sensitive
    expect(isHttpMethod("TRACE")).toBe(false);
  });
});

describe("StorageKey registry", () => {
  it("keys are unique; ca./ca:/editor. prefixes only", () => {
    const set = new Set(ALL_STORAGE_KEYS);
    expect(set.size).toBe(ALL_STORAGE_KEYS.length);
    for (const key of ALL_STORAGE_KEYS) {
      expect(key.startsWith("ca.") || key.startsWith("ca:") || key.startsWith("editor.")).toBe(
        true,
      );
    }
  });
  it("guard accepts registered keys and rejects unknowns", () => {
    expect(isStorageKey(StorageKey.CameraControls)).toBe(true);
    expect(isStorageKey(StorageKey.ActiveProgram)).toBe(true);
    expect(isStorageKey("ca.unknown")).toBe(false);
  });
});

// Barrel re-export sanity: importing from the barrel gives the same values.
describe("constants barrel re-export", () => {
  it("re-exports HttpMethod and StorageKey from `@/lib/constants`", async () => {
    const mod = await import("@/lib/constants");
    expect(mod.HttpMethod.Get).toBe("GET");
    expect(mod.StorageKey.CameraControls).toBe("ca.settings.camera.controls");
  });
});
