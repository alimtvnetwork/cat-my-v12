import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EVENTS, Joyride, STATUS, type EventData, type Step } from "react-joyride";
import { useNavigate } from "@tanstack/react-router";
import { Square } from "lucide-react";
import { toast } from "sonner";
import ruleSetupImage from "../../../assets/ui/12-session-screenshot-file12.png";
import analysisImage from "../../../assets/ui/11-session-screenshot-file11.png";
import pin1SetupImage from "../../../assets/ui/13-session-screenshot-file13.png";
import greyscaleSetupImage from "../../../assets/ui/14-session-screenshot-file14.png";
import {
  GUIDED_SIMULATION_COMMAND_EVENT,
  GUIDED_SIMULATION_ANALYSIS_EVENT,
  GUIDED_SIMULATION_MENU_EVENT,
  GUIDED_SIMULATION_STATE_EVENT,
  type GuidedSimulationAnalysisDetail,
  type GuidedSimulationCommandDetail,
  type GuidedSimulationMenuDetail,
  type GuidedSimulationStateDetail,
} from "./events";
import {
  EditorRuleKindType,
  EditorToolFamilyType,
  DEFAULT_RULE_CAMERA_SETTINGS,
  DEFAULT_RULE_LIGHT_SETTINGS,
  type EditorRule,
} from "@/lib/editor/types";
import { useProjectStore } from "@/lib/projects/store";
import {
  useValidationStore,
  ValidationStatusType,
  type ValidationResult,
} from "@/lib/editor/validation-store";
import { useRulesStore } from "@/lib/editor/store/rules-slice";

const TOUR_PROJECT_NAME = "demo";
const TOUR_RULESET_NAME = "demoset";
const TOUR_PIN1_RULE_ID = "guided-demo-pin1-rule-d1";
const TOUR_PATTERN_RULE_ID = "guided-demo-greyscale-rule-d1";
const TOUR_VIEWPORT_PADDING = 96;
const TOUR_MIN_STEP_MS = 6500;

interface GuidedDeviceLayout {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  pinX: number;
  pinY: number;
  pinTopY: number;
  pinBottomY: number;
  searchX: number;
  searchY: number;
  searchWidth: number;
  searchHeight: number;
  textX: number;
  textTopY: number;
  textBottomY: number;
  textStep: number;
  textWidth: number;
  textHeight: number;
  imageWidth: number;
  imageHeight: number;
  pinSearchRegion?: { x: number; y: number; width: number; height: number };
  greyscalePatternRegion?: { x: number; y: number; width: number; height: number };
  isEmbeddedGuidanceImage?: boolean;
}

const PIN1_SETUP_DEVICE_LAYOUT: GuidedDeviceLayout = {
  id: "d1",
  label: "Device 1",
  x: 171,
  y: 271,
  w: 802,
  h: 211,
  pinX: 288,
  pinY: 437,
  pinTopY: 224,
  pinBottomY: 481,
  searchX: 171,
  searchY: 271,
  searchWidth: 802,
  searchHeight: 211,
  textX: 379,
  textTopY: 309,
  textBottomY: 363,
  textStep: 77,
  textWidth: 60,
  textHeight: 47,
  imageWidth: 1072,
  imageHeight: 605,
  pinSearchRegion: { x: 218, y: 361, width: 138, height: 116 },
  isEmbeddedGuidanceImage: true,
};

const GREYSCALE_SETUP_DEVICE_LAYOUT: GuidedDeviceLayout = {
  id: "d1",
  label: "Device 1",
  x: 177,
  y: 274,
  w: 798,
  h: 209,
  pinX: 286,
  pinY: 429,
  pinTopY: 224,
  pinBottomY: 482,
  searchX: 345,
  searchY: 285,
  searchWidth: 456,
  searchHeight: 137,
  textX: 382,
  textTopY: 309,
  textBottomY: 358,
  textStep: 79,
  textWidth: 69,
  textHeight: 41,
  imageWidth: 1077,
  imageHeight: 607,
  greyscalePatternRegion: { x: 373, y: 291, width: 400, height: 116 },
  isEmbeddedGuidanceImage: true,
};

const DEVICE_LAYOUTS: readonly GuidedDeviceLayout[] = [
  {
    id: "d1",
    label: "Device 1 (Pocket 3)",
    x: 430,
    y: 143,
    w: 180,
    h: 202,
    pinX: 460,
    pinY: 317,
    pinTopY: 143,
    pinBottomY: 345,
    searchX: 430,
    searchY: 173,
    searchWidth: 182,
    searchHeight: 141,
    textX: 450,
    textTopY: 195,
    textBottomY: 229,
    textStep: 19,
    textWidth: 16,
    textHeight: 29,
    imageWidth: 1042,
    imageHeight: 403,
  },
  {
    id: "d2",
    label: "Device 2 (Pocket 4)",
    x: 630,
    y: 143,
    w: 180,
    h: 202,
    pinX: 659,
    pinY: 322,
    pinTopY: 143,
    pinBottomY: 345,
    searchX: 630,
    searchY: 173,
    searchWidth: 182,
    searchHeight: 141,
    textX: 650,
    textTopY: 195,
    textBottomY: 229,
    textStep: 19,
    textWidth: 16,
    textHeight: 29,
    imageWidth: 1042,
    imageHeight: 403,
  },
  {
    id: "d3",
    label: "Device 3 (Pocket 5)",
    x: 835,
    y: 143,
    w: 180,
    h: 202,
    pinX: 868,
    pinY: 318,
    pinTopY: 143,
    pinBottomY: 345,
    searchX: 835,
    searchY: 173,
    searchWidth: 182,
    searchHeight: 141,
    textX: 855,
    textTopY: 195,
    textBottomY: 229,
    textStep: 19,
    textWidth: 16,
    textHeight: 29,
    imageWidth: 1042,
    imageHeight: 403,
  },
] as const;

