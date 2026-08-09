import { CatSeedRuleFamilyType } from "@/lib/seed/types";
import { CatSeedRuleKindType } from "@/lib/seed/types";
/** @vitest-environment jsdom */
// Plan 72 step 23: prove the projects/seed.ts pipeline consumes the
// UiSeedFacade end-to-end. We source projects through MemoryUiSeedFacade
// (the same contract JsonUiSeedFacade exposes at runtime) so any drift
// between what the facade returns and what seedSampleProjects expects
// fails here rather than silently in-app.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedSampleProjects, autoSeedIfEmpty } from "../seed";
import { useProjectStore } from "../store";
import { useRunStore } from "@/lib/run-store";
import { useTrialStore } from "../trials";
import { MemoryUiSeedFacade } from "@/lib/seed";
import type { CatSeedBundle } from "@/lib/seed";
import { canonicalSeedSnapshotJson } from "../canonical-snapshot";

const AUTOSEED_FLAG = "ca:autoseeded:v1";

const BUNDLE: CatSeedBundle = {
  version: "test-1",
  projects: [
    {
      name: "Seeded Line",
      cameraName: "Cam-X",
      categories: ["Alpha", "Beta"],
      rulesets: [
        {
          name: "Alpha RS",
          categoryName: "Alpha",
          rules: [
            {
              name: "ROI",
              kind: CatSeedRuleKindType.R,
              family: CatSeedRuleFamilyType.Rect,
              x: 0,
              y: 0,
              width: 10,
              height: 10,
            },
          ],
        },
      ],
    },
  ],
  categories: [],
  ruleTemplates: [],
  toolPresets: [],
  sampleImages: [],
  programs: [],
};

function resetStores(): void {
  useProjectStore.setState({ projects: {}, rulesets: {} } as never, false);
  useTrialStore.setState({ runs: [] } as never, false);
  useRunStore.setState(
    {
      counters: { total: 0, ok: 0, ng: 0 },
      ngEvents: [],
      history: [],
    } as never,
    false,
  );
  try {
    window.localStorage.removeItem(AUTOSEED_FLAG);
  } catch {
    /* ignore */
  }
}

