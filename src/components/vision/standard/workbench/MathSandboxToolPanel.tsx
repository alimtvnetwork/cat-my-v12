import React from "react";
import { Check, X, Calculator, ShieldCheck, Play, Clock, ArrowRight, GitBranch } from "lucide-react";
import type {
  MathComparisonOperator,
  MathSandboxLimits,
  MathSandboxEvaluationResult,
} from "@/domain/execution/math-rule-types";

export interface AvailableVariable {
  name: string;
  value: number;
  label: string;
}

export interface MathSandboxToolPanelProps {
  expression: string;
  operator: MathComparisonOperator;
  limits: MathSandboxLimits;
  dependsOnRuleId: string;
  skipIfParentFailed: boolean;
  availableRules?: Array<{ id: string; name: string }>;
  availableVariables?: AvailableVariable[];
  evalResult: MathSandboxEvaluationResult | null;
  hasProcessed: boolean;
  actionButtonLabel?: string;
  onExpressionChange: (expr: string) => void;
  onOperatorChange: (op: MathComparisonOperator) => void;
  onLimitsChange: (limits: MathSandboxLimits) => void;
  onDependsOnRuleIdChange: (ruleId: string) => void;
  onSkipIfParentFailedChange: (skip: boolean) => void;
  onProcess: () => void;
  onApply: () => void;
  onCancel?: () => void;
}

