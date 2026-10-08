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
    <section className="flex-1 flex flex-col p-6 bg-[#0b0c10] text-ca-ink overflow-y-auto">
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-8 border-b border-ca-border pb-4">
          <h2 className="flex items-center gap-3 text-2xl font-bold font-sans uppercase tracking-wider">
            <Camera className="h-6 w-6 text-ca-primary" aria-hidden /> 
            Camera Binding
          </h2>
          <Link
            to="/setup/camera"
            className="flex items-center gap-2 px-3 py-1.5 bg-ca-panel hover:bg-ca-panel-2 border border-ca-border rounded text-xs font-mono font-bold uppercase transition"
          >
            Manage Global Library <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-ca-panel border border-ca-border rounded p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-ca-ink mb-4 flex items-center gap-2">
                <Server size={16} className="text-ca-primary" /> Active Connection
              </h3>
              
              <div className="space-y-2">
                <label htmlFor="camera-binding" className="text-xs font-mono text-ca-ink-muted uppercase block">
                  Select Hardware Source
                </label>
                <div className="flex items-stretch gap-2">
                  <select
                    id="camera-binding"
                    className="flex-1 rounded-sm border border-ca-border bg-[#0b0c10] p-2.5 text-sm font-mono text-ca-ink focus:border-ca-primary focus:ring-1 focus:ring-ca-primary outline-none transition"
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
                  {project.cameraSettingId && (
                    <button
                      type="button"
                      onClick={() => onSelect("")}
                      className="px-4 bg-[#0b0c10] border border-ca-border hover:border-ca-danger hover:text-ca-danger rounded-sm text-xs font-bold uppercase transition flex items-center justify-center"
                      title="Unbind Camera"
                    >
                      <Unlink className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {library.all.length === 0 && (
                  <p className="text-xs font-mono text-ca-ink-muted mt-2">
                    No cameras registered in the global library.
                  </p>
                )}
                
                {missingBinding && (
                  <p role="alert" className="text-xs font-mono text-red-400 mt-2 bg-red-400/10 p-2 rounded border border-red-400/20">
                    ERR: Previously bound camera [{project.cameraSettingId}] is missing from library.
                  </p>
                )}
              </div>
            </div>

            {!bound && project.cameraName && (
              <div className="bg-ca-panel border border-ca-border border-dashed rounded p-5">
                <p className="text-xs font-mono text-ca-ink-muted mb-1 uppercase">Legacy Configuration</p>
                <p className="text-sm font-bold">{project.cameraName}</p>
                <p className="text-xs text-ca-ink-muted mt-2">Please select a formal hardware source above to upgrade this project.</p>
              </div>
            )}
          </div>

          <div className="bg-ca-panel border border-ca-border rounded p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ca-ink mb-4 flex items-center gap-2">
              <Cpu size={16} className="text-green-400" /> Sensor Telemetry
            </h3>

            {bound ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <TelemetryStat label="Resolution" value={`${bound.resolutionW} x ${bound.resolutionH}`} icon={<Maximize size={14}/>} />
                <TelemetryStat label="FOV (mm)" value={`${bound.fovMmW} x ${bound.fovMmH}`} icon={<Monitor size={14}/>} />
                <TelemetryStat label="Exposure" value={`${bound.exposureUs} us`} />
                <TelemetryStat label="Gain" value={`${bound.gainDb} dB`} />
                <TelemetryStat label="Trigger Mode" value={bound.triggerMode} />
                <TelemetryStat label="Frame Rate" value={`${bound.frameRateHz} Hz`} />
                <TelemetryStat label="Color Mode" value={bound.ColorModeType} />
                <TelemetryStat label="Pockets" value={bound.pockets} />
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-ca-ink-muted font-mono text-xs border border-ca-border border-dashed rounded">
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
    <div className="bg-[#0b0c10] border border-ca-border/50 rounded p-2 flex flex-col">
      <span className="text-[10px] font-mono text-ca-ink-muted uppercase mb-1 flex items-center gap-1">
        {icon} {label}
      </span>
      <span className="text-sm font-bold font-mono text-ca-ink truncate">{value}</span>
    </div>
  );
}
