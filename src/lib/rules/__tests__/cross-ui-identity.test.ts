// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  IntAliasNamespaceType,
  toIntParam,
  resolveIdParam,
  seedIntParams,
  __resetIntAliasForTests,
} from "@/lib/ids/int-alias";
import {
  toRulesetIntId,
  fromRulesetIntId,
  __resetRulesetIdAliasForTests,
} from "../ruleset-id-alias";
import { toIntId, fromIntId, __resetRuleIdAliasForTests } from "../rule-id-alias";
import { projectRulesetToEnvelope } from "../envelopeAdapter";
import {
  useProjectStore,
  selectProject,
  selectRuleset,
  type ProjectStoreState,
  type Project,
  type RuleSet,
} from "@/lib/projects/store";
import {
  resolveStandardRuleSetId,
  findMatchingRuleItem,
} from "@/components/setup/StandardRoiSetup";
import { EditorRuleKindType } from "@/lib/editor/types";
import {
  RULESET_SCHEMA_VERSION,
  RuleKindType,
  ToleranceKindType,
  DraftOriginType,
  type RuleItem,
} from "../draftStore";

describe("Cross-UI Identity & Naming Contract", () => {
  beforeEach(() => {
    __resetIntAliasForTests();
    __resetRulesetIdAliasForTests();
    __resetRuleIdAliasForTests();

    // Reset project store with a canonical project & ruleset
    useProjectStore.setState({
      projects: {
        "proj-bottle-inspection": {
          id: "proj-bottle-inspection",
          name: "Bottle Line Inspection",
          createdAt: 1000,
          rulesetIds: ["rs-front-label", "rs-cap-torque"],
        },
      },
      rulesets: {
        "rs-front-label": {
          id: "rs-front-label",
          projectId: "proj-bottle-inspection",
          name: "Front Label Presence",
          rules: [
            {
              id: "rule-label-presence",
              name: "Label ROI",
              kind: EditorRuleKindType.R,
              isHidden: false,
              isLocked: false,
              x: 120,
              y: 200,
              width: 320,
              height: 220,
            },
          ],
        },
        "rs-cap-torque": {
          id: "rs-cap-torque",
          projectId: "proj-bottle-inspection",
          name: "Cap Torque Mark",
          rules: [],
        },
      },
    });

    seedIntParams(IntAliasNamespaceType.Project, ["proj-bottle-inspection"]);
    seedIntParams(IntAliasNamespaceType.Ruleset, ["rs-cap-torque", "rs-front-label"]);
  });

  it("1. same project resolves identically in Modern and Standard", () => {
    // Project integer alias
    const projectAlias = toIntParam(IntAliasNamespaceType.Project, "proj-bottle-inspection");
    expect(projectAlias).toBe("1");

    // Modern lookup via selectProject with alias "1"
    const modernProject = selectProject(useProjectStore.getState(), projectAlias);
    expect(modernProject).toBeDefined();
    expect(modernProject?.id).toBe("proj-bottle-inspection");
    expect(modernProject?.name).toBe("Bottle Line Inspection");

    // Standard lookup resolves to the exact same canonical ID
    const standardProject = resolveIdParam(IntAliasNamespaceType.Project, projectAlias);
    expect(standardProject).toBe("proj-bottle-inspection");
  });

  it("2. same ruleset resolves identically in Modern and Standard", () => {
    // Ruleset integer alias
    const rulesetAlias = toIntParam(IntAliasNamespaceType.Ruleset, "rs-front-label");
    expect(rulesetAlias).toBeTruthy();

    // Modern lookup via selectRuleset
    const modernRuleset = selectRuleset(useProjectStore.getState(), rulesetAlias);
    expect(modernRuleset).toBeDefined();
    expect(modernRuleset?.id).toBe("rs-front-label");
    expect(modernRuleset?.name).toBe("Front Label Presence");

    // Standard lookup resolves to the exact same integer RuleSetId
    const standardRuleSetId = resolveStandardRuleSetId(rulesetAlias);
    expect(standardRuleSetId).toBe(Number(rulesetAlias));

    const standardCanonicalId = fromRulesetIntId(Number(rulesetAlias));
    expect(standardCanonicalId).toBe("rs-front-label");
  });

  it("3. same rule/tool resolves identically where applicable", () => {
    const ruleAlias = toIntId("rule-label-presence");
    expect(ruleAlias).toBeGreaterThan(0);

    const resolvedStringId = fromIntId(ruleAlias);
    expect(resolvedStringId).toBe("rule-label-presence");

    const sampleRules: RuleItem[] = [
      {
        Id: ruleAlias,
        Kind: RuleKindType.Presence,
        Enabled: true,
        Shape: { Type: "rect", X: 120, Y: 200, W: 320, H: 220 },
        Tolerance: { Kind: ToleranceKindType.Pct, Value: 5 },
        Params: { _LegacyId: "rule-label-presence" },
      },
    ];

    // Resolving by integer alias
    expect(findMatchingRuleItem(sampleRules, String(ruleAlias))?.Id).toBe(ruleAlias);
    // Resolving by string ID
    expect(findMatchingRuleItem(sampleRules, "rule-label-presence")?.Id).toBe(ruleAlias);
  });

  it("4. visible ruleset card generates a route that resolves back to that exact ruleset without 404", () => {
    const state = useProjectStore.getState();
    const project = state.projects["proj-bottle-inspection"];
    const ruleset = state.rulesets["rs-front-label"];

    // Simulated card route generation (as done in Modern UI Ruleset list)
    const routeProjectId = toIntParam(IntAliasNamespaceType.Project, project.id);
    const routeRulesetId = toIntParam(IntAliasNamespaceType.Ruleset, ruleset.id);

    expect(routeProjectId).toBe("1");
    expect(routeRulesetId).toBe("2"); // second in sorted list

    // Target route lookup (/projects/$projectId/rulesets/$rulesetId)
    const resolvedProject = selectProject(state, routeProjectId);
    const resolvedRuleset = selectRuleset(state, routeRulesetId);

    expect(resolvedProject).toBeDefined();
    expect(resolvedRuleset).toBeDefined();

    // The core bug check: ruleset ownership must match resolved project canonical id
    expect(resolvedRuleset!.projectId).toBe(resolvedProject!.id);
    // It should NOT fail the route guard:
    const wouldThrowNotFound = !resolvedRuleset || resolvedRuleset.projectId !== resolvedProject!.id;
    expect(wouldThrowNotFound).toBe(false);
  });

  it("5. backend RuleSetEnvelope ID matches the selected UI ruleset", () => {
    const state = useProjectStore.getState();
    const ruleset = state.rulesets["rs-front-label"];

    const { envelope } = projectRulesetToEnvelope(ruleset);
    const routeRulesetId = Number(toIntParam(IntAliasNamespaceType.Ruleset, ruleset.id));

    // Wire RuleSetId must match the route param number
    expect(envelope.RuleSetId).toBe(routeRulesetId);
    expect(toRulesetIntId(ruleset.id)).toBe(routeRulesetId);
  });

  it("6. invalid identity does not silently select an unrelated first ruleset", () => {
    // When no ruleset and no project context is provided, return null
    expect(resolveStandardRuleSetId(undefined, undefined)).toBeNull();

    // When an unknown integer alias is requested, selectRuleset returns undefined
    const unknownRuleset = selectRuleset(useProjectStore.getState(), "999");
    expect(unknownRuleset).toBeUndefined();
  });

  it("7. invalid rule identity does not silently edit an unrelated first rule", () => {
    const sampleRules: RuleItem[] = [
      {
        Id: 1,
        Kind: RuleKindType.Presence,
        Enabled: true,
        Shape: { Type: "rect", X: 10, Y: 10, W: 10, H: 10 },
        Tolerance: { Kind: ToleranceKindType.Pct, Value: 5 },
        Params: { _LegacyId: "rule-primary" },
      },
      {
        Id: 2,
        Kind: RuleKindType.Match,
        Enabled: true,
        Shape: { Type: "rect", X: 20, Y: 20, W: 20, H: 20 },
        Tolerance: { Kind: ToleranceKindType.Pct, Value: 5 },
        Params: { _LegacyId: "rule-secondary" },
      },
    ];

    // Asking for non-existent rule "999" MUST return undefined, NOT rules[0]
    const invalidMatch = findMatchingRuleItem(sampleRules, "999");
    expect(invalidMatch).toBeUndefined();

    // Asking for non-existent string ID MUST return undefined
    const invalidStringMatch = findMatchingRuleItem(sampleRules, "unknown-rule");
    expect(invalidStringMatch).toBeUndefined();

    // Only when omitted by design does it default to rules[0]
    const defaultMatch = findMatchingRuleItem(sampleRules, undefined);
    expect(defaultMatch?.Id).toBe(1);
  });
});