function getDevicePassRegions() {
  return DEVICE_LAYOUTS.map((device) => ({
    id: device.id,
    label: device.label,
    region: { x: device.x, y: device.y, width: device.w, height: device.h },
  }));
}


interface DemoContext {
  projectId: string;
  rulesetId?: string;
}

interface TourStep extends Step {
  actionKey?:
    | "go-project-list"
    | "go-project-create"
    | "create-project"
    | "go-ruleset-create"
    | "create-ruleset"
    | "go-add-rule"
    | "select-pin1-tool"
    | "add-pin1-rule"
    | "finish-pin1-config"
    | "select-greyscale-tool"
    | "add-greyscale-rule"
    | "finish-greyscale-config"
    | "focus-tree"
    | "focus-rules"
    | "register-image"
    | "run-analysis";
  actionPhase?: "enter" | "exit";
  autoMs?: number;
}

function hasTourTarget(step: TourStep): boolean {
  if (typeof step.target !== "string" || typeof document === "undefined") {
    return true;
  }

  return document.querySelector(step.target) !== null;
}

function scrollTourTargetIntoView(step: TourStep): void {
  if (typeof step.target !== "string" || typeof document === "undefined") {
    return;
  }

  const target = document.querySelector<HTMLElement>(step.target);

  if (!target) {
    return;
  }

  target.scrollIntoView({
    behavior: "auto",
    block: "center",
    inline: "center",
  });

  let parent = target.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);
    const hasVerticalScroll =
      (style.overflowY === "auto" || style.overflowY === "scroll") &&
      parent.scrollHeight > parent.clientHeight;
    const hasHorizontalScroll =
      (style.overflowX === "auto" || style.overflowX === "scroll") &&
      parent.scrollWidth > parent.clientWidth;

    if (hasVerticalScroll || hasHorizontalScroll) {
      const parentRect = parent.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      if (hasVerticalScroll) {
        const targetCenterY = targetRect.top + targetRect.height / 2;
        const parentCenterY = parentRect.top + parentRect.height / 2;
        parent.scrollTop += targetCenterY - parentCenterY;
      }

      if (hasHorizontalScroll) {
        const targetCenterX = targetRect.left + targetRect.width / 2;
        const parentCenterX = parentRect.left + parentRect.width / 2;
        parent.scrollLeft += targetCenterX - parentCenterX;
      }
    }

    parent = parent.parentElement;
  }

  window.requestAnimationFrame(() => {
    const rect = target.getBoundingClientRect();
    let deltaY = 0;
    let deltaX = 0;

    if (rect.top < TOUR_VIEWPORT_PADDING) {
      deltaY = rect.top - TOUR_VIEWPORT_PADDING;
    } else if (rect.bottom > window.innerHeight - TOUR_VIEWPORT_PADDING) {
      deltaY = rect.bottom - (window.innerHeight - TOUR_VIEWPORT_PADDING);
    }

    if (rect.left < TOUR_VIEWPORT_PADDING) {
      deltaX = rect.left - TOUR_VIEWPORT_PADDING;
    } else if (rect.right > window.innerWidth - TOUR_VIEWPORT_PADDING) {
      deltaX = rect.right - (window.innerWidth - TOUR_VIEWPORT_PADDING);
    }

    if (Math.abs(deltaY) > 1 || Math.abs(deltaX) > 1) {
      window.scrollBy({ top: deltaY, left: deltaX, behavior: "auto" });
    }

    window.dispatchEvent(new Event("resize"));
  });
}

function makeDemoRules(): EditorRule[] {
  return [
    makePin1Rule(PIN1_SETUP_DEVICE_LAYOUT, 1, pin1SetupImage),
    makeGreyscaleRule(GREYSCALE_SETUP_DEVICE_LAYOUT, 2, greyscaleSetupImage),
  ];
}

function makeAnalysisRules(): EditorRule[] {
  return [
    {
      ...makePin1Rule(DEVICE_LAYOUTS[0], 1, analysisImage),
      id: TOUR_PIN1_RULE_ID,
      name: "Rule 1: Pin 1 Orientation",
      x: 420,
      y: 140,
      width: 600,
      height: 210,
      params: {
        ...makePin1Rule(DEVICE_LAYOUTS[0], 1, analysisImage).params,
        imageRef: analysisImage,
        multiDevicePin1: DEVICE_LAYOUTS.map((device) => ({
          id: device.id,
          label: device.label,
          x: device.pinX,
          y: device.pinY,
          radius: 11,
          packageRegion: { x: device.x, y: device.y, width: device.w, height: device.h },
        })),
        multiDevicePassRegions: getDevicePassRegions(),
      } as any,
    },
    makeMultiDeviceGreyscaleRule(),
  ];
}

