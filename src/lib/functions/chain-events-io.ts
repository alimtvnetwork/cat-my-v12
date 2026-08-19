// Plan 66 step 21 (FS-02) slice 1.5: chain-events JSON import/export.
//
// Small, dependency-free serializer that mirrors the FS-01 library IO shape.
// Slice 2 will call these from the inspector "Chain events" panel and from
// the ruleset export path so chain events travel with a ruleset.

import {
  EMPTY_CHAIN_EVENT_STORE,
  validateChainEvent,
  type ChainEvent,
  type ChainEventStore,
  type ChainEventValidationError,
} from "./chain-events";

export function exportChainEventsJson(store: ChainEventStore): string {

  return JSON.stringify(store, null, 2);
}

export interface ChainEventImportResult {
  store: ChainEventStore;
  errors: ChainEventValidationError[];
  /** Reason the payload was rejected outright (parse or schema shape). */
  parseError?: string;
}

/**
 * Parse and validate a serialized chain-event store. Never throws. Rejects
 * payloads with the wrong shape via `parseError`; otherwise returns the
 * store plus a flat list of per-event validation errors (invalid events
 * are dropped, valid ones kept).
 */
export function importChainEventsJson(text: string): ChainEventImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {

    return {
      store: { ...EMPTY_CHAIN_EVENT_STORE },
      errors: [],
      parseError: err instanceof Error ? err.message : String(err),
    };
  }

  if (!raw || typeof raw !== "object") {

    return {
      store: { ...EMPTY_CHAIN_EVENT_STORE },
      errors: [],
      parseError: "payload is not an object",
    };
  }

  const obj = raw as { version?: unknown; events?: unknown };

  if (obj.version !== 1) {

    return {
      store: { ...EMPTY_CHAIN_EVENT_STORE },
      errors: [],
      parseError: `unsupported version: ${String(obj.version)}`,
    };
  }

  if (Array.isArray(obj.events) === false) {

    return {
      store: { ...EMPTY_CHAIN_EVENT_STORE },
      errors: [],
      parseError: "events must be an array",
    };
  }

  const errors: ChainEventValidationError[] = [];
  const kept: ChainEvent[] = [];
  for (const item of obj.events) {
    if (!item || typeof item !== "object") continue;
    const e = item as Partial<ChainEvent>;
    const ev: ChainEvent = {
      id: typeof e.id === "string" ? e.id : "",
      trigger: (e.trigger ?? "beforeRule") as ChainEvent["trigger"],
      ruleId: typeof e.ruleId === "string" ? e.ruleId : undefined,
      functionId: typeof e.functionId === "string" ? e.functionId : "",
      enabled: typeof e.enabled === "boolean" ? e.enabled : true,
      order: typeof e.order === "number" ? e.order : 0,
    };
    const evErrs = validateChainEvent(ev);

    if (evErrs.length > 0) {
      errors.push(...evErrs);
      continue;
    }

    kept.push(ev);
  }

  return { store: { version: 1, events: kept }, errors };
}
