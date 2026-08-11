// Plan 66 step 21 (FS-02) slice 1.75: chain-events runner (pure orchestrator).
//
// Walks resolved chain events for a trigger and invokes each function via an
// injected `invoke` callback. This module does NOT sandbox JS; slice 2 will
// pass a sandboxed invoker (Web Worker or vm) as `invoke`. Keeping the
// orchestration pure means the sandbox choice can be swapped without
// re-testing the walk/error-aggregation logic.

import {
  resolveEventsForRule,
  resolveEventsForRuleset,
  type ChainEvent,
  type ChainEventStore,
} from "./chain-events";

export interface ChainEventInvocationContext {
  eventId: string;
  functionId: string;
  trigger: ChainEvent["trigger"];
  ruleId?: string;
  /** Arbitrary user-supplied payload passed to every function on this pass. */
  payload: Readonly<Record<string, unknown>>;
}

export type ChainEventInvokeResult =
  { ok: true; value: unknown } | { ok: false; code: string; message: string };

export type ChainEventInvoker = (
  ctx: ChainEventInvocationContext,
) => Promise<ChainEventInvokeResult>;

export interface ChainEventRunLogEntry {
  eventId: string;
  functionId: string;
  ok: boolean;
  code?: string;
  message?: string;
  value?: unknown;
  durationMs: number;
}

export interface ChainEventRunResult {
  ok: boolean;
  log: ChainEventRunLogEntry[];
}

export interface RunChainEventsOptions {
  store: ChainEventStore;
  invoke: ChainEventInvoker;
  payload?: Readonly<Record<string, unknown>>;
  /** Milliseconds. If an invocation exceeds this, it is marked as timeout and the run aborts. */
  perEventTimeoutMs?: number;
  /** Injected clock, defaults to Date.now. Tests can supply a deterministic one. */
  now?: () => number;
  /** If true, stop on the first failure. Defaults to true. */
  stopOnError?: boolean;
}

export interface RunForRuleOptions extends RunChainEventsOptions {
  trigger: "beforeRule" | "afterRule";
  ruleId: string;
}

export interface RunForRulesetOptions extends RunChainEventsOptions {
  trigger: "beforeRuleset" | "afterRuleset";
}

function raceTimeout<T>(
  p: Promise<T>,
  ms: number | undefined,
): Promise<{ ok: true; value: T } | { ok: false; code: "ce.run.timeout"; message: string }> {
  if (!ms || Number.isFinite(ms) === false || ms <= 0)

    return p.then((value) => ({ ok: true, value }));

  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => {
      if (done) return;
      done = true;
      resolve({ ok: false, code: "ce.run.timeout", message: `exceeded ${ms}ms` });
    }, ms);
    p.then(
      (value) => {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve({ ok: true, value });
      },
      (err: unknown) => {
        if (done) return;
        done = true;
        clearTimeout(t);
        // Surfaced as a thrown invoke; the caller normalizes to a run entry.
        resolve({
          ok: false,
          code: "ce.run.timeout",
          message: err instanceof Error ? err.message : String(err),
        });
      },
    );
  });
}

async function runEvents(
  events: ChainEvent[],
  opts: RunChainEventsOptions,
): Promise<ChainEventRunResult> {
  const now = opts.now ?? Date.now;
  const stopOnError = opts.stopOnError !== false;
  const payload = opts.payload ?? {};
  const log: ChainEventRunLogEntry[] = [];
  let ok = true;
  for (const ev of events) {
    const start = now();
    const ctx: ChainEventInvocationContext = {
      eventId: ev.id,
      functionId: ev.functionId,
      trigger: ev.trigger,
      ruleId: ev.ruleId,
      payload,
    };
    let res: ChainEventInvokeResult;
    try {
      const raced = await raceTimeout(opts.invoke(ctx), opts.perEventTimeoutMs);

      if (raced.ok) {
        res = raced.value;
      } else {
        res = { ok: false, code: raced.code, message: raced.message };
      }
    } catch (err) {
      res = {
        ok: false,
        code: "ce.run.threw",
        message: err instanceof Error ? err.message : String(err),
      };
    }

    const durationMs = Math.max(0, now() - start);

    if (res.ok) {
      log.push({
        eventId: ev.id,
        functionId: ev.functionId,
        ok: true,
        value: res.value,
        durationMs,
      });
    } else {
      ok = false;
      log.push({
        eventId: ev.id,
        functionId: ev.functionId,
        ok: false,
        code: res.code,
        message: res.message,
        durationMs,
      });

      if (stopOnError) break;
    }
  }

  return { ok, log };
}

export function runChainEventsForRule(opts: RunForRuleOptions): Promise<ChainEventRunResult> {
  const events = resolveEventsForRule(opts.store, opts.trigger, opts.ruleId);

  return runEvents(events, opts);
}

export function runChainEventsForRuleset(opts: RunForRulesetOptions): Promise<ChainEventRunResult> {
  const events = resolveEventsForRuleset(opts.store, opts.trigger);

  return runEvents(events, opts);
}