beforeEach(() => {
  resetStores();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("projects/seed via UiSeedFacade (Plan 72 step 23)", () => {
  it("seedSampleProjects consumes MemoryUiSeedFacade.load() output", async () => {
    const facade = new MemoryUiSeedFacade(BUNDLE);
    const bundle = await facade.load();
    const result = seedSampleProjects(bundle.projects);
    expect(result.createdProjectIds).toHaveLength(1);
    expect(result.createdRulesetCount).toBe(1);
    expect(result.createdTrialRunCount).toBe(2);
    const project = useProjectStore.getState().projects[result.createdProjectIds[0]!]!;
    expect(project.name).toBe("Seeded Line");
    expect(project.categoryNames).toEqual(expect.arrayContaining(["Alpha", "Beta"]));
  });

  it("seedSampleProjects is idempotent by project name across facade reloads", async () => {
    const facade = new MemoryUiSeedFacade(BUNDLE);
    seedSampleProjects((await facade.load()).projects);
    const before = Object.keys(useProjectStore.getState().projects).length;
    // Second call with the SAME payload must not duplicate.
    seedSampleProjects((await facade.load()).projects);
    const after = Object.keys(useProjectStore.getState().projects).length;
    expect(after).toBe(before);
  });

  it("empty projects slice: no-op with warning (bundle-not-ready case)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = seedSampleProjects([]);
    expect(result.createdProjectIds).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
    expect(Object.keys(useProjectStore.getState().projects)).toHaveLength(0);
  });

  it("autoSeedIfEmpty defers when projects is empty and does NOT set the flag", () => {
    const result = autoSeedIfEmpty([]);
    expect(result).toBeNull();
    // Flag must remain unset so the caller can retry once the bundle loads.
    expect(window.localStorage.getItem(AUTOSEED_FLAG)).toBeNull();
  });

  it("autoSeedIfEmpty seeds once and sets the flag; second call is a no-op", async () => {
    const facade = new MemoryUiSeedFacade(BUNDLE);
    const bundle = await facade.load();
    const first = autoSeedIfEmpty(bundle.projects);
    expect(first?.createdProjectIds).toHaveLength(1);
    expect(window.localStorage.getItem(AUTOSEED_FLAG)).toBe("1");
    // Second call short-circuits on the flag even though projects still exist.
    const second = autoSeedIfEmpty(bundle.projects);
    expect(second).toBeNull();
  });

  // Plan 80 step 42: deeper idempotency coverage. The earlier tests prove
  // projects don't duplicate; these lock down the adjacent surfaces
  // (rulesets, run history, run counters) so a re-seed cannot pile up
  // ghost rulesets or replay NG events on top of a live session.
  it("seedSampleProjects does not duplicate rulesets when re-invoked", async () => {
    const facade = new MemoryUiSeedFacade(BUNDLE);
    const bundle = await facade.load();
    seedSampleProjects(bundle.projects);
    const rulesetsBefore = Object.keys(useProjectStore.getState().rulesets).length;
    // Second identical call must be a no-op at the ruleset level too,
    // not just the project level.
    const second = seedSampleProjects(bundle.projects);
    expect(second.createdRulesetCount).toBe(0);
    expect(Object.keys(useProjectStore.getState().rulesets).length).toBe(rulesetsBefore);
  });

  it("autoSeedIfEmpty preserves existing run history when re-invoked after flag clear", async () => {
    const facade = new MemoryUiSeedFacade(BUNDLE);
    const bundle = await facade.load();
    autoSeedIfEmpty(bundle.projects);
    const runBefore = useRunStore.getState();
    expect(runBefore.history.length).toBeGreaterThan(0);
    // Simulate the user manually clearing the autoseed flag (e.g. after
    // deleting projects to reset a demo). Projects still exist, so
    // autoSeedIfEmpty must short-circuit on the "projects non-empty"
    // guard (lines 189-195 of seed.ts) and MUST NOT replay seedRunState.
    window.localStorage.removeItem(AUTOSEED_FLAG);
    autoSeedIfEmpty(bundle.projects);
    const runAfter = useRunStore.getState();
    expect(runAfter.history.length).toBe(runBefore.history.length);
    expect(runAfter.counters).toEqual(runBefore.counters);
    // And the flag is set again so future mounts are no-ops.
    expect(window.localStorage.getItem(AUTOSEED_FLAG)).toBe("1");
  });

  // Plan 80 step 44: seed determinism. Baseline Playwright screenshots
  // and any snapshot-diff test consuming seed output rely on the order
  // being stable: (a) projects created in bundle order,
  // (b) rulesets on each project created in the ruleset's declared
  // order, (c) category names on each project preserving declaration
  // order. Any wobble here silently flaps visual gates.
  it("seedSampleProjects preserves declared order for projects, rulesets, and categories", async () => {
    const bundle: CatSeedBundle = {
      ...BUNDLE,
      projects: [
        {
          name: "Line A",
          cameraName: "Cam-1",
          categories: ["Cat-A", "Cat-B", "Cat-C"],
          rulesets: [
            {
              name: "RS-A1",
              categoryName: "Cat-A",
              rules: [
                {
                  name: "r",
                  kind: CatSeedRuleKindType.R,
                  family: CatSeedRuleFamilyType.Rect,
                  x: 0,
                  y: 0,
                  width: 4,
                  height: 4,
                },
              ],
            },
            {
              name: "RS-A2",
              categoryName: "Cat-B",
              rules: [
                {
                  name: "r",
                  kind: CatSeedRuleKindType.R,
                  family: CatSeedRuleFamilyType.Rect,
                  x: 0,
                  y: 0,
                  width: 4,
                  height: 4,
                },
              ],
            },
            {
              name: "RS-A3",
              categoryName: "Cat-C",
              rules: [
                {
                  name: "r",
                  kind: CatSeedRuleKindType.R,
                  family: CatSeedRuleFamilyType.Rect,
                  x: 0,
                  y: 0,
                  width: 4,
                  height: 4,
                },
              ],
            },
          ],
        },
        {
          name: "Line B",
          cameraName: "Cam-2",
          categories: ["Cat-X", "Cat-Y"],
          rulesets: [
            {
              name: "RS-B1",
              categoryName: "Cat-X",
              rules: [
                {
                  name: "r",
                  kind: CatSeedRuleKindType.R,
                  family: CatSeedRuleFamilyType.Rect,
                  x: 0,
                  y: 0,
                  width: 4,
                  height: 4,
                },
              ],
            },
            {
              name: "RS-B2",
              categoryName: "Cat-Y",
              rules: [
                {
                  name: "r",
                  kind: CatSeedRuleKindType.R,
                  family: CatSeedRuleFamilyType.Rect,
                  x: 0,
                  y: 0,
                  width: 4,
                  height: 4,
                },
              ],
            },
          ],
        },
      ],
    };
    const facade = new MemoryUiSeedFacade(bundle);
    const loaded = await facade.load();
    const result = seedSampleProjects(loaded.projects);

    // (a) project creation order matches bundle order.
    expect(result.createdProjectIds).toHaveLength(2);
    const projA = useProjectStore.getState().projects[result.createdProjectIds[0]!]!;
    const projB = useProjectStore.getState().projects[result.createdProjectIds[1]!]!;
    expect(projA.name).toBe("Line A");
    expect(projB.name).toBe("Line B");

    // (c) category names on each project preserve declaration order.
    expect(projA.categoryNames).toEqual(["Cat-A", "Cat-B", "Cat-C"]);
    expect(projB.categoryNames).toEqual(["Cat-X", "Cat-Y"]);

    // (b) rulesets on each project, in creation order (== declared order).
    const rulesets = useProjectStore.getState().rulesets;
    const namesForProject = (proj: typeof projA) =>
      proj.rulesetIds.map((rid) => rulesets[rid]!.name);
    expect(namesForProject(projA)).toEqual(["RS-A1", "RS-A2", "RS-A3"]);
    expect(namesForProject(projB)).toEqual(["RS-B1", "RS-B2"]);
  });

  // Plan 80 step 45: full-reset -> reseed produces canonically-equal
  // store snapshots. Store IDs / createdAt are non-deterministic by
  // design, so we compare `canonicalSeedSnapshotJson` (volatile fields
  // stripped, references remapped to names). Any drift = a seed pipeline
  // determinism bug that would flap visual gates / diff tools.
  it("seedSampleProjects: two isolated runs produce byte-identical canonical snapshots", async () => {
    const facade = new MemoryUiSeedFacade(BUNDLE);
    const bundle = await facade.load();

    resetStores();
    seedSampleProjects(bundle.projects);
    const firstJson = canonicalSeedSnapshotJson(useProjectStore.getState());

    resetStores();
    seedSampleProjects(bundle.projects);
    const secondJson = canonicalSeedSnapshotJson(useProjectStore.getState());

    expect(secondJson).toBe(firstJson);
    // Sanity: the projection must be non-trivial, else we're comparing
    // "{\"projects\":[]}" to itself and the assertion is vacuous.
    expect(JSON.parse(firstJson).projects.length).toBeGreaterThan(0);
  });
});
