import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Camera, FileImage, ScanSearch, Save, Play, Film } from "lucide-react";
import { toast } from "sonner";
import {
  VisualToolWorkpieceCanvas,
  VisualToolTuningModal,
  InspectionHierarchyTree,
} from "./index";
import { AddRuleFromToolModal } from "@/components/rules/AddRuleFromToolModal";
import { visualTunerBus } from "@/lib/editor/selection/visual-tuner-bus";
import { saveRuleSet } from "@/lib/rules/saveRuleSet";
import type { Project, RuleSet } from "@/lib/projects/types";
import {
  getFreshRuleset,
  updateRulesetRulesInStore,
  updateRulesetImageRefInStore,
} from "@/hooks/useWorkpieceProject";
import {
  EditorToolFamilyType,
  EditorRuleKindType,
  type EditorRule,
  type EditorRuleParams,
  type RuleCameraSettings,
  type RuleLightSettings,
  DEFAULT_RULE_CAMERA_SETTINGS,
  DEFAULT_RULE_LIGHT_SETTINGS,
} from "@/lib/editor/types";
import { CameraCaptureModal } from "@/components/vision/white-box/CameraCaptureModal";
import type { WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import {
  useValidationStore,
  ValidationStatusType,
  type ValidationResult,
  runStubValidation,
} from "@/lib/editor/validation-store";
import {
  loadWorkpieceImageData,
  evaluateWorkpieceRuleReal,
  defaultWorkpieceFilledSample,
} from "@/lib/vision/workpiece-rule-analyzer";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { useProjectStore } from "@/lib/projects/store";
import { markSaved } from "@/lib/editor/store/save-status";
import { Section, SectionDensityType, SectionVariantType } from "@/components/ui/section";
import { projectRulesetToEnvelope, envelopeToProjectRuleset } from "@/lib/rules/envelopeAdapter";
import type { RuleSetEnvelope } from "@/lib/rules/draftStore";

function newRuleId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };

  if (g.crypto?.randomUUID) return g.crypto.randomUUID();

  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const EMPTY_VALIDATION_RESULTS: Record<string, ValidationResult> = {};

interface RunAnalysisParams {
  hasStepDelay: boolean;
  hasStepToasts: boolean;
  hasSelectionFocus: boolean;
}

const MANUAL_RUN_ANALYSIS_PARAMS: RunAnalysisParams = {
  hasStepDelay: true,
  hasStepToasts: true,
  hasSelectionFocus: true,
};

const AUTO_RUN_ANALYSIS_PARAMS: RunAnalysisParams = {
  hasStepDelay: false,
  hasStepToasts: false,
  hasSelectionFocus: false,
};

export interface WorkpieceAnalyzeWorkspaceProps {
  project: Project;
  ruleset: RuleSet;
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
  const rulesetId = ruleset.id;
  const updateRulesetRules = updateRulesetRulesInStore;
  const createRuleset = useProjectStore((s) => s.createRuleset);
  const deleteRuleset = useProjectStore((s) => s.deleteRuleset);

