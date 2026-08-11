// @vitest-environment jsdom
// Plan 90 Step 136. Conflict resolver contract.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
const memory = new Map<string, unknown>();
vi.mock("idb-keyval", () => ({
  get: vi.fn(async (k: string) => memory.get(k)),
  set: vi.fn(async (k: string, v: unknown) => {
    memory.set(k, v);
  }),
  del: vi.fn(async (k: string) => {
    memory.delete(k);
  }),
  keys: vi.fn(async () => Array.from(memory.keys())),
}));
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
import { envelopeOk, envelopeFail } from "@/lib/backend/envelope-server";
import { useSaveConflictResolvers } from "../useSaveConflictResolvers";
import {
  RULESET_SCHEMA_VERSION,
  ToleranceKindType,
  DraftOriginType,
  RuleKindType,
  type RuleSetEnvelope,
} from "../draftStore";
function envelope(version = 1): RuleSetEnvelope {
  return {
    SchemaVersion: RULESET_SCHEMA_VERSION,
    RuleSetId: 7,
    Name: "Housing",
    Version: version,
    Enabled: true,
    Rules: [
      {
        Id: 1,
        Kind: RuleKindType.Presence,
        Enabled: true,
        Shape: { Type: "rect", X: 0, Y: 0, W: 10, H: 10 },
        Tolerance: { Kind: ToleranceKindType.Pct, Value: 5 },
        Params: {},
      },
    ],
    DraftMeta: {
      ClientId: "c-1",
      UpdatedAt: "2026-07-21T00:00:00Z",
      Origin: DraftOriginType.Server,
    },
  };
}
function okResponse(env: RuleSetEnvelope): Response {
  return envelopeOk([env]);
}
describe("useSaveConflictResolvers", () => {
  beforeEach(() => {
    memory.clear();
    fetchMock.mockReset();
  });
  it("onReloadServer GETs the server envelope, mirrors to IDB, and resets state", async () => {
    const server = { ...envelope(9) };
    fetchMock.mockResolvedValueOnce(okResponse(server));
    const save = vi.fn();
    const reset = vi.fn();
    const onServerReloaded = vi.fn();
    const { result } = renderHook(() =>
      useSaveConflictResolvers({ save, reset, onServerReloaded }),
    );
    await act(async () => {
      await result.current.onReloadServer(envelope(1));
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/rules/7/set",
      expect.objectContaining({ method: "GET" }),
    );
    expect(onServerReloaded).toHaveBeenCalledWith(expect.objectContaining({ Version: 9 }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(memory.get("rs-draft:7")).toBeDefined();
  });
  it("onOverwriteLocal fetches server Version and re-saves the rebased envelope", async () => {
    const server = { ...envelope(9) };
    fetchMock.mockResolvedValueOnce(okResponse(server));
    const save = vi.fn().mockResolvedValue(undefined);
    const reset = vi.fn();
    const { result } = renderHook(() => useSaveConflictResolvers({ save, reset }));
    await act(async () => {
      await result.current.onOverwriteLocal(envelope(1));
    });
    expect(save).toHaveBeenCalledTimes(1);
    const rebased = save.mock.calls[0][0] as RuleSetEnvelope;
    expect(rebased.Version).toBe(9);
    expect(rebased.RuleSetId).toBe(7);
    expect(rebased.DraftMeta.Origin).toBe("indexeddb");
  });
  it("onCancel just calls reset()", () => {
    const save = vi.fn();
    const reset = vi.fn();
    const { result } = renderHook(() => useSaveConflictResolvers({ save, reset }));
    act(() => {
      result.current.onCancel();
    });
    expect(reset).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
  });
  it("onReloadServer surfaces load errors instead of swallowing them", async () => {
    fetchMock.mockResolvedValueOnce(
      envelopeFail({ code: "E_BE_NOT_FOUND", backendMessage: "gone", httpStatus: 404 }),
    );
    const save = vi.fn();
    const reset = vi.fn();
    const { result } = renderHook(() => useSaveConflictResolvers({ save, reset }));
    await expect(
      act(async () => {
        await result.current.onReloadServer(envelope(1));
      }),
    ).rejects.toMatchObject({ code: "E_BE_NOT_FOUND" });
    expect(reset).not.toHaveBeenCalled();
  });
});