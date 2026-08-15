import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Camera, Plus } from "lucide-react";
import type { Project } from "@/lib/projects/store";
import { useProjectStore } from "@/lib/projects/store";
import { useCameraLibrary } from "@/lib/camera/useCameraLibrary";
import { SaveCameraSetupModal } from "@/features/projects/modals/SaveCameraSetupModal";

export function ProjectCameraSection({ project }: { project: Project }) {
  const { all } = useCameraLibrary();
  const setProjectCamera = useProjectStore((s) => s.setProjectCamera);
  const [error, setError] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const selectedId = project.cameraSettingId ?? "";

  function onSelect(id: string): void {
    try {
      setProjectCamera(project.id, id || null);
      console.info("[project-editor/camera] bound", {
        projectId: project.id,
        cameraSettingId: id || null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[project-editor/camera] bind failed", e);
      setError(msg);
    }
  }

  return (
    <section
      aria-label="Camera Setup"
      className="rounded-lg border border-ca-border bg-ca-panel p-hmi-4"
      data-testid="project-editor-camera-setup"
    >
      <div className="flex items-center justify-between gap-hmi-3">
        <div className="flex items-center gap-hmi-2">
          <Camera aria-hidden size={18} className="text-ca-ink-muted" />
          <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            Camera Setup
          </h2>
        </div>
        <div className="flex items-center gap-hmi-2">
          <button
            type="button"
            onClick={() => setSaveModalOpen(true)}
            disabled={all.length === 0}
            data-testid="save-current-camera-btn"
            className="inline-flex items-center gap-hmi-2 rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink transition hover:border-ca-select disabled:cursor-not-allowed disabled:opacity-40"
            title={
              all.length === 0 ? "No camera settings to copy yet" : "Save current as new setup"
            }
          >
            <Plus aria-hidden size={16} />
            Save current as new
          </button>
          <Link
            to="/setup/camera"
            className="inline-flex items-center gap-hmi-2 rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink transition hover:border-ca-select"
          >
            <Plus aria-hidden size={16} />
            New camera setting
          </Link>
        </div>
      </div>
      <div className="mt-hmi-3 flex items-center gap-hmi-2">
        <label htmlFor="project-camera-select" className="text-hmi-caption text-ca-ink-muted">
          Bound setting
        </label>
        <select
          id="project-camera-select"
          data-testid="project-camera-select"
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="flex-1 rounded-md border border-ca-border bg-ca-panel-2 px-hmi-2 py-1 text-hmi-body text-ca-ink"
        >
          <option value="">(none)</option>
          {all.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.vendor} · {c.resolutionW}×{c.resolutionH}
            </option>
          ))}
        </select>
      </div>
      {selectedId && all.some((c) => c.id === selectedId) === false ? (
        <p role="alert" className="mt-hmi-2 text-hmi-caption text-ca-ng">
          Bound camera setting id `{selectedId}` is missing from the library. It may have been
          deleted; pick another or clear the binding.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-hmi-2 text-hmi-caption text-ca-ng">
          {error}
        </p>
      ) : null}
      <SaveCameraSetupModal
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        currentSettingId={project.cameraSettingId ?? null}
        onSaved={(newId) => {
          try {
            setProjectCamera(project.id, newId);
            console.info("[project-editor/camera] auto-bound new copy", {
              projectId: project.id,
              newId,
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error("[project-editor/camera] bind new copy failed", e);
            setError(msg);
          }
        }}
      />
    </section>
  );
}
