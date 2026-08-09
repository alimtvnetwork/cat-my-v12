// Plan 79 step 17. Coverage for computeEffectiveChain.
//
// Required cases (from rule-category-project-model.md verification triggers):
//   1. empty roots
//   2. single root, no deps
//   3. nested deps (spec example: [X3, X4] with X3.appliesBefore=[X1,X2])
//   4. shared ancestor dedupe (keep first occurrence)
//   5. direct cycle (A -> A via appliesBefore, only reachable if schema
//      guard is bypassed, e.g. hand-edited JSON)
//   6. indirect cycle (A -> B -> A)
//
// Bonus:
//   7. dangling id is reported in `missing`, walk continues
//   8. self-appearance in deeper chain still dedupes to first slot

import { describe, it, expect } from "vitest";
import { computeEffectiveChain } from "../chain";
import type { Rule, RuleId } from "@/lib/rules/model";

function makeRule(id: string, appliesBefore: string[] = []): Rule {
  return {
    id: id as RuleId,
    name: id,
    isCategory: false,
    appliesBefore: appliesBefore as RuleId[],
    conditions: [],
    createdAt: "2026-07-18T00:00:00.000Z",
    updatedAt: "2026-07-18T00:00:00.000Z",
  } as Rule;
}

function resolver(rules: Rule[]): (id: RuleId) => Rule | null {
  const byId = new Map(rules.map((r) => [r.id, r]));

  return (id) => byId.get(id) ?? null;
}

describe("computeEffectiveChain", () => {
  it("returns empty for empty root list", () => {
    const r = computeEffectiveChain([], resolver([]));
    expect(r.chain).toEqual([]);
    expect(r.cycle).toBeUndefined();
    expect(r.missing).toEqual([]);
  });

  it("returns a single rule when there are no deps", () => {
    const a = makeRule("A");
    const r = computeEffectiveChain([a.id], resolver([a]));
    expect(r.chain.map((x) => x.id)).toEqual(["A"]);
    expect(r.missing).toEqual([]);
  });

  it("expands the spec example [X3, X4] with X3.appliesBefore=[X1, X2]", () => {
    const x1 = makeRule("X1");
    const x2 = makeRule("X2");
    const x3 = makeRule("X3", ["X1", "X2"]);
    const x4 = makeRule("X4");
    const r = computeEffectiveChain([x3.id, x4.id], resolver([x1, x2, x3, x4]));
    expect(r.chain.map((x) => x.id)).toEqual(["X1", "X2", "X3", "X4"]);
  });

  it("dedupes a shared ancestor and keeps the first occurrence", () => {
    // Both B and C depend on A. Roots [B, C] should yield [A, B, C], not
    // [A, B, A, C].
    const a = makeRule("A");
    const b = makeRule("B", ["A"]);
    const c = makeRule("C", ["A"]);
    const r = computeEffectiveChain([b.id, c.id], resolver([a, b, c]));
    expect(r.chain.map((x) => x.id)).toEqual(["A", "B", "C"]);
  });

  it("detects a direct cycle A -> A", () => {
    // The Zod schema rejects self-refs, but the expander must not loop if
    // one arrives via hand-edited JSON.
    const a = { ...makeRule("A"), appliesBefore: ["A"] as RuleId[] } as Rule;
    const r = computeEffectiveChain([a.id], resolver([a]));
    expect(r.cycle).toEqual(["A", "A"]);
    expect(r.chain).toEqual([]);
  });

  it("detects an indirect cycle A -> B -> A", () => {
    const a = makeRule("A", ["B"]);
    const b = makeRule("B", ["A"]);
    const r = computeEffectiveChain([a.id], resolver([a, b]));
    expect(r.cycle).toEqual(["A", "B", "A"]);
    expect(r.chain).toEqual([]);
  });

  it("drops dangling ids into `missing` and keeps walking", () => {
    const a = makeRule("A", ["MISSING"]);
    const r = computeEffectiveChain([a.id], resolver([a]));
    expect(r.chain.map((x) => x.id)).toEqual(["A"]);
    expect(r.missing).toEqual(["MISSING"]);
    expect(r.cycle).toBeUndefined();
  });

  it("keeps first occurrence when a rule is both a root and a nested dep", () => {
    // Root order: [A, B]. B depends on A. A must appear once, at index 0.
    const a = makeRule("A");
    const b = makeRule("B", ["A"]);
    const r = computeEffectiveChain([a.id, b.id], resolver([a, b]));
    expect(r.chain.map((x) => x.id)).toEqual(["A", "B"]);
  });

  // Plan 83 backlog 11c. `enabled === false` must remove the rule from
  // `chain` and land in `disabled`; missing/undefined stays enabled.
  it("skips rules with enabled=false and reports them in `disabled`", () => {
    const a = makeRule("A");
    const b = { ...makeRule("B"), enabled: false } as Rule;
    const c = makeRule("C");
    const r = computeEffectiveChain([a.id, b.id, c.id], resolver([a, b, c]));
    expect(r.chain.map((x) => x.id)).toEqual(["A", "C"]);
    expect(r.disabled).toEqual(["B"]);
    expect(r.missing).toEqual([]);
  });

  it("does not traverse appliesBefore of a disabled rule (dep only present via other roots)", () => {
    // B is disabled and would normally pull A in. With B off, A must NOT
    // appear unless another enabled root asks for it.
    const a = makeRule("A");
    const b = { ...makeRule("B", ["A"]), enabled: false } as Rule;
    const r = computeEffectiveChain([b.id], resolver([a, b]));
    expect(r.chain).toEqual([]);
    expect(r.disabled).toEqual(["B"]);
  });

  it("still pulls a shared dep in when an enabled sibling references it", () => {
    const a = makeRule("A");
    const b = { ...makeRule("B", ["A"]), enabled: false } as Rule;
    const c = makeRule("C", ["A"]);
    const r = computeEffectiveChain([b.id, c.id], resolver([a, b, c]));
    expect(r.chain.map((x) => x.id)).toEqual(["A", "C"]);
    expect(r.disabled).toEqual(["B"]);
  });

  it("treats missing `enabled` as enabled (backward compat)", () => {
    const a = makeRule("A"); // no `enabled` field at all
    const r = computeEffectiveChain([a.id], resolver([a]));
    expect(r.chain.map((x) => x.id)).toEqual(["A"]);
    expect(r.disabled).toEqual([]);
  });
});
