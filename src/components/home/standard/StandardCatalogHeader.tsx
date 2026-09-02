import React from "react";
import { Link } from "@tanstack/react-router";
import { Activity, HardDrive, Cpu, Layers } from "lucide-react";
import { DataSourceToggle } from "@/components/data-source/DataSourceToggle";
import { CATALOG_TOOLS } from "./tools";

export interface StandardCatalogHeaderProps {
  activeProjectName?: string;
  activeProjectId?: string;
}

export function StandardCatalogHeader({
  activeProjectName,
  activeProjectId,
}: StandardCatalogHeaderProps): React.JSX.Element {
  return (
    <div className="bg-ca-panel border-b border-ca-border px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-4">
        {/* Line Status */}
        <div className="flex items-center gap-2 pr-4 border-r border-ca-border">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-ca-ink-muted">
            Status:
          </span>
          <span className="text-xs font-bold text-emerald-500 font-mono">HMI READY</span>
        </div>

        {/* Active Project */}
        <div className="flex items-center gap-2 pr-4 border-r border-ca-border">
          <HardDrive className="w-3.5 h-3.5 text-ca-ink-muted" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-ca-ink-muted">
            Project:
          </span>
          {activeProjectId ? (
            <Link
              to="/projects/$projectId"
              params={{ projectId: activeProjectId }}
              className="text-xs font-bold text-ca-select hover:underline font-mono"
            >
              {activeProjectName || activeProjectId}
            </Link>
          ) : (
            <span className="text-xs font-semibold text-ca-ink font-mono">
              {activeProjectName || "Default Workspace"}
            </span>
          )}
        </div>

        {/* System Mode */}
        <div className="hidden sm:flex items-center gap-2 pr-4 border-r border-ca-border">
          <Cpu className="w-3.5 h-3.5 text-ca-ink-muted" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-ca-ink-muted">
            Mode:
          </span>
          <span className="text-xs font-semibold text-ca-ink font-mono">Tool Catalog HMI</span>
        </div>

        {/* Total Available Tools */}
        <div className="hidden md:flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-ca-ink-muted" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-ca-ink-muted">
            Available Tools:
          </span>
          <span className="text-xs font-bold text-amber-500 font-mono">
            {CATALOG_TOOLS.length} Units
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <DataSourceToggle />
      </div>
    </div>
  );
}
