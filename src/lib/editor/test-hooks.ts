import { EditorRuleKindType } from "@/lib/editor/types";
import { EditorToolFamilyType } from "@/lib/editor/types";
// Editor test hooks exposed on window for Playwright specs (plan 30 steps 94-95).
// Guarded so it only runs in the browser and only when explicitly opted in via
// the `?e2e=1` URL flag or `VITE_EDITOR_E2E=1`. Never active in production
// builds without the flag, so real users never see the global.
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { useUiPrefsStore } from "@/lib/ui-prefs-store";
import { IMAGE_BOUNDS } from "@/lib/editor/coords";
import type { RuleGroup } from "@/lib/editor/store/rules-slice";

import { DEFAULT_PARAMS, type ControllerKind } from "@/lib/editor/schema";
import { PATTERN_EDGE_KERNELS, PATTERN_EDGE_POLARITIES } from "@/lib/editor/schema";
import type { PatternEdgeKernel, PatternEdgePolarity } from "@/lib/editor/schema";
import type { EditorRule, EditorRuleKind } from "@/lib/editor/types";
import { logger } from "@/lib/editor/errors";
import { serializeRuleSet, parseRuleSet } from "@/lib/editor/ruleset-io";

export interface EditorTestHooks {
  seed(count: number): void;
  clear(): void;
  setKind(id: string, kind: EditorRuleKind): void;
  seedControllers(kinds: ControllerKind[]): void;
  setBounds(id: string, rect: { x: number; y: number; width: number; height: number }): void;
  setHudFollowsShape(next: boolean): void;
  setHudAnchorDebug(next: boolean): void;

  seedMix(rectCount: number, controllers: ControllerKind[]): void;
  getRuleById(id: string): EditorRule | null;
  setReferenceAsset(id: string, url: string): void;
  setNumberBounds(id: string, patch: { min: number; max: number; unit: string }): void;
  setColorTarget(id: string, patch: { hex: string; tolerance: number }): void;
  setBlobParams(
    id: string,
    patch: { minArea: number; maxArea: number; expectedCount: number },
  ): void;
  setPatternEdge(
    id: string,
    patch: {
      edgeKernel: PatternEdgeKernel;
      threshold: number;
      polarity: PatternEdgePolarity;
      minLength: number;
    },
  ): void;
  roundTrip(): EditorRule[];
  getRules(): EditorRule[];
  setSelection(ids: string[]): void;
  groupSelected(groupId: string, name: string): void;
  setHidden(ids: string[], hidden: boolean): void;
  setLocked(ids: string[], locked: boolean): void;
  getGroups(): RuleGroup[];
}

function makeRule(i: number): EditorRule {
  const cols = 20;
  const col = i % cols;
  const row = Math.floor(i / cols);

  return {
    id: `seed-${i}`,
    name: `Seed ${i + 1}`,
    kind: EditorRuleKindType.R,
    isHidden: false,
    isLocked: false,
    x: 40 + col * 48,
    y: 40 + row * 40,
    width: 40,
    height: 32,
  };
}

function kindForController(controller: ControllerKind): EditorRuleKind {
  if (controller === "color" || controller === "presence") return EditorRuleKindType.C;

  if (controller === "ocr" || controller === "pattern") return EditorRuleKindType.K;

  if (controller === "textMatch") return EditorRuleKindType.S;

  if (controller === "math") return EditorRuleKindType.E;

  return EditorRuleKindType.R;
}

function makeControllerRule(controller: ControllerKind, i: number): EditorRule {
  const rule = makeRule(i) as EditorRule & { controller: ControllerKind };
  rule.id = `panel-${controller}`;
  rule.name = `${controller} panel`;
  rule.kind = kindForController(controller);
  rule.family =
    rule.kind === "C" || rule.kind === "R"
      ? EditorToolFamilyType.Rect
      : EditorToolFamilyType.Anchor;
  rule.controller = controller;
  rule.params = { ...DEFAULT_PARAMS[controller] };

  return rule;
}

function patchRule(id: string, patch: EditorRule["params"]): void {
  const target = useRulesStore.getState().rules.find((rule) => rule.id === id);

  if (target) useRulesStore.getState().updateParams(id, { ...(target.params ?? {}), ...patch });
}

