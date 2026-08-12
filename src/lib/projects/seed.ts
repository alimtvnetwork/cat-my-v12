import { EditorToolFamilyType } from "@/lib/editor/types";
import { type RuleKindType } from "@/types/rules/RuleKind";
import { CatSeedRuleFamilyType } from "@/lib/seed";
// Sample-data seeding for local testing.
//
// Populates the project store with a handful of realistic projects,
// categories, and rule sets so operators can explore the app without
// hand-crafting content. Goes through the same store actions that the UI
// uses (createProject / createRuleset / updateRulesetRules /
// updateRulesetCategory) so persistence, category merging, and the
// facade-backed IndexedDB write path all exercise identically to a real
// user flow.
//
// Plan 72 step 13: sample content is now supplied by the caller (from
// `useSeedSlice("projects")` on top of the `UiSeedFacade`), never read
// from a hard-coded constant in this module. Passing an empty array is a
// no-op and logs a warning so a missing bundle does not silently seed
// nothing.
import { useProjectStore } from "./store";
import type { EditorRule } from "@/lib/editor/types";
import type { CatSeedProject, CatSeedRule } from "@/lib/seed";
import { useTrialStore, runRuleset } from "./trials";
import { useRunStore, type NgEvent, type RunHistoryEntry } from "@/lib/run-store";
import { writeFacadeJson } from "@/lib/projects/facade-json";

function mkEditorRule(seed: CatSeedRule): EditorRule {
  // EditorRule.family is currently the narrower `EditorToolFamily`
  // ("rect" | "anchor"). CatSeedRuleFamily also allows "polygon" /
  // "line" for future geometry; coerce anything beyond the editor set
  // to "rect" so seeding cannot smuggle in a family the editor can't
  // render. Widening EditorToolFamily is a separate change.
  const family: EditorRule["family"] =
    seed.family === CatSeedRuleFamilyType.Anchor
      ? EditorToolFamilyType.Anchor
      : EditorToolFamilyType.Rect;

  return {
    id: `seed-${Math.random().toString(36).slice(2, 10)}`,
    isHidden: false,
    isLocked: false,
    name: seed.name,
    kind: seed.kind as unknown as RuleKindType,
    family,
    x: seed.x,
    y: seed.y,
    width: seed.width,
    height: seed.height,
  };
}

export interface SeedResult {
  createdProjectIds: string[];
  createdRulesetCount: number;
  createdTrialRunCount: number;
}

/**
 * Insert the supplied sample set into the store. Idempotent by name:
 * projects whose names already exist are skipped so repeated clicks in a
 * dev/demo session don't pile up duplicates.
 *
 * `projects` comes from the `UiSeedFacade` (see `useSeedSlice("projects")`
 * or `SeedProvider`). Passing an empty list logs a warning and returns an
 * empty result rather than silently seeding nothing.
 */
export function seedSampleProjects(projects: readonly CatSeedProject[]): SeedResult {
  const store = useProjectStore.getState();
  const existingNames = new Set(
    Object.values(store.projects).map((p) => p.name.trim().toLowerCase()),
  );

  const createdProjectIds: string[] = [];
  let createdRulesetCount = 0;
  let createdTrialRunCount = 0;
  const trialStore = useTrialStore.getState();

  if (projects.length === 0) {
    console.warn(
      "[projects/seed] seedSampleProjects called with empty seed slice, nothing to insert",
    );

    return { createdProjectIds, createdRulesetCount, createdTrialRunCount };
  }

  for (const sample of projects) {
    if (existingNames.has(sample.name.trim().toLowerCase())) continue;

    const projectId = store.createProject(sample.name, {
      cameraName: sample.cameraName,
      categoryNames: sample.categories,
    });
    createdProjectIds.push(projectId);

    for (const rs of sample.rulesets) {
      const rulesetId = store.createRuleset(projectId, rs.name);

      if (rs.categoryName) {
        store.updateRulesetCategory(rulesetId, rs.categoryName);
      }

      const editorRules: EditorRule[] = rs.rules.map(mkEditorRule);

      if (editorRules.length > 0) {
        store.updateRulesetRules(rulesetId, editorRules);
      }

      createdRulesetCount++;

      // Seed 2 deterministic trial runs per ruleset so /trial-run, run
      // history and results screens have content out of the box.
      const seeds = [
        { imageRef: `seed://${sample.name}/${rs.name}/A.png`, offset: 5 * 60_000 },
        { imageRef: `seed://${sample.name}/${rs.name}/B.png`, offset: 60_000 },
      ];
      for (const s of seeds) {
        if (editorRules.length === 0) continue;
        const run = runRuleset({
          rulesetId,
          imageRef: s.imageRef,
          rules: editorRules,
          now: Date.now() - s.offset,
        });
        trialStore.appendRun(run);
        createdTrialRunCount++;
      }
    }
  }

  console.info("[projects/seed] seedSampleProjects", {
    seedProjectCount: projects.length,
    createdProjectCount: createdProjectIds.length,
    createdRulesetCount,
    createdTrialRunCount,
  });

  return { createdProjectIds, createdRulesetCount, createdTrialRunCount };
}

