# SS-02: Project + RuleSet Zustand store

Parent: 34-home-hub-projects-rulesets
Slug: project-store
Status: pending
Created: 2026-07-15

## Goal

Client-side store that owns Project and RuleSet entities, persisted to
localStorage. Consumed by every new route in this plan.

## Shape

```ts
// src/lib/projects/store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EditorRule } from "@/lib/editor/types";

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  rulesetIds: string[];
}
export interface RuleSet {
  id: string;
  projectId: string;
  name: string;
  imageRef?: string;
  rules: EditorRule[];
}

interface State {
  projects: Record<string, Project>;
  rulesets: Record<string, RuleSet>;
  createProject: (name: string) => string;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  createRuleset: (projectId: string, name: string, imageRef?: string) => string;
  updateRulesetRules: (id: string, rules: EditorRule[]) => void;
  deleteRuleset: (id: string) => void;
}
```

## Rules

- IDs via `crypto.randomUUID()`.
- Deleting a project cascades to its rulesets.
- Selectors: `selectProject(id)`, `selectRulesetsForProject(projectId)`,
  `selectRuleset(id)`, exported as plain state -> value functions.
- Persist key `ca:projects:v1`. Any shape change requires a migration.

## Tests (vitest)

- Create project, create ruleset under it, cascade delete.
- Persistence round-trip via `JSON.parse(JSON.stringify(state))`.
