import React from "react";
import { Wand2, Search } from "lucide-react";
import { ToolIcon } from "./ToolIcon";
import type { CatalogTool, CatalogCategory } from "./types";

export interface StandardToolGridProps {
  category: CatalogCategory;
  tools: readonly CatalogTool[];
  selectedToolId: string;
  onSelectTool: (toolId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAutoTeach?: () => void;
}

export function StandardToolGrid({
  category,
  tools,
  selectedToolId,
  onSelectTool,
  searchQuery,
  onSearchChange,
  onAutoTeach,
}: StandardToolGridProps): React.JSX.Element {
  const preferredTool = tools.find((t) => t.isPreferred) ?? tools[0];

  const filteredTools = searchQuery.trim()
    ? tools.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.displayCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.badge.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : tools;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-ca-bg">
      {/* Sub-header Question & Search Strip */}
      <div className="px-4 py-2 bg-ca-panel-2 border-b border-ca-border flex flex-wrap items-center justify-between gap-2 shrink-0">
        <span className="text-xs font-semibold text-ca-ink flex items-center gap-1.5 font-mono">
          <span className="text-amber-500 font-bold">▶</span>
          {category.promptQuestion}
        </span>

        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-ca-ink-muted absolute left-2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter inspection tools..."
            className="pl-7 pr-2.5 py-1 text-xs bg-ca-bg border border-ca-border rounded text-ca-ink placeholder:text-ca-ink-muted focus:outline-none focus:border-amber-500 w-48 sm:w-60"
          />
        </div>
      </div>

      {/* Main Tools Container */}
      <div className="flex-1 overflow-auto p-3 sm:p-4 flex flex-col md:flex-row gap-4">
        {/* Preferred Tool / Auto-Teach Quick Action (Reference Image Feature) */}
        <div className="w-full md:w-44 shrink-0 flex flex-col gap-2">
          <div className="bg-ca-panel border border-ca-border rounded p-2.5 flex flex-col">
            <div className="bg-amber-500/15 border border-amber-500/40 rounded px-2 py-0.5 mb-2 text-center">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider font-mono">
                Preferred Tool
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onAutoTeach) {
                  onAutoTeach();
                } else if (preferredTool) {
                  onSelectTool(preferredTool.id);
                }
              }}
              className={`p-3 rounded border flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer ${
                preferredTool && selectedToolId === preferredTool.id
                  ? "border-amber-500 bg-amber-500/10 shadow-sm"
                  : "border-ca-border bg-ca-panel-2 hover:bg-ca-panel hover:border-ca-select"
              }`}
            >
              <div className="w-10 h-10 rounded border border-ca-border bg-ca-bg flex items-center justify-center text-amber-500">
                <Wand2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-ca-ink">Auto-Teach</span>
                <span className="text-[10px] text-ca-ink-muted">Automated Setup</span>
              </div>
            </button>
          </div>

          <div className="hidden md:flex flex-col bg-ca-panel/50 border border-ca-border/60 rounded p-2 text-[11px] text-ca-ink-muted leading-relaxed">
            <span className="font-semibold text-ca-ink text-[10px] uppercase font-mono mb-1">
              Industrial Guide:
            </span>
            Click any tool tile to review its algorithm profile and configure inspection tolerances.
          </div>
        </div>

        {/* Tools Grid */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 content-start">
          {filteredTools.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-ca-ink-muted">
              No tools matching &quot;{searchQuery}&quot; in this category.
            </div>
          ) : (
            filteredTools.map((tool) => {
              const isSelected = selectedToolId === tool.id;

              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onSelectTool(tool.id)}
                  className={`flex flex-col items-center justify-between p-3 rounded border text-center transition-all cursor-pointer group relative ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/10 shadow-md ring-1 ring-amber-500"
                      : "border-ca-border bg-ca-panel hover:bg-ca-panel-2 hover:border-ca-select"
                  }`}
                >
                  {/* tool.displayCode Badge */}
                  <span
                    className={`absolute top-2 right-2 text-[9px] font-mono px-1 rounded ${
                      isSelected
                        ? "bg-amber-500 text-slate-950 font-bold"
                        : "bg-ca-panel-2 text-ca-ink-muted border border-ca-border"
                    }`}
                  >
                    {tool.displayCode}
                  </span>

                  {/* Thumbnail / Graphic Icon */}
                  <div
                    className={`w-12 h-12 rounded border flex items-center justify-center mb-2 transition-colors ${
                      isSelected
                        ? "border-amber-500 bg-ca-bg text-amber-500 shadow-inner"
                        : "border-ca-border bg-ca-panel-2 text-ca-ink-muted group-hover:text-ca-ink"
                    }`}
                  >
                    <ToolIcon name={tool.iconName} className="w-6 h-6" />
                  </div>

                  {/* Title & Badge */}
                  <div className="flex flex-col items-center min-w-0 w-full">
                    <span className="text-xs font-bold text-ca-ink line-clamp-1 w-full">
                      {tool.name}
                    </span>
                    <span className="text-[10px] text-ca-ink-muted truncate w-full mt-0.5">
                      {tool.badge}
                    </span>
                  </div>

                  {/* Active Indicator Bar */}
                  <div
                    className={`h-0.5 w-8 rounded mt-2.5 transition-colors ${
                      isSelected ? "bg-amber-500" : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
