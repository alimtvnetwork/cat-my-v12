import { ChainEventTriggerType } from "@/lib/functions/chain-events";
import { describe, it, expect, vi } from "vitest";
import {
  runChainEventsForRule,
  runChainEventsForRuleset,
  type ChainEventInvoker,
} from "../chain-events-runner";
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
      order: 1,
    },
    {
      id: "b",
      trigger: ChainEventTriggerType.BeforeRule,
      ruleId: "r1",
      functionId: "f2",
      enabled: true,
      order: 2,
    },
    {
      id: "c",
      trigger: ChainEventTriggerType.BeforeRule,
      ruleId: "r1",
      functionId: "f3",
      enabled: false,
      order: 3,
    },
    {
      id: "d",
      trigger: ChainEventTriggerType.AfterRule,
      ruleId: "r1",
      functionId: "f4",
      enabled: true,
      order: 0,
    },
    {
      id: "e",
      trigger: ChainEventTriggerType.BeforeRuleset,
      functionId: "f5",
      enabled: true,
      order: 0,
    },
  ],
};

describe("chain-events runner", () => {
  it("runs enabled events in order and collects a log", async () => {
    const seen: string[] = [];
    const invoke: ChainEventInvoker = async (ctx) => {
      seen.push(ctx.eventId);

      return { ok: true, value: ctx.functionId };
    };
    const r = await runChainEventsForRule({
      store,
      trigger: "beforeRule",
      ruleId: "r1",
      invoke,
    });
    expect(r.ok).toBe(true);
    expect(seen).toEqual(["a", "b"]);
    expect(r.log.map((e) => e.value)).toEqual(["f1", "f2"]);
  });

  it("stops on first failure by default and marks ok=false", async () => {
    const invoke: ChainEventInvoker = async (ctx) =>
      ctx.eventId === "a"
        ? { ok: false, code: "fn.threw", message: "boom" }
        : { ok: true, value: 1 };
    const r = await runChainEventsForRule({
      store,
      trigger: "beforeRule",
      ruleId: "r1",
      invoke,
    });
    expect(r.ok).toBe(false);
    expect(r.log).toHaveLength(1);
    expect(r.log[0]).toMatchObject({ eventId: "a", ok: false, code: "fn.threw" });
  });

  it("continues after failure when stopOnError=false", async () => {
    const invoke: ChainEventInvoker = async (ctx) =>
      ctx.eventId === "a"
        ? { ok: false, code: "fn.threw", message: "boom" }
        : { ok: true, value: 1 };
    const r = await runChainEventsForRule({
      store,
      trigger: "beforeRule",
      ruleId: "r1",
      invoke,
      stopOnError: false,
    });
    expect(r.ok).toBe(false);
    expect(r.log.map((e) => e.eventId)).toEqual(["a", "b"]);
  });

  it("normalizes a thrown invoker to code ce.run.threw", async () => {
    const invoke: ChainEventInvoker = async () => {
      throw new Error("nope");
    };
    const r = await runChainEventsForRule({
      store,
      trigger: "beforeRule",
      ruleId: "r1",
      invoke,
    });
    expect(r.log[0]).toMatchObject({ ok: false, code: "ce.run.threw", message: "nope" });
  });

  it("times out a slow invoker with code ce.run.timeout", async () => {
    vi.useFakeTimers();
    try {
      const invoke: ChainEventInvoker = () => new Promise(() => {});
      const p = runChainEventsForRule({
        store,
        trigger: "beforeRule",
        ruleId: "r1",
        invoke,
        perEventTimeoutMs: 50,
      });
      await vi.advanceTimersByTimeAsync(60);
      const r = await p;
      expect(r.ok).toBe(false);
      expect(r.log[0]).toMatchObject({ ok: false, code: "ce.run.timeout" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("records durationMs from the injected clock", async () => {
    let t = 1000;
    const now = () => t;
    const invoke: ChainEventInvoker = async () => {
      t += 7;

      return { ok: true, value: null };
    };
    const r = await runChainEventsForRule({
      store,
      trigger: "beforeRule",
      ruleId: "r1",
      invoke,
      now,
    });
    expect(r.log[0].durationMs).toBe(7);
  });

  it("runs ruleset triggers", async () => {
    const invoke: ChainEventInvoker = async (ctx) => ({ ok: true, value: ctx.functionId });
    const r = await runChainEventsForRuleset({
      store,
      trigger: "beforeRuleset",
      invoke,
    });
    expect(r.ok).toBe(true);
    expect(r.log.map((e) => e.functionId)).toEqual(["f5"]);
  });

  it("passes payload through to the invoker context", async () => {
    const seen: unknown[] = [];
    const invoke: ChainEventInvoker = async (ctx) => {
      seen.push(ctx.payload);

      return { ok: true, value: null };
    };
    await runChainEventsForRule({
      store,
      trigger: "beforeRule",
      ruleId: "r1",
      invoke,
      payload: { serial: "S123" },
    });
    expect(seen[0]).toEqual({ serial: "S123" });
  });

  it("empty resolution yields ok=true with empty log", async () => {
    const invoke: ChainEventInvoker = vi.fn(async () => ({ ok: true as const, value: null }));
    const r = await runChainEventsForRule({
      store,
      trigger: "beforeRule",
      ruleId: "nope",
      invoke,
    });
    expect(r).toEqual({ ok: true, log: [] });
    expect(invoke).not.toHaveBeenCalled();
  });
});
