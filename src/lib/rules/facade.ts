// Plan 79 step 13. Rule facade (fake IndexedDB implementation).
//
// Contract: .lovable/pending-facades/01-rule-facade.md
// Model:    src/lib/rules/model.ts
// Storage seam reused from src/lib/projects/facade.ts (ProjectRepositoryFacade).
//
// What this fake does:
//   - Persists Rule[] under idb key `ca:rules:v1` via ProjectRepositoryFacade.
//   - Keeps an in-memory Map<RuleId, Rule> after first hydration.
//   - subscribe() -> useSyncExternalStore compatible.
//   - save() rejects cycles in appliesBefore via BFS. Emits RuleCycleError.
//   - remove() rejects deletion when other rules reference the id.
//   - Uncategorized (UNCATEGORIZED_RULE_ID) cannot be deleted.
//   - All errors carry a correlationId per spec 21/40.
//
// The facade is a browser seam. Do NOT import in server functions.

import {
  RuleSchema,
  UNCATEGORIZED_RULE_ID,
  RuleCycleError,
  RuleReferencedError,
  BuiltinCategoryError,
  RuleValidationError,
  type Rule,
  type RuleId,
} from "./model";
import { makeProjectRepositoryFacade, type ProjectRepositoryFacade } from "@/lib/projects/facade";
import { parseFacadeRows, serializeFacadeRows, type AsyncCrudFacade } from "@/lib/facade/contracts";
import { seedIntIds } from "./rule-id-alias";

const STORAGE_KEY = "ca:rules:v1";

function newCorrelationId(): string {
  // 8-char lowercase base36; matches spec 40 correlation id length.
  return Math.random().toString(36).slice(2, 10).padEnd(8, "0");
}

function detectCycle(
  startId: RuleId,
  appliesBefore: RuleId[],
  resolve: (id: RuleId) => Rule | undefined,
): RuleId[] | null {
  // DFS from each dep. If we revisit startId, that's the cycle path.
  const stack: Array<{ id: RuleId; path: RuleId[] }> = appliesBefore.map((d) => ({
    id: d,
    path: [startId, d],
  }));
  const visited = new Set<RuleId>();
  while (stack.length > 0) {
    const { id, path } = stack.pop()!;

    if (id === startId) return path;

    if (visited.has(id)) continue;
    visited.add(id);
    const node = resolve(id);

    if (!node) continue;
    for (const dep of node.appliesBefore) {
      stack.push({ id: dep, path: [...path, dep] });
    }
  }

  return null;
}

// Structurally identical to AsyncCrudFacade; declared explicitly so a
// future change to the base contract is caught here at compile time.
export interface RuleFacade extends AsyncCrudFacade<RuleId, Rule> {}

class IndexedDbRuleFacade implements RuleFacade {
  private map = new Map<RuleId, Rule>();
  private listeners = new Set<() => void>();
  private hydrated = false;
  private hydrating: Promise<void> | null = null;

  constructor(private readonly repo: ProjectRepositoryFacade) {}

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  private async ensureHydrated(): Promise<void> {
    if (this.hydrated) return;

    if (this.hydrating) return this.hydrating;
    this.hydrating = (async () => {
      const raw = await this.repo.readItem(STORAGE_KEY);
      for (const row of parseFacadeRows<Rule>(raw, RuleSchema, "rules/facade")) {
        this.map.set(row.id, row);
      }
      // Deterministic integer-alias seeding. Same set of rule ids ->
      // same integer URLs on every browser and every user. Existing
      // aliases are preserved (see seedIntIds).
      seedIntIds(Array.from(this.map.keys()));
      this.hydrated = true;
    })();

    return this.hydrating;
  }

  private async persist(): Promise<void> {
    await this.repo.writeItem(STORAGE_KEY, serializeFacadeRows(Array.from(this.map.values())));
  }

  async __hydrate(): Promise<void> {
    this.hydrated = false;
    this.hydrating = null;
    this.map.clear();
    await this.ensureHydrated();
    this.notify();
  }

  list(): Rule[] {
    return Array.from(this.map.values());
  }

  get(id: RuleId): Rule | undefined {
    return this.map.get(id);
  }

  async save(rule: Rule): Promise<Rule> {
    await this.ensureHydrated();
    const parsed = RuleSchema.safeParse(rule);

    if (parsed.success === false) {
      throw new RuleValidationError(parsed.error.issues, newCorrelationId());
    }

    const clean = parsed.data;
    // Cycle check: simulate the post-save graph.
    const resolve = (id: RuleId): Rule | undefined => (id === clean.id ? clean : this.map.get(id));
    const cyclePath = detectCycle(clean.id, clean.appliesBefore, resolve);

    if (cyclePath) {
      throw new RuleCycleError(cyclePath, newCorrelationId());
    }

    this.map.set(clean.id, clean);
    await this.persist();
    this.notify();

    return clean;
  }

  async remove(id: RuleId): Promise<void> {
    await this.ensureHydrated();

    if (id === UNCATEGORIZED_RULE_ID) {
      throw new BuiltinCategoryError(id, newCorrelationId());
    }

    const referrers: RuleId[] = [];
    for (const r of this.map.values()) {
      if (r.id !== id && r.appliesBefore.includes(id)) referrers.push(r.id);
    }

    if (referrers.length > 0) {
      throw new RuleReferencedError({ rules: referrers, projects: [] }, newCorrelationId());
    }

    this.map.delete(id);
    await this.persist();
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    // Fire-and-forget hydrate so first subscribers see data.
    void this.ensureHydrated().then(() => listener());

    return () => {
      this.listeners.delete(listener);
    };
  }
}

let cached: RuleFacade | null = null;

export function makeRuleFacade(): RuleFacade {
  if (cached) return cached;
  cached = new IndexedDbRuleFacade(makeProjectRepositoryFacade());

  return cached;
}

/** Test-only override. */
export function __setRuleFacadeForTests(f: RuleFacade | null): void {
  cached = f;
}