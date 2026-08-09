// @vitest-environment jsdom
// Plan 79 step 20 coverage.

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCameraLibrary } from "../useCameraLibrary";
import { __setCameraFacadeForTests, makeCameraFacade } from "../facade";
import { makeDefaultCameraSetting, type CameraSetting } from "../model";

function seed(name = "Cam A"): CameraSetting {
  const e = makeDefaultCameraSetting();

  return { ...e, name };
}

beforeEach(() => {
  __setCameraFacadeForTests(null);
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
});

describe("useCameraLibrary", () => {
  it("starts empty and populates via save()", async () => {
    const { result } = renderHook(() => useCameraLibrary());
    expect(result.current.all).toEqual([]);
    act(() => {
      const r = result.current.save(seed("Cam-1"));
      expect(r.ok).toBe(true);
    });
    await waitFor(() => expect(result.current.all).toHaveLength(1));
    expect(result.current.all[0].name).toBe("Cam-1");
  });

  it("byId returns undefined for unknown ids", () => {
    const { result } = renderHook(() => useCameraLibrary());
    expect(result.current.byId("nope")).toBeUndefined();
  });

  it("remove blocks when referrer resolver reports project bindings", async () => {
    const facade = makeCameraFacade();
    facade.setReferrerResolver((id) => (id === "cam-x" ? ["p-1"] : []));
    const entry: CameraSetting = { ...seed("Bound"), id: "cam-x" };
    facade.save(entry);
    const { result } = renderHook(() => useCameraLibrary());
    await waitFor(() => expect(result.current.all).toHaveLength(1));
    const out = result.current.remove("cam-x");
    expect(out.ok).toBe(false);

    if (out.ok === false) expect(out.kind).toBe("referenced");
  });
});
