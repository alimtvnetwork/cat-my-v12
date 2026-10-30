import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bug,
  Camera,
  CircleDot,
  Crosshair,
  FileImage,
  FolderTree,
  Layers,
  Grid2X2,
  PaintBucket,
  Play,
  Plus,
  QrCode,
  Ruler,
  ScanSearch,
  Type,
  Upload,
  Wand2,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { VisualToolWorkpieceCanvas } from "./index";
import type { WorkpieceRoi } from "./VisualToolWorkpieceCanvas";
import { AnalyzeImageToolbar } from "./AnalyzeImageToolbar";
import { RuleRightToolbarPanel } from "./RuleRightToolbarPanel";
import { VisualToolTuningModal } from "./VisualToolTuningModal";
import { AddRulePanel } from "./AddRulePanel";
import { AddRulesetPanel } from "./AddRulesetPanel";
import { addRulePanelBus } from "@/lib/editor/selection/add-rule-panel-bus";
import { addRulesetPanelBus } from "@/lib/editor/selection/add-ruleset-panel-bus";
import { sessionAnalysisBus } from "@/lib/editor/selection/session-analysis-bus";
import { useWorkspaceSaveStore } from "./workspace-save-store";
import { MAX_RECENT_IMAGE_SOURCES, useImageSourceRecentsStore } from "./image-source-recents-store";
import { InspectionHierarchyTree } from "./InspectionHierarchyTree";
import { useCameraStream } from "@/components/vision/white-box/useCameraStream";
import { visualTunerBus } from "@/lib/editor/selection/visual-tuner-bus";
import { saveRuleSet } from "@/lib/rules/saveRuleSet";
import type { Project, RuleSet } from "@/lib/projects/types";
import { getFreshRuleset, updateRulesetRulesInStore } from "@/hooks/useWorkpieceProject";
import {
  type EditorRule,
  type RuleCameraSettings,
  type RuleLightSettings,
  DEFAULT_RULE_CAMERA_SETTINGS,
  DEFAULT_RULE_LIGHT_SETTINGS,
} from "@/lib/editor/types";
import {
  useValidationStore,
  ValidationStatusType,
  type ValidationResult,
} from "@/lib/editor/validation-store";
import {
  loadWorkpieceImageData,
  evaluateWorkpieceRuleReal,
  evaluateCodeReaderRuleAsync,
  evaluateTapeStripRules,
  type TapeStripEvaluationResult,
} from "@/lib/vision/workpiece-rule-analyzer";
import {
  evaluateRuleGatingDecision,
  createSkippedValidationResult,
} from "@/lib/execution/dag-execution-planner";
import { LEGACY_DEFAULT_UM_PER_PX } from "@/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/carrier-tape-evaluator";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { useProjectStore } from "@/lib/projects/store";
import { markSaved } from "@/lib/editor/store/save-status";
import { projectRulesetToEnvelope, envelopeToProjectRuleset } from "@/lib/rules/envelopeAdapter";
import type { RuleSetEnvelope } from "@/lib/rules/draftStore";
import {
  GUIDED_SIMULATION_ANALYSIS_EVENT,
  type GuidedSimulationAnalysisDetail,
} from "@/components/guided-simulation/events";
import {
  SAMPLE_IMAGE_POCKET_1_FILLED,
  SAMPLE_IMAGE_POCKET_2_EMPTY_MIXED,
  SAMPLE_IMAGE_POCKET_5_PARTIAL,
} from "@/lib/vision/sample-images";

const EMPTY_VALIDATION_RESULTS: Record<string, ValidationResult> = {};

function getRuleToolCode(rule: EditorRule): string {
  return typeof rule.params?.toolCode === "string" ? rule.params.toolCode : "";
}

function getToolIcon(code: string, name: string): LucideIcon {
  const normalized = `${code} ${name}`.toLowerCase();

  if (normalized.includes("pin 1") || normalized.includes("pin1")) return CircleDot;
  if (normalized.includes("pattern") || code === "T102") return ScanSearch;
  if (normalized.includes("area") || normalized.includes("intensity")) return Grid2X2;
  if (normalized.includes("edge") || normalized.includes("lead")) return Activity;
  if (normalized.includes("blob") || normalized.includes("bridge")) return Bug;
  if (normalized.includes("void") || normalized.includes("circle") || code === "T111")
    return Crosshair;
  if (normalized.includes("caliper") || normalized.includes("gauge") || code === "T110")
    return Ruler;
  if (normalized.includes("qr") || normalized.includes("datamatrix") || code === "T103")
    return QrCode;
  if (normalized.includes("ocr") || normalized.includes("marking") || code === "T106") return Type;
  if (normalized.includes("coating") || normalized.includes("color") || code === "T112")
    return PaintBucket;

  return ScanSearch;
}

interface RunAnalysisParams {
  hasStepDelay: boolean;
  hasStepToasts: boolean;
  hasSelectionFocus: boolean;
}

const MANUAL_RUN_ANALYSIS_PARAMS: RunAnalysisParams = {
  hasStepDelay: true,
  hasStepToasts: false,
  hasSelectionFocus: true,
};

export interface WorkpieceAnalyzeWorkspaceProps {
  project: Project;
  /** Null when the project has no rulesets yet - the workspace renders its empty state. */
  ruleset: RuleSet | null;
  rulesets?: RuleSet[];
  onSelectRuleset?: (rulesetId: string) => void;
  searchRule?: string;
  onNavigateBack?: () => void;
}

