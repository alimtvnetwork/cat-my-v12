import { ChainEventTriggerType } from "@/lib/functions/chain-events";
import { describe, it, expect } from "vitest";
import {
  EMPTY_CHAIN_EVENT_STORE,
  validateChainEvent,
  upsertChainEvent,
  deleteChainEvent,
  resolveEventsForRule,
  resolveEventsForRuleset,
  checkChainEventIntegrity,
  type ChainEvent,
  type ChainEventStore,
} from "../chain-events";
import type { FunctionLibrary } from "../library";

const baseRuleEvent = (over: Partial<ChainEvent> = {}): ChainEvent => ({
  id: "e1",
  trigger: ChainEventTriggerType.BeforeRule,
  ruleId: "r1",
  functionId: "f1",
  enabled: true,
  order: 0,
  ...over,
});

const baseRulesetEvent = (over: Partial<ChainEvent> = {}): ChainEvent => ({
  id: "s1",
  trigger: ChainEventTriggerType.BeforeRuleset,
  functionId: "f1",
  enabled: true,
  order: 0,
  ...over,
});

describe("validateChainEvent", () => {
  it("accepts a valid rule-scoped event", () => {
    expect(validateChainEvent(baseRuleEvent())).toEqual([]);
  });

  it("accepts a valid ruleset-scoped event", () => {
    expect(validateChainEvent(baseRulesetEvent())).toEqual([]);
  });

  it("rejects empty id, functionId, and unknown trigger", () => {
    const errs = validateChainEvent({
      id: "",
      trigger: "bogus" as ChainEvent["trigger"],
      functionId: "",
      enabled: true,
      order: 0,
    });
    const codes = errs.map((e) => e.code).sort();
    expect(codes).toContain("ce.id.empty");
    expect(codes).toContain("ce.trigger.unknown");
    expect(codes).toContain("ce.functionId.empty");
  });

  it("requires ruleId for rule triggers", () => {
    const errs = validateChainEvent(baseRuleEvent({ ruleId: undefined }));
    expect(errs.map((e) => e.code)).toContain("ce.ruleId.missing");
  });

  it("rejects ruleId on ruleset triggers", () => {
    const errs = validateChainEvent(baseRulesetEvent({ ruleId: "r1" }));
    expect(errs.map((e) => e.code)).toContain("ce.ruleId.unexpected");
  });

  it("rejects non-finite order", () => {
    const errs = validateChainEvent(baseRuleEvent({ order: Number.NaN }));
    expect(errs.map((e) => e.code)).toContain("ce.order.invalid");
  });
});

describe("upsert / delete", () => {
  it("upserts a new event", () => {
    const r = upsertChainEvent(EMPTY_CHAIN_EVENT_STORE, baseRuleEvent());
    expect(r.errors).toEqual([]);
    expect(r.store.events).toHaveLength(1);
  });

  it("upsert updates existing by id", () => {
    const s1 = upsertChainEvent(EMPTY_CHAIN_EVENT_STORE, baseRuleEvent()).store;
    const s2 = upsertChainEvent(s1, baseRuleEvent({ functionId: "f2" })).store;
    expect(s2.events).toHaveLength(1);
    expect(s2.events[0].functionId).toBe("f2");
  });

  it("invalid event returns errors and leaves store unchanged", () => {
    const s0 = upsertChainEvent(EMPTY_CHAIN_EVENT_STORE, baseRuleEvent()).store;
    const r = upsertChainEvent(s0, baseRuleEvent({ id: "", functionId: "" }));
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.store).toBe(s0);
  });

  it("delete removes matching id and is a no-op otherwise", () => {
    const s1 = upsertChainEvent(EMPTY_CHAIN_EVENT_STORE, baseRuleEvent()).store;
    expect(deleteChainEvent(s1, "e1").events).toHaveLength(0);
    expect(deleteChainEvent(s1, "missing").events).toHaveLength(1);
  });
});

describe("resolve", () => {
  const store: ChainEventStore = {
    version: 1,
    events: [
      baseRuleEvent({ id: "b", order: 2 }),
      baseRuleEvent({ id: "a", order: 1 }),
      baseRuleEvent({ id: "c", order: 1 }),
      baseRuleEvent({ id: "d", order: 0, enabled: false }),
      baseRuleEvent({ id: "e", ruleId: "r2", order: 0 }),
      baseRulesetEvent({ id: "rs1", order: 5 }),
      baseRulesetEvent({ id: "rs2", trigger: ChainEventTriggerType.AfterRuleset, order: 0 }),
    ],
  };

  it("returns enabled events for a rule, sorted by order then id", () => {
    const res = resolveEventsForRule(store, ChainEventTriggerType.BeforeRule, "r1").map(
      (e) => e.id,
    );
    expect(res).toEqual(["a", "c", "b"]);
  });

  it("filters by ruleId", () => {
    expect(
      resolveEventsForRule(store, ChainEventTriggerType.BeforeRule, "r2").map((e) => e.id),
    ).toEqual(["e"]);
  });

  it("filters ruleset triggers", () => {
    expect(
      resolveEventsForRuleset(store, ChainEventTriggerType.BeforeRuleset).map((e) => e.id),
    ).toEqual(["rs1"]);
    expect(
      resolveEventsForRuleset(store, ChainEventTriggerType.AfterRuleset).map((e) => e.id),
    ).toEqual(["rs2"]);
  });
});

describe("checkChainEventIntegrity", () => {
  const lib: FunctionLibrary = {
    version: 1,
    entries: [
      { id: "f1", name: "f1", description: "", source: "return 1;", createdAt: 1, updatedAt: 1 },
    ],
  };

  it("returns no issues when every functionId resolves", () => {
    const store = upsertChainEvent(EMPTY_CHAIN_EVENT_STORE, baseRuleEvent()).store;
    expect(checkChainEventIntegrity(store, lib)).toEqual([]);
  });

  it("flags dangling functionIds with a code", () => {
    const store = upsertChainEvent(
      EMPTY_CHAIN_EVENT_STORE,
      baseRuleEvent({ functionId: "missing" }),
    ).store;
    const issues = checkChainEventIntegrity(store, lib);
    expect(issues).toEqual([
      { eventId: "e1", functionId: "missing", code: "ce.functionId.dangling" },
    ]);
  });
});
