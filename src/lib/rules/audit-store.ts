import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 83 backlog 13: rule audit trail store.
//
// Root cause addressed: enable/disable toggles at
// `src/routes/setup.rules.tsx` (single-row `handleToggleEnabled`, bulk
// `bulkSetEnabled`, and the inline `undoBulk`) emit only ephemeral
// `console.info` lines. After a refresh there is no way to answer
// "who/when/why did rule X flip off". This store is the single
// choke-point for those events: a bounded, localStorage-backed ring
// buffer with a stable event shape so future diagnostics surfaces can
// query it without touching route code.
//
// Not React-coupled: the setup.rules route calls `recordRuleToggle`
// directly. Zustand is used so a future audit-viewer component can
// subscribe with the standard selector pattern.

import { create } from "zustand";

import type { RuleId } from "./model";

/** Where the toggle came from. Used to attribute rewinds vs primary edits. */
export enum RuleAuditSourceType {
  Single = "single",
  Bulk = "bulk",
  BulkUndo = "bulk-undo",
}
export type RuleAuditSource = RuleAuditSourceType;

export interface RuleAuditEvent {
  /** 8-char base36; matches the CapturedError correlation id shape. */
  id: string;
  /** Epoch ms; wall clock at the moment `save` returned ok. */
  timestamp: number;
  ruleId: RuleId;
  /** Snapshot of the rule name at the toggle site, so a later rename does not lose the audit context. */
  ruleName: string;
  /** Explicit boolean; `undefined` in the domain model means enabled, so we normalise here. */
  prev: boolean;
  next: boolean;
  source: RuleAuditSource;
}

const STORAGE_KEY = "ca:rule-audit:v1";
const MAX_HISTORY = 200;

function makeEventId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function normalizeEnabled(v: boolean | undefined): boolean {
  return v !== false;
}

function readPersisted(): RuleAuditEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed) === false) return [];

    // Defensive filter: keep only well-shaped rows so a corrupt entry
    // never blocks the whole trail.
    return parsed.filter(
      (r): r is RuleAuditEvent =>
        !!r &&
        typeof r === "object" &&
        typeof (r as RuleAuditEvent).id === "string" &&
        typeof (r as RuleAuditEvent).timestamp === "number" &&
        typeof (r as RuleAuditEvent).ruleId === "string" &&
        typeof (r as RuleAuditEvent).ruleName === "string" &&
        typeof (r as RuleAuditEvent).prev === "boolean" &&
        typeof (r as RuleAuditEvent).next === "boolean" &&
        typeof (r as RuleAuditEvent).source === "string",
    );
  } catch (err) {
    ClientLogger.warn("[rule-audit] read failed", err);

    return [];
  }
}

function writePersisted(events: RuleAuditEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    // Storage quota / private-mode. Log and move on; the in-memory
    // ring is still authoritative for the current session.
    ClientLogger.warn("[rule-audit] persist failed", err);
  }
}

export interface RuleAuditState {
  /** Newest first, bounded to MAX_HISTORY. */
  events: RuleAuditEvent[];
  record: (input: {
    ruleId: RuleId;
    ruleName: string;
    prev: boolean | undefined;
    next: boolean | undefined;
    source: RuleAuditSource;
  }) => RuleAuditEvent;
  clear: () => void;
  __reset: () => void;
}

export const useRuleAuditStore = create<RuleAuditState>((set, get) => ({
  events: readPersisted(),
  record: (input) => {
    const event: RuleAuditEvent = {
      id: makeEventId(),
      timestamp: Date.now(),
      ruleId: input.ruleId,
      ruleName: input.ruleName,
      prev: normalizeEnabled(input.prev),
      next: normalizeEnabled(input.next),
      source: input.source,
    };
    const next = [event, ...get().events].slice(0, MAX_HISTORY);
    writePersisted(next);
    set({ events: next });
    // Stable structured line so log scrapers can ingest without regex-
    // parsing the existing per-site `[setup.rules] *` lines.
    ClientLogger.info("[rule-audit] toggle", {
      id: event.id,
      ruleId: event.ruleId,
      prev: event.prev,
      next: event.next,
      source: event.source,
      timestamp: event.timestamp,
    });

    return event;
  },
  clear: () => {
    writePersisted([]);
    set({ events: [] });
  },
  __reset: () => {
    writePersisted([]);
    set({ events: [] });
  },
}));

/**
 * Non-React convenience: record a toggle from anywhere without needing
 * a hook. Returns the event so callers can correlate with a toast id.
 */
export function recordRuleToggle(input: {
  ruleId: RuleId;
  ruleName: string;
  prev: boolean | undefined;
  next: boolean | undefined;
  source: RuleAuditSource;
}): RuleAuditEvent {
  return useRuleAuditStore.getState().record(input);
}
