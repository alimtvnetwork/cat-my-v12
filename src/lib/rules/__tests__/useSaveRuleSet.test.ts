// @vitest-environment jsdom
// Plan 90 Step 134 tests. useSaveRuleSet state-machine contract.

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

import { useSaveRuleSet } from "../useSaveRuleSet";
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
  return new Response(
    JSON.stringify({ TraceId: "t", Success: true, Results: [env], Errors: null }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function errResponse(status: number, code: string): Response {
  return new Response(
    JSON.stringify({
      TraceId: "t",
      Success: false,
      Results: [],
      Errors: { Code: code, BackendMessage: `boom: ${code}` },
    }),
    { status, headers: { "content-type": "application/json" } },
  );
}

describe("useSaveRuleSet", () => {
  beforeEach(() => {
    memory.clear();
    fetchMock.mockReset();
  });

  it("starts idle", () => {
    const { result } = renderHook(() => useSaveRuleSet());
    expect(result.current.state.kind).toBe("idle");
  });

  it("transitions idle -> saved on success and mirrors committed to IDB", async () => {
    const committed = { ...envelope(), Version: 2 };
    fetchMock.mockResolvedValueOnce(okResponse(committed));
    const { result } = renderHook(() => useSaveRuleSet());
    await act(async () => {
      await result.current.save(envelope());
    });
    expect(result.current.state.kind).toBe("saved");
    if (result.current.state.kind === "saved") {
      expect(result.current.state.committed.Version).toBe(2);
    }
    expect(memory.get("rs-draft:7")).toBeDefined();
  });

  it("routes E_BE_CONFLICT into { kind: 'conflict' } with local envelope", async () => {
    fetchMock.mockResolvedValueOnce(errResponse(409, "E_BE_CONFLICT"));
    const { result } = renderHook(() => useSaveRuleSet());
    const local = envelope(1);
    await act(async () => {
      await result.current.save(local);
    });
    expect(result.current.state.kind).toBe("conflict");
    if (result.current.state.kind === "conflict") {
      expect(result.current.state.error.code).toBe("E_BE_CONFLICT");
      expect(result.current.state.localEnvelope.RuleSetId).toBe(7);
    }
  });

  it("routes non-conflict SaveRuleSetError into { kind: 'error' }", async () => {
    fetchMock.mockResolvedValueOnce(errResponse(400, "E_BE_BAD_REQUEST"));
    const { result } = renderHook(() => useSaveRuleSet());
    await act(async () => {
      await result.current.save(envelope());
    });
    expect(result.current.state.kind).toBe("error");
    if (result.current.state.kind === "error") {
      expect(result.current.state.error.code).toBe("E_BE_BAD_REQUEST");
    }
  });

  it("reset() returns to idle from any state", async () => {
    fetchMock.mockResolvedValueOnce(errResponse(409, "E_BE_CONFLICT"));
    const { result } = renderHook(() => useSaveRuleSet());
    await act(async () => {
      await result.current.save(envelope());
    });
    expect(result.current.state.kind).toBe("conflict");
    act(() => {
      result.current.reset();
    });
    expect(result.current.state.kind).toBe("idle");
  });

  it("ignores stale save() results when a newer save() supersedes", async () => {
    let resolveFirst!: (r: Response) => void;
    const first = new Promise<Response>((res) => {
      resolveFirst = res;
    });
    fetchMock.mockReturnValueOnce(first);
    const committedSecond = { ...envelope(), Version: 9 };
    fetchMock.mockResolvedValueOnce(okResponse(committedSecond));

    const { result } = renderHook(() => useSaveRuleSet());
    // Kick off two saves; second one wins.
    let firstDone: Promise<void>;
    await act(async () => {
      firstDone = result.current.save(envelope(1));
      await result.current.save(envelope(2));
    });
    // Now resolve the first (stale) request as a conflict.
    await act(async () => {
      resolveFirst(errResponse(409, "E_BE_CONFLICT"));
      await firstDone;
    });
    // The second (successful) save must remain the committed state.
    expect(result.current.state.kind).toBe("saved");
  });
});