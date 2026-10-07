import { useMemo } from "react";
import {
  useProjectStore,
  selectProject,
  selectRulesetsForProject,
  selectRuleset,
} from "@/lib/projects/store";
import type { Project, RuleSet } from "@/lib/projects/types";
import type { EditorRule } from "@/lib/editor/types";

export interface UseWorkpieceProjectResult {
  project: Project;
  ruleset: RuleSet;
  allProjects: Project[];
  allRulesets: RuleSet[];
  updateRulesetRules: (rulesetId: string, rules: EditorRule[]) => void;
  createProject: (name: string, opts?: { deviceId?: string; rulesetNames?: string[] }) => string;
}

export function useWorkpieceProject(
  projectIdParam?: string,
  rulesetIdParam?: string,
): UseWorkpieceProjectResult {
  const projectsById = useProjectStore((s) => s.projects);
  const rulesetsById = useProjectStore((s) => s.rulesets);
  const updateRulesetRules = useProjectStore((s) => s.updateRulesetRules);
  const createProject = useProjectStore((s) => s.createProject);

  const allProjects = useMemo(() => Object.values(projectsById), [projectsById]);
  const allRulesets = useMemo(() => Object.values(rulesetsById), [rulesetsById]);

  const project: Project = useMemo(() => {
    if (projectIdParam && projectsById[projectIdParam]) {
      return projectsById[projectIdParam];
    }
    return (
      allProjects[0] ?? {
        id: "proj-sample-01",
        name: "Standard Inspection Project",
        createdAt: Date.now(),
        rulesetIds: ["ruleset-sample-01"],
        deviceId: "dev-ic-sop8-circuit",
      }
    );
  }, [projectIdParam, projectsById, allProjects]);

  const ruleset: RuleSet = useMemo(() => {
    if (rulesetIdParam && rulesetsById[rulesetIdParam]) {
      return rulesetsById[rulesetIdParam];
    }
    const projectRulesets = allRulesets.filter((r) => r.projectId === project.id);
    if (projectRulesets.length > 0) {
      return projectRulesets[0];
    }
    return (
      allRulesets[0] ?? {
        id: "ruleset-sample-01",
        projectId: project.id,
        name: "Default Workpiece Ruleset",
        imageRef: "/src/assets/samples/pocket-1-filled.jpg",
        rules: [],
      }
    );
  }, [rulesetIdParam, rulesetsById, allRulesets, project.id]);

  return {
    project,
    ruleset,
    allProjects,
    allRulesets,
    updateRulesetRules,
    createProject,
  };
}

export function getFreshRuleset(rulesetId: string): RuleSet | undefined {
  return selectRuleset(useProjectStore.getState(), rulesetId);
}

export function updateRulesetRulesInStore(rulesetId: string, rules: EditorRule[]): void {
  useProjectStore.getState().updateRulesetRules(rulesetId, rules);
}

export function updateRulesetImageRefInStore(rulesetId: string, imageRef: string): void {
  useProjectStore.getState().updateRulesetImageRef(rulesetId, imageRef);
}

export function useWorkpieceProjectsAndRulesets(): {
  projects: Record<string, Project>;
  rulesets: Record<string, RuleSet>;
} {
  const projects = useProjectStore((s) => s.projects);
  const rulesets = useProjectStore((s) => s.rulesets);

  return { projects, rulesets };
}


