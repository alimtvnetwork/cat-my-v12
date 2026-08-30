import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Sliders,
  PlayCircle,
  Activity,
  FolderOpen,
  Sparkles,
  AlertTriangle,
  FileSpreadsheet,
  Settings,
  Camera,
  Sun,
  Tags,
  Plus,
  ArrowRight,
  HardDrive,
  Cpu,
} from "lucide-react";
import { StandardAppShell } from "@/components/layout/StandardAppShell";
import { DataSourceToggle } from "@/components/data-source/DataSourceToggle";

export interface StandardHomeViewProps {
  recentProjects?: Array<{ projectId: string; name: string; openedAt: number }>;
}

export function StandardHomeView({ recentProjects = [] }: StandardHomeViewProps): React.JSX.Element {
  const recent = recentProjects;
  const navigate = useNavigate();
  const topProject = recent[0];


  return (
    <StandardAppShell activeNav="home" title="System Dashboard" subtitle="Industrial Vision Controller">
      <div className="flex-1 flex flex-col p-4 gap-4 max-w-7xl mx-auto w-full">
        {/* System Line & Telemetry Status Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-ca-panel border border-ca-border rounded p-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-mono text-ca-ink-muted uppercase">Line Status</span>
              <span className="font-bold text-sm text-emerald-500 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                ONLINE / ACTIVE
              </span>
            </div>
            <Activity className="w-5 h-5 text-ca-ink-muted" />
          </div>

          <div className="bg-ca-panel border border-ca-border rounded p-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-mono text-ca-ink-muted uppercase">Inspection Mode</span>
              <span className="font-bold text-sm text-ca-ink mt-0.5">Standard HMI</span>
            </div>
            <Cpu className="w-5 h-5 text-ca-ink-muted" />
          </div>

          <div className="bg-ca-panel border border-ca-border rounded p-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-mono text-ca-ink-muted uppercase">Active Project</span>
              <span className="font-bold text-sm text-ca-ink truncate max-w-[140px] mt-0.5">
                {topProject ? topProject.name : "None (Default)"}
              </span>
            </div>
            <HardDrive className="w-5 h-5 text-ca-ink-muted" />
          </div>

          <div className="bg-ca-panel border border-ca-border rounded p-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-mono text-ca-ink-muted uppercase">Data Source</span>
              <div className="mt-1">
                <DataSourceToggle />
              </div>
            </div>
          </div>
        </div>

        {/* Primary Operational Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Setup Group */}
          <div className="bg-ca-panel border border-ca-border rounded flex flex-col">
            <div className="bg-ca-panel-2 border-b border-ca-border px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-ca-select" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-ca-ink">
                  Configuration & Setup
                </h2>
              </div>
              <Link
                to="/setup"
                className="text-[11px] font-semibold text-ca-select hover:underline flex items-center gap-0.5"
              >
                Open Hub <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-3 flex flex-col gap-2 flex-1">
              <p className="text-xs text-ca-ink-muted">
                Configure camera sensors, reference images, lighting, and inspection rule parameters.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                <Link
                  to="/setup/rules"
                  className="flex items-center gap-2 p-2 rounded border border-ca-border bg-ca-panel-2 hover:bg-ca-panel hover:border-ca-select transition-colors text-xs font-medium text-ca-ink"
                >
                  <Tags className="w-3.5 h-3.5 text-ca-ink-muted" />
                  <span>Rules Library</span>
                </Link>
                <Link
                  to="/setup/camera"
                  className="flex items-center gap-2 p-2 rounded border border-ca-border bg-ca-panel-2 hover:bg-ca-panel hover:border-ca-select transition-colors text-xs font-medium text-ca-ink"
                >
                  <Camera className="w-3.5 h-3.5 text-ca-ink-muted" />
                  <span>Camera Setup</span>
                </Link>
                <Link
                  to="/settings/lighting"
                  className="flex items-center gap-2 p-2 rounded border border-ca-border bg-ca-panel-2 hover:bg-ca-panel hover:border-ca-select transition-colors text-xs font-medium text-ca-ink"
                >
                  <Sun className="w-3.5 h-3.5 text-ca-ink-muted" />
                  <span>Lighting</span>
                </Link>
                <Link
                  to="/setup/roi"
                  search={{ project: undefined, ruleset: undefined, rule: undefined }}
                  className="flex items-center gap-2 p-2 rounded border border-ca-border bg-ca-panel-2 hover:bg-ca-panel hover:border-ca-select transition-colors text-xs font-medium text-ca-ink"
                >
                  <Sliders className="w-3.5 h-3.5 text-ca-ink-muted" />
                  <span>ROI Setup</span>
                </Link>


              </div>
            </div>
          </div>

          {/* Execution & Ops Group */}
          <div className="bg-ca-panel border border-ca-border rounded flex flex-col">
            <div className="bg-ca-panel-2 border-b border-ca-border px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-emerald-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-ca-ink">
                  Execution & Ops
                </h2>
              </div>
              <Link
                to="/run"
                className="text-[11px] font-semibold text-ca-select hover:underline flex items-center gap-0.5"
              >
                Launch Run <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-3 flex flex-col gap-2 flex-1">
              <p className="text-xs text-ca-ink-muted">
                Execute live inspections, monitor high-speed camera streams, and review real-time verdicts.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                <Link
                  to="/run"
                  className="flex items-center gap-2 p-2 rounded border border-ca-border bg-ca-panel-2 hover:bg-ca-panel hover:border-ca-select transition-colors text-xs font-medium text-ca-ink"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Run Trial</span>
                </Link>
                <Link
                  to="/ops"
                  className="flex items-center gap-2 p-2 rounded border border-ca-border bg-ca-panel-2 hover:bg-ca-panel hover:border-ca-select transition-colors text-xs font-medium text-ca-ink"
                >
                  <Activity className="w-3.5 h-3.5 text-blue-500" />
                  <span>Live Ops</span>
                </Link>
                <Link
                  to="/results"
                  className="flex items-center gap-2 p-2 rounded border border-ca-border bg-ca-panel-2 hover:bg-ca-panel hover:border-ca-select transition-colors text-xs font-medium text-ca-ink col-span-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-ca-ink-muted" />
                  <span>Inspection Results & Export</span>
                </Link>
              </div>
            </div>
          </div>

          {/* System & Maintenance Group */}
          <div className="bg-ca-panel border border-ca-border rounded flex flex-col">
            <div className="bg-ca-panel-2 border-b border-ca-border px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-ca-ink">
                  Diagnostics & System
                </h2>
              </div>
              <Link
                to="/diagnostics"
                className="text-[11px] font-semibold text-ca-select hover:underline flex items-center gap-0.5"
              >
                Diagnostics <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-3 flex flex-col gap-2 flex-1">
              <p className="text-xs text-ca-ink-muted">
                Review hardware diagnostics, alarm/error history, license keys, and trigger timing.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                <Link
                  to="/diagnostics"
                  className="flex items-center gap-2 p-2 rounded border border-ca-border bg-ca-panel-2 hover:bg-ca-panel hover:border-ca-select transition-colors text-xs font-medium text-ca-ink"
                >
                  <Sparkles className="w-3.5 h-3.5 text-ca-ink-muted" />
                  <span>Diagnostics</span>
                </Link>
                <Link
                  to="/errors"
                  className="flex items-center gap-2 p-2 rounded border border-ca-border bg-ca-panel-2 hover:bg-ca-panel hover:border-ca-select transition-colors text-xs font-medium text-ca-ink"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Error Alarms</span>
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 p-2 rounded border border-ca-border bg-ca-panel-2 hover:bg-ca-panel hover:border-ca-select transition-colors text-xs font-medium text-ca-ink col-span-2"
                >
                  <Settings className="w-3.5 h-3.5 text-ca-ink-muted" />
                  <span>System Settings & Preferences</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Projects Table & Actions */}
        <div className="bg-ca-panel border border-ca-border rounded flex flex-col">
          <div className="bg-ca-panel-2 border-b border-ca-border px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-ca-ink" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-ca-ink">
                Recent Projects
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate({ to: "/projects", search: { new: "1" } as any })}
                className="flex items-center gap-1 px-2.5 py-1 bg-ca-select text-ca-bg rounded text-xs font-semibold hover:opacity-90 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Project</span>
              </button>
              <Link
                to="/projects"
                className="px-2.5 py-1 bg-ca-panel border border-ca-border rounded text-xs font-medium hover:bg-ca-panel-2 text-ca-ink shadow-sm"
              >
                View All
              </Link>
            </div>
          </div>

          <div className="p-3">
            {recent.length === 0 ? (
              <div className="py-6 text-center text-xs text-ca-ink-muted">
                No recent projects found. Create a new project to get started.
              </div>
            ) : (
              <div className="divide-y divide-ca-border border border-ca-border rounded overflow-hidden">
                {recent.map((proj) => (
                  <div
                    key={proj.projectId}
                    className="flex items-center justify-between px-3 py-2 text-xs hover:bg-ca-panel-2 transition-colors"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-ca-ink truncate">{proj.name}</span>
                      <span className="text-[10px] text-ca-ink-muted">
                        ID: {proj.projectId} • Last opened {new Date(proj.openedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: proj.projectId }}
                      className="px-3 py-1 bg-ca-panel border border-ca-border rounded text-xs font-semibold text-ca-select hover:bg-ca-panel-2 shadow-sm"
                    >
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </StandardAppShell>
  );
}
