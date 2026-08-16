import { ClientLogger } from "@/lib/observability/client-logger";
import { IntAliasNamespaceType } from "@/lib/ids/int-alias";
// Project + RuleSet client-side store (Plan 34, step 4, SS-02).
// Persists via the SDK facade (spec 21 §52) under key `ca:projects:v1`.
// All mutations go through actions on this store; routes never mutate
// the raw maps.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { EditorRule } from "@/lib/editor/types";
import { createFacadeStateStorage } from "./facade";
import { resolveIdParam as _resolveIdParam, seedIntParams } from "@/lib/ids/int-alias";

const rid = (id: string): string => _resolveIdParam(IntAliasNamespaceType.Ruleset, id) || id;
const pid = (id: string): string => _resolveIdParam(IntAliasNamespaceType.Project, id) || id;

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  rulesetIds: string[];
  /** Plan 64 step 72: optional attachments captured at create time. */
  cameraName?: string;
  /**
   * Plan 78 slice 4 (I-SU-05 bind): reference to a CameraSetting from
   * `src/lib/camera/store.ts` library. Optional so pre-binding projects
   * hydrate untouched. Cleared via `setProjectCamera(id, null)`.
   */
  cameraSettingId?: string;
  categoryNames?: string[];
  /**
   * Plan 79 step 44 (V4 Mics Settings binding): optional reference to a
   * `MicSettings` entry from `src/lib/mic-settings/facade.ts`. Optional so
   * pre-binding projects hydrate untouched. Cleared via
   * `setProjectMicSettings(id, null)`.
   */
  micSettingsId?: string;
  /**
   * Plan 67 step 39 (PR-03): per-project AI Testing configuration.
   * All fields optional so existing persisted projects hydrate untouched.
   */
  aiSettings?: {
    model?: string;
    temperature?: number;
    systemPrompt?: string;
  };
}

export interface RuleSet {
  id: string;
  projectId: string;
  name: string;
  imageRef?: string;
  rules: EditorRule[];
  categoryName?: string;
  overrideMode?: "direct" | "reference" | "snapshot";
  parentRulesetId?: string;
}

export interface ProjectStoreState {
  projects: Record<string, Project>;
  rulesets: Record<string, RuleSet>;
  createProject: (
    name: string,
    opts?: {
      cameraName?: string;
      rulesetNames?: string[];
      categoryNames?: string[];
    },
  ) => string;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  /**
   * Plan 79 step 40: clone a project (and every ruleset it owns) into a
   * new project with a fresh id. Returns the new project id, or `null`
   * when the source id is unknown. The clone is idempotent-safe: name
   * defaults to "<original> (copy)" when `nextName` is omitted.
   */
  duplicateProject: (id: string, nextName?: string) => string | null;
  createRuleset: (projectId: string, name: string, imageRef?: string) => string;
  cloneRuleset: (
    projectId: string,
    sourceRulesetId: string,
    name: string,
    mode: "reference" | "snapshot",
  ) => string;
  renameRuleset: (id: string, name: string) => void;
  updateRulesetCategory: (id: string, categoryName?: string) => void;
  updateRulesetRules: (id: string, rules: EditorRule[]) => void;
  deleteRuleset: (id: string) => void;
  /**
   * Reinsert a ruleset previously removed by `deleteRuleset`. Used by the
   * confirm-delete undo toast in `setup.rules.tsx`. If `index` is provided
   * and in range, the id is spliced back at that position; otherwise it is
   * appended. Idempotent: calling with an existing id is a no-op.
   */
  restoreRuleset: (ruleset: RuleSet, index?: number) => void;
  /**
   * Plan 79 step 42: reorder a project's `rulesetIds` list. Accepts a full
   * permutation of the current ids. Returns without mutating state when:
   *   1. the project does not exist, or
   *   2. the incoming list has a different length than the current one, or
   *   3. the incoming list contains ids not currently owned by the project
   *      (defensive: prevents a caller from injecting foreign ids via a
   *      reorder). Each rejection is logged with context.
   */
  reorderProjectRulesets: (projectId: string, orderedIds: readonly string[]) => void;
  addProjectCategory: (projectId: string, name: string) => void;
  renameProjectCategory: (projectId: string, oldName: string, newName: string) => void;
  deleteProjectCategory: (projectId: string, name: string) => void;
  /** Plan 64 step 88: bulk import an envelope from Export JSON/YAML/Zip. */
  importProjectBundle: (payload: { project: Project; rulesets: RuleSet[] }) => string;
  /** Plan 67 step 39 (PR-03): update a project's AI Testing settings. */
  updateProjectAiSettings: (projectId: string, settings: Project["aiSettings"]) => void;
  /** Plan 78 slice 4: bind (or unbind) a CameraSetting id to a project. */
  setProjectCamera: (projectId: string, cameraSettingId: string | null) => void;
  /** Plan 79 step 44: bind (or unbind) a MicSettings id to a project. */
  setProjectMicSettings: (projectId: string, micSettingsId: string | null) => void;
}

