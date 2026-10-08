import React from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { StandardAppShell } from "@/components/layout/StandardAppShell";
import {
  FolderKanban,
  Activity,
  Server,
  HardDrive,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Clock,
  PlayCircle,
  Settings as SettingsIcon,
  Search,
} from "lucide-react";

export interface StandardHomeViewProps {
  recentProjects?: Array<{ projectId: string; name: string; openedAt: number }>;
}

export function StandardHomeView({
  recentProjects = [],
}: StandardHomeViewProps): React.JSX.Element {
  const navigate = useNavigate();

  const handleCreateProject = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: "/projects?new=1" as any });
  };

  return (
    <StandardAppShell
      activeNav="home"
      title="System Dashboard"
      subtitle="Main Operations & Status"
    >
      <div className="flex-1 bg-ca-bg text-ca-ink p-4 overflow-auto">
        <div className="w-full space-y-4">
          {/* Status Strip */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            <StatusCard
              icon={<CameraIcon className="text-ca-primary" />}
              label="Camera Link"
              value="CONNECTED"
              status="good"
            />
            <StatusCard
              icon={<Activity className="text-blue-500" />}
              label="System IO"
              value="ACTIVE"
              status="good"
            />
            <StatusCard
              icon={<Cpu className="text-purple-500" />}
              label="DSP Load"
              value="12%"
              status="neutral"
            />
            <StatusCard
              icon={<HardDrive className="text-amber-500" />}
              label="Disk Space"
              value="820 GB Free"
              status="neutral"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)] gap-4">
            {/* Left Column - Recent Projects */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight uppercase">Programs</h2>
                <button
                  onClick={handleCreateProject}
                  className="px-4 py-2 bg-ca-primary text-ca-on-primary text-sm font-bold uppercase rounded hover:bg-ca-primary/90 flex items-center gap-2 transition"
                >
                  <FolderKanban size={16} />
                  New Program
                </button>
              </div>

              {recentProjects.length === 0 ? (
                <div className="border border-ca-border/50 bg-ca-panel p-12 text-center rounded text-ca-ink-muted">
                  <FolderKanban size={32} className="mx-auto mb-4 opacity-50" />
                  <p>No programs loaded.</p>
                  <p className="text-sm mt-1">Create a new program to start inspection.</p>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
                  {recentProjects.map((p) => (
                    <ProjectCard key={p.projectId} project={p} />
                  ))}
                </div>
              )}
            </div>

            {/* Right Column - Logs / System Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold tracking-tight uppercase">System Event Log</h2>
              <div className="border border-ca-border/50 bg-ca-panel rounded p-4 text-xs font-mono text-ca-ink-muted space-y-2 h-[400px] overflow-y-auto">
                <div className="flex gap-3">
                  <span className="text-blue-400">10:45:01</span>
                  <span>System boot sequence completed.</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-blue-400">10:45:02</span>
                  <span>Camera ETH_0 initialized.</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-blue-400">10:45:05</span>
                  <span>Trigger mode set to CONTINUOUS.</span>
                </div>
                {recentProjects.length > 0 && (
                  <div className="flex gap-3 text-ca-ink">
                    <span className="text-green-400">10:46:12</span>
                    <span>Loaded program {recentProjects[0].name}.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardAppShell>
  );
}

function CameraIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function StatusCard({
  icon,
  label,
  value,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  status: "good" | "bad" | "neutral";
}) {
  return (
    <div className="border border-ca-border/50 bg-ca-panel p-4 rounded flex items-center gap-4">
      <div className="p-3 bg-ca-bg rounded border border-ca-border/30">{icon}</div>
      <div>
        <p className="text-xs font-mono text-ca-ink-muted uppercase">{label}</p>
        <p
          className={`text-lg font-bold font-mono uppercase ${
            status === "good"
              ? "text-green-400"
              : status === "bad"
                ? "text-red-400"
                : "text-ca-ink"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
}: {
  project: { projectId: string; name: string; openedAt: number };
}) {
  const navigate = useNavigate();

  return (
    <div className="group border border-ca-border/50 bg-ca-panel hover:bg-ca-panel-2 hover:border-ca-primary/50 transition p-4 rounded flex flex-col justify-between h-[160px]">
      <div>
        <div className="flex items-start justify-between">
          <h3 className="font-bold text-lg text-ca-ink uppercase truncate pr-4">{project.name}</h3>
          <span className="text-xs font-mono text-ca-ink-muted shrink-0">ID: {project.projectId.slice(0,6)}</span>
        </div>
        <p className="text-xs text-ca-ink-muted flex items-center gap-1 mt-1">
          <Clock size={12} /> Last opened {new Date(project.openedAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-ca-border/30">
        <button
          onClick={() => navigate({ to: "/projects/$projectId", params: { projectId: project.projectId } })}
          className="flex-1 px-3 py-1.5 bg-ca-bg border border-ca-border/50 text-ca-ink text-sm font-bold uppercase rounded hover:border-ca-primary hover:text-ca-primary transition flex items-center justify-center gap-2"
        >
          <SettingsIcon size={14} /> Setup
        </button>
        <button
          onClick={() => navigate({ to: "/projects/$projectId/trial-run", params: { projectId: project.projectId } })}
          className="flex-1 px-3 py-1.5 bg-ca-bg border border-ca-border/50 text-ca-ink text-sm font-bold uppercase rounded hover:border-ca-primary hover:text-ca-primary transition flex items-center justify-center gap-2"
        >
          <PlayCircle size={14} /> Run
        </button>
      </div>
    </div>
  );
}
