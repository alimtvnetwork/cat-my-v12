import { describe, it, expect } from "vitest";
import { runSeedGapCheck } from "../gap-check";
import type { CatSeedBundle } from "../types";

const empty: CatSeedBundle = {
  categories: [],
  ruleTemplates: [],
  toolPresets: [],
  projects: [],
  sampleImages: [],
  programs: [],
} as unknown as CatSeedBundle;

describe("runSeedGapCheck", () => {
  it("returns ok on an empty bundle", () => {
    const r = runSeedGapCheck(empty, {
      cameraNames: new Set(),
      micSettingsNames: new Set(),
      sampleLibraryIds: new Set(),
    });
    expect(r.ok).toBe(true);
    expect(r.findings).toHaveLength(0);
  });

  it("flags a project pointing at a missing camera", () => {
    const bundle = {
      ...empty,
      projects: [
        {
          name: "P",
          cameraName: "GhostCam",
          categories: [],
          rulesets: [],
        },
      ],
    } as unknown as CatSeedBundle;
    const r = runSeedGapCheck(bundle, {
      cameraNames: new Set(["Basler acA1920"]),
      micSettingsNames: new Set(),
      sampleLibraryIds: new Set(),
    });
    expect(r.ok).toBe(false);
    expect(r.findings[0].kind).toBe("project.cameraName");
    expect(r.findings[0].ref).toBe("GhostCam");
  });

  it("flags a program pointing at a missing ruleset", () => {
    const bundle = {
      ...empty,
      projects: [{ name: "P", categories: [], rulesets: [{ name: "RS" }] }],
      programs: [{ id: "prog-1", projectName: "P", rulesetName: "Nope" }],
    } as unknown as CatSeedBundle;
    const r = runSeedGapCheck(bundle, {
      cameraNames: new Set(),
      micSettingsNames: new Set(),
      sampleLibraryIds: new Set(),
    });
    expect(r.findings.some((f) => f.kind === "program.rulesetName")).toBe(true);
  });
});