  const [savedVersion, setSavedVersion] = useState<number>(0);
  const savedVersionRef = useRef<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const isAnalyzingRef = useRef<boolean>(false);
  const hasAutoAnalyzedKeyRef = useRef<string>("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [visualTunerRuleId, setVisualTunerRuleId] = useState<string | null>(null);
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const updateRulesetImageRef = useCallback((rsId: string, ref: string) => {
    updateRulesetImageRefInStore(rsId, ref);
  }, []);

  useEffect(() => {
    return visualTunerBus.subscribe((ruleId) => {
      setSelectedIds([ruleId]);
      setVisualTunerRuleId(ruleId);
    });
  }, []);

  const updateSavedVersion = useCallback((v: number) => {
    savedVersionRef.current = v;
    setSavedVersion(v);
  }, []);

  const getEnvelope = useCallback((): RuleSetEnvelope => {
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
    [project.id, ruleset.categoryName, ruleset.id, updateRulesetRules, updateSavedVersion],
  );

  const handleSaveRuleSet = useCallback(async () => {
    setIsSaving(true);
    try {
      const envelope = getEnvelope();
      await saveRuleSet(envelope);
      onSaved(envelope);
    } catch (err) {
      console.error("[WorkpieceAnalyzeWorkspace] save error", err);
      toast.error(err instanceof Error ? err.message : "Failed to save rule set.");
    } finally {
      setIsSaving(false);
    }
  }, [getEnvelope, onSaved]);

  const liveStoreRules = useRulesStore((s) => s.rules);
  const rules = useMemo(() => {
    if (liveStoreRules.length > 0) {
      return liveStoreRules;
    }
    return ruleset.rules ?? [];
  }, [ruleset.rules, liveStoreRules]);
  const projectRulesetsForAnalysis = useMemo(() => {
    const source = rulesets && rulesets.length > 0 ? rulesets : [ruleset];

    return source.map((rs) => (rs.id === ruleset.id ? { ...rs, rules } : rs));
  }, [rules, ruleset, rulesets]);
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

  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (searchRule && rules.some((r) => r.id === searchRule)) {
      return [searchRule];
    }
    return rules[0]?.id ? [rules[0].id] : [];
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [designOpen, setDesignOpen] = useState(false);
  const [validateOpen, setValidateOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const shapeInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const targetSelected =
      selectedIds.length > 0 ? selectedIds : ruleset.rules.length > 0 ? [ruleset.rules[0].id] : [];

    useRulesStore.getState().replaceAll(ruleset.rules, targetSelected, []);

    if (ruleset.rules[0]?.id && selectedIds.length === 0) {
      setSelectedIds([ruleset.rules[0].id]);
    }
  }, [ruleset.id]);

  const commit = useCallback(
    (nextRules: EditorRule[], reason: string, nextSelectedIds?: string[]) => {
      updateRulesetRules(ruleset.id, nextRules);
      const activeSel =
        nextSelectedIds ??
        (selectedIds.length > 0 ? selectedIds : useRulesStore.getState().selectedIds);
      useRulesStore.getState().replaceAll(nextRules, activeSel, []);
    },
    [ruleset.id, updateRulesetRules, selectedIds],
  );

  const handleAddRuleFromTool = useCallback(
    (newRule: EditorRule) => {
      const nextRules = [...rules, newRule];
      setSelectedIds([newRule.id]);
      commit(nextRules, "add-from-tool", [newRule.id]);
      useRulesStore.getState().setSelection([newRule.id], "add-from-tool");
      toast.success(`Rule "${newRule.name}" added to ruleset!`);
    },
    [rules, commit],
  );

  const handleAddRuleset = useCallback(() => {
    const rulesetCount = rulesets?.length ?? project.rulesetIds.length;
    const newRulesetName = `RuleSet ${String(rulesetCount + 1).padStart(2, "0")}`;
    const newRulesetId = createRuleset(
      projectId,
      newRulesetName,
      ruleset.imageRef || defaultWorkpieceFilledSample,
    );

    onSelectRuleset?.(newRulesetId);
    toast.success(`Rule set "${newRulesetName}" added.`);
  }, [createRuleset, onSelectRuleset, project.rulesetIds.length, projectId, ruleset.imageRef, rulesets?.length]);

  const handleDeleteRuleset = useCallback(() => {
    const isConfirmed = window.confirm(`Delete rule set "${ruleset.name}"? This removes its rules from this project.`);

    if (!isConfirmed) {
      return;
    }

    const nextRuleset = (rulesets ?? []).find((rs) => rs.id !== ruleset.id) ?? null;
    deleteRuleset(ruleset.id);

    if (nextRuleset) {
      onSelectRuleset?.(nextRuleset.id);
    }

    toast.success(`Rule set "${ruleset.name}" deleted.`);
  }, [deleteRuleset, onSelectRuleset, ruleset.id, ruleset.name, rulesets]);

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

  const ruleToTune = useMemo(() => {
    if (!visualTunerRuleId) return null;
    return rules.find((r) => r.id === visualTunerRuleId) ?? null;
  }, [rules, visualTunerRuleId]);

  const handleCanvasSelectRule = useCallback((id: string) => {
    setSelectedIds([id]);
    useRulesStore.getState().setSelection([id], "canvas.click");
  }, []);

  const handleLaunchPatternTuner = useCallback(() => {
    if (activeRule) {
      setVisualTunerRuleId(activeRule.id);
    }
  }, [activeRule]);

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
      const nextRules = rules.map((r) =>
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
      commit(nextRules, "update-camera-settings");
      toast.success("Camera settings updated for rule");
    },
    [rules, commit],
  );

