import React, { useCallback, useMemo, useState } from "react";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type {
  MathComparisonOperator,
  MathSandboxLimits,
  MathSandboxEvaluationResult,
} from "@/domain/execution/math-rule-types";
import { evaluateMathExpression } from "@/lib/execution/math-sandbox";
import { useStandardWorkbench } from "../workbench/useStandardWorkbench";
import { StandardWorkbenchShell } from "../workbench/StandardWorkbenchShell";
import { StandardWorkbenchCanvas } from "../workbench/StandardWorkbenchCanvas";
import {
  MathSandboxToolPanel,
  type AvailableVariable,
} from "../workbench/MathSandboxToolPanel";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { useValidationStore } from "@/lib/editor/validation-store";

export interface StandardMathSandboxToolProps {
  settings: PatternSearchSettings;
  onChange: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  onEvaluate?: () => void;
  onCancel?: () => void;
  onOk?: () => void;
  onSettings?: () => void;
  onRegisterImage?: () => void;
  onOriginPoint?: () => void;
  onDisplay?: () => void;
  onRefresh?: () => void;
  imageRef?: string;
  onImageRegistered?: (url: string) => void;
  actionButtonLabel?: string;
}

export function StandardMathSandboxTool(
  props: StandardMathSandboxToolProps,
): React.JSX.Element {
  const workbench = useStandardWorkbench({
    settings: props.settings,
    onChange: props.onChange,
    imageRef: props.imageRef,
    onImageRegistered: props.onImageRegistered,
  });

  const initialParams = (props.settings.params as Record<string, unknown> | undefined) ?? {};

  const [expression, setExpression] = useState<string>(
    String(initialParams.expression ?? initialParams.mathExpression ?? "LeadPitch >= 1.2 && LeadPitch <= 1.4"),
  );
  const [operator, setOperator] = useState<MathComparisonOperator>(
    (initialParams.operator as MathComparisonOperator) ?? "between",
  );
  const [limits, setLimits] = useState<MathSandboxLimits>({
    min: Number(initialParams.minLimit ?? (initialParams.limits as any)?.min ?? 0),
    max: Number(initialParams.maxLimit ?? (initialParams.limits as any)?.max ?? 100),
    nominal: Number(initialParams.nominal ?? (initialParams.limits as any)?.nominal ?? 1.27),
    tolerance: Number(initialParams.tolerance ?? (initialParams.limits as any)?.tolerance ?? 0.05),
  });
  const [dependsOnRuleId, setDependsOnRuleId] = useState<string>(
    String(initialParams.dependsOnRuleId ?? initialParams.gatingParentRuleId ?? ""),
  );
  const [skipIfParentFailed, setSkipIfParentFailed] = useState<boolean>(
    typeof initialParams.skipIfParentFailed === "boolean" ? initialParams.skipIfParentFailed : true,
  );

  // Explicit processing state: no tool auto-analyzes
  const [hasProcessed, setHasProcessed] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<MathSandboxEvaluationResult | null>(null);

  // Available rules from rulesStore
  const allRules = useRulesStore((s) => s.rules);
  const availableRules = useMemo(() => {
    return allRules
      .filter((r) => r.id !== props.settings.id)
      .map((r) => ({ id: r.id, name: r.name }));
  }, [allRules, props.settings.id]);

  // Read latest validation results from validation store to build live variables
  const activeRulesetId = useValidationStore((s) => s.activeRulesetId);
  const runs = useValidationStore((s) => s.runs);

  const availableVariables = useMemo<AvailableVariable[]>(() => {
    const list: AvailableVariable[] = [];
    const currentRun = activeRulesetId ? runs[activeRulesetId] : null;
    const resultsMap = currentRun?.results ?? {};

    for (const rule of allRules) {
      if (rule.id === props.settings.id) continue;

      const res = resultsMap[rule.id];
      const score = res?.score ?? 1.0;
      const sanitized = rule.name.replace(/[^a-zA-Z0-9_]/g, "_");

      list.push({
        name: `${sanitized}_score`,
        value: score,
        label: `${rule.name} Score`,
      });

      if (res?.debug && typeof res.debug === "object") {
        for (const [k, v] of Object.entries(res.debug)) {
          if (typeof v === "number" && Number.isFinite(v)) {
            list.push({
              name: `${sanitized}_${k}`,
              value: v,
              label: `${rule.name} ${k}`,
            });
          }
        }
      }
    }

    // Default simulation variables if rules haven't run yet
    if (list.length === 0) {
      list.push(
        { name: "LeadPitch", value: 1.27, label: "Lead Pitch (mm)" },
        { name: "Circle_Diameter", value: 50.2, label: "Circle Diameter (px)" },
        { name: "T110_Width", value: 12.45, label: "Caliper Width (px)" },
        { name: "T101_Area", value: 1420, label: "Area Gate (px)" },
        { name: "Pin1_Score", value: 0.98, label: "Pin1 Score" },
      );
    }

    return list;
  }, [allRules, activeRulesetId, runs, props.settings.id]);

  const handleProcess = useCallback(() => {
    const vars: Record<string, number> = {};

    for (const item of availableVariables) {
      vars[item.name] = item.value;
    }

    const result = evaluateMathExpression({
      expression,
      variables: vars,
      limits,
      operator,
    });

    setEvalResult(result);
    setHasProcessed(true);
  }, [expression, availableVariables, limits, operator]);

  const handleApply = useCallback(() => {
    props.onChange((prev) => ({
      ...prev,
      params: {
        ...(prev.params as Record<string, unknown>),
        toolCode: "M301",
        category: "MathematicalOperations",
        expression,
        operator,
        limits,
        minLimit: limits.min,
        maxLimit: limits.max,
        nominal: limits.nominal,
        tolerance: limits.tolerance,
        dependsOnRuleId: dependsOnRuleId || undefined,
        skipIfParentFailed,
        hasParentGate: Boolean(dependsOnRuleId),
        measuredValue: evalResult?.value ?? null,
      },
    }));

    if (props.onOk) {
      props.onOk();
    }
  }, [
    props,
    expression,
    operator,
    limits,
    dependsOnRuleId,
    skipIfParentFailed,
    evalResult,
  ]);

  const renderCustomOverlays = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.save();
      ctx.fillStyle = "rgba(10, 14, 20, 0.85)";
      ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
      ctx.lineWidth = 1;
      const boxW = Math.min(width - 40, 360);
      const boxH = 90;
      ctx.fillRect(20, 20, boxW, boxH);
      ctx.strokeRect(20, 20, boxW, boxH);

      ctx.font = "bold 11px monospace";
      ctx.fillStyle = "#22d3ee";
      ctx.fillText("M301 MATH SANDBOX EXPRESSION", 32, 42);

      ctx.font = "12px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(expression || "1.0", 32, 64);

      if (hasProcessed && evalResult) {
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = evalResult.isPass ? "#4ade80" : "#f87171";
        const valText =
          typeof evalResult.value === "number"
            ? evalResult.value.toFixed(4)
            : String(evalResult.value);
        ctx.fillText(`Result: ${valText} [${evalResult.isPass ? "PASS" : "FAIL"}]`, 32, 86);
      }
      ctx.restore();
    },
    [expression, hasProcessed, evalResult],
  );

  return (
    <StandardWorkbenchShell
      toolName="Math Sandbox & Execution Gating"
      toolCode="M301"
      isCameraOpen={workbench.isCameraOpen}
      onCloseCamera={() => workbench.setIsCameraOpen(false)}
      onCaptureCameraFrame={workbench.handleCaptureFrame}
      onLoadFile={workbench.handleLoadFile}
      onProcess={handleProcess}
      onRefresh={handleProcess}
      canvas={
        <StandardWorkbenchCanvas
          source={workbench.source}
          searchRegion={workbench.searchRegion}
          dragState={workbench.dragState}
          hasFilteredPreview={workbench.hasFilteredPreview}
          hasOverlays={workbench.hasOverlays}
          filterModeLabel="FILTERED (Math Feature Anchor)"
          toolBadge="M301 MATH SANDBOX"
          statusText={
            hasProcessed
              ? `VAL ${evalResult?.value !== null && evalResult?.value !== undefined ? (typeof evalResult.value === "number" ? evalResult.value.toFixed(3) : String(evalResult.value)) : "---"} [${evalResult?.isPass ? "PASS" : "FAIL"}]`
              : "PENDING PROCESS"
          }
          isPass={hasProcessed ? evalResult?.isPass : undefined}
          onSearchRegionChange={(region) => {
            workbench.handleRegionChange(region);
            setHasProcessed(false);
          }}
          onDragStateChange={workbench.setDragState}
          onToggleFilteredPreview={workbench.toggleFilteredPreview}
          onResetRegion={workbench.resetRegion}
          renderCustomOverlays={renderCustomOverlays}
        />
      }
      inspectorPanel={
        <MathSandboxToolPanel
          expression={expression}
          operator={operator}
          limits={limits}
          dependsOnRuleId={dependsOnRuleId}
          skipIfParentFailed={skipIfParentFailed}
          availableRules={availableRules}
          availableVariables={availableVariables}
          evalResult={evalResult}
          hasProcessed={hasProcessed}
          actionButtonLabel={props.actionButtonLabel}
          onExpressionChange={(expr) => {
            setExpression(expr);
            setHasProcessed(false);
          }}
          onOperatorChange={(op) => {
            setOperator(op);
            setHasProcessed(false);
          }}
          onLimitsChange={(lim) => {
            setLimits(lim);
            setHasProcessed(false);
          }}
          onDependsOnRuleIdChange={setDependsOnRuleId}
          onSkipIfParentFailedChange={setSkipIfParentFailed}
          onProcess={handleProcess}
          onApply={handleApply}
          onCancel={props.onCancel}
        />
      }
    />
  );
}
