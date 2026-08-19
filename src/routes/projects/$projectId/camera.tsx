// Plan 78 slice 4 (I-SU-05 bind): the Project Camera tab is a live view of
// the project's bound CameraSetting from the camera library store. Users can
// pick from cameras managed in `/setup/camera`, unbind, or navigate to the
// library. Zero business logic here beyond a store dispatch; the source of
// truth for camera details stays in `src/lib/camera/store.ts`.
import { useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, ExternalLink, Unlink } from "lucide-react";
import { toast } from "sonner";
import { useProjectStore, selectProject } from "@/lib/projects/store";
import { useCameraLibrary } from "@/lib/camera/useCameraLibrary";

export const Route = createFileRoute("/projects/$projectId/camera")({
  staticData: { crumb: "Camera" },
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

  // If the bound CameraSetting was deleted in `/setup/camera`, surface it
  // instead of silently pretending nothing is bound.
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
      <section aria-labelledby="camera-tab-heading" className="mx-auto w-full max-w-4xl p-hmi-6">
        <h2 id="camera-tab-heading" className="text-hmi-title text-ca-ink">
          Camera
        </h2>
        <p className="mt-2 text-hmi-body text-ca-ink-muted">Project not found.</p>
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
    <section
      aria-labelledby="camera-tab-heading"
      className="mx-auto w-full max-w-4xl p-hmi-6"
      data-project-id={projectId}
    >
      <div className="flex items-center justify-between gap-hmi-3">
        <h2 id="camera-tab-heading" className="flex items-center gap-2 text-hmi-title text-ca-ink">
          <Camera className="h-5 w-5 text-ca-primary" aria-hidden /> Camera
        </h2>
        <Link
          to="/setup/camera"
          className="inline-flex items-center gap-1 text-hmi-body text-ca-ink-muted underline hover:text-ca-ink"
        >
          Manage library <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <div className="mt-hmi-3 flex flex-col gap-2">
        <label htmlFor="camera-binding" className="text-hmi-caption text-ca-ink-muted">
          Bound CameraSetting
        </label>
        <div className="flex items-center gap-2">
          <select
            id="camera-binding"
            className="min-w-0 flex-1 rounded-md border border-ca-border bg-ca-surface p-2 text-hmi-body text-ca-ink"
            value={project.cameraSettingId ?? ""}
            onChange={(e) => onSelect(e.target.value)}
            aria-invalid={missingBinding ? true : undefined}
          >
            <option value="">(none)</option>
            {library.all.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.vendor}
                {e.deviceSerial ? ` · ${e.deviceSerial}` : ""})
              </option>
            ))}
          </select>
          {project.cameraSettingId ? (
            <button
              type="button"
              onClick={() => onSelect("")}
              className="inline-flex items-center gap-1 rounded-md border border-ca-border px-2 py-1 text-hmi-body text-ca-ink hover:bg-ca-surface-hover"
              aria-label="Unbind camera from project"
            >
              <Unlink className="h-3.5 w-3.5" aria-hidden /> Unbind
            </button>
          ) : null}
        </div>
        {library.all.length === 0 ? (
          <p className="text-hmi-caption text-ca-ink-muted">
            No CameraSetting records yet. Create one in{" "}
            <Link to="/setup/camera" className="underline hover:text-ca-ink">
              /setup/camera
            </Link>
            .
          </p>
        ) : null}
        {missingBinding ? (
          <p role="alert" className="text-hmi-caption text-ca-danger">
            The previously bound camera ({project.cameraSettingId}) was removed from the library.
            Pick another or unbind.
          </p>
        ) : null}
      </div>

      {bound ? (
        <dl className="mt-hmi-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-md border border-ca-border p-3 text-hmi-body">
          <dt className="text-ca-ink-muted">Name</dt>
          <dd className="text-ca-ink">{bound.name}</dd>
          <dt className="text-ca-ink-muted">Vendor</dt>
          <dd className="text-ca-ink">{bound.vendor}</dd>
          {bound.deviceSerial ? (
            <>
              <dt className="text-ca-ink-muted">Serial</dt>
              <dd className="text-ca-ink">{bound.deviceSerial}</dd>
            </>
          ) : null}
          <dt className="text-ca-ink-muted">Resolution</dt>
          <dd className="text-ca-ink">
            {bound.resolutionW} x {bound.resolutionH}
          </dd>
          <dt className="text-ca-ink-muted">FOV (mm)</dt>
          <dd className="text-ca-ink">
            {bound.fovMmW} x {bound.fovMmH}
          </dd>
          <dt className="text-ca-ink-muted">Exposure</dt>
          <dd className="text-ca-ink">{bound.exposureUs} us</dd>
          <dt className="text-ca-ink-muted">Gain</dt>
          <dd className="text-ca-ink">{bound.gainDb} dB</dd>
          <dt className="text-ca-ink-muted">Trigger</dt>
          <dd className="text-ca-ink">{bound.triggerMode}</dd>
          <dt className="text-ca-ink-muted">Frame rate</dt>
          <dd className="text-ca-ink">{bound.frameRateHz} Hz</dd>
          <dt className="text-ca-ink-muted">Color mode</dt>
          <dd className="text-ca-ink">{bound.ColorModeType}</dd>
          <dt className="text-ca-ink-muted">Pockets</dt>
          <dd className="text-ca-ink">{bound.pockets}</dd>
        </dl>
      ) : project.cameraName ? (
        <p className="mt-hmi-4 text-hmi-body text-ca-ink-muted">
          Legacy label: <span className="text-ca-ink">{project.cameraName}</span>. Pick a
          CameraSetting above to replace it with live values.
        </p>
      ) : null}
    </section>
  );
}
