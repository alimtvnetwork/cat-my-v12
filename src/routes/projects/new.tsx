import React, { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { FolderPlus, ChevronLeft, Cpu, Plus, Sparkles } from "lucide-react";
import { useProjectStore } from "@/lib/projects/store";
import { useDeviceStore } from "@/lib/devices/store";
import type { InspectedDevice } from "@/lib/devices/model";
import { AddDeviceModal } from "@/components/devices/AddDeviceModal";

export const Route = createFileRoute("/projects/new")({
  component: NewProjectPage,
});

function NewProjectPage() {
  const navigate = useNavigate();
  const createProject = useProjectStore((s) => s.createProject);
  const devicesMap = useDeviceStore((s) => s.devices);
  const deviceList = Object.values(devicesMap);

  const isGuidedSimulation =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("guided") === "1";

  const [name, setName] = useState(isGuidedSimulation ? "demo" : "");
  const [deviceId, setDeviceId] = useState<string>(() => deviceList[0]?.id || "");
  const [code, setCode] = useState(isGuidedSimulation ? "DEMO" : "");
  const [description, setDescription] = useState(
    isGuidedSimulation
      ? "Presentation simulation for project creation, ruleset setup, and visual analysis."
      : "",
  );
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDevice = deviceId ? devicesMap[deviceId] : undefined;
  const isSubmitDisabled = !name.trim() || !deviceId.trim();

  const handleDeviceCreated = (newDev: InspectedDevice) => {
    setDeviceId(newDev.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Project name is required");

      return;
    }

    if (!deviceId.trim()) {
      setError("Target inspected device is required");

      return;
    }

    try {
      const projectId = createProject(name.trim(), {
        projectCode: code.trim() || undefined,
        description: description.trim() || undefined,
        deviceId: deviceId.trim(),
      });
      await navigate({ to: "/projects/$projectId", params: { projectId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
    }
  };

  return (
    <div
      data-create-project-page="true"
      className="flex h-full min-h-0 w-full flex-col bg-[#06080d] text-slate-100 font-sans antialiased"
    >
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div
          data-tour="simulation-project-create-panel"
          className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0a0d14]/90 backdrop-blur-2xl p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_24px_64px_-16px_rgba(0,0,0,0.85)]"
        >
          <div className="mb-6 flex items-center gap-3 border-b border-white/[0.08] pb-4">
            <Link
              to="/projects"
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/[0.05] transition-colors"
            >
              <ChevronLeft size={22} />
            </Link>
            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                PROJECT WORKSPACE // INITIALIZE
              </span>
              <h1 className="text-lg font-bold uppercase tracking-wider text-slate-100 font-mono">
                Create Inspection Project
              </h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                Project Name *
              </label>
              <input
                autoFocus
                type="text"
                data-tour="simulation-project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-[#07090e] px-4 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
                placeholder="e.g. SOIC-8 LINE"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Cpu size={14} className="text-cyan-400" />
                  Target Device *
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddDeviceOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 text-[11px] font-mono font-medium text-slate-300 hover:border-cyan-500/50 hover:bg-white/[0.06] hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <Plus size={12} className="text-cyan-400" />
                  <span>New Device</span>
                </button>
              </div>
              <div className="relative">
                <select
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.1] bg-[#07090e] px-4 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] cursor-pointer"
                >
                  <option value="" disabled className="bg-[#0a0d14] text-slate-500">
                    -- Select Target Inspected Device --
                  </option>
                  {deviceList.map((d) => (
                    <option key={d.id} value={d.id} className="bg-[#0a0d14] text-slate-100">
                      {d.name} [{d.id}]
                    </option>
                  ))}
                </select>
              </div>
              {selectedDevice ? (
                <div className="flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-950/30 px-3 py-1.5 text-[11px] font-mono text-cyan-300">
                  <span className="font-semibold text-slate-200">
                    {selectedDevice.packageType || "Standard DUT"}
                  </span>
                  <span className="text-cyan-600">•</span>
                  <span className="truncate text-slate-400">
                    {selectedDevice.description || "Active inspection profile"}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Program Code (Optional)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-[#07090e] px-4 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
                placeholder="e.g. P-1029"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-white/[0.1] bg-[#07090e] px-4 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
                placeholder="Enter manufacturing line or inspection recipe details..."
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-mono text-rose-400">
                {error}
              </div>
            )}

            <div className="mt-2 flex justify-end gap-3 border-t border-white/[0.08] pt-5">
              <Link
                to="/projects"
                className="flex items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.02] px-6 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-300 hover:bg-white/[0.06] hover:text-white transition-all"
              >
                Cancel
              </Link>
              <button
                type="submit"
                data-tour="simulation-project-create-submit"
                disabled={isSubmitDisabled}
                className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isSubmitDisabled
                    ? "border border-white/[0.08] bg-white/[0.03] text-slate-500 cursor-not-allowed shadow-none"
                    : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm active:scale-[0.98]"
                }`}
              >
                <Sparkles
                  size={15}
                  className={isSubmitDisabled ? "text-slate-600" : "text-slate-950"}
                />
                <span
                  className={
                    isSubmitDisabled
                      ? "text-slate-500 tracking-wider"
                      : "text-slate-950 tracking-wider font-extrabold"
                  }
                >
                  Create Project
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <AddDeviceModal
        isOpen={isAddDeviceOpen}
        onClose={() => setIsAddDeviceOpen(false)}
        onDeviceCreated={handleDeviceCreated}
      />
    </div>
  );
}
