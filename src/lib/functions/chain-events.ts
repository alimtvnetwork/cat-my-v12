// Plan 66 step 21 (FS-02) slice 1: chain-events pure core.
//
// A chain event ties a user-authored function (see FS-01 `library.ts`) to a
// point in the ruleset run: before/after a specific rule, or before/after the
// whole ruleset. This module owns types, coded validation, immutable CRUD,
// sorted resolution, and integrity checks against a FunctionLibrary. It
// never executes JS; slice 2 will wire the inspector UI and the sandboxed
// runner.

import type { FunctionLibrary } from "./library";

export enum ChainEventTriggerType {
  BeforeRuleset = "beforeRuleset",
  AfterRuleset = "afterRuleset",
  BeforeRule = "beforeRule",
  AfterRule = "afterRule",
}
export type ChainEventTrigger = ChainEventTriggerType;

export interface ChainEvent {
  id: string;
  trigger: ChainEventTrigger;
  /** Required for beforeRule / afterRule. Ignored for ruleset-level. */
  ruleId?: string;
  functionId: string;
  enabled: boolean;
  /** Sort key within the same (trigger, ruleId) bucket. Finite number. */
  order: number;
}

export interface ChainEventStore {
  version: 1;
  events: ChainEvent[];
}

export const EMPTY_CHAIN_EVENT_STORE: Readonly<ChainEventStore> = Object.freeze({
  version: 1,
  events: [],
});

export interface ChainEventValidationError {
  code:
    | "ce.id.empty"
    | "ce.trigger.unknown"
    | "ce.functionId.empty"
    | "ce.ruleId.missing"
    | "ce.ruleId.unexpected"
    | "ce.order.invalid";
  message: string;
}

const RULE_TRIGGERS: ReadonlySet<ChainEventTriggerType> = new Set([
  ChainEventTriggerType.BeforeRule,
  ChainEventTriggerType.AfterRule,
]);

const ALL_TRIGGERS: ReadonlySet<ChainEventTriggerType> = new Set([
  ChainEventTriggerType.BeforeRuleset,
  ChainEventTriggerType.AfterRuleset,
  ChainEventTriggerType.BeforeRule,
  ChainEventTriggerType.AfterRule,
]);

export function validateChainEvent(ev: ChainEvent): ChainEventValidationError[] {
  const errs: ChainEventValidationError[] = [];

  if (!ev.id || ev.id.trim().length === 0) {
    errs.push({ code: "ce.id.empty", message: "id must be a non-empty string." });
  }

  if (ALL_TRIGGERS.has(ev.trigger) === false) {
    errs.push({
      code: "ce.trigger.unknown",
      message: `unknown trigger: ${String(ev.trigger)}`,
    });
  }

  if (!ev.functionId || ev.functionId.trim().length === 0) {
    errs.push({
      code: "ce.functionId.empty",
      message: "functionId must be a non-empty string.",
    });
  }

  const ruleScoped = RULE_TRIGGERS.has(ev.trigger);
  const hasRuleId = typeof ev.ruleId === "string" && ev.ruleId.trim().length > 0;

  if (ruleScoped && !hasRuleId) {
    errs.push({
      code: "ce.ruleId.missing",
      message: "ruleId is required for beforeRule/afterRule triggers.",
    });
  }

  if (!ruleScoped && hasRuleId) {
    errs.push({
      code: "ce.ruleId.unexpected",
      message: "ruleId must be omitted for ruleset-level triggers.",
    });
  }

  if (Number.isFinite(ev.order) === false) {
    errs.push({
      code: "ce.order.invalid",
      message: "order must be a finite number.",
    });
  }

  return errs;
}

// ---------------------------------------------------------------------------
// Immutable CRUD. Every op returns a NEW store.
// ---------------------------------------------------------------------------

export interface ChainEventCrudResult {
  store: ChainEventStore;
  errors: ChainEventValidationError[];
}

export function upsertChainEvent(store: ChainEventStore, event: ChainEvent): ChainEventCrudResult {
  const errors = validateChainEvent(event);

  if (errors.length > 0) return { store, errors };
  const idx = store.events.findIndex((e) => e.id === event.id);
  const next = store.events.slice();

  if (idx === -1) next.push(event);
  else next[idx] = event;

  return { store: { ...store, events: next }, errors: [] };
}

export function deleteChainEvent(store: ChainEventStore, id: string): ChainEventStore {
  return { ...store, events: store.events.filter((e) => e.id !== id) };
}

// ---------------------------------------------------------------------------
// Resolution: enabled events, sorted by order (stable by id on ties).
// ---------------------------------------------------------------------------

export function resolveEventsForRule(
  store: ChainEventStore,
  trigger: "beforeRule" | "afterRule",
  ruleId: string,
): ChainEvent[] {
  return store.events
    .filter((e) => e.enabled && e.trigger === trigger && e.ruleId === ruleId)
    .slice()
    .sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function resolveEventsForRuleset(
  store: ChainEventStore,
  trigger: "beforeRuleset" | "afterRuleset",
): ChainEvent[] {
  return store.events
    .filter((e) => e.enabled && e.trigger === trigger)
    .slice()
    .sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// ---------------------------------------------------------------------------
// Integrity: every referenced functionId must exist in the library.
// Returns the set of event ids whose functionId is dangling.
// ---------------------------------------------------------------------------

export interface IntegrityIssue {
  eventId: string;
  functionId: string;
  code: "ce.functionId.dangling";
}

export function checkChainEventIntegrity(
  store: ChainEventStore,
  library: FunctionLibrary,
): IntegrityIssue[] {
  const known = new Set(library.entries.map((e) => e.id));
  const issues: IntegrityIssue[] = [];
  for (const ev of store.events) {
    if (known.has(ev.functionId) === false) {
      issues.push({
        eventId: ev.id,
        functionId: ev.functionId,
        code: "ce.functionId.dangling",
      });
    }
  }

  return issues;
}
