import { ClientLogger } from "@/lib/observability/client-logger";
import { useState } from "react";
import { Mic, Plus } from "lucide-react";
import type { Project } from "@/lib/projects/store";
import { useProjectStore } from "@/lib/projects/store";
import { useMicSettingsLibrary } from "@/lib/mic-settings/useMicSettingsLibrary";
import { MicSettingsSchema, type MicSettings } from "@/lib/mic-settings/model";
import { NewMicSettingsModal } from "@/features/projects/modals/NewMicSettingsModal";

export function ProjectMicsSection({ project }: { project: Project }) {
  const { all, save } = useMicSettingsLibrary();
  const setProjectMicSettings = useProjectStore((s) => s.setProjectMicSettings);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const selectedId = project.micSettingsId ?? "";

  function onSelect(id: string): void {
    try {
      setProjectMicSettings(project.id, id || null);
      ClientLogger.info("[project-editor/mics] bound", {
        projectId: project.id,
        micSettingsId: id || null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      ClientLogger.error("[project-editor/mics] bind failed", e);
      setError(msg);
    }
  }

  async function onCreate({
    name,
    params,
  }: {
    name: string;
    params: Record<string, unknown>;
  }): Promise<void> {
    setError(null);
    const now = new Date().toISOString();
    const entry: MicSettings = MicSettingsSchema.parse({
      id: `mic_${Math.random().toString(36).slice(2, 10)}`,
      name,
      params,
      createdAt: now,
      updatedAt: now,
    });
    const saved = await save(entry);
    ClientLogger.info("[project-editor/mics] created", { id: saved.id, name: saved.name });
    setProjectMicSettings(project.id, saved.id as string);
    ClientLogger.info("[project-editor/mics] auto-bound", {
      projectId: project.id,
      micSettingsId: saved.id,
    });
  }

  const missing = selectedId && all.some((m) => (m.id as string) === selectedId) === false;

  return (
    <section
      aria-label="Mics Settings"
      className="rounded-lg border border-ca-border bg-ca-panel p-hmi-4"
      data-testid="project-editor-mics-settings"
    >
      <div className="flex items-center justify-between gap-hmi-3">
        <div className="flex items-center gap-hmi-2">
          <Mic aria-hidden size={18} className="text-ca-ink-muted" />
          <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            Mics Settings
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-hmi-2 rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink transition hover:border-ca-select"
        >
          <Plus aria-hidden size={16} />
          New…
        </button>
      </div>
      <div className="mt-hmi-3 flex items-center gap-hmi-2">
        <label htmlFor="project-mics-select" className="text-hmi-caption text-ca-ink-muted">
          Bound setting
        </label>
        <select
          id="project-mics-select"
          data-testid="project-mics-select"
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="flex-1 rounded-md border border-ca-border bg-ca-panel-2 px-hmi-2 py-1 text-hmi-body text-ca-ink"
        >
          <option value="">(none)</option>
          {all.map((m) => (
            <option key={m.id as string} value={m.id as string}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      {missing ? (
        <p role="alert" className="mt-hmi-2 text-hmi-caption text-ca-ng">
          Bound mics setting `{selectedId}` is missing from the library. Pick another or clear the
          binding.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-hmi-2 text-hmi-caption text-ca-ng">
          {error}
        </p>
      ) : null}
      <NewMicSettingsModal open={showNew} onOpenChange={setShowNew} onSubmit={onCreate} />
    </section>
  );
}