export function WorkpieceAnalyzeWorkspace({
  project,
  ruleset,
  rulesets,
  onSelectRuleset,
  searchRule,
}: WorkpieceAnalyzeWorkspaceProps): React.JSX.Element {
  const projectId = project.id;
  const rulesetId = ruleset?.id ?? null;
  const updateRulesetRules = updateRulesetRulesInStore;
  const deleteRuleset = useProjectStore((s) => s.deleteRuleset);
  /** Target ruleset for the inline Add Rule panel (right viewport). Null = closed. */
  const [addRuleRulesetId, setAddRuleRulesetId] = useState<string | null>(null);

  const [savedVersion, setSavedVersion] = useState<number>(0);
  const savedVersionRef = useRef<number>(0);
  const setSaving = useWorkspaceSaveStore((s) => s.setSaving);
  const registerSave = useWorkspaceSaveStore((s) => s.registerSave);
  const isAnalyzingRef = useRef<boolean>(false);
  const [isAddingRuleset, setIsAddingRuleset] = useState(false);
  const [draftRulesetName, setDraftRulesetName] = useState("");
  const [tapeStripResult, setTapeStripResult] = useState<TapeStripEvaluationResult | null>(null);
  /**
   * True only after Analyze has been clicked in this session. Analysis results
   * must never be restored from the persisted validation store — the results
   * area shows only what the current session's run produced.
   */
  const [hasSessionAnalysis, setHasSessionAnalysis] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"tree" | "source">("tree");
  /** Rule id whose tool configuration is open inline (right viewport), if any. */
  const [configRuleId, setConfigRuleId] = useState<string | null>(null);
  const [evaluatingRuleId, setEvaluatingRuleId] = useState<string | null>(null);
  /** Left program sidebar collapsed into a slim rail so the canvas gets the space. */
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  /** Last-used image sources (uploads + camera captures), capped at 5. */
  const recents = useImageSourceRecentsStore((s) => s.recents);
  const pushRecent = useImageSourceRecentsStore((s) => s.pushRecent);
  const removeRecent = useImageSourceRecentsStore((s) => s.removeRecent);
  /** Microns-per-pixel driving pin pitch + device measurements. */
  const calibrationUmPerPx = LEGACY_DEFAULT_UM_PER_PX;
  const imageInputRef = useRef<HTMLInputElement>(null);
  const updateProjectInspectionImageRef = useProjectStore((s) => s.updateProjectInspectionImageRef);

  const updateSavedVersion = useCallback((v: number) => {
    savedVersionRef.current = v;
    setSavedVersion(v);
  }, []);

  const getEnvelope = useCallback((): RuleSetEnvelope => {
    if (!rulesetId) {
      throw new Error("[WorkpieceAnalyzeWorkspace] no ruleset to save");
    }

    const fresh = getFreshRuleset(rulesetId);

    if (!fresh) {
      throw new Error(`[WorkpieceAnalyzeWorkspace] ruleset gone at save: ${rulesetId}`);
    }

    const { envelope, droppedCategories } = projectRulesetToEnvelope(fresh, {
      version: savedVersionRef.current,
    });

    if (droppedCategories > 0) {
      console.info("[WorkpieceAnalyzeWorkspace] envelope stripped categories", {
        RuleSetId: envelope.RuleSetId,
        DroppedCategories: droppedCategories,
      });
    }

    return envelope;
  }, [rulesetId]);

  const onSaved = useCallback(
    (committed: RuleSetEnvelope) => {
      updateSavedVersion(committed.Version);
      markSaved();
      toast.success("Rule set and optical settings saved to server!");
      console.info("[WorkpieceAnalyzeWorkspace] saved", {
        RuleSetId: committed.RuleSetId,
        Version: committed.Version,
      });
    },
    [updateSavedVersion],
  );

  const onServerReloaded = useCallback(
    (env: RuleSetEnvelope) => {
      if (!ruleset) return;

      const back = envelopeToProjectRuleset(env, {
        projectId: project.id,
        categoryName: ruleset.categoryName,
        rulesetId: ruleset.id,
      });
      updateRulesetRules(ruleset.id, back.rules);
      useRulesStore
        .getState()
        .replaceAll(back.rules, back.rules.length > 0 ? [back.rules[0].id] : [], []);
      updateSavedVersion(env.Version);
      toast.info("Rule set reloaded from server.");
    },
    [project.id, ruleset, updateRulesetRules, updateSavedVersion],
  );

  const handleSaveRuleSet = useCallback(async () => {
    setSaving(true);
    try {
      const envelope = getEnvelope();
      await saveRuleSet(envelope);
      onSaved(envelope);
    } catch (err) {
      console.error("[WorkpieceAnalyzeWorkspace] save error", err);
      toast.error(err instanceof Error ? err.message : "Failed to save rule set.");
    } finally {
      setSaving(false);
    }
  }, [getEnvelope, onSaved, setSaving]);

  // The Save button lives on the upper bar; register this workspace's save
  // handler so the button can trigger it from outside this component.
  // With no ruleset there is nothing to save - the button stays inert.
  useEffect(() => {
    registerSave(ruleset ? handleSaveRuleSet : null);

    return () => registerSave(null);
  }, [handleSaveRuleSet, registerSave, ruleset]);

  const liveStoreRules = useRulesStore((s) => s.rules);
  const rules = useMemo(() => {
    if (liveStoreRules.length > 0) {
      return liveStoreRules;
    }
    return ruleset?.rules ?? [];
  }, [ruleset?.rules, liveStoreRules]);
  const projectRulesetsForAnalysis = useMemo(() => {
    const source = rulesets && rulesets.length > 0 ? rulesets : ruleset ? [ruleset] : [];

    return source.map((rs) => (rs.id === rulesetId ? { ...rs, rules } : rs));
  }, [rules, ruleset, rulesetId, rulesets]);
  const projectAnalysisItems = useMemo(
    () =>
      projectRulesetsForAnalysis.flatMap((rs) =>
        (rs.rules ?? []).map((rule) => ({
          ruleset: rs,
          rule,
        })),
      ),
    [projectRulesetsForAnalysis],
  );
  const projectOverlayRules = useMemo(
    () => projectAnalysisItems.map((item) => item.rule),
    [projectAnalysisItems],
  );
  const ruleOwnerById = useMemo(() => {
    const map = new Map<string, RuleSet>();

    for (const item of projectAnalysisItems) {
      map.set(item.rule.id, item.ruleset);
    }

    return map;
  }, [projectAnalysisItems]);

  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (searchRule && rules.some((r) => r.id === searchRule)) {
      return [searchRule];
    }
    return rules[0]?.id ? [rules[0].id] : [];
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGuidedAnalyzing, setIsGuidedAnalyzing] = useState(false);
  const isAnalysisBusy = isAnalyzing || isGuidedAnalyzing;

  useEffect(() => {
    const onGuidedAnalysis = (event: Event) => {
      const detail = (event as CustomEvent<GuidedSimulationAnalysisDetail>).detail;
      setIsGuidedAnalyzing(Boolean(detail?.isLoading));
    };

    window.addEventListener(GUIDED_SIMULATION_ANALYSIS_EVENT, onGuidedAnalysis);

    return () => {
      window.removeEventListener(GUIDED_SIMULATION_ANALYSIS_EVENT, onGuidedAnalysis);
    };
  }, []);

  const [designOpen, setDesignOpen] = useState(false);
  const [validateOpen, setValidateOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isLiveCameraMode, setIsLiveCameraMode] = useState(false);
  const [isCapturingFrame, setIsCapturingFrame] = useState(false);
  const {
    videoRef: liveCameraVideoRef,
    isReady: isLiveCameraReady,
    errorText: liveCameraErrorText,
  } = useCameraStream(isLiveCameraMode);

  const shapeInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const rulesetRules = ruleset?.rules ?? [];
    const isCurrentSelectedInRuleset = rulesetRules.some((r) => selectedIds.includes(r.id));
    const targetSelected = isCurrentSelectedInRuleset
      ? selectedIds
      : rulesetRules.length > 0
        ? [rulesetRules[0].id]
        : [];

    useRulesStore.getState().replaceAll(rulesetRules, targetSelected, []);

    if (!isCurrentSelectedInRuleset) {
      setSelectedIds(targetSelected);
    }

    setConfigRuleId(null);
    setAddRuleRulesetId(null);
    setIsAddingRuleset(false);
  }, [ruleset?.id]);

  useEffect(() => {
    if (searchRule && rules.some((r) => r.id === searchRule)) {
      setSelectedIds([searchRule]);
      useRulesStore.getState().setSelection([searchRule], "searchRule");
    }
  }, [searchRule, rules]);

  const commit = useCallback(
    (nextRules: EditorRule[], reason: string, nextSelectedIds?: string[]) => {
      if (!ruleset) return;

      updateRulesetRules(ruleset.id, nextRules);
      const activeSel =
        nextSelectedIds ??
        (selectedIds.length > 0 ? selectedIds : useRulesStore.getState().selectedIds);
      useRulesStore.getState().replaceAll(nextRules, activeSel, []);
    },
    [ruleset, updateRulesetRules, selectedIds],
  );

  const handleCloseAddRule = useCallback(() => {
    setAddRuleRulesetId(null);
  }, []);

  const handleOpenAddRule = useCallback(
    (targetRulesetId?: string) => {
      const target = targetRulesetId ?? ruleset?.id ?? null;

      if (!target) return;

      setConfigRuleId(null);
      setIsAddingRuleset(false);
      setAddRuleRulesetId(target);
    },
    [ruleset],
  );

  const handleStartAddRuleset = useCallback(
    (initialName?: string) => {
      setDraftRulesetName(initialName ?? `Ruleset ${(rulesets?.length ?? 0) + 1}`);
      setConfigRuleId(null);
      setAddRuleRulesetId(null);
      setIsAddingRuleset(true);
    },
    [rulesets?.length],
  );

  const handleInlineRulesetCreated = useCallback(
    (newRulesetId: string, name: string) => {
      setIsAddingRuleset(false);
      setDraftRulesetName("");
      onSelectRuleset?.(newRulesetId);
      toast.success(`Rule set "${name}" added.`);
    },
    [onSelectRuleset],
  );

  const handleExitAddRuleset = useCallback(() => {
    setIsAddingRuleset(false);
    setDraftRulesetName("");
  }, []);

  const handleDeleteRuleset = useCallback(
    (targetRulesetId?: string) => {
      const targetId = targetRulesetId ?? ruleset?.id;

      if (!targetId) return;

      const targetRuleset = (rulesets ?? []).find((rs) => rs.id === targetId) ?? ruleset;

      if (!targetRuleset) return;

      const isConfirmed = window.confirm(
        `Delete rule set "${targetRuleset.name}"? This removes its rules from this project.`,
      );

      if (!isConfirmed) {
        return;
      }

      const nextRuleset = (rulesets ?? []).find((rs) => rs.id !== targetRuleset.id) ?? null;
      deleteRuleset(targetRuleset.id);

      if (nextRuleset) {
        onSelectRuleset?.(nextRuleset.id);
      }

      toast.success(`Rule set "${targetRuleset.name}" deleted.`);
    },
    [deleteRuleset, onSelectRuleset, ruleset, rulesets],
  );

  const activeRule = useMemo(() => {
    const primaryId = selectedIds[0];
    if (!primaryId) return rules[0] ?? projectOverlayRules[0] ?? null;
    return (
      rules.find((r) => r.id === primaryId) ??
      projectOverlayRules.find((r) => r.id === primaryId) ??
      rules[0] ??
      projectOverlayRules[0] ??
      null
    );
  }, [projectOverlayRules, rules, selectedIds]);

  const handleOpenRuleConfig = useCallback(
    (ruleId: string) => {
      const ownerRuleset = ruleOwnerById.get(ruleId) ?? ruleset;

      if (!ownerRuleset) return;

      if (!ownerRuleset) return;

      if (ownerRuleset.id !== ruleset?.id) {
        onSelectRuleset?.(ownerRuleset.id);
      }

      setSelectedIds([ruleId]);
      useRulesStore.getState().setSelection([ruleId], "tree.configure");
      setConfigRuleId(ruleId);
      setAddRuleRulesetId(null);
      setIsAddingRuleset(false);
    },
    [onSelectRuleset, ruleOwnerById, ruleset],
  );

  const handleInlineRuleCreated = useCallback(
    (_ownerRulesetId: string, ruleId: string) => {
      // The panel already committed the rule to the project + editor stores.
      // Close it and open the new rule's configuration inline, mirroring
      // the old add-rule -> tune navigation.
      setAddRuleRulesetId(null);
      handleOpenRuleConfig(ruleId);
    },
    [handleOpenRuleConfig],
  );

  const handleCloseRuleConfig = useCallback(() => {
    setConfigRuleId(null);
  }, []);

  const configRule = useMemo(() => {
    if (!configRuleId) return null;

    return (
      rules.find((r) => r.id === configRuleId) ??
      projectOverlayRules.find((r) => r.id === configRuleId) ??
      null
    );
  }, [configRuleId, rules, projectOverlayRules]);

  // Tool tune requests (e.g. from a tool's own config screen) open the tool
  // configuration inline in this screen instead of navigating away.
  useEffect(() => {
    return visualTunerBus.subscribe((ruleId) => {
      handleOpenRuleConfig(ruleId);
    });
  }, [handleOpenRuleConfig]);

  // The guided simulation drives the inline Add Rule panel through this bus
  // so the tour never leaves the overview workspace.
  useEffect(() => {
    return addRulePanelBus.subscribe((message) => {
      if (message.type === "open") {
        handleOpenAddRule(message.rulesetId);
      } else {
        setConfigRuleId(null);
        setAddRuleRulesetId(null);
      }
    });
  }, [handleOpenAddRule]);

  // The guided simulation drives the inline Add Ruleset panel through this
  // bus so ruleset creation also stays inside the overview workspace.
  useEffect(() => {
    return addRulesetPanelBus.subscribe((message) => {
      if (message.type === "open") {
        handleStartAddRuleset(message.initialName);
      } else {
        setIsAddingRuleset(false);
      }
    });
  }, [handleStartAddRuleset]);

  // The guided simulation's scripted analysis run produces results without
  // going through the Analyze button; this lifts the stale-result gate so
  // the canvas shows them like a real session run.
  useEffect(() => {
    return sessionAnalysisBus.subscribe((tapeStripResult) => {
      setHasSessionAnalysis(true);

      if (tapeStripResult) {
        setTapeStripResult(tapeStripResult);
      }
    });
  }, []);

  const handleSelectProjectRule = useCallback(
    (id: string) => {
      const ownerRuleset = ruleOwnerById.get(id);

      if (ownerRuleset && ownerRuleset.id !== ruleset?.id) {
        onSelectRuleset?.(ownerRuleset.id);
      }

      setSelectedIds([id]);
      useRulesStore.getState().setSelection([id], "project.rule.select");
    },
    [onSelectRuleset, ruleOwnerById, ruleset?.id],
  );

  const handleLaunchPatternTuner = useCallback(() => {
    if (activeRule) {
      handleOpenRuleConfig(activeRule.id);
    }
  }, [activeRule, handleOpenRuleConfig]);

  const handlePatternBoxesChange = useCallback(
    (boxes: any[], constellation: any[]) => {
      if (!activeRule) return;
      const constellationPayload =
        Array.isArray(constellation) && constellation.length > 0
          ? constellation
          : boxes.map((b) => ({
              id: b.id ?? b.boxIndex,
              x: b.x,
              y: b.y,
              width: b.w ?? b.width,
              height: b.h ?? b.height,
            }));
      const nextRules = rules.map((r) =>
        r.id === activeRule.id
          ? {
              ...r,
              params: {
                ...(r.params ?? {}),
                activeBoxCount: boxes.length,
                totalBoxCount: boxes.length,
                constellationJson: JSON.stringify(constellationPayload),
              },
            }
          : r,
      );
      commit(nextRules, "pattern-boxes-extracted");
    },
    [activeRule, rules, commit],
  );

  const handleUpdateRuleCameraSettings = useCallback(
    (ruleId: string, cameraSettings: RuleCameraSettings) => {
      const ownerRuleset = ruleOwnerById.get(ruleId) ?? ruleset;

      if (!ownerRuleset) return;
      const ownerRules = ownerRuleset.id === ruleset?.id ? rules : (ownerRuleset.rules ?? []);
      const nextRules = ownerRules.map((r) =>
        r.id === ruleId
          ? ({
              ...r,
              cameraSettings,
              params: {
                ...(r.params ?? {}),
                cameraSettings: cameraSettings as any,
              },
            } as EditorRule)
          : r,
      );
      updateRulesetRules(ownerRuleset.id, nextRules);

      if (ownerRuleset.id === ruleset?.id) {
        useRulesStore.getState().replaceAll(nextRules, selectedIds, []);
      }

      toast.success("Camera settings updated for rule");
    },
    [ruleOwnerById, rules, ruleset, selectedIds, updateRulesetRules],
  );

  const handleUpdateRuleLightSettings = useCallback(
    (ruleId: string, lightSettings: RuleLightSettings) => {
      const ownerRuleset = ruleOwnerById.get(ruleId) ?? ruleset;

      if (!ownerRuleset) return;
      const ownerRules = ownerRuleset.id === ruleset?.id ? rules : (ownerRuleset.rules ?? []);
      const nextRules = ownerRules.map((r) =>
        r.id === ruleId
          ? ({
              ...r,
              lightSettings,
              params: {
                ...(r.params ?? {}),
                lightSettings: lightSettings as any,
              },
            } as EditorRule)
          : r,
      );
      updateRulesetRules(ownerRuleset.id, nextRules);

      if (ownerRuleset.id === ruleset?.id) {
        useRulesStore.getState().replaceAll(nextRules, selectedIds, []);
      }

      toast.success("Light settings updated for rule");
    },
    [ruleOwnerById, rules, ruleset, selectedIds, updateRulesetRules],
  );

  const validationRuns = useValidationStore((s) => s.runs);
  const allValidationResults = useMemo(() => {
    const merged: Record<string, ValidationResult> = {};

    for (const rs of projectRulesetsForAnalysis) {
      Object.assign(merged, validationRuns[rs.id]?.results ?? EMPTY_VALIDATION_RESULTS);
    }

    return merged;
  }, [projectRulesetsForAnalysis, validationRuns]);
  const activeValidationResult = activeRule ? allValidationResults[activeRule.id] : undefined;
  // Never show cached results: the canvas only sees what this session's run produced.
  const sessionValidationResults = hasSessionAnalysis
    ? allValidationResults
    : EMPTY_VALIDATION_RESULTS;
  const sessionActiveValidation = hasSessionAnalysis ? activeValidationResult : undefined;

  // No auto analysis: the user runs it explicitly via the Analyze button.
  // Clear the result when the image, the rules, or the camera mode change,
  // so the canvas never shows stale markings.
  useEffect(() => {
    setTapeStripResult(null);
    setHasSessionAnalysis(false);
  }, [isLiveCameraMode, project.inspectionImageRef, projectAnalysisItems]);

  const captureLiveCameraFrame = useCallback(async (): Promise<string | null> => {
    const video = liveCameraVideoRef.current;

    if (!isLiveCameraMode) {
      return project.inspectionImageRef ?? null;
    }

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("Live camera is not ready yet.");

      return null;
    }

    setIsCapturingFrame(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 960;
      canvas.height = 540;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        toast.error("Unable to capture camera frame.");

        return null;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      updateProjectInspectionImageRef(project.id, dataUrl);
      pushRecent({ dataUrl, label: "Camera frame", kind: "camera" });
      setIsLiveCameraMode(false);

      for (const item of projectRulesetsForAnalysis) {
        useValidationStore.getState().clear(item.id);
      }

      toast.success("Live camera frame captured for inspection.");

      return dataUrl;
    } finally {
      setIsCapturingFrame(false);
    }
  }, [
    isLiveCameraMode,
    liveCameraVideoRef,
    project.id,
    project.inspectionImageRef,
    projectRulesetsForAnalysis,
    pushRecent,
    updateProjectInspectionImageRef,
  ]);

  const handleRunAnalysis = useCallback(
    async (params: RunAnalysisParams) => {
      if (projectAnalysisItems.length === 0 || isAnalyzingRef.current) {
        if (projectAnalysisItems.length === 0) {
          toast.warning("No rules in project to analyze. Please add rules first.");
        }

        return;
      }

      isAnalyzingRef.current = true;
      setIsAnalyzing(true);
      setHasSessionAnalysis(true);

      if (params.hasStepToasts) {
        toast.info(
          `Starting sequential optical inspection across ${projectAnalysisItems.length} ${projectAnalysisItems.length === 1 ? "rule" : "rules"} in all rule sets...`,
        );
      }

      try {
        const activeImageSrc = isLiveCameraMode
          ? await captureLiveCameraFrame()
          : project.inspectionImageRef;
        const imgData = activeImageSrc ? await loadWorkpieceImageData(activeImageSrc) : null;
        let stripRes: TapeStripEvaluationResult | null = null;

        if (imgData) {
          stripRes = await evaluateTapeStripRules(
            projectAnalysisItems.map((item) => item.rule),
            imgData,
            undefined,
            calibrationUmPerPx,
          );
          setTapeStripResult(stripRes);

          if (stripRes.emptyPockets > 0) {
            toast.info(
              `Tape strip: ${stripRes.emptyPockets} empty ${stripRes.emptyPockets === 1 ? "cavity" : "cavities"} detected. Inspecting present devices...`,
            );
          }
        } else {
          setTapeStripResult(null);
        }

        let passCount = 0;
        let failCount = 0;
        const batchedResults: Record<
          string,
          { rulesetName: string; results: Record<string, ValidationResult> }
        > = {};

        for (let i = 0; i < projectAnalysisItems.length; i++) {
          const item = projectAnalysisItems[i];
          const r = item.rule;
          const ownerRuleset = item.ruleset;

          if (params.hasSelectionFocus) {
            setSelectedIds([r.id]);
            useRulesStore.getState().setSelection([r.id], "sequential-analysis");
          }

          const cam =
            r.cameraSettings ?? (r.params as any)?.cameraSettings ?? DEFAULT_RULE_CAMERA_SETTINGS;
          const light =
            r.lightSettings ?? (r.params as any)?.lightSettings ?? DEFAULT_RULE_LIGHT_SETTINGS;
          const exposureMs = ((cam.exposureUs ?? 20000) / 1000).toFixed(1);
          const gainDb = (cam.gainDb ?? 0).toFixed(1);
          const lightIntensity = light.intensity ?? 80;
          const lightChannel = light.channel ?? 1;
          const opticalContext = `Camera: ${exposureMs}ms, ${gainDb}dB | Light: CH${lightChannel} @ ${lightIntensity}%`;

          if (params.hasStepToasts) {
            toast.info(
              `[Step ${i + 1}/${projectAnalysisItems.length}] ${ownerRuleset.name}: "${r.name}" (${opticalContext})...`,
            );
          }

          if (params.hasStepDelay) {
            // Manual runs keep a short acquisition pause so the sequential visual focus is readable.
            const delayMs =
              typeof process !== "undefined" && process.env.NODE_ENV === "test" ? 10 : 350;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }

          let ruleResult: ValidationResult;

          if (imgData) {
            if (stripRes && stripRes.totalPockets > 1) {
              const occupiedPockets = stripRes.pockets.filter((p) => !p.isEmpty);
              const pocketResults = occupiedPockets.map((p) => p.ruleResults[r.id]).filter(Boolean);
              const hasAnyFailed = pocketResults.some(
                (res) => res.status === ValidationStatusType.Fail,
              );
              const isAllPass = pocketResults.length > 0 && !hasAnyFailed;
              const avgScore =
                pocketResults.length > 0
                  ? pocketResults.reduce((acc, curr) => acc + (curr.score ?? 0), 0) /
                    pocketResults.length
                  : 1.0;

              const multiDevicePassRegions = occupiedPockets.map((p) => ({
                label: `Pocket #${p.pocketIndex}`,
                region: p.region,
              }));

              const multiDevicePin1 = occupiedPockets
                .map((p) => {
                  const pRes = p.ruleResults[r.id];
                  const hX = pRes?.debug?.detectedHoleX ?? pRes?.debug?.nominalX ?? (p as any).pinX;
                  const hY = pRes?.debug?.detectedHoleY ?? pRes?.debug?.nominalY ?? (p as any).pinY;

                  if (typeof hX === "number" && typeof hY === "number") {
                    return {
                      x: hX,
                      y: hY,
                      centerX: hX,
                      centerY: hY,
                      label: `Pocket #${p.pocketIndex}`,
                      packageRegion: p.region,
                    };
                  }

                  return null;
                })
                .filter(Boolean);

              const allBoxResults = pocketResults.flatMap(
                (pRes) => (pRes?.debug?.boxResults ?? []) as any[],
              );
              const firstDebug = pocketResults[0]?.debug ?? {};
              const totalMatchedCount =
                allBoxResults.length > 0
                  ? allBoxResults.filter((b) => b.isMatched).length
                  : firstDebug.matchedCount;
              const totalBoxCount =
                allBoxResults.length > 0 ? allBoxResults.length : firstDebug.totalCount;

              ruleResult = {
                status: isAllPass ? ValidationStatusType.Pass : ValidationStatusType.Fail,
                score: Math.round(avgScore * 100) / 100,
                message: isAllPass
                  ? `Tape strip inspection: ${occupiedPockets.length}/${occupiedPockets.length} present devices passed "${r.name}".`
                  : `Tape strip inspection: device defects detected for "${r.name}".`,
                stub: false,
                debug: {
                  ...firstDebug,
                  boxResults: allBoxResults.length > 0 ? allBoxResults : firstDebug.boxResults,
                  matchedCount: totalMatchedCount,
                  totalCount: totalBoxCount,
                  multiDevicePassRegions,
                  multiDevicePin1,
                  occupiedPocketCount: occupiedPockets.length,
                  totalPocketCount: stripRes.totalPockets,
                },
              };
            } else {
              const previousResultsForWorkspace: Record<string, ValidationResult> = {};
              for (const b of Object.values(batchedResults)) {
                Object.assign(previousResultsForWorkspace, b.results);
              }
              const allRulesMap = new Map(projectAnalysisItems.map((it) => [it.rule.id, it.rule]));
              const decision = evaluateRuleGatingDecision({
                rule: r,
                previousResults: previousResultsForWorkspace,
                allRulesMap,
              });

              if (r.isHidden) {
                ruleResult = {
                  status: ValidationStatusType.Skipped,
                  score: 1.0,
                  message: "Rule is disabled",
                  stub: false,
                };
              } else if (decision.isSkipped) {
                ruleResult = createSkippedValidationResult({ rule: r, decision });
              } else if (String((r.params as any)?.toolCode ?? "").toUpperCase() === "T103") {
                // Code rules need the async ZXing path even when there
                // is no tape-strip result to reuse; the sync evaluator
                // cannot decode pixels and must not grade the taught
                // payload as a test result.
                ruleResult = await evaluateCodeReaderRuleAsync(r, imgData, "1D/2D Code Reader");
              } else {
                ruleResult = evaluateWorkpieceRuleReal(r, imgData, previousResultsForWorkspace);
              }
            }
          } else {
            ruleResult = {
              status: ValidationStatusType.Fail,
              score: 0.0,
              message: `No inspection image registered. Register or capture an image before running real rule analysis.`,
              stub: false,
            };
          }

          if (ruleResult.status === ValidationStatusType.Pass) {
            passCount += 1;
          } else if (ruleResult.status === ValidationStatusType.Fail) {
            failCount += 1;
          }

          if (params.hasSelectionFocus) {
            // Manual runs update rule-by-rule for readable live feedback.
            useValidationStore
              .getState()
              .mergeResults(ownerRuleset.id, { [r.id]: ruleResult }, ownerRuleset.name);
          } else {
            const bucket = batchedResults[ownerRuleset.id] ?? {
              rulesetName: ownerRuleset.name,
              results: {},
            };
            bucket.results[r.id] = ruleResult;
            batchedResults[ownerRuleset.id] = bucket;
          }
        }

        if (!params.hasSelectionFocus) {
          for (const [ownerRulesetId, bucket] of Object.entries(batchedResults)) {
            useValidationStore
              .getState()
              .mergeResults(ownerRulesetId, bucket.results, bucket.rulesetName);
          }
        }

        if (failCount === 0) {
          toast.success(
            `Sequential inspection complete: All ${projectAnalysisItems.length} rules PASSED (${passCount}/${projectAnalysisItems.length}). Workpiece OK.`,
          );
        } else {
          toast.error(
            `Sequential inspection complete: ${failCount}/${projectAnalysisItems.length} rules FAILED (${passCount} passed). Workpiece REJECTED.`,
          );
        }
      } catch (err) {
        console.error("[WorkpieceAnalyzeWorkspace] Analysis error:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        toast.error(`Analysis failed to complete: ${errorMessage}`);
      } finally {
        isAnalyzingRef.current = false;
        setIsAnalyzing(false);
      }
    },
    [
      captureLiveCameraFrame,
      isLiveCameraMode,
      project.inspectionImageRef,
      projectAnalysisItems,
      calibrationUmPerPx,
    ],
  );
  const handleManualRunAnalysis = useCallback(() => {
    void handleRunAnalysis(MANUAL_RUN_ANALYSIS_PARAMS);
  }, [handleRunAnalysis]);

  const railHandlers = useMemo(
    () => ({
      onUpdateRule: (updatedRule: EditorRule) => {
        const ownerRuleset = ruleOwnerById.get(updatedRule.id) ?? ruleset;

        if (!ownerRuleset) return;
        const ownerRules = ownerRuleset.id === ruleset?.id ? rules : (ownerRuleset.rules ?? []);
        const next = ownerRules.map((r) => (r.id === updatedRule.id ? updatedRule : r));
        updateRulesetRules(ownerRuleset.id, next);

        if (ownerRuleset.id === ruleset?.id) {
          useRulesStore.getState().replaceAll(next, selectedIds, []);
        }
      },
      onToggleHidden: (id: string) => {
        const ownerRuleset = ruleOwnerById.get(id) ?? ruleset;

        if (!ownerRuleset) return;
        const ownerRules = ownerRuleset.id === ruleset?.id ? rules : (ownerRuleset.rules ?? []);
        const next = ownerRules.map((r) => (r.id === id ? { ...r, isHidden: !r.isHidden } : r));
        updateRulesetRules(ownerRuleset.id, next);

        if (ownerRuleset.id === ruleset?.id) {
          useRulesStore.getState().replaceAll(next, selectedIds, []);
        }
      },
      onToggleLocked: (id: string) => {
        const ownerRuleset = ruleOwnerById.get(id) ?? ruleset;

        if (!ownerRuleset) return;
        const ownerRules = ownerRuleset.id === ruleset?.id ? rules : (ownerRuleset.rules ?? []);
        const next = ownerRules.map((r) => (r.id === id ? { ...r, isLocked: !r.isLocked } : r));
        updateRulesetRules(ownerRuleset.id, next);

        if (ownerRuleset.id === ruleset?.id) {
          useRulesStore.getState().replaceAll(next, selectedIds, []);
        }
      },
      onBringToFront: (id: string) => {
        const ownerRuleset = ruleOwnerById.get(id) ?? ruleset;

        if (!ownerRuleset) return;
        const ownerRules = ownerRuleset.id === ruleset?.id ? rules : (ownerRuleset.rules ?? []);
        const idx = ownerRules.findIndex((r) => r.id === id);

        if (idx === -1 || idx === ownerRules.length - 1) return;
        const next = [...ownerRules];
        const [moved] = next.splice(idx, 1);
        next.push(moved);
        updateRulesetRules(ownerRuleset.id, next);

        if (ownerRuleset.id === ruleset?.id) {
          useRulesStore.getState().replaceAll(next, selectedIds, []);
        }
      },
      onSendToBack: (id: string) => {
        const ownerRuleset = ruleOwnerById.get(id) ?? ruleset;

        if (!ownerRuleset) return;
        const ownerRules = ownerRuleset.id === ruleset?.id ? rules : (ownerRuleset.rules ?? []);
        const idx = ownerRules.findIndex((r) => r.id === id);

        if (idx <= 0) return;
        const next = [...ownerRules];
        const [moved] = next.splice(idx, 1);
        next.unshift(moved);
        updateRulesetRules(ownerRuleset.id, next);

        if (ownerRuleset.id === ruleset?.id) {
          useRulesStore.getState().replaceAll(next, selectedIds, []);
        }
      },
      onDelete: (id: string) => {
        const ownerRuleset = ruleOwnerById.get(id) ?? ruleset;

        if (!ownerRuleset) return;
        const ownerRules = ownerRuleset.id === ruleset?.id ? rules : (ownerRuleset.rules ?? []);
        const target = ownerRules.find((r) => r.id === id);
        const next = ownerRules.filter((r) => r.id !== id);
        updateRulesetRules(ownerRuleset.id, next);

        if (ownerRuleset.id === ruleset?.id) {
          useRulesStore.getState().replaceAll(next, [], []);
        }

        if (target) toast.success(`Rule "${target.name}" deleted.`);
      },
      onReorder: (id: string, dir: "up" | "down") => {
        const ownerRuleset = ruleOwnerById.get(id) ?? ruleset;

        if (!ownerRuleset) return;
        const ownerRules = ownerRuleset.id === ruleset?.id ? rules : (ownerRuleset.rules ?? []);
        const idx = ownerRules.findIndex((r) => r.id === id);
        if (idx === -1) return;
        const targetIdx = dir === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= ownerRules.length) return;
        const next = [...ownerRules];
        const [moved] = next.splice(idx, 1);
        next.splice(targetIdx, 0, moved);
        updateRulesetRules(ownerRuleset.id, next);

        if (ownerRuleset.id === ruleset?.id) {
          useRulesStore.getState().replaceAll(next, selectedIds, []);
        }
      },
      onMove: (id: string, toIndex: number) => {
        const ownerRuleset = ruleOwnerById.get(id) ?? ruleset;

        if (!ownerRuleset) return;
        const ownerRules = ownerRuleset.id === ruleset?.id ? rules : (ownerRuleset.rules ?? []);
        const fromIndex = ownerRules.findIndex((r) => r.id === id);
        if (fromIndex === -1) return;
        const next = [...ownerRules];
        const [moved] = next.splice(fromIndex, 1);
        const clamped = Math.max(0, Math.min(toIndex, next.length));
        next.splice(clamped, 0, moved);
        updateRulesetRules(ownerRuleset.id, next);

        if (ownerRuleset.id === ruleset?.id) {
          useRulesStore.getState().replaceAll(next, selectedIds, []);
        }
      },
    }),
    [ruleOwnerById, rules, ruleset, selectedIds, updateRulesetRules],
  );

  const handleChangeActiveRuleRoi = useCallback(
    (roi: WorkpieceRoi) => {
      if (!activeRule) return;

      const updatedRule: EditorRule = {
        ...activeRule,
        x: roi.x,
        y: roi.y,
        width: roi.width,
        height: roi.height,
      };

      railHandlers.onUpdateRule(updatedRule);
    },
    [activeRule, railHandlers],
  );

  const handleUpdateActiveRuleParams = useCallback(
    (params: Record<string, any>) => {
      if (!activeRule) {
        return;
      }

      const updatedRule: EditorRule = {
        ...activeRule,
        params,
      };

      railHandlers.onUpdateRule(updatedRule);
    },
    [activeRule, railHandlers],
  );

  const handleEvaluateSingleRule = useCallback(
    async (ruleId: string) => {
      const targetRule = projectOverlayRules.find((r) => r.id === ruleId);

      if (!targetRule) return;

      setEvaluatingRuleId(ruleId);

      try {
        const activeImageSrc = isLiveCameraMode
          ? await captureLiveCameraFrame()
          : project.inspectionImageRef;
        const imgData = activeImageSrc ? await loadWorkpieceImageData(activeImageSrc) : null;

        if (!imgData) {
          toast.error("No valid image loaded to evaluate rule.");

          return;
        }

        const result = await evaluateWorkpieceRuleReal(targetRule, imgData);
        const targetRuleset = ruleOwnerById.get(ruleId) ?? ruleset;

        if (targetRuleset) {
          useValidationStore
            .getState()
            .mergeResults(targetRuleset.id, { [ruleId]: result }, targetRuleset.name);
        }

        if (result.status === ValidationStatusType.Pass) {
          toast.success(
            `Rule "${targetRule.name}" PASSED (${Math.round((result.score ?? 1) * 100)}%)`,
          );
        } else if (result.status === ValidationStatusType.Warn) {
          toast.warning(`Rule "${targetRule.name}" WARNING: ${result.message}`);
        } else {
          toast.error(`Rule "${targetRule.name}" FAILED: ${result.message ?? "Threshold not met"}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Evaluation failed: ${msg}`);
      } finally {
        setEvaluatingRuleId(null);
      }
    },
    [
      captureLiveCameraFrame,
      isLiveCameraMode,
      project.inspectionImageRef,
      projectOverlayRules,
      ruleOwnerById,
      ruleset,
    ],
  );

  const handleUploadImageWithAlias = useCallback(
    (file: File, alias: string) => {
      const reader = new FileReader();

      reader.onload = () => {
        const dataUrl = reader.result as string;

        if (dataUrl) {
          updateProjectInspectionImageRef(project.id, dataUrl);
          pushRecent({ dataUrl, label: alias, kind: "upload" });
          setIsLiveCameraMode(false);

          for (const item of projectRulesetsForAnalysis) {
            useValidationStore.getState().clear(item.id);
          }

          toast.success(`Registered image "${alias}" successfully.`);
        }
      };

      reader.readAsDataURL(file);
    },
    [project.id, projectRulesetsForAnalysis, pushRecent, updateProjectInspectionImageRef],
  );

  const handleSelectPresetOrRecentImage = useCallback(
    (imageRef: string, label: string) => {
      updateProjectInspectionImageRef(project.id, imageRef);
      setIsLiveCameraMode(false);

      for (const item of projectRulesetsForAnalysis) {
        useValidationStore.getState().clear(item.id);
      }
    },
    [project.id, projectRulesetsForAnalysis, updateProjectInspectionImageRef],
  );

  const onImportImage = useCallback(
    (file: File) => {
      setImportError(null);
      const reader = new FileReader();

      reader.onload = () => {
        const dataUrl = reader.result as string;

        if (dataUrl) {
          updateProjectInspectionImageRef(project.id, dataUrl);
          pushRecent({ dataUrl, label: file.name, kind: "upload" });
          setIsLiveCameraMode(false);
          for (const item of projectRulesetsForAnalysis) {
            useValidationStore.getState().clear(item.id);
          }
          toast.success(`Inspection image registered: ${file.name}`);
        }
      };

      reader.onerror = () => {
        setImportError("Failed to read image file");
        toast.error("Failed to read image file");
      };

      reader.readAsDataURL(file);
    },
    [project.id, projectRulesetsForAnalysis, pushRecent, updateProjectInspectionImageRef],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#0a0d14] p-3 text-[#f8fafc]">
      <div className="flex min-h-0 w-full flex-1 flex-col gap-2.5 overflow-hidden">
        {/* 3 & 4. Main workspace (left inspection program, right camera/current image viewport) */}
        <div
          className={`grid min-h-0 flex-1 gap-2.5 overflow-hidden bg-transparent ${
            isSidebarCollapsed
              ? "grid-cols-[44px_minmax(0,1fr)]"
              : "grid-cols-[320px_minmax(0,1fr)]"
          }`}
        >
          {/* Left: inspection hierarchy tree & source container */}
          {isSidebarCollapsed ? (
            <div className="flex h-full max-h-full min-h-0 min-w-0 flex-col items-center gap-2 overflow-hidden rounded-xl border border-white/[0.08] bg-black/40 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
              <button
                type="button"
                title="Expand sidebar"
                aria-label="Expand sidebar"
                onClick={() => setIsSidebarCollapsed(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.25)] transition hover:bg-cyan-500/25 hover:text-cyan-200 active:scale-95"
              >
                <PanelLeftOpen size={16} />
              </button>
              <div className="flex flex-col items-center gap-1">
                <FolderTree size={14} className="text-amber-400" />
                <span className="font-sans text-[9px] font-medium text-white/60">
                  {projectAnalysisItems.length}
                </span>
              </div>
            </div>
          ) : (
            <div
              data-tour="project-inspection-program"
              className="flex h-full max-h-full min-h-0 min-w-0 flex-col gap-1.5 overflow-hidden rounded-xl border border-white/[0.08] bg-black/40 p-2 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl"
            >
              {/* Tab switchers: Program vs Image Source */}
              <div className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-black/60 p-0.5">
                <div className="grid w-full grid-cols-2 gap-1 font-sans text-[11px] font-bold uppercase tracking-wider">
                  <button
                    type="button"
                    data-tour="project-program-tab"
                    onClick={() => setActiveSidebarTab("tree")}
                    className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1 transition ${
                      activeSidebarTab === "tree"
                        ? "bg-[oklch(0.76_0.145_210)] text-[#0a0d14] shadow-sm font-bold"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <FolderTree size={12} />
                    <span>Program ({projectAnalysisItems.length})</span>
                  </button>
                  <button
                    type="button"
                    data-tour="project-image-source-tab"
                    onClick={() => setActiveSidebarTab("source")}
                    className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1 transition ${
                      activeSidebarTab === "source"
                        ? "bg-[oklch(0.76_0.145_210)] text-[#0a0d14] shadow-sm font-bold"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Camera size={12} />
                    <span>Image & Source</span>
                  </button>
                </div>
                <button
                  type="button"
                  title="Minimize sidebar"
                  aria-label="Minimize sidebar"
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="flex shrink-0 items-center justify-center rounded-md p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95"
                >
                  <PanelLeftClose size={14} />
                </button>
              </div>

              {activeSidebarTab === "tree" ? (
                <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
                  <InspectionHierarchyTree
                    project={project}
                    ruleset={ruleset}
                    rulesets={projectRulesetsForAnalysis}
                    onSelectRuleset={onSelectRuleset}
                    rules={projectOverlayRules}
                    selectedRuleId={activeRule?.id ?? null}
                    onSelectRule={handleSelectProjectRule}
                    onToggleHidden={railHandlers.onToggleHidden}
                    onToggleLocked={railHandlers.onToggleLocked}
                    onBringToFront={railHandlers.onBringToFront}
                    onSendToBack={railHandlers.onSendToBack}
                    onDeleteRule={railHandlers.onDelete}
                    onReorderRule={railHandlers.onReorder}
                    onMoveRule={railHandlers.onMove}
                    onAddRuleClick={handleOpenAddRule}
                    onAddRulesetClick={() => handleStartAddRuleset()}
                    onDeleteRulesetClick={handleDeleteRuleset}
                    onConfigureRule={handleOpenRuleConfig}
                    onUpdateCameraSettings={handleUpdateRuleCameraSettings}
                    onUpdateLightSettings={handleUpdateRuleLightSettings}
                  />
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <section
                    data-tour="project-image-samples"
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/30 p-3 shadow-inner"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xs font-sans font-bold uppercase tracking-wider text-white/90">
                          Image & Camera Source
                        </h2>
                        <p className="text-[10px] font-sans text-white/50">
                          {isLiveCameraMode
                            ? "Live camera selected"
                            : project.inspectionImageRef
                              ? "1 registered inspection image (960×540)"
                              : "No inspection image registered"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 font-sans text-[11px] font-bold uppercase tracking-wider text-white shadow-sm transition hover:border-white/30 hover:bg-white/10 active:scale-95"
                      >
                        <Upload size={12} />
                        {project.inspectionImageRef ? "Change" : "Upload"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-black/50 p-1">
                      <button
                        type="button"
                        onClick={() => setIsLiveCameraMode(false)}
                        className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-sans text-[10px] font-bold uppercase tracking-wider transition ${
                          isLiveCameraMode
                            ? "text-white/55 hover:bg-white/5 hover:text-white"
                            : "bg-ca-primary text-black shadow-[0_0_10px_color-mix(in_oklab,var(--ca-primary)_25%,transparent)]"
                        }`}
                      >
                        <FileImage size={12} />
                        Image
                      </button>
                      <button
                        type="button"
                        data-tour="project-live-camera-source"
                        onClick={() => {
                          setIsLiveCameraMode(true);
                          toast.info("Live camera source selected.");
                        }}
                        className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-sans text-[10px] font-bold uppercase tracking-wider transition ${
                          isLiveCameraMode
                            ? "bg-emerald-400 text-black shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                            : "text-white/55 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Camera size={12} />
                        Live Camera
                      </button>
                    </div>

                    <div className="space-y-1">
                      <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-white/50">
                        Sample Carrier Pockets
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            updateProjectInspectionImageRef(
                              project.id,
                              SAMPLE_IMAGE_POCKET_1_FILLED,
                            );
                          }}
                          className={`rounded-md border px-2 py-1.5 font-sans text-[10px] font-bold uppercase tracking-wider transition ${
                            project.inspectionImageRef === SAMPLE_IMAGE_POCKET_1_FILLED
                              ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-200"
                              : "border-white/10 bg-white/5 text-white/50 hover:text-white"
                          }`}
                        >
                          Pocket 1
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateProjectInspectionImageRef(
                              project.id,
                              SAMPLE_IMAGE_POCKET_2_EMPTY_MIXED,
                            );
                          }}
                          className={`rounded-md border px-2 py-1.5 font-sans text-[10px] font-bold uppercase tracking-wider transition ${
                            project.inspectionImageRef === SAMPLE_IMAGE_POCKET_2_EMPTY_MIXED
                              ? "border-amber-400/50 bg-amber-500/20 text-amber-200"
                              : "border-white/10 bg-white/5 text-white/50 hover:text-white"
                          }`}
                        >
                          Pocket 2
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateProjectInspectionImageRef(
                              project.id,
                              SAMPLE_IMAGE_POCKET_5_PARTIAL,
                            );
                          }}
                          className={`rounded-md border px-2 py-1.5 font-sans text-[10px] font-bold uppercase tracking-wider transition ${
                            project.inspectionImageRef === SAMPLE_IMAGE_POCKET_5_PARTIAL
                              ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                              : "border-white/10 bg-white/5 text-white/50 hover:text-white"
                          }`}
                        >
                          Pocket 5 [Strip]
                        </button>
                      </div>
                    </div>

                    <div className="group relative h-36 overflow-hidden rounded-lg border border-white/10 bg-black/80 shadow-inner flex items-center justify-center">
                      {isLiveCameraMode ? (
                        <>
                          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-emerald-300/70">
                            <Camera size={22} />
                            <span className="font-sans text-[11px] uppercase tracking-wider">
                              {liveCameraErrorText
                                ? "Camera unavailable"
                                : isLiveCameraReady
                                  ? "Feed visible on canvas"
                                  : "Connecting camera feed"}
                            </span>
                          </div>
                          <div className="absolute left-2.5 top-2.5 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider text-emerald-200">
                            Live
                          </div>
                        </>
                      ) : project.inspectionImageRef ? (
                        <>
                          <img
                            src={project.inspectionImageRef}
                            alt="Current project inspection"
                            className="h-full w-full object-contain opacity-90 transition group-hover:opacity-100"
                          />
                          <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/60 font-sans text-xs font-bold uppercase tracking-wider text-white opacity-0 backdrop-blur-xs transition group-hover:opacity-100"
                          >
                            <Upload size={14} />
                            Replace Image
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 font-sans text-xs font-bold uppercase tracking-wider text-white/70 transition hover:bg-black/50 hover:text-white"
                        >
                          <Upload size={14} />
                          Upload Inspection Image
                        </button>
                      )}
                    </div>

                    {isLiveCameraMode ? (
                      <button
                        type="button"
                        onClick={() => void captureLiveCameraFrame()}
                        disabled={!isLiveCameraReady || isCapturingFrame}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 font-sans text-[11px] font-bold uppercase tracking-wider text-black shadow-[0_0_14px_rgba(52,211,153,0.3)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Camera size={13} />
                        {isCapturingFrame ? "Capturing..." : "Capture Frame"}
                      </button>
                    ) : null}

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-white/50">
                          Recent
                        </span>
                        <span className="font-sans text-[9px] text-white/35">
                          last {MAX_RECENT_IMAGE_SOURCES}
                        </span>
                      </div>
                      {recents.length === 0 ? (
                        <p className="rounded-md border border-dashed border-white/10 bg-black/30 px-2 py-2 text-center font-sans text-[10px] text-white/35">
                          Uploaded images and captured frames appear here.
                        </p>
                      ) : (
                        <div className="grid grid-cols-5 gap-1.5">
                          {recents.map((recent) => {
                            const isActive =
                              !isLiveCameraMode && project.inspectionImageRef === recent.dataUrl;

                            return (
                              <div key={recent.id} className="group/recent relative">
                                <button
                                  type="button"
                                  title={recent.label}
                                  onClick={() => {
                                    updateProjectInspectionImageRef(project.id, recent.dataUrl);
                                    setIsLiveCameraMode(false);
                                    for (const item of projectRulesetsForAnalysis) {
                                      useValidationStore.getState().clear(item.id);
                                    }
                                    toast.info(`Loaded: ${recent.label}`);
                                  }}
                                  className={`block h-11 w-full overflow-hidden rounded-md border transition ${
                                    isActive
                                      ? "border-cyan-400/60 shadow-[0_0_10px_rgba(34,211,238,0.25)]"
                                      : "border-white/10 hover:border-white/30"
                                  }`}
                                >
                                  <img
                                    src={recent.dataUrl}
                                    alt={recent.label}
                                    className="h-full w-full object-cover"
                                  />
                                </button>
                                <span className="pointer-events-none absolute left-0.5 top-0.5 rounded bg-black/70 px-1 py-px font-sans text-[8px] font-bold uppercase tracking-wider text-white/70">
                                  {recent.kind === "camera" ? (
                                    <Camera size={8} className="text-emerald-300" />
                                  ) : (
                                    <Upload size={8} className="text-cyan-300" />
                                  )}
                                </span>
                                <button
                                  type="button"
                                  title="Remove from recent"
                                  aria-label={`Remove ${recent.label} from recent`}
                                  onClick={() => removeRecent(recent.id)}
                                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-black/80 text-white/70 transition hover:text-white group-hover/recent:flex"
                                >
                                  <X size={9} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              )}
            </div>
          )}

          {/* Right: camera/current image viewport, or inline tool configuration */}
          <div
            data-tour="project-analysis-canvas"
            className="relative flex min-h-0 flex-1 min-w-0 flex-col overflow-hidden"
          >
            {isAddingRuleset ? (
              <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-black">
                <AddRulesetPanel
                  projectId={projectId}
                  projectName={project.name}
                  defaultName={draftRulesetName}
                  onCreated={handleInlineRulesetCreated}
                  onExit={handleExitAddRuleset}
                />
              </div>
            ) : !ruleset ? (
              <div className="flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-black p-8">
                <div
                  data-tour="project-overview-empty"
                  className="flex max-w-sm flex-col items-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center shadow-2xl backdrop-blur-xl"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.15)]">
                    <Layers size={22} />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    No Rulesets Defined
                  </h3>
                  <p className="mt-1 text-xs text-white/50">
                    Create an inspection ruleset program to begin automated vision analysis.
                  </p>
                  <button
                    type="button"
                    data-tour="project-overview-add-ruleset"
                    onClick={() => handleStartAddRuleset()}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-ca-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-ca-primary/20 transition hover:brightness-110"
                  >
                    <Plus size={14} />
                    New Ruleset
                  </button>
                </div>
              </div>
            ) : addRuleRulesetId ? (
              <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-black">
                <AddRulePanel
                  key={addRuleRulesetId}
                  projectId={projectId}
                  rulesetId={addRuleRulesetId}
                  onRuleCreated={handleInlineRuleCreated}
                  onExit={handleCloseAddRule}
                />
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-black/40 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                {/* 1. Top Analyze Image Selection Toolbar with Aliases & Resolution Check */}
                <AnalyzeImageToolbar
                  currentImageRef={project.inspectionImageRef}
                  isLiveCameraMode={isLiveCameraMode}
                  isLiveCameraReady={isLiveCameraReady}
                  onSelectLiveCamera={() => {
                    setIsLiveCameraMode(true);
                    toast.info("Live camera feed activated.");
                  }}
                  onSelectImage={handleSelectPresetOrRecentImage}
                  onUploadImage={handleUploadImageWithAlias}
                  recents={recents}
                  onRemoveRecent={removeRecent}
                  calibratedWidth={960}
                  calibratedHeight={540}
                />

                {/* 2. Main Work Area: Center Canvas + Right Toolbar Panel */}
                <div className="flex min-h-0 flex-1 gap-2.5 p-2 overflow-hidden">
                  {/* Center Canvas or Live Stream */}
                  <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-black">
                    {isLiveCameraMode ? (
                      <div className="relative flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:32px_32px]" />
                        <video
                          ref={liveCameraVideoRef}
                          playsInline
                          autoPlay
                          muted
                          className="relative z-10 max-h-full max-w-full object-contain"
                        />
                        <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-black/70 px-3 py-2 font-sans text-xs font-bold uppercase tracking-wider text-emerald-200 shadow-lg backdrop-blur">
                          <span
                            className={`h-2 w-2 rounded-full ${isLiveCameraReady ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" : "bg-amber-400 animate-pulse"}`}
                          />
                          {isLiveCameraReady ? "Live Camera Feed" : "Connecting Camera"}
                        </div>
                        {liveCameraErrorText ? (
                          <div className="absolute z-30 max-w-md rounded-xl border border-rose-500/30 bg-rose-950/70 p-4 text-center font-sans text-xs text-rose-100 shadow-xl backdrop-blur">
                            {liveCameraErrorText}
                          </div>
                        ) : null}
                        {!isLiveCameraReady && !liveCameraErrorText ? (
                          <div className="absolute z-30 rounded-xl border border-white/10 bg-black/70 px-4 py-3 font-sans text-xs uppercase tracking-wider text-white/70 shadow-xl backdrop-blur">
                            Opening camera stream...
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void captureLiveCameraFrame()}
                          disabled={!isLiveCameraReady || isCapturingFrame}
                          className="absolute bottom-4 right-4 z-30 flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 font-sans text-xs font-bold uppercase tracking-wider text-black shadow-[0_0_18px_rgba(52,211,153,0.35)] transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Camera size={14} />
                          {isCapturingFrame ? "Capturing..." : "Capture Frame"}
                        </button>
                      </div>
                    ) : (
                      <VisualToolWorkpieceCanvas
                        imageRef={project.inspectionImageRef}
                        roi={
                          activeRule
                            ? {
                                x: activeRule.x,
                                y: activeRule.y,
                                width: activeRule.width,
                                height: activeRule.height,
                              }
                            : undefined
                        }
                        onChangeRoi={handleChangeActiveRuleRoi}
                        toolCode={
                          typeof activeRule?.params?.toolCode === "string"
                            ? activeRule.params.toolCode
                            : undefined
                        }
                        toolName={activeRule?.name}
                        toolParams={activeRule?.params}
                        isEditable={Boolean(activeRule)}
                        isAnalyzeMode={true}
                        overlayRules={projectOverlayRules}
                        selectedRuleId={activeRule?.id}
                        onSelectRule={handleSelectProjectRule}
                        onLaunchPatternTuner={handleLaunchPatternTuner}
                        onPatternBoxesChange={handlePatternBoxesChange}
                        validationStatus={sessionActiveValidation?.status}
                        validationScore={sessionActiveValidation?.score}
                        validationResultsMap={sessionValidationResults}
                        isAnalyzing={isAnalysisBusy}
                        tapeStripResult={tapeStripResult}
                        onUpdateParams={handleUpdateActiveRuleParams}
                      />
                    )}
                  </div>

                  {/* Right-Hand Side Toolbar: Tool Configuration Panel */}
                  {activeRule ? (
                    <RuleRightToolbarPanel
                      rule={activeRule}
                      ruleset={ruleOwnerById.get(activeRule.id) ?? ruleset}
                      onUpdateRule={railHandlers.onUpdateRule}
                      onToggleHidden={railHandlers.onToggleHidden}
                      onLaunchWorkbench={() => setConfigRuleId(activeRule.id)}
                      onClose={() => {
                        setSelectedIds([]);
                        setConfigRuleId(null);
                      }}
                      validationResult={sessionActiveValidation}
                      isEvaluating={evaluatingRuleId === activeRule.id}
                      onEvaluateSingleRule={handleEvaluateSingleRule}
                      onDeleteRule={railHandlers.onDelete}
                    />
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 5. Bottom action bar */}
        <div
          data-tour="project-results"
          className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-black/40 px-4 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl"
        >
          <div className="flex items-center gap-2 font-sans text-[11px] uppercase tracking-wider text-white/50">
            <span
              className={`h-2 w-2 rounded-full ${isAnalysisBusy ? "bg-amber-400 animate-ping" : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"}`}
            />
            <span>
              {isAnalysisBusy ? "Inspection engine analyzing" : "Inspection engine ready"} ·{" "}
              {isLiveCameraMode ? "live camera source" : "reference image source"} ·{" "}
              {projectAnalysisItems.length} active rules
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (file) void onImportImage(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              data-tour="project-run-analysis"
              onClick={handleManualRunAnalysis}
              disabled={isAnalysisBusy}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-1.5 font-sans text-xs font-bold uppercase tracking-wider text-black shadow-[0_0_20px_rgba(16,185,129,0.45)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              <Play size={14} className={isAnalysisBusy ? "animate-spin" : "fill-black"} />
              {isAnalysisBusy ? "Running..." : "Run"}
            </button>
          </div>
        </div>
      </div>

      {configRule ? (
        <VisualToolTuningModal
          isOpen={Boolean(configRuleId)}
          onClose={handleCloseRuleConfig}
          rule={configRule}
          onApplyRule={(updatedRule) => {
            railHandlers.onUpdateRule(updatedRule);
            handleCloseRuleConfig();
          }}
          imageRef={project.inspectionImageRef}
          onImageRegistered={(newImg) => {
            updateProjectInspectionImageRef(project.id, newImg);
          }}
        />
      ) : null}
    </div>
  );
}
