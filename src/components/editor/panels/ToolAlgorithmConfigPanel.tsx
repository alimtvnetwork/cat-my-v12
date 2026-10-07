import React from "react";
import { Sliders, Cpu, Info, Sparkles } from "lucide-react";
import type { EditorRule, EditorRuleParams } from "@/lib/editor/types";
import { findVisionTool, VISION_TOOL_CATALOG } from "@/lib/vision/tool-catalog";
import { visualTunerBus } from "@/lib/editor/selection/visual-tuner-bus";

export interface ToolAlgorithmConfigPanelProps {
  rule: EditorRule;
  onUpdateParams?: (id: string, params: EditorRuleParams) => void;
}

export function ToolAlgorithmConfigPanel({
  rule,
  onUpdateParams,
}: ToolAlgorithmConfigPanelProps): React.JSX.Element | null {
  const toolCode = typeof rule.params?.toolCode === "string" ? rule.params.toolCode : undefined;
  const tool = toolCode ? findVisionTool(toolCode) : undefined;
  const category = rule.categoryName ?? (typeof rule.params?.category === "string" ? rule.params.category : undefined);

  function handleParamChange(key: string, value: string | number | boolean) {
    if (!onUpdateParams) return;
    const nextParams: EditorRuleParams = {
      ...(rule.params ?? {}),
      [key]: value,
    };
    onUpdateParams(rule.id, nextParams);
  }

  return (
    <div
      className="editor-tool-config-panel flex flex-col gap-2 rounded border border-ca-border/70 bg-ca-panel-2/30 p-2 text-xs"
      data-testid="tool-algorithm-config-panel"
    >
      <header className="flex items-center justify-between border-b border-ca-border/50 pb-1.5">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-ca-ink">
          <Sliders size={13} className="text-ca-select" />
          Tool Algorithm
        </span>
        {toolCode ? (
          <span className="rounded bg-ca-select/20 px-1.5 py-0.2 font-mono text-[10px] font-bold text-ca-select">
            [{toolCode}]
          </span>
        ) : null}
      </header>

      {/* Metadata strip */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ca-ink-muted">
        {category ? (
          <span className="rounded bg-ca-panel px-1.5 py-0.5 font-semibold text-ca-ink border border-ca-border/40">
            {category}
          </span>
        ) : null}
        {tool ? (
          <span className="truncate text-ca-ink-muted">{tool.name}</span>
        ) : (
          <span className="italic">Custom Rule</span>
        )}
      </div>

      {tool ? (
        <div className="mt-1 flex flex-col gap-2">
          {tool.params.map((param) => {
            const currentValue = rule.params?.[param.key] ?? param.defaultValue;

            return (
              <div
                key={param.key}
                className="flex flex-col gap-1 rounded border border-ca-border/40 bg-ca-panel p-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ca-ink">{param.label}</span>
                  {param.unit ? (
                    <span className="font-mono text-[10px] text-ca-ink-muted">{param.unit}</span>
                  ) : null}
                </div>

                {param.type === "number" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={param.min ?? 0}
                      max={param.max ?? 100}
                      step={param.step ?? 1}
                      value={Number(currentValue)}
                      disabled={rule.isLocked}
                      onChange={(e) => handleParamChange(param.key, Number(e.target.value))}
                      className="flex-1 accent-ca-select"
                    />
                    <input
                      type="number"
                      min={param.min ?? 0}
                      max={param.max ?? 100}
                      step={param.step ?? 1}
                      value={Number(currentValue)}
                      disabled={rule.isLocked}
                      onChange={(e) => handleParamChange(param.key, Number(e.target.value))}
                      className="w-14 rounded border border-ca-border bg-ca-panel-2 px-1 py-0.5 text-right font-mono text-[11px] text-ca-ink"
                    />
                  </div>
                ) : param.type === "select" && param.options ? (
                  <select
                    value={String(currentValue)}
                    disabled={rule.isLocked}
                    onChange={(e) => handleParamChange(param.key, e.target.value)}
                    className="w-full rounded border border-ca-border bg-ca-panel-2 px-1.5 py-0.5 text-xs text-ca-ink"
                  >
                    {param.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={String(currentValue)}
                    disabled={rule.isLocked}
                    onChange={(e) => handleParamChange(param.key, e.target.value)}
                    className="w-full rounded border border-ca-border bg-ca-panel-2 px-1.5 py-0.5 font-mono text-xs text-ca-ink"
                  />
                )}
              </div>
            );
          })}

            <div className="mt-1 border-t border-ca-border/40 pt-2">
              <button
                type="button"
                onClick={() => {
                  visualTunerBus.emit(rule.id);
                }}
                className="w-full flex items-center justify-center gap-1.5 rounded bg-ca-select/15 border border-ca-select/40 py-1.5 font-semibold text-ca-select hover:bg-ca-select/25 transition text-xs"
              >
                <Sparkles size={13} />
                {tool.id === "T102" || rule.name.toLowerCase().includes("pattern")
                  ? "Calibrate Pattern Visually"
                  : `Tune ${tool.name.replace(/ \(.*\)/, "")} Visually`}
              </button>
            </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-ca-ink-muted text-[11px] p-1">
          <Info size={13} className="shrink-0" />
          <span>No predefined vision tool bound. Rule operates as geometric boundary.</span>
        </div>
      )}
    </div>
  );
}
