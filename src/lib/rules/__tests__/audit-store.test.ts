import { RuleAuditSourceType } from "@/lib/rules/audit-store";
// @vitest-environment jsdom
// Plan 83 backlog 13. Rule audit store must:
//   1. Record a toggle with normalised prev/next booleans.
//   2. Keep newest-first order across successive records.
//   3. Persist to localStorage so the trail survives a reload.
//   4. Bound at MAX_HISTORY (asserted via 201 writes -> length 200).

import { describe, it, expect, beforeEach } from "vitest";

import type { RuleId } from "../model";
import { useRuleAuditStore, recordRuleToggle } from "../audit-store";

const STORAGE_KEY = "ca:rule-audit:v1";

beforeEach(() => {
  window.localStorage.clear();
  useRuleAuditStore.getState().__reset();
});

describe("rule audit-store", () => {
  it("normalises undefined prev to enabled=true and records newest-first", () => {
    recordRuleToggle({
      ruleId: "r1" as RuleId,
      ruleName: "First",
      prev: undefined,
      next: false,
      source: RuleAuditSourceType.Single,
    });
    recordRuleToggle({
      ruleId: "r2" as RuleId,
      ruleName: "Second",
      prev: false,
      next: true,
      source: RuleAuditSourceType.Bulk,
    });
    const events = useRuleAuditStore.getState().events;
    expect(events).toHaveLength(2);
    expect(events[0].ruleId).toBe("r2");
    expect(events[0].prev).toBe(false);
    expect(events[0].next).toBe(true);
    expect(events[1].ruleId).toBe("r1");
    expect(events[1].prev).toBe(true); // undefined -> true
    expect(events[1].next).toBe(false);
  });

  it("persists events to localStorage under STORAGE_KEY", () => {
    recordRuleToggle({
      ruleId: "rX" as RuleId,
      ruleName: "Persisted",
      prev: true,
      next: false,
      source: RuleAuditSourceType.BulkUndo,
    });
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].ruleId).toBe("rX");
    expect(parsed[0].source).toBe("bulk-undo");
    expect(typeof parsed[0].id).toBe("string");
    expect(parsed[0].id).toHaveLength(8);
  });

  it("caps the ring buffer at MAX_HISTORY (200)", () => {
    for (let i = 0; i < 205; i++) {
      recordRuleToggle({
        ruleId: `r${i}` as RuleId,
        ruleName: `Rule ${i}`,
        prev: true,
        next: false,
        source: RuleAuditSourceType.Single,
      });
    }
    const events = useRuleAuditStore.getState().events;
    expect(events).toHaveLength(200);
    // Newest first: last recorded (i=204) sits at index 0.
    expect(events[0].ruleId).toBe("r204");
    expect(events[199].ruleId).toBe("r5");
  });

  it("clear() empties both memory and localStorage", () => {
    recordRuleToggle({
      ruleId: "r1" as RuleId,
      ruleName: "One",
      prev: true,
      next: false,
      source: RuleAuditSourceType.Single,
    });
    useRuleAuditStore.getState().clear();
    expect(useRuleAuditStore.getState().events).toHaveLength(0);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("[]");
  });
});