  const handleUpdateRuleLightSettings = useCallback(
    (ruleId: string, lightSettings: RuleLightSettings) => {
      const nextRules = rules.map((r) =>
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
      commit(nextRules, "update-light-settings");
      toast.success("Light settings updated for rule");
    },
    [rules, commit],
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

  const handleRunAnalysis = useCallback(async (params: RunAnalysisParams) => {
    if (projectAnalysisItems.length === 0 || isAnalyzingRef.current) {
      if (projectAnalysisItems.length === 0) {
        toast.warning("No rules in project to analyze. Please add rules first.");
      }

      return;
    }

    isAnalyzingRef.current = true;
    setIsAnalyzing(true);

    if (params.hasStepToasts) {
      toast.info(
        `Starting sequential optical inspection across ${projectAnalysisItems.length} ${projectAnalysisItems.length === 1 ? "rule" : "rules"} in all rule sets...`,
      );
    }

    try {
      const activeImageSrc = ruleset.imageRef || defaultWorkpieceFilledSample;
      const imgData = await loadWorkpieceImageData(activeImageSrc);

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
          ruleResult = evaluateWorkpieceRuleReal(r, imgData);
        } else {
          ruleResult = {
            status: ValidationStatusType.Fail,
            score: 0.0,
            message: `Failed to acquire image pixel buffer for inspection.`,
            stub: false,
          };
        }

        if (ruleResult.status === ValidationStatusType.Pass) {
          passCount += 1;
        } else {
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

      if (params.hasStepToasts) {
        if (failCount === 0) {
          toast.success(
            `Sequential inspection complete: All ${projectAnalysisItems.length} rules PASSED (${passCount}/${projectAnalysisItems.length}). Workpiece OK.`,
          );
        } else {
          toast.error(
            `Sequential inspection complete: ${failCount}/${projectAnalysisItems.length} rules FAILED (${passCount} passed). Workpiece REJECTED.`,
          );
        }
      }
    } catch (err) {
      console.error("[WorkpieceAnalyzeWorkspace] Analysis error:", err);
      toast.error("Analysis failed to complete.");
    } finally {
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
    }
  }, [projectAnalysisItems, ruleset.imageRef]);
  const handleManualRunAnalysis = useCallback(() => {
    void handleRunAnalysis(MANUAL_RUN_ANALYSIS_PARAMS);
  }, [handleRunAnalysis]);

  // Auto-analyze workpiece picture sequentially across all rules
  useEffect(() => {
    if (projectAnalysisItems.length === 0) {
      return;
    }

    const rulesSignature = projectAnalysisItems
      .map(
        ({ ruleset: ownerRuleset, rule }) =>
          `${ownerRuleset.id}:${rule.id}:${rule.x}:${rule.y}:${rule.width}:${rule.height}:${rule.params?.threshold ?? ""}`,
      )
      .join("|");
    const currentKey = `${project.id}:${rulesSignature}:${ruleset.imageRef || "default"}`;

    if (hasAutoAnalyzedKeyRef.current === currentKey) {
      return;
    }

    hasAutoAnalyzedKeyRef.current = currentKey;

    const runAutoAnalysis = () => {
      void handleRunAnalysis(AUTO_RUN_ANALYSIS_PARAMS);
    };

    const rafId =
      typeof window !== "undefined"
        ? window.requestAnimationFrame(() => {
            window.setTimeout(runAutoAnalysis, 0);
          })
        : null;

    if (rafId === null) {
      runAutoAnalysis();
    }

    return () => {
      if (rafId !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [project.id, projectAnalysisItems, ruleset.imageRef, handleRunAnalysis]);

  const railHandlers = useMemo(
    () => ({
      onToggleHidden: (id: string) => {
        const next = rules.map((r) => (r.id === id ? { ...r, isHidden: !r.isHidden } : r));
        commit(next, "toggle-hidden");
      },
      onDelete: (id: string) => {
        const target = rules.find((r) => r.id === id);
        const next = rules.filter((r) => r.id !== id);
        commit(next, "delete");
        if (target) toast.success(`Rule "${target.name}" deleted.`);
      },
      onReorder: (id: string, dir: "up" | "down") => {
        const idx = rules.findIndex((r) => r.id === id);
        if (idx === -1) return;
        const targetIdx = dir === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= rules.length) return;
        const next = [...rules];
        const [moved] = next.splice(idx, 1);
        next.splice(targetIdx, 0, moved);
        commit(next, "reorder");
      },
    }),
    [rules, commit],
  );

  const onImportImage = useCallback(
    (file: File) => {
      setImportError(null);
      const reader = new FileReader();

      reader.onload = () => {
        const dataUrl = reader.result as string;

        if (dataUrl) {
          updateRulesetImageRef(ruleset.id, dataUrl);
          toast.success(`Reference image imported: ${file.name}`);
        }
      };

      reader.onerror = () => {
        setImportError("Failed to read image file");
        toast.error("Failed to read image file");
      };

      reader.readAsDataURL(file);
    },
    [ruleset.id, updateRulesetImageRef],
  );

  const handleCaptureCamera = useCallback(
    (frame: WhiteBoxMarkingInput) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = frame.width;
        canvas.height = frame.height;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          const clampedArray = new Uint8ClampedArray(frame.rgba);
          const imgData = new ImageData(clampedArray, frame.width, frame.height);
          ctx.putImageData(imgData, 0, 0);
          const dataUrl = canvas.toDataURL("image/png");
          updateRulesetImageRef(ruleset.id, dataUrl);
          setIsCameraOpen(false);
          toast.success("Camera frame captured and set as ruleset reference!");
        }
      } catch (err) {
        console.error("[camera-capture] failed", err);
        toast.error("Failed to process captured camera frame");
      }
    },
    [ruleset.id, updateRulesetImageRef],
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-auto p-hmi-4">
      <div className="mx-auto w-full max-w-[1720px]">
        {importError ? (
          <p role="alert" className="mb-hmi-3 text-hmi-caption text-ca-ng">
            Import failed: {importError}
          </p>
        ) : null}

        {/* Inspection Hierarchy Tree on the Left & Workpiece Canvas on the Right (Right Rail Removed) */}
        <div className="grid grid-cols-1 gap-hmi-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
          <InspectionHierarchyTree
            project={project}
            ruleset={ruleset}
            rulesets={rulesets}
            onSelectRuleset={onSelectRuleset}
            rules={rules}
            selectedRuleId={activeRule?.id}
            onSelectRule={(id) => {
              setSelectedIds([id]);
              useRulesStore.getState().setSelection([id], "inspector.tree");
            }}
            onToggleHidden={railHandlers.onToggleHidden}
            onDeleteRule={railHandlers.onDelete}
            onReorderRule={railHandlers.onReorder}
            onAddRuleClick={() => setIsAddRuleModalOpen(true)}
            onAddRulesetClick={handleAddRuleset}
            onDeleteRulesetClick={handleDeleteRuleset}
            onTuneRule={(id) => setVisualTunerRuleId(id)}
            onRunAnalysis={handleManualRunAnalysis}
            isAnalyzing={isAnalyzing}
            onUpdateCameraSettings={handleUpdateRuleCameraSettings}
            onUpdateLightSettings={handleUpdateRuleLightSettings}
          />

          <Section density={SectionDensityType.Compact} variant={SectionVariantType.Panel}>
            <div className="h-[74vh] min-h-[500px] w-full p-1.5 flex flex-col">

                <VisualToolWorkpieceCanvas
                  imageRef={ruleset.imageRef || defaultWorkpieceFilledSample}
                  toolCode={
                    typeof activeRule?.params?.toolCode === "string"
                      ? activeRule.params.toolCode
                      : undefined
                  }
                  toolName={activeRule?.name}
                  toolParams={activeRule?.params}
                  isEditable={false}
                  isAnalyzeMode={true}
                  overlayRules={projectOverlayRules}
                  selectedRuleId={activeRule?.id}
                  onSelectRule={handleCanvasSelectRule}
                  onLaunchPatternTuner={handleLaunchPatternTuner}
                  onPatternBoxesChange={handlePatternBoxesChange}
                  validationStatus={activeValidationResult?.status}
                  validationScore={activeValidationResult?.score}
                  validationResultsMap={allValidationResults}
                  onRunAnalysis={handleManualRunAnalysis}
                  isAnalyzing={isAnalyzing}
                />
            </div>
          </Section>
        </div>

        {/* Compact single-band toolbar moved to the bottom as requested */}
        <div
          role="toolbar"
          aria-label="Ruleset actions"
          className="mt-hmi-4 flex flex-wrap items-center gap-hmi-2 rounded-md border border-ca-border/60 bg-ca-panel/80 p-hmi-2 shadow-sm"
        >
          <span className="ml-hmi-2 mr-auto text-hmi-caption font-mono text-ca-ink-muted">
            {projectAnalysisItems.length} {projectAnalysisItems.length === 1 ? "RULE" : "RULES"} ACROSS {projectRulesetsForAnalysis.length} {projectRulesetsForAnalysis.length === 1 ? "RULESET" : "RULESETS"}
          </span>
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
            onClick={() => imageInputRef.current?.click()}
            className="inline-flex items-center gap-hmi-2 rounded border border-ca-border bg-ca-panel px-hmi-3 py-hmi-1.5 text-xs font-semibold uppercase tracking-wider text-ca-ink transition hover:border-ca-select hover:bg-ca-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
            title="Import an image file as reference"
          >
            <FileImage aria-hidden size={14} />
            Import image
          </button>
          <button
            type="button"
            onClick={() => setIsCameraOpen(true)}
            className="inline-flex items-center gap-hmi-2 rounded border border-cyan-500/60 bg-cyan-950/30 px-hmi-3 py-hmi-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-200 transition hover:bg-cyan-900/40 hover:border-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
            title="Live Camera Mode: Capture frame from camera stream"
          >
            <Camera aria-hidden size={14} className="text-cyan-400" />
            Camera stream
          </button>
          <button
            type="button"
            onClick={handleManualRunAnalysis}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-hmi-2 rounded border border-emerald-600 bg-emerald-950/40 text-emerald-300 px-hmi-3 py-hmi-1.5 text-xs font-semibold uppercase tracking-wider transition hover:bg-emerald-900/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
          >
            <Play aria-hidden size={14} className={isAnalyzing ? "animate-spin" : ""} />
            {isAnalyzing ? "Analyzing..." : "Run Analysis"}
          </button>

          <button
            type="button"
            onClick={() => setIsAddRuleModalOpen(true)}
            className="inline-flex items-center gap-hmi-2 rounded border border-ca-border bg-ca-panel px-hmi-3 py-hmi-1.5 text-xs font-semibold uppercase tracking-wider text-ca-ink transition hover:border-ca-select hover:bg-ca-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
            title="Add inspection rule from vision tools"
          >
            <Plus aria-hidden size={14} />
            Add rule
          </button>
          <button
            type="button"
            onClick={handleSaveRuleSet}
            disabled={isSaving}
            className="inline-flex items-center gap-hmi-2 rounded bg-ca-select px-hmi-4 py-hmi-1.5 text-xs font-bold uppercase tracking-wider text-ca-bg transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus disabled:opacity-50"
          >
            <Save aria-hidden size={14} />
            {isSaving ? "Saving..." : "Save Config"}
          </button>
        </div>
      </div>
      {isCameraOpen && (
        <CameraCaptureModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={handleCaptureCamera}
        />
      )}
      {ruleToTune && (
        <VisualToolTuningModal
          isOpen={Boolean(ruleToTune)}
          onClose={() => setVisualTunerRuleId(null)}
          rule={ruleToTune}
          imageRef={
            ruleset.imageRef && (ruleset.imageRef.startsWith("data:") || ruleset.imageRef.startsWith("blob:"))
              ? ruleset.imageRef
              : undefined
          }
          onApplyRule={(updatedRule) => {
            const nextRules = rules.map((r) => (r.id === updatedRule.id ? updatedRule : r));