import React from "react";
import { CATALOG_CATEGORIES } from "./categories";
import { getToolsForCategory } from "./catalog-data";
import { CatalogCategoryIdType } from "./types";

export interface StandardCategoryGridProps {
  activeCategory: CatalogCategoryIdType;
  onSelectCategory: (category: CatalogCategoryIdType) => void;
}

export function StandardCategoryGrid({
  activeCategory,
  onSelectCategory,
}: StandardCategoryGridProps): React.JSX.Element {
  return (
    <div className="flex flex-col bg-ca-panel border-b border-ca-border select-none">
      <div className="px-3 py-1.5 bg-ca-panel-2 border-b border-ca-border flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ca-ink font-mono">
          Category Selection
        </span>
        <span className="text-[10px] text-ca-ink-muted">
          Select an inspection category to filter available tools
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-x divide-y sm:divide-y-0 divide-ca-border bg-ca-border">
        {CATALOG_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = activeCategory === cat.id;
          const count = getToolsForCategory(cat.id).length;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`flex flex-col items-center justify-center p-2.5 sm:p-3 text-center transition-all cursor-pointer relative group ${
                isSelected
                  ? "bg-ca-ink text-ca-bg font-bold shadow-inner"
                  : "bg-ca-panel text-ca-ink hover:bg-ca-panel-2 hover:text-ca-ink"
              }`}
            >
              {isSelected && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-ca-bg" />
              )}
              <div
                className={`p-1.5 rounded mb-1.5 ${
                  isSelected
                    ? "bg-black/20 text-ca-bg"
                    : "bg-ca-panel-2 text-ca-ink-muted group-hover:text-ca-ink"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold leading-tight line-clamp-1">
                {cat.label}
              </span>
              <span
                className={`text-[10px] mt-0.5 font-mono ${
                  isSelected ? "text-ca-bg/90 font-semibold" : "text-ca-ink-muted"
                }`}
              >
                {cat.id === CatalogCategoryIdType.FunctionList ? "All" : `${count} Tools`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
