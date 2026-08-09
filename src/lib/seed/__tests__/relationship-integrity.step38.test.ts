import { describe, it, expect } from "vitest";
import bundle from "../data/bundle.v2.json";

/**
 * Plan 86 Step 38: Relationship integrity ratchet.
 * Root cause guard: the orchestrator writes slices in dependency order, but nothing today
 * fails the build when a project references a missing camera, a ruleset points at a
 * removed category, or an empty-state CTA names a profile that was renamed. Any of those
 * dangling refs silently produce blank UI at runtime. This test resolves every cross-slice
 * reference against the frozen bundle so a bad edit fails at test time, not in preview.
 */

type Row = { id: string } & Record<string, unknown>;
const ids = (rows: Row[]) => new Set(rows.map((r) => r.id));

const B = bundle as unknown as {
  profiles: Row[];
  categories: Row[];
  cameras: Row[];
  micSettings: Row[];
  swatches: Row[];
  propertyPresets: Row[];
  settings: Row[];
  projects: Array<
    Row & {
      profileId: string;
      defaultCameraId?: string;
      defaultRulesetId?: string;
      paletteSwatchIds?: string[];
    }
  >;
  rulesets: Array<Row & { categoryId?: string; ruleIds?: string[] }>;
  rules: Array<Row & { rulesetId?: string; categoryId?: string }>;
  samples: Array<Row & { projectId: string; cameraId?: string }>;
  commands: Array<Row & { action: string }>;
  emptyStates: Array<Row & { ctaCommand?: string; ctaArgs?: { profileId?: string } }>;
  errorScenarios: Row[];
};

describe("Plan 86 Step 38 — seed bundle relationship integrity", () => {
  const profileIds = ids(B.profiles);
  const categoryIds = ids(B.categories);
  const cameraIds = ids(B.cameras);
  const swatchIds = ids(B.swatches);
  const projectIds = ids(B.projects);
  const rulesetIds = ids(B.rulesets);
  const ruleIds = ids(B.rules);

  it("projects reference existing profile, camera, ruleset, and swatches", () => {
    for (const p of B.projects) {
      expect(profileIds.has(p.profileId), `project ${p.id} profileId`).toBe(true);
      if (p.defaultCameraId)
        expect(cameraIds.has(p.defaultCameraId), `project ${p.id} camera`).toBe(true);
      if (p.defaultRulesetId)
        expect(rulesetIds.has(p.defaultRulesetId), `project ${p.id} ruleset`).toBe(true);
      for (const sid of p.paletteSwatchIds ?? [])
        expect(swatchIds.has(sid), `project ${p.id} swatch ${sid}`).toBe(true);
    }
  });

  it("rulesets reference existing category and rules; ruleIds match rules.rulesetId", () => {
    for (const rs of B.rulesets) {
      if (rs.categoryId)
        expect(categoryIds.has(rs.categoryId), `ruleset ${rs.id} category`).toBe(true);
      for (const rid of rs.ruleIds ?? [])
        expect(ruleIds.has(rid), `ruleset ${rs.id} rule ${rid}`).toBe(true);
    }
    // Bidirectional: every rule's rulesetId must exist and that ruleset must list this rule.
    for (const r of B.rules) {
      if (!r.rulesetId) continue;
      expect(rulesetIds.has(r.rulesetId), `rule ${r.id} rulesetId`).toBe(true);
      const rs = B.rulesets.find((x) => x.id === r.rulesetId);
      expect(rs?.ruleIds ?? [], `ruleset ${r.rulesetId} lists rule ${r.id}`).toContain(r.id);
      if (r.categoryId) expect(categoryIds.has(r.categoryId), `rule ${r.id} category`).toBe(true);
    }
  });

  it("samples reference existing project and camera", () => {
    for (const s of B.samples) {
      expect(projectIds.has(s.projectId), `sample ${s.id} project`).toBe(true);
      if (s.cameraId) expect(cameraIds.has(s.cameraId), `sample ${s.id} camera`).toBe(true);
    }
  });

  it("emptyStates ctaArgs.profileId resolves to a real profile", () => {
    for (const e of B.emptyStates) {
      const pid = e.ctaArgs?.profileId;
      if (!pid) continue;
      expect(profileIds.has(pid), `emptyState ${e.id} profile ${pid}`).toBe(true);
    }
  });

  it("commands with seed.applyProfile action are covered by at least one profile", () => {
    const hasSeedApply = B.commands.some((c) => c.action === "seed.applyProfile");
    if (hasSeedApply) expect(B.profiles.length).toBeGreaterThan(0);
    for (const c of B.commands) {
      expect(typeof c.action === "string" && c.action.length > 0, `command ${c.id} action`).toBe(
        true,
      );
    }
  });

  it("no id collisions within a slice", () => {
    for (const [key, rows] of Object.entries({
      profiles: B.profiles,
      categories: B.categories,
      cameras: B.cameras,
      micSettings: B.micSettings,
      swatches: B.swatches,
      propertyPresets: B.propertyPresets,
      settings: B.settings,
      projects: B.projects,
      rulesets: B.rulesets,
      rules: B.rules,
      samples: B.samples,
      commands: B.commands,
      emptyStates: B.emptyStates,
      errorScenarios: B.errorScenarios,
    })) {
      const seen = new Set<string>();
      for (const r of rows as Row[]) {
        expect(seen.has(r.id), `${key} duplicate id ${r.id}`).toBe(false);
        seen.add(r.id);
      }
    }
  });
});
