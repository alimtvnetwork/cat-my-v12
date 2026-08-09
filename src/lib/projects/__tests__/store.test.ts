// Store contract tests (Plan 34, step 5, SS-02).
import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore, selectProject, selectRuleset, selectRulesetsForProject } from "../store";

function reset() {
  useProjectStore.setState({ projects: {}, rulesets: {} });
}

describe("projects store", () => {
  beforeEach(reset);

  it("creates a project and returns its id", () => {
    const id = useProjectStore.getState().createProject("Line A");
    const p = selectProject(useProjectStore.getState(), id);
    expect(p?.name).toBe("Line A");
    expect(p?.rulesetIds).toEqual([]);
  });

  it("renames a project", () => {
    const id = useProjectStore.getState().createProject("Old");
    useProjectStore.getState().renameProject(id, "New");
    expect(selectProject(useProjectStore.getState(), id)?.name).toBe("New");
  });

  it("creates a ruleset under a project", () => {
    const pid = useProjectStore.getState().createProject("P");
    const rid = useProjectStore.getState().createRuleset(pid, "RS1", "data:image/png;base64,AAA");
    const rs = selectRuleset(useProjectStore.getState(), rid);
    expect(rs?.projectId).toBe(pid);
    expect(rs?.imageRef).toBe("data:image/png;base64,AAA");
    expect(selectProject(useProjectStore.getState(), pid)?.rulesetIds).toContain(rid);
    expect(selectRulesetsForProject(useProjectStore.getState(), pid)).toHaveLength(1);
  });

  it("cascades ruleset deletion when the project is deleted", () => {
    const pid = useProjectStore.getState().createProject("P");
    const r1 = useProjectStore.getState().createRuleset(pid, "A");
    const r2 = useProjectStore.getState().createRuleset(pid, "B");
    useProjectStore.getState().deleteProject(pid);
    const s = useProjectStore.getState();
    expect(selectProject(s, pid)).toBeUndefined();
    expect(selectRuleset(s, r1)).toBeUndefined();
    expect(selectRuleset(s, r2)).toBeUndefined();
  });

  it("removes ruleset id from project on deleteRuleset", () => {
    const pid = useProjectStore.getState().createProject("P");
    const rid = useProjectStore.getState().createRuleset(pid, "RS");
    useProjectStore.getState().deleteRuleset(rid);
    expect(selectProject(useProjectStore.getState(), pid)?.rulesetIds).not.toContain(rid);
    expect(selectRuleset(useProjectStore.getState(), rid)).toBeUndefined();
  });

  it("duplicates a project and its rulesets under fresh ids", () => {
    // Plan 79 step 40: duplicateProject must clone everything under
    // new ids so mutations on the copy do not touch the source.
    const pid = useProjectStore.getState().createProject("Source");
    const r1 = useProjectStore.getState().createRuleset(pid, "A");
    const r2 = useProjectStore.getState().createRuleset(pid, "B");
    const newId = useProjectStore.getState().duplicateProject(pid);
    expect(newId).toBeTruthy();
    const s = useProjectStore.getState();
    const src = selectProject(s, pid)!;
    const copy = selectProject(s, newId!)!;
    expect(copy.id).not.toBe(pid);
    expect(copy.name).toBe("Source (copy)");
    expect(copy.rulesetIds).toHaveLength(2);
    // No id sharing between source and clone.
    for (const rid of copy.rulesetIds) {
      expect(src.rulesetIds).not.toContain(rid);
      const rs = selectRuleset(s, rid)!;
      expect(rs.projectId).toBe(newId);
    }
    // Original rulesets untouched.
    expect(selectRuleset(s, r1)?.projectId).toBe(pid);
    expect(selectRuleset(s, r2)?.projectId).toBe(pid);
  });

  it("duplicateProject returns null for unknown ids", () => {
    expect(useProjectStore.getState().duplicateProject("nope")).toBeNull();
  });

  it("reorders project rulesets under an exact-permutation guard", () => {
    // Plan 79 step 42.
    const pid = useProjectStore.getState().createProject("Perm");
    const r1 = useProjectStore.getState().createRuleset(pid, "A");
    const r2 = useProjectStore.getState().createRuleset(pid, "B");
    const r3 = useProjectStore.getState().createRuleset(pid, "C");
    useProjectStore.getState().reorderProjectRulesets(pid, [r3, r1, r2]);
    expect(selectProject(useProjectStore.getState(), pid)?.rulesetIds).toEqual([r3, r1, r2]);
    // Length mismatch is rejected without mutation.
    useProjectStore.getState().reorderProjectRulesets(pid, [r1, r2]);
    expect(selectProject(useProjectStore.getState(), pid)?.rulesetIds).toEqual([r3, r1, r2]);
    // Foreign id is rejected without mutation.
    useProjectStore.getState().reorderProjectRulesets(pid, [r1, r2, "foreign"]);
    expect(selectProject(useProjectStore.getState(), pid)?.rulesetIds).toEqual([r3, r1, r2]);
  });

  it("supports rule CRUD with category assignment", () => {
    const pid = useProjectStore.getState().createProject("P", { categoryNames: ["OCR"] });
    const rid = useProjectStore.getState().createRuleset(pid, "Rule Set 01");
    useProjectStore.getState().renameRuleset(rid, "Rule Set 02");
    useProjectStore.getState().updateRulesetCategory(rid, "Missing");
    expect(selectRuleset(useProjectStore.getState(), rid)?.name).toBe("Rule Set 02");
    expect(selectRuleset(useProjectStore.getState(), rid)?.categoryName).toBe("Missing");
    expect(selectProject(useProjectStore.getState(), pid)?.categoryNames).toContain("Missing");
  });

  it("clones rule sets as reference or snapshot", () => {
    const pid = useProjectStore.getState().createProject("P");
    const source = useProjectStore.getState().createRuleset(pid, "Base");
    const ref = useProjectStore.getState().cloneRuleset(pid, source, "Base Ref", "reference");
    const snap = useProjectStore.getState().cloneRuleset(pid, source, "Base Copy", "snapshot");
    expect(selectRuleset(useProjectStore.getState(), ref)?.parentRulesetId).toBe(source);
    expect(selectRuleset(useProjectStore.getState(), ref)?.overrideMode).toBe("reference");
    expect(selectRuleset(useProjectStore.getState(), snap)?.overrideMode).toBe("snapshot");
  });

  it("survives a JSON round-trip (persistence-shaped)", () => {
    const pid = useProjectStore.getState().createProject("P");
    useProjectStore.getState().createRuleset(pid, "RS");
    const snapshot = JSON.parse(
      JSON.stringify({
        projects: useProjectStore.getState().projects,
        rulesets: useProjectStore.getState().rulesets,
      }),
    );
    reset();
    useProjectStore.setState(snapshot);
    const s = useProjectStore.getState();
    expect(selectProject(s, pid)?.name).toBe("P");
    expect(selectRulesetsForProject(s, pid)).toHaveLength(1);
  });

  it("logs but does not throw when acting on unknown ids", () => {
    expect(() => useProjectStore.getState().renameProject("nope", "x")).not.toThrow();
    expect(() => useProjectStore.getState().updateRulesetRules("nope", [])).not.toThrow();
    expect(() => useProjectStore.getState().deleteProject("nope")).not.toThrow();
    expect(() => useProjectStore.getState().deleteRuleset("nope")).not.toThrow();
  });

  describe("setProjectCamera (Plan 78 slice 4)", () => {
    it("binds a CameraSetting id to a project", () => {
      const id = useProjectStore.getState().createProject("P");
      useProjectStore.getState().setProjectCamera(id, "cam-abc");
      expect(selectProject(useProjectStore.getState(), id)?.cameraSettingId).toBe("cam-abc");
    });

    it("clears the binding when passed null or empty", () => {
      const id = useProjectStore.getState().createProject("P");
      useProjectStore.getState().setProjectCamera(id, "cam-abc");
      useProjectStore.getState().setProjectCamera(id, null);
      expect(selectProject(useProjectStore.getState(), id)?.cameraSettingId).toBeUndefined();

      useProjectStore.getState().setProjectCamera(id, "cam-xyz");
      useProjectStore.getState().setProjectCamera(id, "   ");
      expect(selectProject(useProjectStore.getState(), id)?.cameraSettingId).toBeUndefined();
    });

    it("no-ops on unknown projectId", () => {
      expect(() => useProjectStore.getState().setProjectCamera("missing", "cam-abc")).not.toThrow();
      expect(useProjectStore.getState().projects["missing"]).toBeUndefined();
    });

    it("does not touch other project fields", () => {
      const id = useProjectStore.getState().createProject("Line A", { cameraName: "Legacy" });
      useProjectStore.getState().setProjectCamera(id, "cam-1");
      const p = selectProject(useProjectStore.getState(), id);
      expect(p?.cameraName).toBe("Legacy");
      expect(p?.cameraSettingId).toBe("cam-1");
      expect(p?.name).toBe("Line A");
    });
  });

  describe("setProjectMicSettings (Plan 79 step 44)", () => {
    it("binds and clears micSettingsId", () => {
      const id = useProjectStore.getState().createProject("P");
      useProjectStore.getState().setProjectMicSettings(id, "mic-1");
      expect(selectProject(useProjectStore.getState(), id)?.micSettingsId).toBe("mic-1");
      useProjectStore.getState().setProjectMicSettings(id, null);
      expect(selectProject(useProjectStore.getState(), id)?.micSettingsId).toBeUndefined();
      useProjectStore.getState().setProjectMicSettings(id, "mic-2");
      useProjectStore.getState().setProjectMicSettings(id, "   ");
      expect(selectProject(useProjectStore.getState(), id)?.micSettingsId).toBeUndefined();
    });

    it("no-ops on unknown projectId", () => {
      expect(() =>
        useProjectStore.getState().setProjectMicSettings("missing", "mic-1"),
      ).not.toThrow();
      expect(useProjectStore.getState().projects["missing"]).toBeUndefined();
    });
  });
});
