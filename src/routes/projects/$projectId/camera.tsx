import { useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, ExternalLink, Unlink, Server, Cpu, Monitor, Maximize } from "lucide-react";
import { toast } from "sonner";
import { useProjectStore, selectProject } from "@/lib/projects/store";
import { useCameraLibrary } from "@/lib/camera/useCameraLibrary";

export const Route = createFileRoute("/projects/$projectId/camera")({
  component: ProjectCameraTab,
});

function ProjectCameraTab() {
  const { projectId } = Route.useParams();
  const project = useProjectStore((s) => selectProject(s, projectId));
  const setProjectCamera = useProjectStore((s) => s.setProjectCamera);

  const library = useCameraLibrary();

  const bound = useMemo(
    () => library.all.find((e) => e.id === project?.cameraSettingId) ?? null,
    [library.all, project?.cameraSettingId],
  );

  useEffect(() => {
    if (project?.cameraSettingId && !bound) {
      console.warn("[projects/camera-tab] bound cameraSettingId not found in library", {
        projectId,
        cameraSettingId: project.cameraSettingId,
      });
    }
  }, [projectId, project?.cameraSettingId, bound]);

  if (!project) {
    return (
      <section className="flex-1 p-6 bg-[#0b0c10] text-ca-ink">
        <h2 className="text-xl font-bold font-sans uppercase tracking-wider mb-2">Camera Binding</h2>
        <p className="text-sm font-mono text-ca-ink-muted">Project not found.</p>
      </section>
    );
  }

  function onSelect(next: string) {
    setProjectCamera(projectId, next || null);

    if (next) {
      const entry = library.all.find((e) => e.id === next);
      toast.success(entry ? `Bound ${entry.name}` : "Bound camera");
    } else {
      toast.success("Unbound camera");
    }
  }

  const missingBinding = Boolean(project.cameraSettingId && !bound);

  return (
    <section className="flex-1 flex flex-col p-8 bg-[#06080d] text-ca-ink overflow-y-auto font-mono">
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-8 border-b border-white/[0.08] pb-5">
          <h2 className="flex items-center gap-3 text-2xl font-bold font-sans uppercase tracking-wider text-white">
            <span className="h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse" />
            Camera Sensor Binding
          </h2>
          <Link
            to="/setup/camera"
            className="flex items-center gap-2 px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/15 rounded-lg text-xs font-mono font-bold uppercase tracking-wider text-white transition shadow-sm"
          >
            Manage Global Library <ExternalLink className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/40 p-6 space-y-5 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/90 flex items-center gap-2">
                <Server size={16} className="text-cyan-400" /> Active Optical Sensor Link
              </h3>

              <div className="space-y-2">
                <label htmlFor="camera-binding" className="text-xs font-mono text-white/50 uppercase block">
                  Select Hardware Source
                </label>
                <div className="flex items-stretch gap-2">
                  <select
                    id="camera-binding"
                    className="flex-1 rounded-lg border border-white/15 bg-black/60 p-3 text-xs font-mono text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition shadow-inner"
                    value={project.cameraSettingId ?? ""}
                    onChange={(e) => onSelect(e.target.value)}
                    aria-invalid={missingBinding ? true : undefined}
                  >
                    <option value="">[ NONE SELECTED ]</option>
                    {library.all.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} {e.vendor ? `(${e.vendor})` : ""} {e.deviceSerial ? `[${e.deviceSerial}]` : ""}
                      </option>
                    ))}
                  </select>
                  {project.cameraSettingId ? (
                    <button
                      type="button"
                      onClick={() => onSelect("")}
                      className="px-4 bg-black/60 border border-white/15 hover:border-rose-500 hover:text-rose-400 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center text-white/60"
                      title="Unbind Camera"
                    >
                      <Unlink className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                {library.all.length === 0 ? (
                  <p className="text-xs font-mono text-white/40 mt-2">
                    No cameras registered in the global library.
                  </p>
                ) : null}

                {missingBinding ? (
                  <p role="alert" className="text-xs font-mono text-rose-300 mt-2 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                    ERR: Previously bound camera [{project.cameraSettingId}] is missing from library.
                  </p>
                ) : null}
              </div>
            </div>

            {!bound && project.cameraName ? (
              <div className="rounded-2xl border border-white/10 border-dashed bg-white/[0.02] p-6">
                <p className="text-xs font-mono text-white/40 mb-1 uppercase">Legacy Configuration</p>
                <p className="text-sm font-bold text-white">{project.cameraName}</p>
                <p className="text-xs text-white/40 mt-2">Please select a formal hardware source above to upgrade this project.</p>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/40 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/90 mb-5 flex items-center gap-2">
              <Cpu size={16} className="text-emerald-400" /> Sensor Optical Telemetry
            </h3>

            {bound ? (
              <div className="grid grid-cols-2 gap-3.5">
                <TelemetryStat label="Resolution" value={`${bound.resolutionW} x ${bound.resolutionH}`} icon={<Maximize size={14} className="text-cyan-400" />} />
                <TelemetryStat label="FOV (mm)" value={`${bound.fovMmW} x ${bound.fovMmH}`} icon={<Monitor size={14} className="text-cyan-400" />} />
                <TelemetryStat label="Exposure" value={`${bound.exposureUs} us`} />
                <TelemetryStat label="Gain" value={`${bound.gainDb} dB`} />
                <TelemetryStat label="Trigger Mode" value={bound.triggerMode} />
                <TelemetryStat label="Frame Rate" value={`${bound.frameRateHz} Hz`} />
                <TelemetryStat label="Color Mode" value={bound.ColorModeType} />
                <TelemetryStat label="Pockets" value={bound.pockets} />
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-white/40 font-mono text-xs border border-dashed border-white/10 rounded-xl bg-black/30">
                NO SENSOR BOUND
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function TelemetryStat({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/50 p-3 flex flex-col shadow-inner">
      <span className="text-[10px] font-mono text-white/50 uppercase mb-1.5 flex items-center gap-1.5">
        {icon} {label}
      </span>
      <span className="text-sm font-bold font-mono text-white truncate tracking-wide">{value}</span>
    </div>
  );
}
