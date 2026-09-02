import React from "react";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Settings,
  Plus,
  ArrowRight,
  Sliders,
  Sparkles,
  Layers,
  ChevronRight,
} from "lucide-react";
import type { CatalogTool, CatalogCategory } from "./types";
import type { Rule } from "@/lib/rules/model";

export interface StandardToolDetailPanelProps {
  tool: CatalogTool;
  category: CatalogCategory;
  connectedRules: readonly Rule[];
  onLaunchTool: (tool: CatalogTool, ruleId?: string) => void;
  onCreateRuleWithTool: (tool: CatalogTool) => void;
}

export function StandardToolDetailPanel({
  tool,
  category,
  connectedRules,
  onLaunchTool,
  onCreateRuleWithTool,
}: StandardToolDetailPanelProps): React.JSX.Element {
  return (
    <aside className="w-full lg:w-96 shrink-0 bg-ca-panel border-l border-ca-border flex flex-col min-h-0 overflow-y-auto">
      {/* Header with tool.displayCode and Name */}
      <div className="p-4 bg-ca-panel-2 border-b border-ca-border flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
            Tool ID: {tool.displayCode}
          </span>
          <span className="text-[10px] text-ca-ink-muted uppercase font-mono">
            {category.label}
          </span>
        </div>

        <h2 className="text-base font-bold text-ca-ink mt-1 flex items-center gap-2">
          {tool.name}
        </h2>
        <span className="text-xs text-ca-ink-muted">{tool.badge}</span>
      </div>

      {/* Body: Descriptions, Features, Judgment, and Rules */}
      <div className="p-4 flex-1 flex flex-col gap-4 text-xs">
        {/* Full Industrial Description */}
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-ca-ink-muted font-mono">
            Inspection Description
          </h3>
          <p className="text-ca-ink leading-relaxed bg-ca-bg/60 p-2.5 rounded border border-ca-border/70 text-xs">
            {tool.fullDesc}
          </p>
        </div>

        {/* Detection Features */}
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-ca-ink-muted font-mono flex items-center gap-1.5">
            <Sliders className="w-3 h-3 text-amber-500" />
            Detection Parameters
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {tool.detectionFeatures.map((feat) => (
              <div
                key={feat}
                className="bg-ca-panel-2 border border-ca-border rounded px-2 py-1 text-[11px] text-ca-ink flex items-center gap-1.5 truncate"
                title={feat}
              >
                <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                <span className="truncate">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Judgment Conditions */}
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-ca-ink-muted font-mono flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Judgment Criteria
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {tool.judgmentCriteria.map((crit) => (
              <div
                key={crit}
                className="bg-ca-panel-2 border border-ca-border rounded px-2 py-1 text-[11px] text-ca-ink flex items-center gap-1.5 truncate"
                title={crit}
              >
                <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{crit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Connected Rules Section */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-ca-ink-muted font-mono flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-blue-500" />
              Connected Rules ({connectedRules.length})
            </h3>
            <Link
              to="/setup/rules"
              className="text-[10px] text-ca-select hover:underline flex items-center"
            >
              All Rules <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {connectedRules.length === 0 ? (
            <div className="bg-ca-panel-2/60 border border-ca-border rounded p-2 text-[11px] text-ca-ink-muted text-center">
              No active rules configured for this tool yet.
            </div>
          ) : (
            <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
              {connectedRules.slice(0, 3).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onLaunchTool(tool, String(r.id))}
                  className="flex items-center justify-between p-2 rounded border border-ca-border bg-ca-panel-2 hover:bg-ca-bg hover:border-ca-select transition-colors text-left group"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-semibold text-ca-ink truncate text-[11px]">{r.name}</span>
                    <span className="text-[9px] text-ca-ink-muted font-mono">{r.id}</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-ca-ink-muted group-hover:text-ca-select shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="p-3 bg-ca-panel-2 border-t border-ca-border flex flex-col gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onLaunchTool(tool)}
          className="w-full py-2 px-3 bg-amber-500 text-slate-950 font-bold rounded text-xs flex items-center justify-center gap-1.5 hover:brightness-110 shadow-sm cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Configure / Launch Tool</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onCreateRuleWithTool(tool)}
            className="py-1.5 px-2 bg-ca-panel border border-ca-border text-ca-ink font-semibold rounded text-[11px] flex items-center justify-center gap-1 hover:bg-ca-bg hover:border-ca-select"
          >
            <Plus className="w-3 h-3" />
            <span>New Rule</span>
          </button>

          <Link
            to="/run"
            className="py-1.5 px-2 bg-ca-panel border border-ca-border text-ca-ink font-semibold rounded text-[11px] flex items-center justify-center gap-1 hover:bg-ca-bg hover:border-ca-select text-center"
          >
            <Sparkles className="w-3 h-3 text-emerald-500" />
            <span>Trial Run</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