function makePin1Rule(device: GuidedDeviceLayout, number: number, imageRef: string): EditorRule {
  const searchRegion = device.pinSearchRegion ?? {
    x: Math.max(0, device.pinX - 32),
    y: Math.max(0, device.pinY - 32),
    width: 64,
    height: 64,
  };

  return {
    id: `guided-demo-pin1-rule-${device.id}`,
    name: `Rule ${number}: ${device.label} Pin 1 Orientation`,
    kind: EditorRuleKindType.C,
    family: EditorToolFamilyType.Rect,
    isHidden: false,
    isLocked: false,
    x: searchRegion.x,
    y: searchRegion.y,
    width: searchRegion.width,
    height: searchRegion.height,
    cameraSettings: DEFAULT_RULE_CAMERA_SETTINGS,
    lightSettings: DEFAULT_RULE_LIGHT_SETTINGS,
    params: {
      toolCode: "T117",
      toolType: "Pin 1 Orientation Config",
      imageRef,
      imageWidth: device.imageWidth,
      imageHeight: device.imageHeight,
      isEmbeddedGuidanceImage: Boolean(device.isEmbeddedGuidanceImage),
      tolerancePx: 25,
      searchRegion,
      ...(device.isEmbeddedGuidanceImage ? {} : { region: searchRegion }),
      pin1Config: {
        thresholdLuma: 35,
        tolerancePx: 25,
        angleToleranceDeg: 1,
        registeredPin1: {
          x: device.pinX,
          y: device.pinY,
          radius: 11,
          centerX: device.pinX,
          centerY: device.pinY,
        },
        ...(device.isEmbeddedGuidanceImage
          ? {}
          : {
              searchRegion,
              packageRegion: { x: device.x, y: device.y, width: device.w, height: device.h },
            }),
        centerX: device.pinX,
        centerY: device.pinY,
        radius: 11,
      },
    } as any,
  };
}

function makeGreyscaleRule(
  device: GuidedDeviceLayout,
  number: number,
  imageRef: string,
): EditorRule {
  const searchRegion = {
    x: device.searchX,
    y: device.searchY,
    width: device.searchWidth,
    height: device.searchHeight,
  };
  const patternRegion = device.greyscalePatternRegion ?? {
    x: device.textX - 5,
    y: device.textTopY - 5,
    width: device.textStep * 4 + device.textWidth + 10,
    height: device.textBottomY - device.textTopY + device.textHeight + 10,
  };
  const characterRows = [
    { y: device.textTopY, characters: "A1234" },
    { y: device.textBottomY, characters: "B5678" },
  ];
  const referenceBoxes = characterRows.flatMap((row, rowIndex) =>
    Array.from(row.characters).map((character, characterIndex) => ({
      number: rowIndex * row.characters.length + characterIndex + 1,
      x: device.textX + device.textStep * characterIndex,
      y: row.y,
      width: device.textWidth,
      height: device.textHeight,
      area: device.textWidth * device.textHeight,
      expectedCharacter: character,
      expectedLuma: 205,
    })),
  );

  return {
    id: `guided-demo-greyscale-rule-${device.id}`,
    name: `Rule ${number}: ${device.label} Greyscale Pattern`,
    kind: EditorRuleKindType.R,
    family: EditorToolFamilyType.Rect,
    isHidden: false,
    isLocked: false,
    x: searchRegion.x,
    y: searchRegion.y,
    width: searchRegion.width,
    height: searchRegion.height,
    cameraSettings: DEFAULT_RULE_CAMERA_SETTINGS,
    lightSettings: DEFAULT_RULE_LIGHT_SETTINGS,
    params: {
      toolCode: "T116",
      toolType: "Greyscale Pattern Matching",
      imageRef,
      imageWidth: device.imageWidth,
      imageHeight: device.imageHeight,
      isEmbeddedGuidanceImage: Boolean(device.isEmbeddedGuidanceImage),
      threshold: 62,
      greyscaleLevel: 62,
      minMatchPercent: 80,
      lumaTolerance: 255,
      searchRegion,
      ...(device.isEmbeddedGuidanceImage ? {} : { region: searchRegion }),
      patternRegion,
      referenceBoxes,
      constellation: referenceBoxes,
      constellationJson: JSON.stringify(referenceBoxes),
    } as any,
  };
}