export function installEditorTestHooks(): void {
  if (typeof window === "undefined") return;
  const enabled =
    new URLSearchParams(window.location.search).get("e2e") === "1" ||
    import.meta.env.VITE_EDITOR_E2E === "1";

  if (!enabled) return;
  const hooks: EditorTestHooks = {
    seed(count: number) {
      const rules = Array.from({ length: count }, (_, i) => makeRule(i));
      useRulesStore.getState().replaceAll(rules, rules.length > 0 ? [rules[0].id] : []);
      logger.info("I_UI_E2E_SEED", { count });
    },
    clear() {
      useRulesStore.getState().replaceAll([], []);
    },
    setKind(id, kind) {
      useRulesStore.getState().setKind(id, kind);
    },
    seedControllers(kinds) {
      const rules = kinds.map((kind, i) => makeControllerRule(kind, i));
      useRulesStore.getState().replaceAll(rules, rules.length > 0 ? [rules[0].id] : []);
      logger.info("I_UI_E2E_SEED_CONTROLLERS", { count: rules.length });
    },
    setBounds(id, rect) {
      useRulesStore.getState().setRuleBounds(id, rect, IMAGE_BOUNDS);
      logger.info("I_UI_E2E_SET_BOUNDS", { id, ...rect });
    },
    setHudFollowsShape(next) {
      useUiPrefsStore.setState({ hudFollowsShape: next });
      logger.info("I_UI_E2E_SET_HUD_FOLLOWS_SHAPE", { next });
    },
    setHudAnchorDebug(next) {
      useUiPrefsStore.setState({ hudAnchorDebug: next });
      logger.info("I_UI_E2E_SET_HUD_ANCHOR_DEBUG", { next });
    },

    seedMix(rectCount, controllers) {
      const rects = Array.from({ length: rectCount }, (_, i) => makeRule(i));
      const panels = controllers.map((c, i) => makeControllerRule(c, rectCount + i));
      const rules = [...rects, ...panels];
      useRulesStore.getState().replaceAll(rules, rules.length > 0 ? [rules[0].id] : []);
      logger.info("I_UI_E2E_SEED_MIX", { rectCount, controllers: controllers.length });
    },
    getRuleById(id) {
      return useRulesStore.getState().rules.find((rule) => rule.id === id) ?? null;
    },
    setReferenceAsset(id, url) {
      patchRule(id, { referenceAsset: url });
    },
    setNumberBounds(id, patch) {
      patchRule(id, patch);
    },
    setColorTarget(id, patch) {
      patchRule(id, { expectedColor: patch.hex, deltaE: patch.tolerance });
    },
    setBlobParams(id, patch) {
      patchRule(id, patch);
    },
    setPatternEdge(id, patch) {
      // Plan 32 step 5. Validate before applying so invalid input surfaces as
      // a coded error instead of silently corrupting store state.
      if (
        PATTERN_EDGE_KERNELS.includes(patch.edgeKernel) === false ||
        PATTERN_EDGE_POLARITIES.includes(patch.polarity) === false ||
        Number.isFinite(patch.threshold) === false ||
        patch.threshold < 0 ||
        patch.threshold > 1 ||
        Number.isFinite(patch.minLength) === false ||
        patch.minLength < 0
      ) {
        logger.error("E_UI_E2E_PATTERN_EDGE_INVALID", {
          id,
          edgeKernel: String(patch.edgeKernel),
          threshold: Number(patch.threshold),
          polarity: String(patch.polarity),
          minLength: Number(patch.minLength),
        });

        throw new Error("E_UI_E2E_PATTERN_EDGE_INVALID");
      }

      patchRule(id, { ...patch });
      logger.info("I_UI_E2E_SET_PATTERN_EDGE", { id });
    },
    getRules() {
      return useRulesStore.getState().rules;
    },
    setSelection(ids) {
      useRulesStore.getState().setSelection(ids, "e2e");
    },
    groupSelected(groupId, name) {
      useRulesStore.getState().groupSelected(groupId, name);
      logger.info("I_UI_E2E_GROUP", { groupId, name });
    },
    setHidden(ids, hidden) {
      useRulesStore.getState().setHidden(ids, hidden);
    },
    setLocked(ids, locked) {
      useRulesStore.getState().setLocked(ids, locked);
    },
    getGroups() {
      return useRulesStore.getState().groups;
    },
    roundTrip() {
      const before = useRulesStore.getState().rules;
      const beforeGroups = useRulesStore.getState().groups;
      const text = serializeRuleSet(before, beforeGroups);
      const { rules, groups } = parseRuleSet(text);
      useRulesStore.getState().replaceAll(rules, rules.length > 0 ? [rules[0].id] : [], groups);
      logger.info("I_UI_E2E_ROUND_TRIP", { count: rules.length, groups: groups.length });

      return useRulesStore.getState().rules;
    },
  };
  (window as unknown as { __editorTestHooks: EditorTestHooks }).__editorTestHooks = hooks;
}