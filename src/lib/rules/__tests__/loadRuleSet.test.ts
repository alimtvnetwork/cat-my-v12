// @vitest-environment jsdom
// Day 2 tests: loadRuleSet and useRulesetHydration contract.

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
import { loadRuleSet, LoadRuleSetError } from "../loadRuleSet";
import { useRulesetHydration } from "../useRulesetHydration";
import { DataSourceType, setBackendBaseUrl, __resetDataSourceForTests } from "@/lib/data-source";
import {
  RULESET_SCHEMA_VERSION,
  ToleranceKindType,
  DraftOriginType,
  RuleKindType,
  type RuleSetEnvelope,
} from "../draftStore";
import { __resetRulesetIdAliasForTests } from "../ruleset-id-alias";

function sampleEnvelope(version = 1): RuleSetEnvelope {
  return {
    SchemaVersion: RULESET_SCHEMA_VERSION,
    RuleSetId: 42,
    Name: "Post-Seal Top Side Inspection",
    Version: version,
    Enabled: true,
    Rules: [
      {
        Id: 101,
        Kind: RuleKindType.Presence,
        Enabled: true,
        Shape: { Type: "rect", X: 120, Y: 240, W: 350, H: 180 },
        Tolerance: { Kind: ToleranceKindType.Pct, Value: 5 },
        Params: { _LegacyId: "r-label-1", _LegacyKind: "R", threshold: 128 },
      },
    ],
    DraftMeta: {
      ClientId: "c-test-client",
      UpdatedAt: "2026-09-16T10:00:00Z",
      Origin: DraftOriginType.Server,
    },
  };
}

describe("loadRuleSet (Day 2 Recipe + ROI load)", () => {
  beforeEach(() => {
    memory.clear();
    fetchMock.mockReset();
    __resetDataSourceForTests();
    __resetRulesetIdAliasForTests();
  });

  it("resolves the backend URL when configured", async () => {
    setBackendBaseUrl("http://127.0.0.1:8787");
    const env = sampleEnvelope(2);
    fetchMock.mockResolvedValueOnce(envelopeOk([env]));

    const loaded = await loadRuleSet(42);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/rules/42/set",
      expect.objectContaining({ method: "GET" }),
    );
    expect(loaded.RuleSetId).toBe(42);
    expect(loaded.Version).toBe(2);
    expect(loaded.Rules[0].Shape).toEqual({ Type: "rect", X: 120, Y: 240, W: 350, H: 180 });
  });

  it("mirrors the server-committed envelope into IDB with server origin", async () => {
    const env = sampleEnvelope(3);
    fetchMock.mockResolvedValueOnce(envelopeOk([env]));

    await loadRuleSet(42);

    const cached = memory.get("rs-draft:42") as RuleSetEnvelope | undefined;
    expect(cached).toBeDefined();
    expect(cached?.Version).toBe(3);
    expect(cached?.DraftMeta.Origin).toBe(DraftOriginType.Server);
  });

  it("throws LoadRuleSetError with 404 when recipe is not found on server", async () => {
    fetchMock.mockResolvedValueOnce(
      envelopeFail({ code: "E_BE_NOT_FOUND", backendMessage: "rule set 999 not found", httpStatus: 404 }),
    );

    await expect(loadRuleSet(999, { suppressCapture: true })).rejects.toThrowError(LoadRuleSetError);
  });
});

describe("useRulesetHydration", () => {
  beforeEach(() => {
    memory.clear();
    fetchMock.mockReset();
    __resetDataSourceForTests();
    __resetRulesetIdAliasForTests();
  });

  it("skips loading when dataSource is Seed", async () => {
    const onHydrated = vi.fn();
    renderHook(() =>
      useRulesetHydration({
        rulesetId: "rs-local-1",
        dataSource: DataSourceType.Seed,
        onHydrated,
      }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(onHydrated).not.toHaveBeenCalled();
  });

  it("calls onHydrated with server envelope when dataSource is Backend", async () => {
    const env = sampleEnvelope(5);
    fetchMock.mockResolvedValueOnce(envelopeOk([env]));
    const onHydrated = vi.fn();

    renderHook(() =>
      useRulesetHydration({
        rulesetId: "rs-local-1",
        dataSource: DataSourceType.Backend,
        onHydrated,
      }),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(onHydrated).toHaveBeenCalledWith(expect.objectContaining({ RuleSetId: 42, Version: 5 }));
  });

  it("gracefully handles 404 not-found without crashing or calling onHydrated", async () => {
    fetchMock.mockResolvedValueOnce(
      envelopeFail({ code: "E_BE_NOT_FOUND", backendMessage: "not found", httpStatus: 404 }),
    );
    const onHydrated = vi.fn();

    renderHook(() =>
      useRulesetHydration({
        rulesetId: "rs-fresh-1",
        dataSource: DataSourceType.Backend,
        onHydrated,
      }),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onHydrated).not.toHaveBeenCalled();
  });
});