function makeMultiDeviceGreyscaleRule(): EditorRule {
  const referenceBoxes = DEVICE_LAYOUTS.flatMap((device, deviceIndex) => {
    const baseRule = makeGreyscaleRule(device, 2, analysisImage);
    const boxes = ((baseRule.params as any)?.referenceBoxes ?? []) as Array<any>;

    return boxes.map((box) => ({
      ...box,
      number: deviceIndex * boxes.length + Number(box.number),
      deviceId: device.id,
      deviceLabel: device.label,
    }));
  });

  return {
    ...makeGreyscaleRule(DEVICE_LAYOUTS[0], 2, analysisImage),
    id: TOUR_PATTERN_RULE_ID,
    name: "Rule 2: Greyscale Pattern Matching",
    x: 420,
    y: 168,
    width: 600,
    height: 151,
    params: {
      ...makeGreyscaleRule(DEVICE_LAYOUTS[0], 2, analysisImage).params,
      imageRef: analysisImage,
      searchRegion: { x: 420, y: 168, width: 600, height: 151 },
      region: { x: 420, y: 168, width: 600, height: 151 },
      patternRegion: { x: 445, y: 190, width: 550, height: 73 },
      referenceBoxes,
      constellation: referenceBoxes,
      constellationJson: JSON.stringify(referenceBoxes),
      multiDevicePassRegions: getDevicePassRegions(),
      minMatchPercent: 80,
      lumaTolerance: 255,
    } as any,
  };
}

function makePassResults(): Record<string, ValidationResult> {
  return Object.fromEntries(
    makeAnalysisRules().map((rule) => {
      const isPinRule = String(rule.params?.toolCode) === "T117";
      const pinCfg = (rule.params as any)?.pin1Config;
      const boxes = (rule.params as any)?.referenceBoxes ?? [];
      const multiDevicePin1 = (rule.params as any)?.multiDevicePin1;
      const multiDevicePassRegions = (rule.params as any)?.multiDevicePassRegions;

      return [
        rule.id,
        {
          status: ValidationStatusType.Pass,
          score: 1,
          message: isPinRule
            ? "Guided simulation: Pin 1 mark verified."
            : "Guided simulation: Greyscale constellation matched.",
          stub: false,
          debug: isPinRule
            ? {
                nominalX: pinCfg?.centerX,
                nominalY: pinCfg?.centerY,
                detectedHoleX: pinCfg?.centerX,
                detectedHoleY: pinCfg?.centerY,
                deltaDistance: 0,
                offsetPx: 0,
                tolerancePx: 25,
                hasPin1Found: true,
                multiDevicePin1,
                multiDevicePassRegions,
              }
            : {
                matchedCount: boxes.length,
                totalCount: boxes.length,
                patternRegion: (rule.params as any)?.patternRegion,
                multiDevicePassRegions,
                boxResults: boxes.map((box: any) => ({
                  boxNumber: box.number,
                  referenceX: box.x,
                  referenceY: box.y,
                  matchedX: box.x,
                  matchedY: box.y,
                  width: box.width,
                  height: box.height,
                  isMatched: true,
                })),
              },
        },
      ];
    }),
  ) as Record<string, ValidationResult>;
}

function ensureDemoProject(): DemoContext {
  const store = useProjectStore.getState();
  const projectId = store.createProject(TOUR_PROJECT_NAME, {
    categoryNames: ["Inspection category"],
    deviceId: "demo-soic-8-dut",
    cameraName: "Demo Camera",
  });

  return { projectId };
}

function ensureDemoRuleset(projectId: string): DemoContext {
  const store = useProjectStore.getState();
  const project = store.projects[projectId];
  let rulesetId =
    project?.rulesetIds
      .map((id) => store.rulesets[id])
      .find((ruleset) => ruleset?.name === TOUR_RULESET_NAME)?.id ?? project?.rulesetIds[0];

  if (!rulesetId) {
    rulesetId = store.createRuleset(projectId, TOUR_RULESET_NAME);
  }

  const nextStore = useProjectStore.getState();
  const nextProject = nextStore.projects[projectId];

  if (!nextProject) {
    rulesetId = nextStore.createRuleset(projectId, TOUR_RULESET_NAME);
  }

  return { projectId, rulesetId };
}

function upsertDemoRule(params: {
  projectId: string;
  rulesetId: string;
  ruleId: string;
}): DemoContext {
  const { projectId, rulesetId, ruleId } = params;
  const store = useProjectStore.getState();
  const ruleset = store.rulesets[rulesetId];
  const demoRules = makeDemoRules();
  const nextRule = demoRules.find((rule) => rule.id === ruleId);

  if (!ruleset || !nextRule) {
    return { projectId, rulesetId };
  }

  const existingRules = ruleset.rules.filter((rule) => rule.id !== nextRule.id);
  const nextRules = [...existingRules, nextRule].sort((a, b) => {
    const aIndex = demoRules.findIndex((rule) => rule.id === a.id);
    const bIndex = demoRules.findIndex((rule) => rule.id === b.id);

    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });

  useProjectStore.getState().updateProjectInspectionImageRef(projectId, ruleSetupImage);
  useProjectStore.getState().updateRulesetRules(rulesetId, nextRules);
  useValidationStore.getState().setActiveRuleset(rulesetId);
  useValidationStore.getState().setResults(rulesetId, {}, "Guided simulation pending");

  return { projectId, rulesetId };
}

