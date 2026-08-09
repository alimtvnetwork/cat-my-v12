// Plan 79 steps 41 + 42. V4 project editor: 6 fixed sections in order
// Rules, Image Samples, Camera Setup, Mics Settings, Run, Result.
//
// Root cause this component fixes, in one sentence:
//   The project overview page had no single fixed-order section stack that
//   matches the V4 spec, so operators could not find rules / samples /
//   camera / mics / run / result on the same surface without cross-route
//   navigation.
//
// Wired now (step 42):
//   - Rules section reads the current `project.rulesetIds`, renders each
//     as a row with move-up / move-down / remove, exposes an "Add ruleset"
//     shortcut, and shows the expanded-chain rule count per row derived
//     from `ruleset.rules.length` (the current V3 chain shape). When the
//     V4 flat `Project.ruleIds` migration lands, swap the row derivation
//     to `computeEffectiveChain(project.ruleIds, resolve)`.
//
// Wired later (steps 43-46):
//   - Image Samples (45), Camera Setup (43), Mics Settings (44), Run (46),
//     Result (46). Sections are rendered today as clearly-marked "wire in
//     step N" placeholders that link out to the existing surfaces so the
//     6-section order is stable and visible.

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  Trash2,
  Plus,
  Camera,
  Mic,
  Images,
  Play,
  ListChecks,
  Upload,
  Video,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowUp,
  ArrowDown,
  Pencil,
} from "lucide-react";
import type { Project, RuleSet } from "@/lib/projects/store";
import { useProjectStore } from "@/lib/projects/store";
import { useCameraLibrary } from "@/lib/camera/useCameraLibrary";
import { useMicSettingsLibrary } from "@/lib/mic-settings/useMicSettingsLibrary";
import { MicSettingsSchema, type MicSettings } from "@/lib/mic-settings/model";
import { useImageSamples } from "@/lib/image-samples/useImageSamples";
import type { ImageSample } from "@/lib/image-samples/model";
import { openCameraStream, watchCameraDevices } from "@/lib/camera/live-capture";
import { captureFrameFromStream } from "@/lib/camera/capture-frame";
import {
  messageForCameraError,
  type CameraPermissionMessage,
} from "@/lib/camera/permission-messages";
import type { CameraCapabilityError } from "@/lib/camera/capability";
import { runProject, type ProjectRunSummary } from "@/lib/projects/project-runner";
import { useRulesLibrary } from "@/lib/rules/useRulesLibrary";
import type { RuleId } from "@/lib/rules/model";
import { SaveCameraSetupModal } from "@/features/projects/modals/SaveCameraSetupModal";
import { NewMicSettingsModal } from "@/features/projects/modals/NewMicSettingsModal";
import { ProjectRulesSection } from "@/features/projects/sections/ProjectRulesSection";
import { SampleCarousel } from "@/components/projects/SampleCarousel";
import { useSelectedSample } from "@/lib/image-samples/use-selected-sample";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

interface Props {
  project: Project;
  rulesets: readonly RuleSet[];
}

export function ProjectEditorSections({ project, rulesets }: Props) {
  const [runSummary, setRunSummary] = useState<ProjectRunSummary | null>(null);
  // Selected sample for the Run / Result flow. Persisted per project
  // via `useSelectedSample`, keyed on stable `orderIndex` (with sample
  // id as a secondary anchor) so reloads land on the same frame the
  // operator was inspecting. Lifted here so RunSection can offer the
  // carousel and ResultSection can label which sample was evaluated.
  const samples = useImageSamples(project.id).all;
  const selection = useSelectedSample(project.id, samples);

  return (
    <div className="mb-hmi-6 space-y-hmi-3" data-testid="project-editor-sections">
      <ProjectRulesSection project={project} rulesets={rulesets} />
      <ImageSamplesSection project={project} />
      <CameraSection project={project} />
      <MicsSection project={project} />
      <RunSection
        project={project}
        rulesets={rulesets}
        onRan={setRunSummary}
        summary={runSummary}
        samples={samples}
        selection={selection}
      />
      <ResultSection summary={runSummary} selectedSampleName={selection.selected?.name ?? null} />
    </div>
  );
}

