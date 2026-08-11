// @vitest-environment jsdom
// Plan 90 Step 137. Boot reconciliation contract.
import { describe, it, expect, beforeEach, vi } from "vitest";
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
import { reconcileDrafts } from "../reconcileDrafts";
import {
  putDraft,
  RULESET_SCHEMA_VERSION,
  ToleranceKindType,
  DraftOriginType,
  RuleKindType,
  type RuleSetEnvelope,
} from "../draftStore";
function envelope(id: number, version: number): RuleSetEnvelope {
  return {
    SchemaVersion: RULESET_SCHEMA_VERSION,
    RuleSetId: id,
    Name: `RS-${id}`,
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
      Origin: DraftOriginType.Indexeddb,
    },
  };
}
function okBody(env: RuleSetEnvelope): Response {
  return envelopeOk([env]);
}
function errBody(status: number, code: string): Response {
  return envelopeFail({ code, backendMessage: code, httpStatus: status });
}
describe("reconcileDrafts", () => {
  beforeEach(() => {
    memory.clear();
    fetchMock.mockReset();
  });
  it("classifies in-sync, server-newer, local-newer, server-missing, load-failed", async () => {
    await putDraft(envelope(1, 5)); // will be in-sync
    await putDraft(envelope(2, 3)); // server has 9 -> server-newer
    await putDraft(envelope(3, 9)); // server has 3 -> local-newer
    await putDraft(envelope(4, 1)); // server 404 -> server-missing
    await putDraft(envelope(5, 1)); // server 500 -> load-failed
    fetchMock
      .mockResolvedValueOnce(okBody(envelope(1, 5)))
      .mockResolvedValueOnce(okBody(envelope(2, 9)))
      .mockResolvedValueOnce(okBody(envelope(3, 3)))
      .mockResolvedValueOnce(errBody(404, "E_BE_NOT_FOUND"))
      .mockResolvedValueOnce(errBody(500, "E_BE_UNKNOWN"));
    const out = await reconcileDrafts();
    const byId = new Map(out.map((e) => [e.RuleSetId, e]));
    expect(byId.get(1)?.Kind).toBe("in-sync");
    expect(byId.get(2)?.Kind).toBe("server-newer");
    expect(byId.get(3)?.Kind).toBe("local-newer");
    expect(byId.get(4)?.Kind).toBe("server-missing");
    expect(byId.get(5)?.Kind).toBe("load-failed");
    expect(byId.get(5)?.Error?.Code).toBe("E_BE_UNKNOWN");
  });
  it("purgeMissing deletes drafts whose server side is 404", async () => {
    await putDraft(envelope(7, 1));
    fetchMock.mockResolvedValueOnce(errBody(404, "E_BE_NOT_FOUND"));
    await reconcileDrafts({ purgeMissing: true });
    expect(memory.has("rs-draft:7")).toBe(false);
  });
  it("never throws on transport failure (network reject)", async () => {
    await putDraft(envelope(8, 1));
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const out = await reconcileDrafts();
    expect(out[0].Kind).toBe("load-failed");
    expect(out[0].Error?.Code).toBe("E_BE_UNAVAILABLE");
  });
  it("returns empty list when no drafts are stored", async () => {
    const out = await reconcileDrafts();
    expect(out).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});