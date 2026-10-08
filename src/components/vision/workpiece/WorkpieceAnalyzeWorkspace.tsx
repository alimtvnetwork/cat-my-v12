import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bug,
  Camera,
  CircleDot,
  Crosshair,
  FileImage,
  Grid2X2,
  PaintBucket,
  Play,
  Plus,
  QrCode,
  Ruler,
  ScanSearch,
  Type,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { VisualToolWorkpieceCanvas } from "./index";
import { InspectionHierarchyTree } from "./InspectionHierarchyTree";
import { visualTunerBus } from "@/lib/editor/selection/visual-tuner-bus";
import { saveRuleSet } from "@/lib/rules/saveRuleSet";
import type { Project, RuleSet } from "@/lib/projects/types";
import {
  getFreshRuleset,
  updateRulesetRulesInStore,
  updateRulesetImageRefInStore,
} from "@/hooks/useWorkpieceProject";
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
  defaultWorkpieceFilledSample,
} from "@/lib/vision/workpiece-rule-analyzer";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { useProjectStore } from "@/lib/projects/store";
import { markSaved } from "@/lib/editor/store/save-status";
import { projectRulesetToEnvelope, envelopeToProjectRuleset } from "@/lib/rules/envelopeAdapter";
import type { RuleSetEnvelope } from "@/lib/rules/draftStore";

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
  if (normalized.includes("void") || normalized.includes("circle") || code === "T111") return Crosshair;
  if (normalized.includes("caliper") || normalized.includes("gauge") || code === "T110") return Ruler;
  if (normalized.includes("qr") || normalized.includes("datamatrix") || code === "T103") return QrCode;
  if (normalized.includes("ocr") || normalized.includes("marking") || code === "T106") return Type;
  if (normalized.includes("coating") || normalized.includes("color") || code === "T112") return PaintBucket;

  return ScanSearch;
}

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
  const navigate = useNavigate();
  const [isAddingRuleset, setIsAddingRuleset] = useState(false);
  const [draftRulesetName, setDraftRulesetName] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const updateRulesetImageRef = useCallback((rsId: string, ref: string) => {
    updateRulesetImageRefInStore(rsId, ref);
  }, []);

  useEffect(() => {
    return visualTunerBus.subscribe((ruleId) => {
      setSelectedIds([ruleId]);
      void navigate({
        to: "/projects/$projectId/rulesets/$rulesetId/tune/$ruleId",
        params: { projectId, rulesetId: ruleset.id, ruleId },
      });
    });
  }, [navigate, projectId, ruleset.id]);

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

  const handleNavigateAddRule = useCallback((targetRulesetId?: string) => {
    void navigate({
      to: "/projects/$projectId/rulesets/$rulesetId/add-rule",
      params: { projectId, rulesetId: targetRulesetId ?? ruleset.id },
    });
  }, [navigate, projectId, ruleset.id]);

  const handleAddRuleset = useCallback((name: string) => {
    const newRulesetId = createRuleset(
      projectId,
      name,
    );

    onSelectRuleset?.(newRulesetId);
    toast.success(`Rule set "${name}" added.`);
  }, [createRuleset, onSelectRuleset, projectId]);

  const handleStartAddRuleset = useCallback(() => {
    setDraftRulesetName(`Ruleset ${(rulesets?.length ?? 0) + 1}`);
    setIsAddingRuleset(true);
  }, [rulesets?.length]);

  const handleSubmitRuleset = useCallback(() => {
    const name = draftRulesetName.trim();

    if (!name) {
      return;
    }

    handleAddRuleset(name);
    setDraftRulesetName("");
    setIsAddingRuleset(false);
  }, [draftRulesetName, handleAddRuleset]);

  const handleDeleteRuleset = useCallback((targetRulesetId?: string) => {
    const targetRuleset =
      (rulesets ?? []).find((rs) => rs.id === (targetRulesetId ?? ruleset.id)) ?? ruleset;
    const isConfirmed = window.confirm(`Delete rule set "${targetRuleset.name}"? This removes its rules from this project.`);

    if (!isConfirmed) {
      return;
    }

    const nextRuleset = (rulesets ?? []).find((rs) => rs.id !== targetRuleset.id) ?? null;
    deleteRuleset(targetRuleset.id);

    if (nextRuleset) {
      onSelectRuleset?.(nextRuleset.id);
    }

    toast.success(`Rule set "${targetRuleset.name}" deleted.`);
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

  const handleNavigateTuneRule = useCallback(
    (ruleId: string) => {
      const ownerRuleset = ruleOwnerById.get(ruleId) ?? ruleset;

      setSelectedIds([ruleId]);
      useRulesStore.getState().setSelection([ruleId], "tree.tune");
      void navigate({
        to: "/projects/$projectId/rulesets/$rulesetId/tune/$ruleId",
        params: { projectId, rulesetId: ownerRuleset.id, ruleId },
      });
    },
    [navigate, projectId, ruleOwnerById, ruleset],
  );

  const handleSelectProjectRule = useCallback(
    (id: string) => {
      const ownerRuleset = ruleOwnerById.get(id);

      if (ownerRuleset && ownerRuleset.id !== ruleset.id) {
        onSelectRuleset?.(ownerRuleset.id);
      }

      setSelectedIds([id]);
      useRulesStore.getState().setSelection([id], "project.rule.select");
    },
    [onSelectRuleset, ruleOwnerById, ruleset.id],
  );

  const handleLaunchPatternTuner = useCallback(() => {
    if (activeRule) {
      handleNavigateTuneRule(activeRule.id);
    }
  }, [activeRule, handleNavigateTuneRule]);

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
      const ownerRules = ownerRuleset.id === ruleset.id ? rules : ownerRuleset.rules ?? [];
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

      if (ownerRuleset.id === ruleset.id) {
        useRulesStore.getState().replaceAll(nextRules, selectedIds, []);
      }

      toast.success("Camera settings updated for rule");
    },
    [ruleOwnerById, rules, ruleset, selectedIds, updateRulesetRules],
  );

  const handleUpdateRuleLightSettings = useCallback(
    (ruleId: string, lightSettings: RuleLightSettings) => {
      const ownerRuleset = ruleOwnerById.get(ruleId) ?? ruleset;
      const ownerRules = ownerRuleset.id === ruleset.id ? rules : ownerRuleset.rules ?? [];
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

      if (ownerRuleset.id === ruleset.id) {
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
        const ownerRuleset = ruleOwnerById.get(id) ?? ruleset;
        const ownerRules = ownerRuleset.id === ruleset.id ? rules : ownerRuleset.rules ?? [];
        const next = ownerRules.map((r) => (r.id === id ? { ...r, isHidden: !r.isHidden } : r));
        updateRulesetRules(ownerRuleset.id, next);

        if (ownerRuleset.id === ruleset.id) {
          useRulesStore.getState().replaceAll(next, selectedIds, []);
        }
      },
      onDelete: (id: string) => {
        const ownerRuleset = ruleOwnerById.get(id) ?? ruleset;
        const ownerRules = ownerRuleset.id === ruleset.id ? rules : ownerRuleset.rules ?? [];
        const target = ownerRules.find((r) => r.id === id);
        const next = ownerRules.filter((r) => r.id !== id);
        updateRulesetRules(ownerRuleset.id, next);

        if (ownerRuleset.id === ruleset.id) {
          useRulesStore.getState().replaceAll(next, [], []);
        }

        if (target) toast.success(`Rule "${target.name}" deleted.`);
      },
      onReorder: (id: string, dir: "up" | "down") => {
        const ownerRuleset = ruleOwnerById.get(id) ?? ruleset;
        const ownerRules = ownerRuleset.id === ruleset.id ? rules : ownerRuleset.rules ?? [];
        const idx = ownerRules.findIndex((r) => r.id === id);
        if (idx === -1) return;
        const targetIdx = dir === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= ownerRules.length) return;
        const next = [...ownerRules];
        const [moved] = next.splice(idx, 1);
        next.splice(targetIdx, 0, moved);
        updateRulesetRules(ownerRuleset.id, next);

        if (ownerRuleset.id === ruleset.id) {
          useRulesStore.getState().replaceAll(next, selectedIds, []);
        }
      },
    }),
    [ruleOwnerById, rules, ruleset, selectedIds, updateRulesetRules],
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

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#111] text-ca-ink">
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        {/* 1. Top Ribbon */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#333] bg-[#1e1e1e] px-3 py-1">
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
              className="rounded bg-ca-select px-3 py-1 text-xs font-bold uppercase text-black disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                void navigate({
                  to: "/projects/$projectId/categories",
                  params: { projectId },
                });
              }}
              className="rounded border border-[#444] bg-[#2d2d2d] px-3 py-1 text-xs font-bold uppercase text-white transition-colors hover:bg-[#3d3d3d]"
            >
              Categories
            </button>
            <button
              type="button"
              onClick={() => {
                void navigate({
                  to: "/projects/$projectId/trial-run",
                  params: { projectId },
                });
              }}
              className="rounded border border-[#444] bg-[#2d2d2d] px-3 py-1 text-xs font-bold uppercase text-white transition-colors hover:bg-[#3d3d3d]"
            >
              Trial Run
            </button>
          </div>
        </div>

        {/* 2. Horizontal rule/tool thumbnail strip */}
        <div className="flex min-h-[44px] shrink-0 items-center gap-2 overflow-x-auto border-b border-[#333] bg-[#252525] p-1">
          {/* Add Ruleset Tile */}
          <button
            onClick={handleStartAddRuleset}
            className="flex h-9 w-24 shrink-0 items-center justify-center gap-1 rounded border border-[#444] bg-[#1a1a1a] transition-colors hover:border-amber-400"
          >
            <Plus size={14} className="text-amber-500" />
            <span className="text-[10px] text-amber-500 font-bold uppercase">Add Ruleset</span>
          </button>

          {isAddingRuleset ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmitRuleset();
              }}
              className="flex h-9 w-64 shrink-0 items-center gap-2 rounded border border-amber-500/70 bg-amber-950/20 px-2"
            >
              <input
                value={draftRulesetName}
                onChange={(event) => setDraftRulesetName(event.target.value)}
                autoFocus
                className="min-w-0 flex-1 rounded border border-[#444] bg-[#0b0c10] px-2 py-1 text-xs text-ca-ink outline-none focus:border-amber-400"
                placeholder="Ruleset name"
              />
              <button
                type="submit"
                className="rounded bg-amber-400 px-2 py-1 text-[10px] font-bold uppercase text-black"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingRuleset(false);
                  setDraftRulesetName("");
                }}
                className="rounded border border-[#444] px-2 py-1 text-[10px] font-bold uppercase text-ca-ink-muted hover:text-ca-ink"
              >
                Cancel
              </button>
            </form>
          ) : null}
          
          {/* Add Rule Tile */}
          <button
            onClick={() => handleNavigateAddRule()}
            className="flex h-9 w-24 shrink-0 items-center justify-center gap-1 rounded border border-[#444] bg-[#1a1a1a] transition-colors hover:border-ca-select"
          >
            <Plus size={14} className="text-ca-ink-muted" />
            <span className="text-[10px] text-ca-ink-muted font-bold uppercase">Add Rule</span>
          </button>
          
          {/* Set Camera Tile */}
          <button
            onClick={() => {
              void navigate({
                to: "/projects/$projectId/camera",
                params: { projectId },
              });
            }}
            className="flex h-9 w-24 shrink-0 items-center justify-center gap-1 rounded border border-[#444] bg-[#1a1a1a] transition-colors hover:border-cyan-400"
          >
            <Camera size={14} className="text-ca-ink-muted" />
            <span className="text-[10px] text-ca-ink-muted font-bold uppercase">Set Camera</span>
          </button>

          {/* Rule Tiles */}
          {projectAnalysisItems.map(({ ruleset: ownerRuleset, rule: r }, idx) => {
            const isSelected = activeRule?.id === r.id;
            const rResult = allValidationResults[r.id];
            const isPass = rResult?.status === "pass";
            const isFail = rResult?.status === "fail";
            const toolCode = getRuleToolCode(r);
            const ToolIcon = getToolIcon(toolCode, r.name);
            
            return (
              <button
                key={r.id}
                onClick={() => {
                  if (ownerRuleset.id !== ruleset.id) {
                    onSelectRuleset?.(ownerRuleset.id);
                  }

                  setSelectedIds([r.id]);
                  useRulesStore.getState().setSelection([r.id], "thumbnail-strip");
                }}
                className={`relative flex h-9 w-32 shrink-0 items-center justify-center gap-1 rounded border bg-[#1a1a1a] px-6 transition-colors ${isSelected ? "border-amber-400 bg-amber-400/10" : "border-[#444] hover:border-[#666]"}`}
              >
                <span className="text-[10px] text-ca-ink-muted absolute top-1 left-1">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <ToolIcon
                  size={16}
                  className={isSelected ? "shrink-0 text-amber-400" : "shrink-0 text-ca-ink-muted"}
                  aria-hidden
                />
                <span className={`text-[10px] font-bold truncate w-full px-1 ${isSelected ? "text-amber-400" : "text-ca-ink"}`}>
                  {r.name}
                </span>
                {toolCode ? (
                  <span className="absolute right-1 top-1 rounded bg-[#2d2d2d] px-1 text-[9px] font-mono text-ca-ink-muted">
                    {toolCode}
                  </span>
                ) : null}
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${isPass ? "bg-emerald-500" : isFail ? "bg-red-500" : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>

        {/* 3 & 4. Main workspace (left inspection program, right camera/current image viewport) */}
        <div className="grid min-h-0 flex-1 grid-cols-[420px_minmax(0,1fr)] bg-[#111]">
          {/* Left: inspection hierarchy tree */}
          <div className="flex min-w-0 flex-col gap-1 overflow-hidden border-r border-[#333] bg-[#1a1a1a] p-1">
            <InspectionHierarchyTree
              project={project}
              ruleset={ruleset}
              rulesets={projectRulesetsForAnalysis}
              onSelectRuleset={onSelectRuleset}
              rules={projectOverlayRules}
              selectedRuleId={activeRule?.id ?? null}
              onSelectRule={handleSelectProjectRule}
              onToggleHidden={railHandlers.onToggleHidden}
              onDeleteRule={railHandlers.onDelete}
              onReorderRule={railHandlers.onReorder}
              onAddRuleClick={handleNavigateAddRule}
              onAddRulesetClick={handleStartAddRuleset}
              onDeleteRulesetClick={handleDeleteRuleset}
              onTuneRule={handleNavigateTuneRule}
              onUpdateCameraSettings={handleUpdateRuleCameraSettings}
              onUpdateLightSettings={handleUpdateRuleLightSettings}
            />
            <section className="shrink-0 rounded border border-ca-border/70 bg-ca-panel/90 p-1.5">
              <div className="mb-1 flex items-center justify-between">
                <div>
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-ca-ink">
                    Image Samples
                  </h2>
                  <p className="text-[9px] text-ca-ink-muted">
                    {ruleset.imageRef ? "1 registered reference" : "No reference registered"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="rounded border border-ca-border bg-ca-panel-2 px-2 py-1 text-[10px] font-semibold text-ca-ink hover:border-ca-select"
                >
                  Upload
                </button>
              </div>
              <div className="h-10 overflow-hidden rounded border border-ca-border/60 bg-[#0b0c10]">
                <img
                  src={ruleset.imageRef || defaultWorkpieceFilledSample}
                  alt="Current inspection reference"
                  className="h-full w-full object-cover opacity-90"
                />
              </div>
            </section>
          </div>

          {/* Right: camera/current image viewport */}
          <div className="relative flex min-w-0 flex-col overflow-hidden p-1">
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
                onSelectRule={handleSelectProjectRule}
                onLaunchPatternTuner={handleLaunchPatternTuner}
                onPatternBoxesChange={handlePatternBoxesChange}
                validationStatus={activeValidationResult?.status}
                validationScore={activeValidationResult?.score}
                validationResultsMap={allValidationResults}
                onRunAnalysis={handleManualRunAnalysis}
                isAnalyzing={isAnalyzing}
              />
          </div>
        </div>

        {/* 5. Bottom action bar */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[#333] bg-[#1e1e1e] p-1">
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
            className="flex items-center gap-2 rounded border border-[#444] bg-[#2d2d2d] px-3 py-1.5 text-xs font-bold uppercase text-white transition-colors hover:bg-[#3d3d3d]"
          >
            <FileImage size={14} />
            Register Image
          </button>
          <button
            type="button"
            onClick={handleManualRunAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 rounded bg-emerald-600 px-5 py-1.5 text-xs font-bold uppercase text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            <Play size={14} className={isAnalyzing ? "animate-spin" : ""} />
            {isAnalyzing ? "Running..." : "Run"}
          </button>
        </div>
      </div>
    </div>
  );
}
