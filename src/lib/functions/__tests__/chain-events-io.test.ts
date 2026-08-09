import { ChainEventTriggerType } from "@/lib/functions/chain-events";
import { describe, it, expect } from "vitest";
import { exportChainEventsJson, importChainEventsJson } from "../chain-events-io";
import type { ChainEventStore } from "../chain-events";

const store: ChainEventStore = {
  version: 1,
  events: [
    {
      id: "a",
      trigger: ChainEventTriggerType.BeforeRule,
      ruleId: "r1",
      functionId: "f1",
      enabled: true,
      order: 0,
    },
    {
      id: "b",
      trigger: ChainEventTriggerType.BeforeRuleset,
      functionId: "f2",
      enabled: false,
      order: 5,
    },
  ],
};

describe("chain-events IO", () => {
  it("round-trips a valid store byte-equal", () => {
    const json = exportChainEventsJson(store);
    const r = importChainEventsJson(json);
    expect(r.parseError).toBeUndefined();
    expect(r.errors).toEqual([]);
    expect(r.store).toEqual(store);
  });

  it("surfaces parseError on invalid JSON", () => {
    const r = importChainEventsJson("not json");
    expect(r.parseError).toBeDefined();
    expect(r.store.events).toEqual([]);
  });

  it("rejects non-object payload", () => {
    expect(importChainEventsJson("42").parseError).toBe("payload is not an object");
  });

  it("rejects unsupported version", () => {
    const r = importChainEventsJson(JSON.stringify({ version: 2, events: [] }));
    expect(r.parseError).toMatch(/unsupported version/);
  });

  it("rejects non-array events", () => {
    const r = importChainEventsJson(JSON.stringify({ version: 1, events: {} }));
    expect(r.parseError).toBe("events must be an array");
  });

  it("keeps valid events, collects errors for invalid ones", () => {
    const payload = {
      version: 1,
      events: [
        {
          id: "ok",
          trigger: "beforeRule",
          ruleId: "r1",
          functionId: "f1",
          enabled: true,
          order: 0,
        },
        { id: "", trigger: "beforeRule", ruleId: "r1", functionId: "", enabled: true, order: 0 },
        { id: "bad-trigger", trigger: "nope", functionId: "f1", enabled: true, order: 0 },
        "junk",
        null,
      ],
    };
    const r = importChainEventsJson(JSON.stringify(payload));
    expect(r.store.events.map((e) => e.id)).toEqual(["ok"]);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("applies defaults for missing optional fields (enabled defaults true)", () => {
    const payload = {
      version: 1,
      events: [{ id: "x", trigger: "beforeRule", ruleId: "r1", functionId: "f1", order: 0 }],
    };
    const r = importChainEventsJson(JSON.stringify(payload));
    expect(r.store.events).toHaveLength(1);
    expect(r.store.events[0].enabled).toBe(true);
  });
});