function cleanName(name: string): string {
  return name.trim();
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function mergeCategoryNames(
  existing: readonly string[] | undefined,
  name: string,
): string[] | undefined {
  const clean = cleanName(name);
  const list = [...(existing ?? [])];

  if (clean && list.some((item) => sameName(item, clean)) === false) list.push(clean);

  return list.length > 0 ? list : undefined;
}

function newId(): string {
  // crypto.randomUUID exists in modern browsers and Node 18+. Fall back to
  // a timestamp-based id ONLY when it is truly unavailable (older test
  // runners); the fallback is loud enough to spot in logs.
  const g = globalThis as { crypto?: { randomUUID?: () => string } };

  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  const fallback = `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  ClientLogger.warn("[projects/store] crypto.randomUUID unavailable, using fallback id", fallback);

  return fallback;
}

export const useProjectStore = create<ProjectStoreState>()(
  persist(
    (set, get) => ({
      projects: {},
      rulesets: {},

      createProject: (name, opts) => {
        const id = newId();
        const rulesetNames = (opts?.rulesetNames ?? []).filter((s) => s.trim().length > 0);
        const categoryNames = (opts?.categoryNames ?? []).filter((s) => s.trim().length > 0);
        set((state) => {
          const rulesets = { ...state.rulesets };
          const rulesetIds: string[] = [];
          for (const rn of rulesetNames) {
            const rid = newId();
            // Match createRuleset: default overrideMode to "direct" so
            // downstream category / resolver code (Plan 67 step 40) can
            // rely on a defined mode for every ruleset in the store.
            rulesets[rid] = {
              id: rid,
              projectId: id,
              name: rn.trim(),
              rules: [],
              overrideMode: "direct",
            };
            rulesetIds.push(rid);
          }

          return {
            projects: {
              ...state.projects,
              [id]: {
                id,
                name,
                createdAt: Date.now(),
                rulesetIds,
                cameraName: opts?.cameraName?.trim() || undefined,
                categoryNames: categoryNames.length > 0 ? categoryNames : undefined,
              },
            },
            rulesets,
          };
        });
        ClientLogger.info("[projects/store] createProject", {
          id,
          name,
          rulesetCount: rulesetNames.length,
          categoryCount: categoryNames.length,
          cameraName: opts?.cameraName ?? null,
        });

        return id;
      },

      renameProject: (id, name) => {
        set((state) => {
          const existing = state.projects[id];

          if (!existing) {
            ClientLogger.warn("[projects/store] renameProject: unknown id", id);

            return state;
          }

          return { projects: { ...state.projects, [id]: { ...existing, name } } };
        });
      },

      deleteProject: (id) => {
        id = pid(id);
        set((state) => {
          const project = state.projects[id];

          if (!project) return state;
          const { [id]: _drop, ...projects } = state.projects;
          const rulesets = { ...state.rulesets };
          for (const rid of project.rulesetIds) delete rulesets[rid];

          return { projects, rulesets };
        });
      },

      duplicateProject: (id, nextName) => {
        id = pid(id);
        // Plan 79 step 40. Deep-clones the project record and every
        // ruleset it owns under fresh ids so the copy is fully
        // independent (no shared ruleset references, no shared rule
        // arrays). Returns null when the source is unknown so callers
        // can surface a proper error instead of silently no-op'ing.
        const source = get().projects[id];

        if (!source) {
          ClientLogger.warn("[projects/store] duplicateProject: unknown id", id);

          return null;
        }

        const newProjectId = newId();
        const nameForClone = cleanName(nextName ?? `${source.name} (copy)`);
        const rulesetIdMap = new Map<string, string>();
        set((state) => {
          const nextRulesets: Record<string, RuleSet> = { ...state.rulesets };
          for (const rid of source.rulesetIds) {
            const rs = state.rulesets[rid];

            if (!rs) continue;
            const clonedId = newId();
            rulesetIdMap.set(rid, clonedId);
            nextRulesets[clonedId] = {
              ...rs,
              id: clonedId,
              projectId: newProjectId,
              rules: rs.rules.map((r) => ({ ...r })),
              parentRulesetId: undefined,
              overrideMode: rs.overrideMode ?? "direct",
            };
          }

          const clonedProject: Project = {
            ...source,
            id: newProjectId,
            name: nameForClone,
            createdAt: Date.now(),
            rulesetIds: source.rulesetIds
              .map((rid) => rulesetIdMap.get(rid))
              .filter((v): v is string => Boolean(v)),
          };

          return {
            projects: { ...state.projects, [newProjectId]: clonedProject },
            rulesets: nextRulesets,
          };
        });
        ClientLogger.info("[projects/store] duplicateProject", {
          fromId: id,
          newId: newProjectId,
          rulesetCount: rulesetIdMap.size,
        });

        return newProjectId;
      },

      createRuleset: (projectId, name, imageRef) => {
        const id = newId();
        set((state) => {
          const project = state.projects[projectId];

          if (!project) {
            ClientLogger.error("[projects/store] createRuleset: unknown project", projectId);

            return state;
          }

          return {
            rulesets: {
              ...state.rulesets,
              [id]: {
                id,
                projectId,
                name: cleanName(name),
                imageRef,
                rules: [],
                overrideMode: "direct",
              },
            },
            projects: {
              ...state.projects,
              [projectId]: { ...project, rulesetIds: [...project.rulesetIds, id] },
            },
          };
        });

        return id;
      },

      cloneRuleset: (projectId, sourceRulesetId, name, mode) => {
        const id = newId();
        set((state) => {
          const project = state.projects[projectId];
          const source = state.rulesets[sourceRulesetId];

          if (!project || !source) {
            ClientLogger.error("[projects/store] cloneRuleset: unknown ids", {
              projectId,
              sourceRulesetId,
            });

            return state;
          }

          return {
            rulesets: {
              ...state.rulesets,
              [id]: {
                ...source,
                id,
                projectId,
                name: cleanName(name),
                rules: source.rules.map((rule) => ({ ...rule })),
                overrideMode: mode,
                parentRulesetId: mode === "reference" ? sourceRulesetId : undefined,
              },
            },
            projects: {
              ...state.projects,
              [projectId]: { ...project, rulesetIds: [...project.rulesetIds, id] },
            },
          };
        });

        return id;
      },

      renameRuleset: (id, name) => {
        set((state) => {
          const existing = state.rulesets[id];

          if (!existing) return state;

          return { rulesets: { ...state.rulesets, [id]: { ...existing, name: cleanName(name) } } };
        });
      },

      updateRulesetCategory: (id, categoryName) => {
        id = rid(id);
        set((state) => {
          const existing = state.rulesets[id];

          if (!existing) return state;
          const category = categoryName ? cleanName(categoryName) : undefined;
          const project = state.projects[existing.projectId];
          const projects = project
            ? {
                ...state.projects,
                [project.id]: {
                  ...project,
                  categoryNames: category
                    ? mergeCategoryNames(project.categoryNames, category)
                    : project.categoryNames,
                },
              }
            : state.projects;

          return {
            projects,
            rulesets: { ...state.rulesets, [id]: { ...existing, categoryName: category } },
          };
        });
      },

      updateRulesetRules: (id, rules) => {
        id = rid(id);
        set((state) => {
          const existing = state.rulesets[id];

          if (!existing) {
            ClientLogger.warn("[projects/store] updateRulesetRules: unknown id", id);

            return state;
          }

          return { rulesets: { ...state.rulesets, [id]: { ...existing, rules } } };
        });
      },

      deleteRuleset: (id) => {
        id = rid(id);
        set((state) => {
          const existing = state.rulesets[id];

          if (!existing) return state;
          const { [id]: _drop, ...rulesets } = state.rulesets;
          const project = state.projects[existing.projectId];
          const projects = project
            ? {
                ...state.projects,
                [existing.projectId]: {
                  ...project,
                  rulesetIds: project.rulesetIds.filter((rid) => rid !== id),
                },
              }
            : state.projects;

          return { projects, rulesets };
        });
      },

      restoreRuleset: (ruleset, index) => {
        set((state) => {
          if (state.rulesets[ruleset.id]) return state;
          const project = state.projects[ruleset.projectId];

          if (!project) {
            ClientLogger.warn("[projects/store] restoreRuleset: project gone", ruleset.projectId);

            return state;
          }

          const ids = [...project.rulesetIds];
          const at =
            typeof index === "number" && index >= 0 && index <= ids.length ? index : ids.length;
          ids.splice(at, 0, ruleset.id);

          return {
            projects: { ...state.projects, [ruleset.projectId]: { ...project, rulesetIds: ids } },
            rulesets: { ...state.rulesets, [ruleset.id]: ruleset },
          };
        });
      },

      reorderProjectRulesets: (projectId, orderedIds) => {
        // Plan 79 step 42. Reorder guarded by exact-permutation check.
        set((state) => {
          const project = state.projects[projectId];

          if (!project) {
            ClientLogger.warn("[projects/store] reorderProjectRulesets: unknown project", projectId);

            return state;
          }

          const current = project.rulesetIds;

          if (orderedIds.length !== current.length) {
            ClientLogger.warn("[projects/store] reorderProjectRulesets: length mismatch", {
              projectId,
              currentLen: current.length,
              incomingLen: orderedIds.length,
            });

            return state;
          }

          const currentSet = new Set(current);
          for (const rid of orderedIds) {
            if (currentSet.has(rid) === false) {
              ClientLogger.warn("[projects/store] reorderProjectRulesets: foreign id rejected", {
                projectId,
                rid,
              });

              return state;
            }
          }
          // No-op if order unchanged.
          let hasChanged = false;
          for (let i = 0; i < current.length; i += 1) {
            if (current[i] !== orderedIds[i]) {
              hasChanged = true;
              break;
            }
          }

          if (!hasChanged) return state;
          ClientLogger.info("[projects/store] reorderProjectRulesets", { projectId });

          return {
            projects: {
              ...state.projects,
              [projectId]: { ...project, rulesetIds: [...orderedIds] },
            },
          };
        });
      },

      addProjectCategory: (projectId, name) => {
        set((state) => {
          const project = state.projects[projectId];

          if (!project) return state;

          return {
            projects: {
              ...state.projects,
              [projectId]: {
                ...project,
                categoryNames: mergeCategoryNames(project.categoryNames, name),
              },
            },
          };
        });
      },

      renameProjectCategory: (projectId, oldName, newName) => {
        set((state) => {
          const project = state.projects[projectId];
          const clean = cleanName(newName);

          if (!project || !clean) return state;
          const categoryNames = (project.categoryNames ?? []).map((name) =>
            sameName(name, oldName) ? clean : name,
          );
          const rulesets = Object.fromEntries(
            Object.entries(state.rulesets).map(([id, ruleset]) => [
              id,
              ruleset.projectId === projectId &&
              ruleset.categoryName &&
              sameName(ruleset.categoryName, oldName)
                ? { ...ruleset, categoryName: clean }
                : ruleset,
            ]),
          );

          return {
            projects: { ...state.projects, [projectId]: { ...project, categoryNames } },
            rulesets,
          };
        });
      },

      deleteProjectCategory: (projectId, name) => {
        set((state) => {
          const project = state.projects[projectId];

          if (!project) return state;
          const categoryNames = (project.categoryNames ?? []).filter(
            (category) => sameName(category, name) === false,
          );
          const rulesets = Object.fromEntries(
            Object.entries(state.rulesets).map(([id, ruleset]) => [
              id,
              ruleset.projectId === projectId &&
              ruleset.categoryName &&
              sameName(ruleset.categoryName, name)
                ? { ...ruleset, categoryName: undefined }
                : ruleset,
            ]),
          );

          return {
            projects: {
              ...state.projects,
              [projectId]: {
                ...project,
                categoryNames: categoryNames.length ? categoryNames : undefined,
              },
            },
            rulesets,
          };
        });
      },

      importProjectBundle: ({ project, rulesets }) => {
        // Regenerate ids so import never collides with an existing row.
        // Preserves relative wiring: each new ruleset points at the new
        // project id and is listed in the new project.rulesetIds.
        const newProjectId = newId();
        const rulesetIds: string[] = [];
        const rulesetsById: Record<string, RuleSet> = {};
        for (const rs of rulesets) {
          const rid = newId();
          rulesetIds.push(rid);
          rulesetsById[rid] = { ...rs, id: rid, projectId: newProjectId };
        }

        set((state) => ({
          projects: {
            ...state.projects,
            [newProjectId]: {
              ...project,
              id: newProjectId,
              createdAt: Date.now(),
              rulesetIds,
            },
          },
          rulesets: { ...state.rulesets, ...rulesetsById },
        }));
        ClientLogger.info("[projects/store] importProjectBundle", {
          newProjectId,
          sourceProjectId: project.id,
          rulesetCount: rulesetIds.length,
        });

        return newProjectId;
      },

      updateProjectAiSettings: (projectId, settings) => {
        set((state) => {
          const project = state.projects[projectId];

          if (!project) {
            ClientLogger.warn("[projects/store] updateProjectAiSettings: unknown project", projectId);

            return state;
          }
          // Normalize: drop empty object, clamp temperature to [0, 2].
          let next: Project["aiSettings"] | undefined = settings;

          if (next) {
            const clean: NonNullable<Project["aiSettings"]> = {};

            if (typeof next.model === "string" && next.model.trim())
              clean.model = next.model.trim();

            if (typeof next.temperature === "number" && Number.isFinite(next.temperature))
              clean.temperature = Math.min(2, Math.max(0, next.temperature));

            if (typeof next.systemPrompt === "string" && next.systemPrompt.trim())
              clean.systemPrompt = next.systemPrompt;
            next = Object.keys(clean).length > 0 ? clean : undefined;
          }

          return {
            projects: {
              ...state.projects,
              [projectId]: { ...project, aiSettings: next },
            },
          };
        });
      },

      setProjectCamera: (projectId, cameraSettingId) => {
        set((state) => {
          const project = state.projects[projectId];

          if (!project) {
            ClientLogger.warn("[projects/store] setProjectCamera: unknown project", projectId);

            return state;
          }

          const nextId = cameraSettingId && cameraSettingId.trim() ? cameraSettingId : undefined;

          if (project.cameraSettingId === nextId) return state;
          ClientLogger.info("[projects/store] setProjectCamera", {
            projectId,
            cameraSettingId: nextId ?? null,
          });

          return {
            projects: {
              ...state.projects,
              [projectId]: { ...project, cameraSettingId: nextId },
            },
          };
        });
      },

      setProjectMicSettings: (projectId, micSettingsId) => {
        // Plan 79 step 44. Mirrors setProjectCamera: null/empty clears.
        set((state) => {
          const project = state.projects[projectId];

          if (!project) {
            ClientLogger.warn("[projects/store] setProjectMicSettings: unknown project", projectId);

            return state;
          }

          const nextId = micSettingsId && micSettingsId.trim() ? micSettingsId : undefined;

          if (project.micSettingsId === nextId) return state;
          ClientLogger.info("[projects/store] setProjectMicSettings", {
            projectId,
            micSettingsId: nextId ?? null,
          });

          return {
            projects: {
              ...state.projects,
              [projectId]: { ...project, micSettingsId: nextId },
            },
          };
        });
      },
    }),
    {
      name: "ca:projects:v1",
      // Storage now goes through ProjectRepositoryFacade (spec 52 TS port),
      // which resolves to IndexedDB in the browser and an in-memory shim
      // during SSR / vitest. A one-shot migration in the facade adapter
      // copies any pre-existing `ca:projects:v1` browser-storage payload
      // into IndexedDB on first read.
      storage: createJSONStorage(() => createFacadeStateStorage()),
      partialize: (state) => ({ projects: state.projects, rulesets: state.rulesets }),
      // Deterministic integer-alias seeding on rehydrate. Same persisted
      // set of project/ruleset ids -> same /projects/N and /rulesets/N
      // integers on every browser and every user. Preserves any prior
      // aliases so bookmarks stay stable across upgrades.
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          ClientLogger.warn("[projects/store] rehydrate error, skipping int-alias seed", error);

          return;
        }

        if (!state) return;
        seedIntParams(IntAliasNamespaceType.Project, Object.keys(state.projects ?? {}));
        seedIntParams(IntAliasNamespaceType.Ruleset, Object.keys(state.rulesets ?? {}));
      },
    },
  ),
);

// Pure selectors: pass state explicitly so they're usable from vanilla code
// (loaders, tests, non-React callers) without a hook subscription.
// Accept either the real string id or the URL-facing integer alias.

export const selectProject = (state: ProjectStoreState, id: string): Project | undefined => {
  const real = pid(id);

  return state.projects[real] ?? state.projects[id];
};

export const selectRuleset = (state: ProjectStoreState, id: string): RuleSet | undefined => {
  const real = rid(id);

  return state.rulesets[real] ?? state.rulesets[id];
};

const rulesetsForProjectCache = new WeakMap<ProjectStoreState, Map<string, RuleSet[]>>();

export const selectRulesetsForProject = (
  state: ProjectStoreState,
  projectId: string,
): RuleSet[] => {
  const real = pid(projectId);
  const cachedByProject = rulesetsForProjectCache.get(state);
  const cached = cachedByProject?.get(real);

  if (cached) return cached;
  const project = state.projects[real];
  const rulesets = project
    ? project.rulesetIds.map((r) => state.rulesets[r]).filter((r): r is RuleSet => Boolean(r))
    : [];
  const nextByProject = cachedByProject ?? new Map<string, RuleSet[]>();
  nextByProject.set(real, rulesets);

  if (!cachedByProject) rulesetsForProjectCache.set(state, nextByProject);

  return rulesets;
};