export function MathSandboxToolPanel(props: MathSandboxToolPanelProps): React.JSX.Element {
  const label = props.actionButtonLabel ?? "OK - Apply to Rule";
  const isPass = props.evalResult?.isPass ?? true;

  const insertToken = (token: string) => {
    props.onExpressionChange(`${props.expression ? `${props.expression} ` : ""}${token}`);
  };

  return (
    <aside className="flex h-full flex-col overflow-hidden text-slate-100 font-sans">
      {/* Panel Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#212832] bg-[#121720] px-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
            Math Sandbox &amp; Gating
          </span>
        </div>
        <span className="rounded bg-cyan-950/80 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-400 border border-cyan-800/50">
          M301
        </span>
      </div>

      {/* Scrollable Controls */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* 1. Real-Time Math Evaluation Result Card */}
        <div
          className={`rounded-lg border p-3 transition-colors ${
            !props.hasProcessed
              ? "border-amber-500/40 bg-amber-950/20"
              : isPass
                ? "border-emerald-500/40 bg-emerald-950/20"
                : "border-rose-500/40 bg-rose-950/20"
          }`}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[#212832]">
            <div className="flex items-center gap-1.5">
              {!props.hasProcessed ? (
                <Clock className="h-4 w-4 text-amber-400 animate-pulse" />
              ) : (
                <ShieldCheck
                  className={`h-4 w-4 ${isPass ? "text-emerald-400" : "text-rose-400"}`}
                />
              )}
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Evaluation Output
              </span>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                !props.hasProcessed
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : isPass
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              }`}
            >
              {!props.hasProcessed ? "PENDING PROCESS" : isPass ? "PASS" : "FAIL"}
            </span>
          </div>

          <div className="pt-2">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-slate-400">Result Value:</span>
              <span className="font-mono text-sm font-black text-cyan-300">
                {props.evalResult?.value !== null && props.evalResult?.value !== undefined
                  ? typeof props.evalResult.value === "number"
                    ? props.evalResult.value.toFixed(4)
                    : String(props.evalResult.value)
                  : "---"}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400 truncate">
              {props.evalResult?.message ?? "Click 'Process Rule' to evaluate formula."}
            </div>
          </div>
        </div>

        {/* 2. Formula Expression Editor */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Formula Expression
          </label>
          <textarea
            value={props.expression}
            onChange={(e) => props.onExpressionChange(e.target.value)}
            rows={2}
            placeholder="e.g. abs(T110_Width - 12.5) or Circle_Diameter * 3.14159"
            className="w-full rounded border border-[#2d3748] bg-[#1a202c] p-2 font-mono text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
          />

          {/* Quick Math Buttons */}
          <div className="flex flex-wrap gap-1 pt-1">
            {["+", "-", "*", "/", "^", "abs()", "sqrt()", "min()", "max()", "round()"].map((btn) => (
              <button
                key={btn}
                type="button"
                onClick={() => insertToken(btn)}
                className="rounded border border-[#374151] bg-[#1e2633] px-2 py-0.5 font-mono text-[10px] text-cyan-300 hover:bg-[#2d3748] hover:text-white"
              >
                {btn}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Available Measurement Variables */}
        {props.availableVariables && props.availableVariables.length > 0 && (
          <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Upstream Variables (Click to Insert)
            </label>
            <div className="max-h-28 overflow-y-auto space-y-1">
              {props.availableVariables.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => insertToken(v.name)}
                  className="flex w-full items-center justify-between rounded bg-[#1a202c] px-2 py-1 text-left text-[11px] hover:bg-cyan-950/40 border border-transparent hover:border-cyan-500/30"
                >
                  <span className="font-mono text-cyan-300 font-bold">{v.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    = {v.value.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. DAG Execution Gating */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2.5">
          <div className="flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5 text-cyan-400" />
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              DAG Execution Gating
            </label>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block mb-1">
              Depends on Upstream Gate Rule:
            </span>
            <select
              value={props.dependsOnRuleId}
              onChange={(e) => props.onDependsOnRuleIdChange(e.target.value)}
              className="w-full rounded border border-[#2d3748] bg-[#1a202c] px-2 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="">None (Independent Execution)</option>
              {props.availableRules?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.id})
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={props.skipIfParentFailed}
              onChange={(e) => props.onSkipIfParentFailedChange(e.target.checked)}
              className="rounded border-[#2d3748] bg-[#1a202c] text-cyan-500 focus:ring-0"
            />
            <span className="text-[11px] text-slate-300">
              Skip Rule If Upstream Gate Fails
            </span>
          </label>
        </div>

        {/* 5. Judgment Limits & Tolerance */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Judgment Criteria &amp; Limits
          </label>

          <div>
            <span className="text-[10px] text-slate-400 block mb-1">Judgment Mode:</span>
            <select
              value={props.operator}
              onChange={(e) => props.onOperatorChange(e.target.value as MathComparisonOperator)}
              className="w-full rounded border border-[#2d3748] bg-[#1a202c] px-2 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="between">Range [Min, Max]</option>
              <option value="gte">&gt;= Min Limit</option>
              <option value="lte">&lt;= Max Limit</option>
              <option value="eq">== Nominal ± Tolerance</option>
              <option value="boolean">Boolean (True != 0)</option>
            </select>
          </div>

          {props.operator === "between" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Min Limit:</span>
                <input
                  type="number"
                  step="any"
                  value={props.limits.min ?? 0}
                  onChange={(e) =>
                    props.onLimitsChange({
                      ...props.limits,
                      min: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded border border-[#2d3748] bg-[#1a202c] px-2 py-1 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Max Limit:</span>
                <input
                  type="number"
                  step="any"
                  value={props.limits.max ?? 100}
                  onChange={(e) =>
                    props.onLimitsChange({
                      ...props.limits,
                      max: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded border border-[#2d3748] bg-[#1a202c] px-2 py-1 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {props.operator === "gte" && (
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">Minimum Value:</span>
              <input
                type="number"
                step="any"
                value={props.limits.min ?? 0}
                onChange={(e) =>
                  props.onLimitsChange({
                    ...props.limits,
                    min: Number.parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full rounded border border-[#2d3748] bg-[#1a202c] px-2 py-1 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          )}

          {props.operator === "lte" && (
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">Maximum Value:</span>
              <input
                type="number"
                step="any"
                value={props.limits.max ?? 100}
                onChange={(e) =>
                  props.onLimitsChange({
                    ...props.limits,
                    max: Number.parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full rounded border border-[#2d3748] bg-[#1a202c] px-2 py-1 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          )}

          {props.operator === "eq" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Nominal:</span>
                <input
                  type="number"
                  step="any"
                  value={props.limits.nominal ?? 0}
                  onChange={(e) =>
                    props.onLimitsChange({
                      ...props.limits,
                      nominal: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded border border-[#2d3748] bg-[#1a202c] px-2 py-1 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Tolerance (±):</span>
                <input
                  type="number"
                  step="any"
                  value={props.limits.tolerance ?? 0.1}
                  onChange={(e) =>
                    props.onLimitsChange({
                      ...props.limits,
                      tolerance: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded border border-[#2d3748] bg-[#1a202c] px-2 py-1 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer with Dual Buttons: Process Rule & Apply / OK */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-[#212832] bg-[#121720] p-3">
        <div className="flex items-center gap-2">
          {/* Button 1: Process */}
          <button
            type="button"
            onClick={props.onProcess}
            className="flex flex-1 items-center justify-center gap-2 rounded border border-cyan-500/70 bg-cyan-950/60 py-2.5 text-xs font-black uppercase tracking-wider text-cyan-300 shadow-md transition-all hover:bg-cyan-900/80 hover:text-white active:scale-[0.98]"
          >
            <Play size={14} className="fill-cyan-400 text-cyan-400" />
            Process Rule
          </button>

          {/* Button 2: Apply / OK */}
          <button
            type="button"
            onClick={props.onApply}
            className="flex flex-1 items-center justify-center gap-2 rounded bg-[#00ff9d] py-2.5 text-xs font-black uppercase tracking-wider text-black shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Check size={16} strokeWidth={3} />
            {label}
          </button>
        </div>

        {props.onCancel && (
          <button
            type="button"
            onClick={props.onCancel}
            className="flex w-full items-center justify-center rounded border border-[#374151] bg-[#1f2937] py-1.5 text-xs font-bold uppercase text-slate-400 transition-colors hover:bg-[#2d3748] hover:text-white"
          >
            <X size={13} className="mr-1" />
            Cancel
          </button>
        )}
      </div>
    </aside>
  );
}