function PlaceholderSection({
  Icon,
  title,
  stepLabel,
  href,
  linkLabel,
}: {
  Icon: typeof Camera;
  title: string;
  stepLabel: string;
  // Loose typing so we can point to any existing route without over-typing
  // the placeholder shell. TanStack Link validates at the call site.
  href: { to: string; params: Record<string, string> } | { to: string; params: never };
  linkLabel: string;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-lg border border-ca-border bg-ca-panel p-hmi-4"
      data-testid={`project-editor-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-center justify-between gap-hmi-3">
        <div className="flex items-center gap-hmi-2">
          <Icon aria-hidden size={18} className="text-ca-ink-muted" />
          <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            {title}
          </h2>
        </div>
        <span className="rounded-md border border-dashed border-ca-border px-hmi-2 py-0.5 text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
          Placeholder
        </span>
      </div>
      <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">{stepLabel}</p>
      <Link
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        to={href.to as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params={(href as any).params}
        className="mt-hmi-2 inline-flex items-center gap-hmi-1 text-hmi-body text-ca-select hover:underline"
      >
        {linkLabel}
      </Link>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Plan 79 step 43: Camera Setup section.
// Reads the CameraSetting library via useCameraLibrary and binds the selected
// id onto project.cameraSettingId via setProjectCamera. Creating a new
// setting requires the full 20-field flow that already exists at
// /setup/camera; we surface it as a link rather than duplicate the form here.
// ---------------------------------------------------------------------------
function CameraSection({ project }: { project: Project }) {
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

// ---------------------------------------------------------------------------
// Plan 79 step 44: Mics Settings section.
// Dropdown of MicSettings entries plus an inline "New…" modal (name + freeform
// JSON params). Save goes through useMicSettingsLibrary().save which delegates
// to MicSettingsFacade with Zod validation. Binding writes project.micSettingsId
// via setProjectMicSettings.
// ---------------------------------------------------------------------------
function MicsSection({ project }: { project: Project }) {
  const { all, save } = useMicSettingsLibrary();
  const setProjectMicSettings = useProjectStore((s) => s.setProjectMicSettings);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const selectedId = project.micSettingsId ?? "";

  function onSelect(id: string): void {
    try {
      setProjectMicSettings(project.id, id || null);
      console.info("[project-editor/mics] bound", {
        projectId: project.id,
        micSettingsId: id || null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[project-editor/mics] bind failed", e);
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
    console.info("[project-editor/mics] created", { id: saved.id, name: saved.name });
    setProjectMicSettings(project.id, saved.id as string);
    console.info("[project-editor/mics] auto-bound", {
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

// ---------------------------------------------------------------------------
// Plan 79 step 45: Image Samples section.
//
// Uploads are read as base64 data URLs and persisted through
// `ImageSamplesFacade` (IndexedDB via ProjectRepositoryFacade). Rows show
// thumbnail + name + dimensions + size, with rename and delete. "Capture
// from live camera" is a stub button that logs intent and disables when no
// camera setting is bound (real capture lands in a later plan; the seam is
// here so operators can see where it will live).
// ---------------------------------------------------------------------------

const MAX_SAMPLE_BYTES = 8 * 1024 * 1024; // 8 MB guard for base64 payloads.

function readImageFile(
  file: File,
): Promise<{ dataUrl: string; width: number; height: number; byteSize: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        resolve({
          dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          byteSize: file.size,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

// Exported so component-level tests can render this section without
// booting the whole project editor tree. See
// `src/components/projects/__tests__/ImageSamplesSection.reorder.test.tsx`.
export function ImageSamplesSection({ project }: { project: Project }) {
  const { all, save, remove, reorder, nextOrderIndex } = useImageSamples(project.id);
  const [error, setError] = useState<string | null>(null);
  // Drag-and-drop reorder state. `dragId` is the currently picked-up
  // sample; `dropIndex` is the insertion slot the pointer is hovering
  // (0..all.length). We render an indicator on the target li and commit
  // the move on drop via the same `reorder` facade used by the arrow
  // buttons, so keyboard, buttons, and DnD all share one write path.
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  // Plan 80 step 48: typed permission banner separate from generic upload
  // error so we can render actionable copy + Retry only for camera flows.
  const [permError, setPermError] = useState<{
    message: CameraPermissionMessage;
    code: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraBound = Boolean(project.cameraSettingId);
  // Plan 81 step 1: hot-plug awareness. `null` = "not yet enumerated"
  // (do not gate the button on this), 0 = "enumerated but empty" (surface
  // notice + disable capture), N>0 = ready. Subscribed only while the
  // project has a bound camera setting; teardown on unmount / rebind.
  const [videoDeviceCount, setVideoDeviceCount] = useState<number | null>(null);
  const isNonCameraBound = !cameraBound;

  useEffect(() => {
    if (isNonCameraBound) {
      setVideoDeviceCount(null);

      return;
    }

    const unsub = watchCameraDevices((devices) => {
      setVideoDeviceCount(devices.length);
      console.info("[project-editor/samples] devices changed", {
        projectId: project.id,
        count: devices.length,
      });
    });

    return () => {
      unsub();
      setVideoDeviceCount(null);
    };
  }, [cameraBound, project.id]);
  const noDevices = cameraBound && videoDeviceCount === 0;

  async function onFiles(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      // Plan 82 step 1: use the facade's `nextOrderIndex` so uploads never
      // collide with a stale orderIndex left behind by earlier deletes.
      let nextIndex = nextOrderIndex();
      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/") === false) {
          throw new Error(`"${file.name}" is not an image (${file.type || "unknown"}).`);
        }

        if (file.size > MAX_SAMPLE_BYTES) {
          throw new Error(
            `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB; max is 8 MB.`,
          );
        }

        const { dataUrl, width, height, byteSize } = await readImageFile(file);
        const entry: ImageSample = {
          id: `img_${Math.random().toString(36).slice(2, 10)}`,
          projectId: project.id,
          name: file.name,
          dataUrl,
          width,
          height,
          byteSize,
          capturedAt: new Date().toISOString(),
          source: "upload",
          orderIndex: nextIndex,
        };
        nextIndex += 1;
        await save(entry);
        console.info("[project-editor/samples] uploaded", {
          projectId: project.id,
          id: entry.id,
          bytes: byteSize,
          dims: [width, height],
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[project-editor/samples] upload failed", e);
      setError(msg);
    } finally {
      setBusy(false);

      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRename(sample: ImageSample): Promise<void> {
    const next = window.prompt("Rename sample", sample.name);

    if (!next || next.trim() === "" || next.trim() === sample.name) return;
    try {
      await save({ ...sample, name: next.trim() });
      console.info("[project-editor/samples] renamed", { id: sample.id, name: next.trim() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[project-editor/samples] rename failed", e);
      setError(msg);
    }
  }

  async function onRemove(sample: ImageSample): Promise<void> {
    if (window.confirm(`Delete sample "${sample.name}"?`) === false) return;
    try {
      await remove(sample.id);
      console.info("[project-editor/samples] removed", { id: sample.id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[project-editor/samples] remove failed", e);
      setError(msg);
    }
  }

  // Plan 80 step 47: real live capture. Uses `openCameraStream` (step 46)
  // for owned track teardown, `captureFrameFromStream` for a single
  // frame, and persists via the ImageSamples facade. Errors are mapped
  // through `messageForCameraError` for actionable copy.
  async function onCaptureLive(): Promise<void> {
    if (capturing) return;
    setError(null);
    setPermError(null);
    setCapturing(true);
    const openResult = await openCameraStream();

    if (openResult.ok === false) {
      const err: CameraCapabilityError = openResult.error;
      console.error("[project-editor/samples] live capture: open failed", err);
      setPermError({ message: messageForCameraError(err), code: err.code });
      setCapturing(false);

      return;
    }

    const live = openResult.stream;
    try {
      const frame = await captureFrameFromStream(live.stream);
      const entry: ImageSample = {
        id: `img_${Math.random().toString(36).slice(2, 10)}`,
        projectId: project.id,
        name: `Capture ${new Date().toISOString().slice(0, 19).replace("T", " ")}`,
        dataUrl: frame.dataUrl,
        width: frame.width,
        height: frame.height,
        byteSize: frame.byteSize,
        capturedAt: new Date().toISOString(),
        source: "camera",
        orderIndex: nextOrderIndex(),
      };
      await save(entry);
      console.info("[project-editor/samples] captured from camera", {
        projectId: project.id,
        id: entry.id,
        dims: [frame.width, frame.height],
        bytes: frame.byteSize,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[project-editor/samples] live capture: frame failed", e);
      setError(msg);
    } finally {
      live.close();
      setCapturing(false);
    }
  }

  async function onMove(index: number, delta: -1 | 1): Promise<void> {
    const next = index + delta;

    if (next < 0 || next >= all.length) return;
    const ids = all.map((s) => s.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    try {
      await reorder(ids);
      console.info("[project-editor/samples] reordered", {
        projectId: project.id,
        from: index,
        to: next,
      });
    } catch (e) {
      console.error("[project-editor/samples] reorder failed", e);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // Commit a reorder from `fromIndex` to `toIndex` (insertion slot in
  // 0..all.length). Used by drag-and-drop and keyboard reorder. Falls
  // back to a no-op when the move would leave order unchanged.
  async function onReorderTo(fromIndex: number, toIndex: number): Promise<void> {
    if (fromIndex < 0 || fromIndex >= all.length) return;
    const clampedTo = Math.max(0, Math.min(all.length, toIndex));
    const ids = all.map((s) => s.id);
    const [moved] = ids.splice(fromIndex, 1);
    const insertAt = clampedTo > fromIndex ? clampedTo - 1 : clampedTo;
    ids.splice(insertAt, 0, moved);

    if (ids.every((id, i) => id === all[i]!.id)) return;
    try {
      await reorder(ids);
      console.info("[project-editor/samples] reordered", {
        projectId: project.id,
        from: fromIndex,
        to: insertAt,
        via: "dnd-or-keyboard",
      });
    } catch (e) {
      console.error("[project-editor/samples] reorder failed", e);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <section
      aria-label="Image Samples"
      className="rounded-lg border border-ca-border bg-ca-panel p-hmi-4"
      data-testid="project-editor-image-samples"
    >
      <div className="flex items-center justify-between gap-hmi-3">
        <div className="flex items-center gap-hmi-2">
          <Images aria-hidden size={18} className="text-ca-ink-muted" />
          <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            Image Samples
          </h2>
          <span
            aria-label={`${all.length} samples`}
            className="inline-flex min-w-[2rem] justify-center rounded-md border border-ca-border bg-ca-panel-2 px-hmi-2 py-0.5 font-mono text-[13px] tabular-nums text-ca-ink"
          >
            {all.length}
          </span>
        </div>
        <div className="flex items-center gap-hmi-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-hmi-2 rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink transition hover:border-ca-select disabled:opacity-50"
            data-testid="samples-upload-btn"
          >
            <Upload aria-hidden size={16} />
            {busy ? "Uploading…" : "Upload"}
          </button>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={
                    cameraBound && !capturing && !noDevices ? () => void onCaptureLive() : undefined
                  }
                  aria-disabled={!cameraBound || capturing || noDevices}
                  aria-busy={capturing || undefined}
                  data-live-capture-disabled={!cameraBound || noDevices || undefined}
                  data-video-device-count={videoDeviceCount ?? undefined}
                  className={
                    "inline-flex items-center gap-hmi-2 rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink transition hover:border-ca-select " +
                    (!cameraBound || capturing || noDevices ? "opacity-50 cursor-not-allowed" : "")
                  }
                  data-testid="samples-capture-btn"
                >
                  <Video aria-hidden size={16} />
                  {capturing ? "Capturing…" : "Capture from live camera"}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {!cameraBound
                  ? "Bind a camera setting first, then live capture unlocks."
                  : noDevices
                    ? "No video input detected. Plug in a camera or grant permission."
                    : "Capture a single frame from your webcam via getUserMedia."}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => void onFiles(e.target.files)}
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-hmi-2 text-hmi-caption text-ca-ng">
          {error}
        </p>
      ) : null}
      {noDevices && !permError ? (
        <p
          role="status"
          aria-live="polite"
          data-testid="samples-no-devices-notice"
          className="mt-hmi-2 rounded-md border border-ca-border bg-ca-panel-2 p-hmi-2 text-hmi-caption text-ca-ink-muted"
        >
          No camera detected. Connect a device or grant browser permission and it will appear here
          automatically.
        </p>
      ) : null}
      {permError ? (
        <div
          role="alert"
          aria-live="polite"
          data-testid="samples-permission-banner"
          data-permission-code={permError.code}
          className="mt-hmi-2 flex items-start justify-between gap-hmi-3 rounded-md border border-ca-ng/40 bg-ca-ng/10 p-hmi-3 text-hmi-body text-ca-ink"
        >
          <div className="min-w-0">
            <p className="font-semibold">{permError.message.title}</p>
            <p className="mt-0.5 text-hmi-caption text-ca-ink-muted">{permError.message.help}</p>
            <p className="mt-1 font-mono text-[11px] text-ca-ink-muted">{permError.code}</p>
          </div>
          <div className="flex items-center gap-hmi-2">
            {permError.message.actionable ? (
              <button
                type="button"
                onClick={() => void onCaptureLive()}
                disabled={capturing}
                className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-1 text-hmi-caption text-ca-ink hover:border-ca-select disabled:opacity-50"
                data-testid="samples-permission-retry"
              >
                Retry
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setPermError(null)}
              aria-label="Dismiss camera permission notice"
              className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-hmi-caption text-ca-ink-muted hover:border-ca-select"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      {all.length === 0 ? (
        <p className="mt-hmi-3 rounded-md border border-dashed border-ca-border bg-ca-panel-2 p-hmi-3 text-hmi-body text-ca-ink-muted">
          No samples yet. Upload one or capture from the bound camera.
        </p>
      ) : (
        // Plan 82: strict 3-column 96px thumbnail grid per V4 spec.
        // The prior variant collapsed to 2-col below `sm`, which drifted
        // from the spec on narrow docks. Grid is now always 3-col; each
        // thumbnail is a fixed 96x96 square so the contact sheet has the
        // predictable rhythm the visual regression tests baseline against.
        <ul className="mt-hmi-3 grid grid-cols-3 gap-hmi-3" data-testid="samples-grid">
          {all.map((s, i) => (
            <li
              key={s.id}
              className={
                "group relative flex flex-col overflow-hidden rounded-md border bg-ca-panel-2 transition hover:border-ca-select focus-within:border-ca-select outline-none focus-visible:ring-2 focus-visible:ring-ca-select " +
                (dragId === s.id ? "border-ca-select opacity-60 " : "border-ca-border ") +
                (dropIndex !== null &&
                (dropIndex === i || (dropIndex === all.length && i === all.length - 1))
                  ? "ring-2 ring-ca-select "
                  : "")
              }
              data-testid="sample-row"
              data-index={i}
              tabIndex={0}
              aria-label={`Sample ${i + 1} of ${all.length}: ${s.name}. Press Alt plus arrow keys to reorder.`}
              aria-grabbed={dragId === s.id || undefined}
              draggable
              onDragStart={(e) => {
                setDragId(s.id);
                e.dataTransfer.effectAllowed = "move";
                try {
                  e.dataTransfer.setData("text/plain", s.id);
                } catch {
                  /* Safari can throw on some MIME types; harmless */
                }
              }}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                const rect = (e.currentTarget as HTMLLIElement).getBoundingClientRect();
                const before = e.clientY - rect.top < rect.height / 2;
                setDropIndex(before ? i : i + 1);
              }}
              onDragLeave={() => {
                // Clearing here would flicker between siblings; the next
                // onDragOver on any tile immediately overwrites dropIndex,
                // and onDragEnd handles the abort case.
              }}
              onDrop={(e) => {
                if (dragId === null) return;
                e.preventDefault();
                const fromIndex = all.findIndex((x) => x.id === dragId);
                const toIndex = dropIndex ?? i;
                setDragId(null);
                setDropIndex(null);
                void onReorderTo(fromIndex, toIndex);
              }}
              onDragEnd={() => {
                setDragId(null);
                setDropIndex(null);
              }}
              onKeyDown={(e) => {
                // Alt+Arrow reorders (Up/Left = earlier, Down/Right = later).
                // Plain arrows are left alone so they still scroll / move
                // focus per browser defaults.
                if (!e.altKey) return;

                if (KeyboardKeyType.isArrowUp(e.key) || KeyboardKeyType.isArrowLeft(e.key)) {
                  e.preventDefault();
                  void onMove(i, -1);
                } else if (
                  KeyboardKeyType.isArrowDown(e.key) ||
                  KeyboardKeyType.isArrowRight(e.key)
                ) {
                  e.preventDefault();
                  void onMove(i, 1);
                }
              }}
            >
              <div className="relative aspect-square h-24 w-full overflow-hidden bg-ca-panel">
                <img
                  src={s.dataUrl}
                  alt={s.name}
                  className="h-full w-full object-contain bg-ca-panel"
                  loading="lazy"
                />
                {/* Hover-reveal action bar */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-1 bg-ca-panel/85 p-1 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
                  data-testid="sample-hover-actions"
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Move sample up"
                      onClick={() => void onMove(i, -1)}
                      disabled={i === 0}
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-ca-border bg-ca-panel text-ca-ink transition hover:border-ca-select disabled:opacity-40"
                      data-testid="sample-move-up"
                    >
                      <ArrowUp aria-hidden size={12} />
                    </button>
                    <button
                      type="button"
                      aria-label="Move sample down"
                      onClick={() => void onMove(i, 1)}
                      disabled={i === all.length - 1}
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-ca-border bg-ca-panel text-ca-ink transition hover:border-ca-select disabled:opacity-40"
                      data-testid="sample-move-down"
                    >
                      <ArrowDown aria-hidden size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Rename sample"
                      onClick={() => void onRename(s)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-ca-border bg-ca-panel text-ca-ink transition hover:border-ca-select"
                    >
                      <Pencil aria-hidden size={12} />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete sample"
                      onClick={() => void onRemove(s)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-ca-border bg-ca-panel text-ca-ng transition hover:border-ca-select"
                    >
                      <Trash2 aria-hidden size={12} />
                    </button>
                  </div>
                </div>
                {/* Index badge, tabular-numeric per V4 spec */}
                <span
                  className="absolute bottom-1 left-1 inline-flex min-w-[1.25rem] justify-center rounded-sm border border-ca-border bg-ca-panel/85 px-1 py-0.5 font-mono text-[11px] tabular-nums text-ca-ink backdrop-blur-sm"
                  aria-hidden
                >
                  {i + 1}
                </span>
              </div>
              <div className="min-w-0 px-hmi-2 py-1">
                <p
                  className="truncate font-display text-hmi-caption font-semibold text-ca-ink"
                  title={s.name}
                >
                  {s.name}
                </p>
                <p className="truncate font-mono text-[11px] tabular-nums text-ca-ink-muted">
                  {s.width}×{s.height} · {(s.byteSize / 1024).toFixed(1)} KB
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Plan 79 step 46: Run + Result sections.
//
// `runProject` is a pure function over the current project + rulesets
// snapshot; the button just runs it, logs the summary, and hands the
// result up to `ProjectEditorSections`. Result rows expose a jump-to-rule
// link so a failing rule is one click away.
// ---------------------------------------------------------------------------
function RunSection({
  project,
  rulesets,
  summary,
  onRan,
  samples,
  selection,
}: {
  project: Project;
  rulesets: readonly RuleSet[];
  summary: ProjectRunSummary | null;
  onRan: (s: ProjectRunSummary) => void;
  samples: readonly ImageSample[];
  selection: ReturnType<typeof useSelectedSample>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rulesetCount = project.rulesetIds.length;
  const hasBindings = Boolean(project.cameraSettingId && project.micSettingsId);

  // Plan 83 backlog 12. Feed the runner a domain-`enabled` predicate so
  // disabled rules emit SKIP + reason "Disabled" instead of a stale
  // PASS/FAIL, matching `computeEffectiveChain`'s ChainResult.disabled
  // contract (v3.718). Snapshot-read via useRulesLibrary().
  const rulesLib = useRulesLibrary();
  const isDisabled = useCallback(
    (ruleId: string): boolean => {
      const r = rulesLib.byId(ruleId as unknown as RuleId);

      return r ? r.enabled === false : false;
    },
    [rulesLib],
  );

  function onRun(): void {
    setError(null);
    setBusy(true);
    try {
      const s = runProject(project, rulesets, { isDisabled });
      onRan(s);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[project-editor/run] failed", e);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Run"
      className="rounded-lg border border-ca-border bg-ca-panel p-hmi-4"
      data-testid="project-editor-run"
    >
      <div className="flex items-center justify-between gap-hmi-3">
        <div className="flex items-center gap-hmi-2">
          <Play aria-hidden size={18} className="text-ca-ink-muted" />
          <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            Run
          </h2>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={busy || rulesetCount === 0}
          data-testid="run-project-btn"
          className="inline-flex items-center gap-hmi-2 rounded-md border border-ca-border bg-ca-select px-hmi-3 py-hmi-2 text-hmi-body font-semibold text-ca-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play aria-hidden size={16} />
          {busy ? "Running…" : "Run project"}
        </button>
      </div>
      <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">
        {rulesetCount === 0
          ? "Add at least one ruleset above to enable Run."
          : hasBindings
            ? `Will evaluate ${rulesetCount} ${rulesetCount === 1 ? "ruleset" : "rulesets"} against the bound camera + mics settings.`
            : `Will evaluate ${rulesetCount} ${rulesetCount === 1 ? "ruleset" : "rulesets"}. Camera and mics bindings are not required for the stub runner.`}
      </p>
      <div className="mt-hmi-3">
        <SampleCarousel samples={samples} selection={selection} />
      </div>
      {summary ? (
        <p className="mt-hmi-2 font-mono text-[13px] tabular-nums text-ca-ink-muted">
          Last run: {summary.pass} pass · {summary.fail} fail · {summary.skip} skip ·{" "}
          {summary.durationMs} ms
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-hmi-2 text-hmi-caption text-ca-ng">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function verdictBadge(
  v: ProjectRunSummary["verdict"] | ProjectRunSummary["rules"][number]["verdict"],
) {
  if (v === "PASS") return { Icon: CheckCircle2, tone: "text-ca-ok", label: "PASS" } as const;

  if (v === "FAIL") return { Icon: XCircle, tone: "text-ca-ng", label: "FAIL" } as const;

  return { Icon: MinusCircle, tone: "text-ca-ink-muted", label: "SKIP" } as const;
}

function ResultSection({
  summary,
  selectedSampleName,
}: {
  summary: ProjectRunSummary | null;
  selectedSampleName: string | null;
}) {
  const grouped = useMemo(() => {
    if (!summary)
      return [] as Array<{
        rulesetId: string;
        rulesetName: string;
        rows: ProjectRunSummary["rules"];
      }>;
    const out = new Map<
      string,
      { rulesetId: string; rulesetName: string; rows: ProjectRunSummary["rules"] }
    >();
    for (const r of summary.rules) {
      const cur = out.get(r.rulesetId);

      if (cur) cur.rows.push(r);
      else out.set(r.rulesetId, { rulesetId: r.rulesetId, rulesetName: r.rulesetName, rows: [r] });
    }

    return Array.from(out.values());
  }, [summary]);

  return (
    <section
      aria-label="Result"
      className="rounded-lg border border-ca-border bg-ca-panel p-hmi-4"
      data-testid="project-editor-result"
    >
      <div className="flex items-center justify-between gap-hmi-3">
        <div className="flex items-center gap-hmi-2">
          <ListChecks aria-hidden size={18} className="text-ca-ink-muted" />
          <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            Result
          </h2>
          {summary ? <VerdictPill verdict={summary.verdict} /> : null}
          {selectedSampleName ? (
            <span
              className="truncate font-mono text-[13px] tabular-nums text-ca-ink-muted"
              title={`Evaluated against sample: ${selectedSampleName}`}
              data-testid="result-selected-sample"
            >
              · {selectedSampleName}
            </span>
          ) : null}
        </div>
        {summary ? (
          <span className="font-mono text-[13px] tabular-nums text-ca-ink-muted">
            {new Date(summary.ranAt).toLocaleTimeString()}
          </span>
        ) : null}
      </div>
      {!summary ? (
        <p className="mt-hmi-3 rounded-md border border-dashed border-ca-border bg-ca-panel-2 p-hmi-3 text-hmi-body text-ca-ink-muted">
          No results yet. Press "Run project" above.
        </p>
      ) : summary.rules.length === 0 ? (
        <p className="mt-hmi-3 rounded-md border border-dashed border-ca-border bg-ca-panel-2 p-hmi-3 text-hmi-body text-ca-ink-muted">
          This project has no rules to evaluate.
        </p>
      ) : (
        <div className="mt-hmi-3 space-y-hmi-3">
          {grouped.map((g) => (
            <div key={g.rulesetId} className="rounded-md border border-ca-border bg-ca-panel-2">
              <div className="flex items-center justify-between border-b border-ca-border px-hmi-3 py-hmi-2">
                <span className="truncate font-display text-hmi-body font-semibold text-ca-ink">
                  {g.rulesetName}
                </span>
                <span className="font-mono text-[13px] tabular-nums text-ca-ink-muted">
                  {g.rows.filter((r) => r.verdict === "PASS").length}/{g.rows.length} pass
                </span>
              </div>
              <ul>
                {g.rows.map((r) => {
                  const b = verdictBadge(r.verdict);

                  return (
                    <li
                      key={`${r.rulesetId}:${r.ruleId}`}
                      className="flex items-center gap-hmi-2 border-b border-ca-border/60 px-hmi-3 py-hmi-2 last:border-b-0"
                      data-testid="result-row"
                    >
                      <b.Icon aria-hidden size={16} className={b.tone} />
                      <span className={`w-12 font-mono text-[13px] tabular-nums ${b.tone}`}>
                        {b.label}
                      </span>
                      <Link
                        to="/setup/rules/$id"
                        params={{ id: r.ruleId }}
                        className="min-w-0 flex-1 truncate text-hmi-body text-ca-ink hover:text-ca-select"
                      >
                        {r.ruleName}
                      </Link>
                      <span className="hidden font-mono text-[13px] tabular-nums text-ca-ink-muted sm:inline">
                        {r.reason}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function VerdictPill({ verdict }: { verdict: ProjectRunSummary["verdict"] }) {
  const b = verdictBadge(verdict);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-ca-border bg-ca-panel px-hmi-2 py-0.5 font-mono text-[13px] tabular-nums ${b.tone}`}
      data-testid="result-verdict"
    >
      <b.Icon aria-hidden size={14} />
      {b.label}
    </span>
  );
}
