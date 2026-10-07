import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Camera, FileImage, ScanSearch, Save, Play, Film } from "lucide-react";
import { toast } from "sonner";
import {
  VisualToolWorkpieceCanvas,
  VisualToolTuningModal,
} from "./index";
import { AddRuleFromToolModal } from "@/components/rules/AddRuleFromToolModal";
import { AddRulesetModal } from "@/components/rules/AddRulesetModal";
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
  const [isAddRulesetModalOpen, setIsAddRulesetModalOpen] = useState(false);
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
    (newRule: EditorRule, overrideImageRef?: string) => {
      const nextRules = [...rules, newRule];
      setSelectedIds([newRule.id]);
      commit(nextRules, "add-from-tool", [newRule.id]);
      
      if (overrideImageRef && ruleset) {
        updateRulesetImageRefInStore(ruleset.id, overrideImageRef);
      }
      
      useRulesStore.getState().setSelection([newRule.id], "add-from-tool");
      toast.success(`Rule "${newRule.name}" added to ruleset!`);
    },
    [rules, commit, project.id, ruleset],
  );

  const handleAddRuleset = useCallback((name: string, description?: string) => {
    const newRulesetId = createRuleset(
      projectId,
      name,
      ruleset.imageRef || defaultWorkpieceFilledSample,
    );

    onSelectRuleset?.(newRulesetId);
    toast.success(`Rule set "${name}" added.`);
    setIsAddRulesetModalOpen(false);
  }, [createRuleset, onSelectRuleset, projectId, ruleset.imageRef]);

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
    <div className="flex min-w-0 flex-1 flex-col h-full bg-[#111] text-ca-ink">
      <div className="flex flex-col h-full w-full">
        {/* 1. Top Ribbon */}
        <div className="flex items-center justify-between bg-[#1e1e1e] border-b border-[#333] px-4 py-2 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-ca-ink font-bold text-sm tracking-wide">
              PROJECT: {project.name}
            </span>
            <div className="h-4 w-px bg-[#333]" />
            <span className="text-ca-ink-muted text-xs">
              {projectAnalysisItems.length} RULES
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveRuleSet}
              disabled={isSaving}
              className="px-3 py-1 bg-ca-select text-white text-xs font-bold uppercase rounded disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button className="px-3 py-1 bg-[#2d2d2d] border border-[#444] text-white text-xs font-bold uppercase rounded hover:bg-[#3d3d3d] transition-colors">
              Utility
            </button>
            <button className="px-3 py-1 bg-[#2d2d2d] border border-[#444] text-white text-xs font-bold uppercase rounded hover:bg-[#3d3d3d] transition-colors">
              Run Mode
            </button>
          </div>
        </div>

        {/* 2. Horizontal rule/tool thumbnail strip */}
        <div className="flex items-center gap-2 overflow-x-auto p-2 bg-[#252525] border-b border-[#333] shrink-0 min-h-[80px]">
          {/* Add Ruleset Tile */}
          <button
            onClick={() => setIsAddRulesetModalOpen(true)}
            className="flex flex-col items-center justify-center w-20 h-16 bg-[#1a1a1a] border border-[#444] rounded hover:border-amber-400 transition-colors shrink-0"
          >
            <Plus size={16} className="text-amber-500 mb-1" />
            <span className="text-[10px] text-amber-500 font-bold uppercase">Add Ruleset</span>
          </button>
          
          {/* Add Tools Tile */}
          <button
            onClick={() => setIsAddRuleModalOpen(true)}
            className="flex flex-col items-center justify-center w-20 h-16 bg-[#1a1a1a] border border-[#444] rounded hover:border-ca-select transition-colors shrink-0"
          >
            <Plus size={16} className="text-ca-ink-muted mb-1" />
            <span className="text-[10px] text-ca-ink-muted font-bold uppercase">Add Tools</span>
          </button>
          
          {/* Set Camera Tile */}
          <button
            onClick={() => setIsCameraOpen(true)}
            className="flex flex-col items-center justify-center w-20 h-16 bg-[#1a1a1a] border border-[#444] rounded hover:border-cyan-400 transition-colors shrink-0"
          >
            <Camera size={16} className="text-ca-ink-muted mb-1" />
            <span className="text-[10px] text-ca-ink-muted font-bold uppercase">Set Camera</span>
          </button>

          {/* Rule Tiles */}
          {rules.map((r, idx) => {
            const isSelected = activeRule?.id === r.id;
            const rResult = allValidationResults[r.id];
            const isPass = rResult?.status === "pass";
            const isFail = rResult?.status === "fail";
            
            return (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedIds([r.id]);
                  useRulesStore.getState().setSelection([r.id], "thumbnail-strip");
                }}
                className={`flex flex-col relative items-center justify-center w-24 h-16 bg-[#1a1a1a] border rounded transition-colors shrink-0 ${isSelected ? "border-amber-400 bg-amber-400/10" : "border-[#444] hover:border-[#666]"}`}
              >
                <span className="text-[10px] text-ca-ink-muted absolute top-1 left-1">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className={`text-[10px] font-bold mt-3 truncate w-full px-1 ${isSelected ? "text-amber-400" : "text-ca-ink"}`}>
                  {r.name}
                </span>
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${isPass ? "bg-emerald-500" : isFail ? "bg-red-500" : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>

        {/* 3 & 4. Main workspace (left canvas, right settings) */}
        <div className="flex flex-1 min-h-0 bg-[#111]">
          {/* Left: camera/current image viewport */}
          <div className="flex-1 relative p-1 overflow-hidden flex flex-col border-r border-[#333]">
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
          
          {/* Right: selected rule result/settings panel */}
          <div className="w-[320px] bg-[#1a1a1a] flex flex-col shrink-0 overflow-y-auto">
            {activeRule ? (
              <div className="flex flex-col h-full">
                {/* Rule Header */}
                <div className="p-3 border-b border-[#333] bg-[#222]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1 py-0.5 bg-amber-400 text-black text-[10px] font-bold rounded">
                      {activeRule.params?.toolCode || "TOOL"}
                    </span>
                    <span className="text-ca-ink font-bold text-sm truncate">
                      {activeRule.name}
                    </span>
                  </div>
                  <div className="text-ca-ink-muted text-[10px] uppercase">
                    {activeRule.family || "Analysis Tool"}
                  </div>
                </div>
                
                {/* Measurement Table */}
                <div className="flex-1 p-3">
                   <div className="text-xs text-ca-ink-muted mb-2 font-bold uppercase tracking-wider">Judged Result</div>
                   {activeValidationResult ? (
                     <div className="bg-[#111] border border-[#333] rounded p-2 mb-4">
                       <div className="flex justify-between items-center mb-1">
                         <span className="text-xs text-ca-ink">Status:</span>
                         <span className={`text-xs font-bold ${activeValidationResult.status === "pass" ? "text-emerald-400" : activeValidationResult.status === "fail" ? "text-red-400" : "text-amber-400"}`}>
                           {activeValidationResult.status.toUpperCase()}
                         </span>
                       </div>
                       {activeValidationResult.score !== undefined && (
                         <div className="flex justify-between items-center mb-1">
                           <span className="text-xs text-ca-ink">Score/Match:</span>
                           <span className="text-xs text-ca-ink font-mono">{activeValidationResult.score}</span>
                         </div>
                       )}
                       {activeValidationResult.message && (
                         <div className="flex justify-between items-center mb-1">
                           <span className="text-xs text-ca-ink">Message:</span>
                           <span className="text-xs text-ca-ink font-mono">{activeValidationResult.message}</span>
                         </div>
                       )}
                     </div>
                   ) : (
                     <div className="text-xs text-ca-ink-muted mb-4">No results yet. Run analysis.</div>
                   )}
                </div>
                
                {/* Bottom Edit Button */}
                <div className="p-3 border-t border-[#333] bg-[#222]">
                  <button
                    onClick={() => setVisualTunerRuleId(activeRule.id)}
                    className="w-full py-2 bg-[#333] hover:bg-[#444] border border-[#555] text-white text-xs font-bold uppercase rounded transition-colors"
                  >
                    Edit Rule Settings
                  </button>
                  <button
                    onClick={() => railHandlers.onDelete(activeRule.id)}
                    className="w-full mt-2 py-1 bg-transparent hover:bg-red-950/30 text-red-400 border border-transparent hover:border-red-900/50 text-[10px] font-bold uppercase rounded transition-colors"
                  >
                    Delete Rule
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4 text-center">
                <span className="text-xs text-ca-ink-muted">Select a tool from the strip above to view results and settings.</span>
              </div>
            )}
          </div>
        </div>

        {/* 5. Bottom action bar */}
        <div className="flex items-center justify-end gap-3 bg-[#1e1e1e] border-t border-[#333] p-2 shrink-0">
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
            className="px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] border border-[#444] text-white text-xs font-bold uppercase rounded transition-colors flex items-center gap-2"
          >
            <FileImage size={14} />
            Register Image
          </button>
          <button
            type="button"
            onClick={handleManualRunAnalysis}
            disabled={isAnalyzing}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Play size={14} className={isAnalyzing ? "animate-spin" : ""} />
            {isAnalyzing ? "Running..." : "Run"}
          </button>
        </div>
      </div>
      
      {/* Modals remain the same */}
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
            commit(nextRules, "visual-tune");
            setVisualTunerRuleId(null);
            toast.success(`Visual tuning applied to ${updatedRule.name}!`);
          }}
        />
      )}
      {isAddRuleModalOpen && (
        <AddRuleFromToolModal
          isOpen={isAddRuleModalOpen}
          onClose={() => setIsAddRuleModalOpen(false)}
          onAddRule={(newRule, overrideImageRef) => {
            handleAddRuleFromTool(newRule, overrideImageRef);
            setVisualTunerRuleId(newRule.id);
          }}
          existingRules={rules}
        />
      )}
      <AddRulesetModal
        isOpen={isAddRulesetModalOpen}
        onClose={() => setIsAddRulesetModalOpen(false)}
        onAdd={handleAddRuleset}
      />
    </div>
  );
}