function prepareMultiDeviceAnalysis(params: { projectId: string; rulesetId: string }): DemoContext {
  const { projectId, rulesetId } = params;
  const analysisRules = makeAnalysisRules();

  useProjectStore.getState().updateProjectInspectionImageRef(projectId, analysisImage);
  useProjectStore.getState().updateRulesetRules(rulesetId, analysisRules);
  useValidationStore.getState().setActiveRuleset(rulesetId);
  useValidationStore.getState().setResults(rulesetId, {}, "Guided multi-device simulation pending");
  useRulesStore.getState().replaceAll(analysisRules, [analysisRules[0].id], []);

  return { projectId, rulesetId };
}

export function ProjectCreationAnalysisTour(): React.JSX.Element {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const isRunningRef = useRef(false);
  const isStepAdvancingRef = useRef(false);
  const demoRef = useRef<DemoContext | null>(null);
  const actionKeysRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<number | null>(null);
  const targetWaitTimerRef = useRef<number | null>(null);
  const analysisTimersRef = useRef<number[]>([]);

  const setAnalysisLoading = useCallback((isLoading: boolean) => {
    const detail: GuidedSimulationAnalysisDetail = { isLoading };
    window.dispatchEvent(new CustomEvent(GUIDED_SIMULATION_ANALYSIS_EVENT, { detail }));
  }, []);

  const setSimulationMenuOpen = useCallback((isOpen: boolean) => {
    const detail: GuidedSimulationMenuDetail = { isOpen };
    window.dispatchEvent(new CustomEvent(GUIDED_SIMULATION_MENU_EVENT, { detail }));
  }, []);

  const clearAnalysisTimers = useCallback(() => {
    for (const timerId of analysisTimersRef.current) {
      window.clearTimeout(timerId);
    }

    analysisTimersRef.current = [];
    setAnalysisLoading(false);
  }, [setAnalysisLoading]);

  const deleteDemoProject = useCallback(() => {
    const demo = demoRef.current;
    demoRef.current = null;

    if (!demo) {
      return;
    }

    if (demo.rulesetId) {
      useValidationStore.getState().clear(demo.rulesetId);
    }

    useValidationStore.getState().setActiveRuleset(null);
    useRulesStore.getState().replaceAll([], [], []);
    useProjectStore.getState().deleteProject(demo.projectId);
    void navigate({ to: "/projects" });
    toast.info("Simulation complete. Demo project removed.");
  }, [navigate]);

  const steps = useMemo<readonly TourStep[]>(
    () => [
      {
        target: "[data-tour='standard-menu-trigger']",
        placement: "bottom",
        title: "Click Projects",
        content:
          "The menu is open from the Home page. Choose the highlighted Projects row to begin the inspection workflow.",
        actionKey: "go-project-list",
        actionPhase: "exit",
        autoMs: 6500,
      },
      {
        target: "[data-tour='projects-create-button']",
        placement: "bottom",
        title: "Open project creation",
        content:
          "Start from the Projects page, then choose New Project to create the demo inspection project.",
        actionKey: "go-project-create",
        actionPhase: "exit",
        autoMs: 5500,
      },
      {
        target: "[data-tour='simulation-project-name']",
        placement: "bottom",
        title: "Name the project",
        content: "Set the project name to demo before creating the inspection project.",
        autoMs: 7000,
      },
      {
        target: "[data-tour='simulation-project-create-submit']",
        title: "Save project and continue",
        content: "The demo project is saved, then the app lands on the project overview page.",
        actionKey: "create-project",
        actionPhase: "exit",
        autoMs: 12000,
      },
      {
        target: "[data-tour='project-overview-tab']",
        placement: "bottom",
        title: "Project demo opened",
        content:
          "The app has landed on the newly-created demo project. This is the overview workspace before any ruleset exists.",
        autoMs: 7000,
      },
      {
        target: "[data-tour='project-overview-empty']",
        title: "Project overview",
        content: "The new project starts empty. No ruleset image is required here.",
        autoMs: 6500,
      },
      {
        target: "[data-tour='project-overview-add-ruleset']",
        placement: "top",
        title: "Add ruleset",
        content: "Now create the demoset ruleset category for the inspection rules.",
        actionKey: "go-ruleset-create",
        actionPhase: "exit",
        autoMs: 12000,
      },
      {
        target: "[data-tour='simulation-ruleset-create-panel']",
        title: "Configure ruleset",
        content:
          "Name the ruleset demoset. This is only a rule category, not an image registration step.",
        autoMs: 5500,
      },
      {
        target: "[data-tour='simulation-ruleset-create-submit']",
        title: "Create ruleset",
        content: "Save demoset, then return to the project workspace so rules can be added.",
        actionKey: "create-ruleset",
        actionPhase: "exit",
        autoMs: 4500,
      },
      {
        target: "[data-tour='project-program-tab']",
        placement: "right",
        title: "Empty inspection program",
        content: "The program now contains demo and demoset, but no rules have been added yet.",
        actionKey: "focus-tree",
        autoMs: 7000,
      },
      {
        target: "[data-tour='project-add-rule']",
        placement: "top",
        title: "Add the first rule",
        content: "Open the rule catalog to add the first tool into demoset.",
        actionKey: "go-add-rule",
        actionPhase: "exit",
        autoMs: 7000,
      },
      {
        target: "[data-tour='rule-add-catalog-header']",
        placement: "bottom",
        title: "Tool catalog",
        content:
          "This catalog lists the available inspection tools and any existing calibrated rules.",
        autoMs: 5500,
      },
      {
        target: "[data-tour='rule-add-pin1-tool']",
        placement: "auto",
        title: "Select PIN1 tool",
        content:
          "Select PIN1 Orientation from the catalog. The rule is not added until Configure is chosen.",
        actionKey: "select-pin1-tool",
        autoMs: 6500,
      },
      {
        target: "[data-tour='rule-add-configure-selected']",
        placement: "left",
        title: "Configure PIN1",
        content: "Choose Configure to add the PIN1 rule and set its inspection region.",
        actionKey: "add-pin1-rule",
        actionPhase: "exit",
        autoMs: 7000,
      },
      {
        target: "[data-tour='rule-config-controls']",
        placement: "left",
        title: "Set PIN1 region",
        content:
          "The supplied PIN1 configuration image shows the search region and registered Pin 1 result.",
        actionKey: "finish-pin1-config",
        actionPhase: "exit",
        autoMs: 7500,
      },
      {
        target: "[data-tour='rule-add-greyscale-tool']",
        placement: "auto",
        title: "Select Greyscale tool",
        content:
          "Select Greyscale Pattern Matching. Configure will add it after the tool is selected.",
        actionKey: "select-greyscale-tool",
        autoMs: 6500,
      },
      {
        target: "[data-tour='rule-add-configure-selected']",
        placement: "left",
        title: "Configure Greyscale",
        content: "Choose Configure to add the Greyscale rule and set the pattern region.",
        actionKey: "add-greyscale-rule",
        actionPhase: "exit",
        autoMs: 7000,
      },
      {
        target: "[data-tour='rule-config-controls']",
        placement: "left",
        title: "Set Greyscale region",
        content:
          "The supplied Greyscale configuration image shows its search region, pattern region, and character boxes.",
        actionKey: "finish-greyscale-config",
        actionPhase: "exit",
        autoMs: 8000,
      },
      {
        target: "[data-tour='project-inspection-program']",
        title: "Configured rules",
        content:
          "The project contains exactly two rules: PIN1 Orientation and Greyscale Pattern Matching.",
        actionKey: "focus-rules",
        autoMs: 6500,
      },
      {
        target: "[data-tour='project-image-source-tab']",
        placement: "auto",
        title: "Inspection image registered",
        content:
          "The project has its own inspection image. Rule registration images stay separate from the project canvas.",
        actionKey: "register-image",
        autoMs: 5000,
      },
      {
        target: "[data-tour='project-analysis-canvas-status']",
        placement: "bottom",
        title: "Visual analysis canvas",
        content:
          "This is where the final inspection result is presented with rule overlays on the workpiece image.",
        autoMs: 5500,
      },
      {
        target: "[data-tour='project-run-analysis']",
        placement: "top",
        title: "Run analysis",
        content:
          "The simulation triggers the project Run action, then presents the two-rule visual result across all devices.",
        actionKey: "run-analysis",
        actionPhase: "exit",
        autoMs: 5000,
      },
      {
        target: "[data-tour='project-analysis-results']",
        placement: "top",
        title: "Results",
        content:
          "All present devices are shown as passed with two rules: PIN1 Orientation and Greyscale Pattern Matching across occupied pockets (Pockets 1 & 2 detected as empty cavities).",
        autoMs: 7500,
      },
    ],
    [],
  );

  const joyrideSteps = useMemo(() => steps.map((step) => ({ ...step, skipBeacon: true })), [steps]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (targetWaitTimerRef.current !== null) {
      window.clearTimeout(targetWaitTimerRef.current);
      targetWaitTimerRef.current = null;
    }
  }, []);

  const finishTour = useCallback(() => {
    clearTimer();
    clearAnalysisTimers();
    setSimulationMenuOpen(false);
    deleteDemoProject();
    isRunningRef.current = false;
    setIsRunning(false);
    setStepIndex(0);
    actionKeysRef.current.clear();
    isStepAdvancingRef.current = false;
  }, [clearAnalysisTimers, clearTimer, deleteDemoProject, setSimulationMenuOpen]);

  const runStepAction = useCallback(
    (step: TourStep): void => {
      if (!step.actionKey || actionKeysRef.current.has(step.actionKey)) {
        return;
      }

      actionKeysRef.current.add(step.actionKey);

      if (step.actionKey === "create-project") {
        const demo = ensureDemoProject();
        demoRef.current = demo;
        void navigate({
          to: "/projects/$projectId",
          params: { projectId: demo.projectId },
        });
        toast.success("Project demo created.");

        return;
      }

      if (step.actionKey === "go-project-list") {
        setSimulationMenuOpen(false);
        void navigate({ to: "/projects" });

        return;
      }

      if (step.actionKey === "go-project-create") {
        void navigate({ to: "/projects/new", search: { guided: "1" } as any });

        return;
      }

      if (step.actionKey === "go-ruleset-create" && demoRef.current) {
        void navigate({
          to: "/projects/$projectId/rulesets/new",
          params: { projectId: demoRef.current.projectId },
          search: { guided: "1" } as any,
        });

        return;
      }

      if (step.actionKey === "create-ruleset" && demoRef.current) {
        const demo = ensureDemoRuleset(demoRef.current.projectId);
        demoRef.current = demo;
        void navigate({
          to: "/projects/$projectId",
          params: { projectId: demo.projectId },
        });
        toast.success("Ruleset demoset created.");

        return;
      }

      if (step.actionKey === "go-add-rule" && demoRef.current?.rulesetId) {
        void navigate({
          to: "/projects/$projectId/rulesets/$rulesetId/add-rule",
          params: { projectId: demoRef.current.projectId, rulesetId: demoRef.current.rulesetId },
        });

        return;
      }

      if (step.actionKey === "select-pin1-tool") {
        document.querySelector<HTMLButtonElement>("[data-tour='rule-add-pin1-tool']")?.click();

        return;
      }

      if (step.actionKey === "add-pin1-rule" && demoRef.current?.rulesetId) {
        const demo = upsertDemoRule({
          projectId: demoRef.current.projectId,
          rulesetId: demoRef.current.rulesetId,
          ruleId: TOUR_PIN1_RULE_ID,
        });
        demoRef.current = demo;
        void navigate({
          to: "/projects/$projectId/rulesets/$rulesetId/tune/$ruleId",
          params: {
            projectId: demo.projectId,
            rulesetId: demo.rulesetId ?? "",
            ruleId: TOUR_PIN1_RULE_ID,
          },
          search: { guided: "1" } as any,
        });
        toast.success("PIN1 rule added to demoset.");

        return;
      }

      if (step.actionKey === "finish-pin1-config" && demoRef.current?.rulesetId) {
        void navigate({
          to: "/projects/$projectId/rulesets/$rulesetId/add-rule",
          params: { projectId: demoRef.current.projectId, rulesetId: demoRef.current.rulesetId },
        });
        toast.success("PIN1 configuration preview complete.");

        return;
      }

      if (step.actionKey === "select-greyscale-tool") {
        document.querySelector<HTMLButtonElement>("[data-tour='rule-add-greyscale-tool']")?.click();

        return;
      }

      if (step.actionKey === "add-greyscale-rule" && demoRef.current?.rulesetId) {
        const demo = upsertDemoRule({
          projectId: demoRef.current.projectId,
          rulesetId: demoRef.current.rulesetId,
          ruleId: TOUR_PATTERN_RULE_ID,
        });
        demoRef.current = demo;
        void navigate({
          to: "/projects/$projectId/rulesets/$rulesetId/tune/$ruleId",
          params: {
            projectId: demo.projectId,
            rulesetId: demo.rulesetId ?? "",
            ruleId: TOUR_PATTERN_RULE_ID,
          },
          search: { guided: "1" } as any,
        });
        toast.success("Greyscale rule added to demoset.");

        return;
      }

      if (step.actionKey === "finish-greyscale-config" && demoRef.current?.rulesetId) {
        const analysisDemo = prepareMultiDeviceAnalysis({
          projectId: demoRef.current.projectId,
          rulesetId: demoRef.current.rulesetId,
        });
        demoRef.current = analysisDemo;
        void navigate({
          to: "/projects/$projectId",
          params: { projectId: analysisDemo.projectId },
        });
        toast.success("Rules configured. Returning to Overview for multi-device analysis.");

        return;
      }

      if (step.actionKey === "focus-tree" || step.actionKey === "focus-rules") {
        if (step.actionKey === "focus-tree") {
          document.querySelector<HTMLButtonElement>("[data-tour='project-program-tab']")?.click();
        }

        const rulesetId = demoRef.current?.rulesetId;
        const ruleset = rulesetId ? useProjectStore.getState().rulesets[rulesetId] : null;
        const rules = ruleset?.rules ?? [];
        useRulesStore.getState().replaceAll(rules, rules.length > 0 ? [rules[0].id] : [], []);

        return;
      }

      if (step.actionKey === "register-image" && demoRef.current) {
        document
          .querySelector<HTMLButtonElement>("[data-tour='project-image-source-tab']")
          ?.click();
        useProjectStore
          .getState()
          .updateProjectInspectionImageRef(demoRef.current.projectId, analysisImage);

        return;
      }

      if (step.actionKey === "run-analysis" && demoRef.current) {
        const demo = demoRef.current;
        const { rulesetId } = demo;

        if (!rulesetId) {
          toast.error("Simulation ruleset is not ready.");

          return;
        }

        setAnalysisLoading(true);

        const passTimer = window.setTimeout(() => {
          setAnalysisLoading(false);
          useValidationStore
            .getState()
            .setResults(rulesetId, makePassResults(), "Guided simulation final inspection");
          useRulesStore.getState().setSelection([TOUR_PATTERN_RULE_ID], "guided-simulation");
          toast.success("Guided simulation analysis complete: 3 present devices passed (100% yield).");
        }, 2800);

        analysisTimersRef.current = [passTimer];
      }
    },
    [navigate, setAnalysisLoading, setSimulationMenuOpen],
  );

  const advance = useCallback(() => {
    if (isStepAdvancingRef.current) {
      return;
    }

    isStepAdvancingRef.current = true;
    clearTimer();
    const step = steps[stepIndex];

    if (step.actionPhase === "exit") {
      runStepAction(step);
    }

    if (stepIndex >= steps.length - 1) {
      finishTour();

      return;
    }

    const delayMs = step.actionPhase === "exit" ? 700 : 0;

    window.setTimeout(() => {
      setStepIndex(stepIndex + 1);
    }, delayMs);
  }, [clearTimer, finishTour, runStepAction, stepIndex, steps]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const step = steps[stepIndex];
    let isCancelled = false;
    isStepAdvancingRef.current = false;
    clearTimer();

    const beginStep = () => {
      if (isCancelled) {
        return;
      }

      if (!hasTourTarget(step)) {
        targetWaitTimerRef.current = window.setTimeout(beginStep, 150);

        return;
      }

      if (step.actionPhase !== "exit") {
        runStepAction(step);
      }

      scrollTourTargetIntoView(step);

      timerRef.current = window.setTimeout(
        () => {
          advance();
        },
        Math.max(step.autoMs ?? TOUR_MIN_STEP_MS, TOUR_MIN_STEP_MS),
      );
    };

    beginStep();

    return () => {
      isCancelled = true;
      clearTimer();
    };
  }, [advance, clearTimer, isRunning, runStepAction, stepIndex, steps]);

  const handleStart = useCallback(() => {
    if (isRunningRef.current) {
      return;
    }

    isRunningRef.current = true;
    clearTimer();
    clearAnalysisTimers();
    demoRef.current = null;
    actionKeysRef.current.clear();
    isStepAdvancingRef.current = false;
    setStepIndex(0);

    const startFromHome = async () => {
      try {
        await navigate({ to: "/" });
        setIsRunning(true);

        window.setTimeout(() => {
          setSimulationMenuOpen(true);
        }, 200);
      } catch (error) {
        isRunningRef.current = false;
        setSimulationMenuOpen(false);
        console.error("[guided-simulation] failed to start from Home", error);
        toast.error("Simulation could not open the Home page.");
      }
    };

    void startFromHome();
  }, [clearAnalysisTimers, clearTimer, navigate, setSimulationMenuOpen]);

  useEffect(() => {
    document.documentElement.dataset.guidedSimulationRunning = isRunning ? "true" : "false";
    const detail: GuidedSimulationStateDetail = { isRunning };
    window.dispatchEvent(new CustomEvent(GUIDED_SIMULATION_STATE_EVENT, { detail }));
  }, [isRunning]);

  useEffect(() => {
    const onCommand = (event: Event) => {
      const command = (event as CustomEvent<GuidedSimulationCommandDetail>).detail?.command;

      if (command === "stop") {
        finishTour();

        return;
      }

      if (command !== "start" || isRunningRef.current) {
        return;
      }

      handleStart();
    };

    window.addEventListener(GUIDED_SIMULATION_COMMAND_EVENT, onCommand);

    return () => {
      window.removeEventListener(GUIDED_SIMULATION_COMMAND_EVENT, onCommand);
    };
  }, [finishTour, handleStart, isRunning]);

  const handleJoyride = useCallback(
    (data: EventData) => {
      const isFinished =
        data.type === EVENTS.TOUR_END ||
        data.status === STATUS.FINISHED ||
        data.status === STATUS.SKIPPED;

      if (isFinished) {
        finishTour();

        return;
      }

      const isStepAdvance = data.type === EVENTS.STEP_AFTER;

      if (isStepAdvance && data.index === stepIndex) {
        advance();
      }
    },
    [advance, finishTour, stepIndex],
  );

  return (
    <>
      <Joyride
        run={isRunning}
        stepIndex={stepIndex}
        steps={joyrideSteps as Step[]}
        onEvent={handleJoyride}
        continuous
        scrollToFirstStep
        options={{
          showProgress: true,
          buttons: ["skip", "primary"],
          closeButtonAction: "skip",
          targetWaitTimeout: 10000,
          spotlightPadding: 8,
          spotlightRadius: 8,
          zIndex: 10000,
          primaryColor: "#00ff9d",
          backgroundColor: "#111820",
          textColor: "#e5f6ff",
          arrowColor: "#111820",
        }}
        styles={{
          tooltip: {
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 8,
            boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
            fontFamily: "Poppins, sans-serif",
          },
          tooltipTitle: {
            fontFamily: "Ubuntu, sans-serif",
            letterSpacing: 0,
          },
          buttonPrimary: {
            color: "#06110c",
            fontWeight: 800,
          },
        }}
      />
      {isRunning ? (
        <button
          type="button"
          onClick={finishTour}
          className="fixed right-4 top-14 z-[10020] inline-flex items-center gap-2 rounded-lg border border-rose-400/50 bg-rose-950/95 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-rose-100 shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_18px_rgba(244,63,94,0.18)] backdrop-blur transition hover:border-rose-300 hover:bg-rose-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-300"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
          Stop
        </button>
      ) : null}
    </>
  );
}