/**
 * Seed a small idle-state result set into `useRunStore` so `/results`,
 * `/errors`, and Run history tabs are populated on first launch. Called
 * only from `autoSeedIfEmpty()` when there's no existing history.
 */
function seedRunState(): void {
  const store = useRunStore.getState();

  if (store.counters.total > 0 || store.history.length > 0) return;

  const now = Date.now();
  const ngEvents: NgEvent[] = [
    {
      id: "ng-seed-1",
      ts: new Date(now - 240_000).toLocaleTimeString(),
      frame: 42,
      tool: "Pattern Match",
      reason: "Score below threshold",
      score: 38,
    },
    {
      id: "ng-seed-2",
      ts: new Date(now - 180_000).toLocaleTimeString(),
      frame: 71,
      tool: "Edge Detect",
      reason: "Edge count mismatch",
      score: 22,
    },
    {
      id: "ng-seed-3",
      ts: new Date(now - 60_000).toLocaleTimeString(),
      frame: 118,
      tool: "Anchor",
      reason: "Anchor drift",
      score: 51,
    },
  ];
  const history: RunHistoryEntry[] = [
    {
      id: `run-${now - 1_800_000}`,
      startedAt: now - 1_800_000,
      endedAt: now - 1_500_000,
      counters: { total: 240, ok: 231, ng: 9 },
      settings: store.settings,
    },
    {
      id: `run-${now - 900_000}`,
      startedAt: now - 900_000,
      endedAt: now - 720_000,
      counters: { total: 120, ok: 118, ng: 2 },
      settings: store.settings,
    },
  ];
  writeFacadeJson("ca-hmi:run.history", history);
  useRunStore.setState({
    counters: { total: 120, ok: 117, ng: 3 },
    ngEvents,
    history,
  });
  console.info("[projects/seed] seedRunState applied", {
    ngEvents: ngEvents.length,
    history: history.length,
  });
}

/**
 * Auto-seed once on first launch when the store is empty. Guarded by a
 * localStorage flag so re-runs (after a user manually deletes projects)
 * don't repopulate. Safe to call on every mount.
 */
const AUTOSEED_FLAG = "ca:autoseeded:v1";
export function autoSeedIfEmpty(projects: readonly CatSeedProject[]): SeedResult | null {
  if (typeof window === "undefined") return null;
  try {
    if (window.localStorage.getItem(AUTOSEED_FLAG) === "1") return null;
  } catch {
    return null;
  }

  const store = useProjectStore.getState();

  if (Object.keys(store.projects).length > 0) {
    try {
      window.localStorage.setItem(AUTOSEED_FLAG, "1");
    } catch {
      /* ignore */
    }

    return null;
  }

  if (projects.length === 0) {
    // Bundle not ready yet. Do NOT set the flag: the caller will re-run
    // this once the SeedProvider transitions to "ready".
    console.info("[projects/seed] autoSeedIfEmpty deferred, seed slice empty");

    return null;
  }

  const result = seedSampleProjects(projects);
  seedRunState();
  try {
    window.localStorage.setItem(AUTOSEED_FLAG, "1");
  } catch {
    /* ignore */
  }

  console.info("[projects/seed] autoSeedIfEmpty applied", result);

  return result;
}