// @vitest-environment jsdom
// Plan 79 step 26. Cycle rejection wiring for the metadata bar.
//
// What this covers:
//   1. The applies-before picker filters out self, uncategorized, already
//      selected ids, and any candidate whose chain transitively reaches
//      the edited rule. This is the client-side defense in depth for the
//      "no cycles" invariant in RuleSchema.superRefine.
//   2. If a cycle somehow reaches the facade (bypassing the UI filter),
//      the RuleCycleError is caught, surfaced inline next to the picker,
//      and never swallowed. Correlation id is pushed through
//      showToastError per spec 21/40.
//   3. Editing name auto-saves through the facade (debounced).

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { RuleMetadataBar } from "../RuleMetadataBar";
import { __setRuleFacadeForTests, makeRuleFacade, type RuleFacade } from "@/lib/rules/facade";
import { RuleCycleError, UNCATEGORIZED_RULE_ID, type Rule, type RuleId } from "@/lib/rules/model";
import {
  __setProjectRepositoryFacadeForTests,
  type ProjectRepositoryFacade,
} from "@/lib/projects/facade";

vi.mock("@/lib/errors/notify", () => ({
  showToastError: vi.fn(),
}));
import { showToastError } from "@/lib/errors/notify";

function memoryRepo(): ProjectRepositoryFacade {
  const store = new Map<string, string>();

  return {
    kind: "memory",
    async readItem(k) {
      return store.get(k) ?? null;
    },
    async writeItem(k, v) {
      store.set(k, v);
    },
    async removeItem(k) {
      store.delete(k);
    },
  };
}

const iso = "2026-07-18T00:00:00.000Z";
function makeRule(id: string, extra: Partial<Rule> = {}): Rule {
  return {
    id: id as RuleId,
    name: id.toUpperCase(),
    isCategory: false,
    appliesBefore: [],
    conditions: [],
    createdAt: iso,
    updatedAt: iso,
    ...extra,
  } as Rule;
}

async function seed(facade: RuleFacade, rules: Rule[]): Promise<void> {
  for (const r of rules) await facade.save(r);
  await facade.__hydrate();
}

beforeEach(() => {
  __setRuleFacadeForTests(null);
  __setProjectRepositoryFacadeForTests(memoryRepo());
  (showToastError as unknown as { mockClear: () => void }).mockClear();
});

afterEach(() => {
  // No auto-cleanup is configured in vitest.config.ts, so previous renders
  // would otherwise leak into `screen` queries and yield duplicate matches.
  cleanup();
});

describe("RuleMetadataBar cycle rejection wiring", () => {
  it("hides self, uncategorized, already-selected, and transitive-reachers from the picker", async () => {
    const facade = makeRuleFacade();
    // Graph: A -> B (A appliesBefore B); Uncat is built-in.
    // Editing B: options must exclude B (self), Uncat (built-in), and
    // A (adding A would form A -> B -> A cycle since A already reaches B).
    // C is safe.
    const uncat = makeRule("cat-uncategorized", { isCategory: true, name: "Uncategorized" });
    const a = makeRule("a", { appliesBefore: ["b" as RuleId] });
    const b = makeRule("b");
    const c = makeRule("c");
    await seed(facade, [uncat, a, b, c]);

    render(<RuleMetadataBar rule={facade.get("b" as RuleId)!} />);

    const picker = await screen.findByTestId("applies-before-picker");
    const options = within(picker)
      .getAllByRole("option")
      .map((o) => o.textContent?.trim());
    // "Add dependency..." placeholder is present.
    expect(options).toContain("Add dependency...");
    // Safe candidate is offered.
    expect(options).toContain("C");
    // Filtered out: self, uncategorized, transitive reacher.
    expect(options).not.toContain("B");
    expect(options).not.toContain("Uncategorized");
    expect(options).not.toContain("A");
  });

  it("surfaces RuleCycleError inline and calls showToastError with correlation id when facade rejects", async () => {
    const facade = makeRuleFacade();
    const b = makeRule("b");
    await seed(facade, [b]);

    // Replace save to simulate a facade-level cycle rejection even though
    // the UI filter would normally prevent it. This is the defense-in-depth
    // path: concurrent edit or direct facade call.
    facade.save = vi.fn(async () => {
      throw new RuleCycleError(["b" as RuleId, "b" as RuleId], "cid00001");
    }) as typeof facade.save;

    const target = facade.get("b" as RuleId)!;
    expect(target).toBeDefined();
    render(<RuleMetadataBar rule={target} />);

    // Trigger a commit via name change (debounced 400 ms). Use real timers.
    const input = await screen.findByTestId("rule-name-input");
    fireEvent.change(input, { target: { value: "Renamed" } });

    const alert = await screen.findByRole("alert", {}, { timeout: 2000 });
    expect(alert.textContent).toMatch(/Cycle: b -> b/);
    expect(showToastError).toHaveBeenCalled();
    const call = (showToastError as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    expect(call?.[0]).toBe("Applies-before cycle rejected");
    expect(call?.[1]).toBeInstanceOf(RuleCycleError);
  });

  it("auto-saves a name change through the facade after the debounce window", async () => {
    const facade = makeRuleFacade();
    const b = makeRule("b");
    await seed(facade, [b]);
    const saveSpy = vi.spyOn(facade, "save");

    render(<RuleMetadataBar rule={facade.get("b" as RuleId)!} />);
    const input = await screen.findByTestId("rule-name-input");
    fireEvent.change(input, { target: { value: "Renamed" } });

    // Wait past the 400 ms name debounce.
    await new Promise((r) => setTimeout(r, 600));

    expect(saveSpy).toHaveBeenCalled();
    const lastCall = saveSpy.mock.calls.at(-1);
    expect(lastCall?.[0].name).toBe("Renamed");
  });
});