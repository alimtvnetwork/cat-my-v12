// Plan 78 step 2 (I-SU-05 camera setup surface).
//
// Full CameraSetting list + editor keyed to `spec/24-app-ui-design-system/17-camera-setup.md`.
// Storage flows through the SDK facade via the camera library store; a memory
// stub is used during SSR/tests. Server-fn hooks (Enumerate Devices, Test
// Capture, live preview) are still blocked on the worker build (I-BE-04) and
// are surfaced as disabled affordances with a tooltip, not silently omitted.
import { createFileRoute, useHydrated } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Plus, Trash2, Camera, Copy, Download, Upload, Search } from "lucide-react";
import { toast } from "sonner";
import { showToastError } from "@/lib/errors/notify";
import { useCameraLibrary } from "@/lib/camera/useCameraLibrary";
import type { CameraSaveOutcome, CameraRemoveOutcome } from "@/lib/camera/facade";
import {
  makeDefaultCameraSetting,
  validateCameraSetting,
  type CameraSetting,
} from "@/lib/camera/model";
import { importCameraLibraryJson, exportCameraLibraryJson } from "@/lib/camera/io";

export const Route = createFileRoute("/setup/camera")({
  head: () => ({
    meta: [
      { title: "Camera Setup - Control Automation" },
      {
        name: "description",
        content:
          "Manage CameraSetting records: identity, optics, exposure, and acquisition parameters shared across projects.",
      },
    ],
  }),
  component: SetupCameraPage,
});

function reportSaveOutcome(out: CameraSaveOutcome, source: string): boolean {
  if (out.ok) return true;
  const tagged = `${source}#${out.correlationId}`;

  if (out.kind === "validation") {
    console.error("[camera] validation failure", {
      correlationId: out.correlationId,
      errors: out.errors,
    });
    const msg = out.errors.map((e) => `${e.path}: ${e.message}`).join("; ");
    showToastError(msg || "Validation failed", out.errors, { source: tagged });
  } else {
    console.error("[camera] persist failure", {
      correlationId: out.correlationId,
      message: out.message,
    });
    showToastError(out.message, null, { source: tagged });
  }

  return false;
}

function reportRemoveOutcome(out: CameraRemoveOutcome, source: string): boolean {
  if (out.ok) return true;
  const tagged = `${source}#${out.correlationId}`;

  if (out.kind === "referenced") {
    console.error("[camera] remove blocked by referrers", out);
    showToastError(
      `Camera is bound to ${out.projects.length} project(s); unbind first.`,
      out.projects,
      { source: tagged },
    );
  } else {
    console.error("[camera] remove persist failure", out);
    showToastError(out.message, null, { source: tagged });
  }

  return false;
}

function SetupCameraPage() {
  const library = useCameraLibrary();
  const hydrated = useHydrated();
  // Gate on hydration to prevent SSR/client mismatch: the facade reads
  // localStorage on the client (populated by seed) but is empty during SSR.
  const entries = hydrated ? library.all : ([] as readonly CameraSetting[]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (selectedId && entries.some((e) => e.id === selectedId) === false) setSelectedId(null);
  }, [entries, selectedId]);
  const selected = selectedId ? (entries.find((e) => e.id === selectedId) ?? null) : null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return entries;

    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.vendor.toLowerCase().includes(q) ||
        e.deviceSerial.toLowerCase().includes(q),
    );
  }, [entries, query]);

  function createNew() {
    const entry = makeDefaultCameraSetting();

    if (reportSaveOutcome(library.save(entry), "setup/camera.create")) {
      setSelectedId(entry.id);
      toast.success(`Created ${entry.name}`);
    }
  }

  function duplicateSelected() {
    if (!selected) return;
    const now = Date.now();
    const copy: CameraSetting = {
      ...selected,
      id: `cam-${now.toString(36)}`,
      name: `${selected.name} (copy)`,
      createdAt: now,
      updatedAt: now,
    };
    const v = validateCameraSetting(copy);

    if (v.ok === false) {
      const msg = v.errors.map((e) => `${e.path}: ${e.message}`).join("; ");
      showToastError(msg || "Validation failed", v.errors, { source: "setup/camera.duplicate" });

      return;
    }

    if (reportSaveOutcome(library.save(v.value), "setup/camera.duplicate")) {
      setSelectedId(copy.id);
      toast.success(`Duplicated to ${copy.name}`);
    }
  }

  function handleExport() {
    try {
      const json = exportCameraLibraryJson({ entries: [...entries] });
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `camera-library-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${entries.length} camera(s)`);
    } catch (err) {
      console.error("[camera] export failure", err);
      showToastError("Failed to export camera library", err, { source: "setup/camera.export" });
    }
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const r = importCameraLibraryJson(text);

      if (r.ok === false) {
        const msg = r.errors.map((e) => `${e.path}: ${e.message}`).join("; ");
        showToastError(msg || "Import validation failed", r.errors, {
          source: "setup/camera.import",
        });

        return;
      }

      let added = 0;
      let rejected = 0;
      for (const entry of r.entries) {
        if (library.save(entry).ok) added++;
        else rejected++;
      }

      toast.success(`Imported ${added} camera(s)${rejected ? `; ${rejected} rejected` : ""}`);
    } catch (err) {
      console.error("[camera] import failure", err);
      showToastError("Failed to read import file", err, { source: "setup/camera.import" });
    }
  }

  function patchSelected(next: Partial<CameraSetting>) {
    if (!selected) return;
    const out = library.save({ ...selected, ...next, updatedAt: Date.now() });
    reportSaveOutcome(out, "setup/camera.patch");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-col gap-1 border-b border-ca-border bg-ca-panel-2 px-4 py-3">
        <h1 className="flex items-center gap-2 text-hmi-header text-ca-ink">
          <Camera className="h-5 w-5 text-ca-primary" aria-hidden /> Camera Setup
        </h1>
        <p className="text-hmi-caption text-ca-ink-muted">
          CameraSetting records shared across projects. Identity, optics, exposure, and acquisition.
        </p>
      </header>
      <div className="flex flex-1 min-h-0">
        <aside className="flex w-72 flex-col border-r border-ca-border bg-ca-panel-2">
          <div className="flex flex-col gap-2 border-b border-ca-border p-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={createNew}
                className="flex items-center gap-1 border border-ca-border bg-ca-bg px-2 py-1 text-hmi-body text-ca-ink hover:bg-ca-panel"
              >
                <Plus size={14} aria-hidden /> New
              </button>
              <button
                type="button"
                onClick={duplicateSelected}
                disabled={!selected}
                title={selected ? "Duplicate selected camera" : "Select a camera to duplicate"}
                className="flex items-center gap-1 border border-ca-border bg-ca-bg px-2 py-1 text-hmi-body text-ca-ink hover:bg-ca-panel disabled:opacity-50 disabled:hover:bg-ca-bg"
              >
                <Copy size={14} aria-hidden /> Duplicate
              </button>
              <button
                type="button"
                disabled
                title="Enumerate Devices requires the worker build (I-BE-04)"
                className="ml-auto flex items-center gap-1 border border-ca-border bg-ca-bg px-2 py-1 text-hmi-body text-ca-ink-muted opacity-60"
              >
                Enumerate
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                disabled={entries.length === 0}
                title="Export camera library as JSON"
                className="flex items-center gap-1 border border-ca-border bg-ca-bg px-2 py-1 text-hmi-caption text-ca-ink hover:bg-ca-panel disabled:opacity-50 disabled:hover:bg-ca-bg"
              >
                <Download size={12} aria-hidden /> Export
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Import camera library from JSON"
                className="flex items-center gap-1 border border-ca-border bg-ca-bg px-2 py-1 text-hmi-caption text-ca-ink hover:bg-ca-panel"
              >
                <Upload size={12} aria-hidden /> Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];

                  if (f) void handleImportFile(f);
                  e.target.value = "";
                }}
              />
            </div>
            <label className="flex items-center gap-2 border border-ca-border bg-ca-bg px-2 py-1 text-hmi-caption text-ca-ink-muted">
              <Search size={12} aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by name, vendor, serial"
                className="w-full bg-transparent text-ca-ink placeholder:text-ca-ink-muted focus:outline-none"
                aria-label="Filter cameras"
              />
            </label>
          </div>
          <ul className="flex-1 overflow-auto">
            {filtered.length === 0 ? (
              <li className="p-3 text-hmi-caption text-ca-ink-muted">
                {entries.length === 0
                  ? "No cameras yet. Click New to add one."
                  : "No cameras match the current filter."}
              </li>
            ) : (
              filtered.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(e.id)}
                    className={`flex w-full flex-col items-start gap-0.5 border-b border-ca-border px-3 py-2 text-left text-hmi-body ${
                      selectedId === e.id
                        ? "bg-ca-panel text-ca-ink"
                        : "text-ca-ink hover:bg-ca-panel"
                    }`}
                  >
                    <span className="truncate">{e.name}</span>
                    <span className="font-hmi-mono text-hmi-caption text-ca-ink-muted">
                      {e.vendor} / {e.resolutionW}x{e.resolutionH} / pockets {e.pockets}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <main className="flex flex-1 flex-col overflow-auto p-4">
          {selected ? (
            <CameraEditor
              entry={selected}
              onPatch={patchSelected}
              onDelete={() =>
                reportRemoveOutcome(library.remove(selected.id), "setup/camera.remove")
              }
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-hmi-body text-ca-ink-muted">
              Select a camera on the left, or create a new one.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-hmi-body text-ca-ink">
      <span className="text-hmi-caption text-ca-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function num(v: string, def: number): number {
  const n = Number(v);

  return Number.isFinite(n) ? n : def;
}

function CameraEditor({
  entry,
  onPatch,
  onDelete,
}: {
  entry: CameraSetting;
  onPatch: (p: Partial<CameraSetting>) => void;
  onDelete: () => void;
}) {
  const inputCls =
    "bg-ca-bg border border-ca-border px-2 py-1 text-ca-ink focus:outline-none focus:ring-1 focus:ring-ca-primary";

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="cam-identity" className="flex flex-col gap-3">
        <h2 id="cam-identity" className="text-hmi-body font-semibold text-ca-ink">
          Identity
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <input
              className={inputCls}
              value={entry.name}
              onChange={(e) => onPatch({ name: e.target.value })}
            />
          </Field>
          <Field label="Vendor">
            <select
              className={inputCls}
              value={entry.vendor}
              onChange={(e) => onPatch({ vendor: e.target.value as CameraSetting["vendor"] })}
            >
              <option value="Pylon">Pylon</option>
              <option value="Spinnaker">Spinnaker</option>
              <option value="Vimba">Vimba</option>
              <option value="GenericV4L2">GenericV4L2</option>
            </select>
          </Field>
          <Field label="Device serial">
            <input
              className={inputCls}
              value={entry.deviceSerial}
              onChange={(e) => onPatch({ deviceSerial: e.target.value })}
            />
          </Field>
          <Field label="Color mode">
            <select
              className={inputCls}
              value={entry.colorMode}
              onChange={(e) => onPatch({ colorMode: e.target.value as CameraSetting["colorMode"] })}
            >
              <option value="Mono8">Mono8</option>
              <option value="Mono12">Mono12</option>
              <option value="RGB8">RGB8</option>
              <option value="Bayer_RG8">Bayer_RG8</option>
            </select>
          </Field>
        </div>
      </section>

      <section aria-labelledby="cam-optics" className="flex flex-col gap-3">
        <h2 id="cam-optics" className="text-hmi-body font-semibold text-ca-ink">
          Optics
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <Field label="FOV width (mm)">
            <input
              type="number"
              step="0.1"
              className={inputCls}
              value={entry.fovMmW}
              onChange={(e) => onPatch({ fovMmW: num(e.target.value, entry.fovMmW) })}
            />
          </Field>
          <Field label="FOV height (mm)">
            <input
              type="number"
              step="0.1"
              className={inputCls}
              value={entry.fovMmH}
              onChange={(e) => onPatch({ fovMmH: num(e.target.value, entry.fovMmH) })}
            />
          </Field>
          <Field label="Pixel size (µm)">
            <input
              type="number"
              step="0.01"
              className={inputCls}
              value={entry.pixelSizeUm ?? ""}
              onChange={(e) =>
                onPatch({
                  pixelSizeUm:
                    e.target.value === "" ? undefined : num(e.target.value, entry.pixelSizeUm ?? 0),
                })
              }
            />
          </Field>
          <Field label="Resolution W (px)">
            <input
              type="number"
              className={inputCls}
              value={entry.resolutionW}
              onChange={(e) => onPatch({ resolutionW: num(e.target.value, entry.resolutionW) })}
            />
          </Field>
          <Field label="Resolution H (px)">
            <input
              type="number"
              className={inputCls}
              value={entry.resolutionH}
              onChange={(e) => onPatch({ resolutionH: num(e.target.value, entry.resolutionH) })}
            />
          </Field>
        </div>
      </section>

      <section aria-labelledby="cam-exposure" className="flex flex-col gap-3">
        <h2 id="cam-exposure" className="text-hmi-body font-semibold text-ca-ink">
          Exposure
        </h2>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Exposure (µs)">
            <input
              type="number"
              min={1}
              max={10_000_000}
              className={inputCls}
              value={entry.exposureUs}
              onChange={(e) => onPatch({ exposureUs: num(e.target.value, entry.exposureUs) })}
            />
          </Field>
          <Field label="Gain (dB)">
            <input
              type="number"
              step="0.1"
              min={0}
              max={60}
              className={inputCls}
              value={entry.gainDb}
              onChange={(e) => onPatch({ gainDb: num(e.target.value, entry.gainDb) })}
            />
          </Field>
          <Field label="Gamma">
            <input
              type="number"
              step="0.05"
              min={0.1}
              max={5}
              className={inputCls}
              value={entry.gamma}
              onChange={(e) => onPatch({ gamma: num(e.target.value, entry.gamma) })}
            />
          </Field>
          <Field label="White balance (K, 0=Auto)">
            <input
              type="number"
              min={0}
              max={10_000}
              className={inputCls}
              value={entry.whiteBalanceKelvin}
              onChange={(e) =>
                onPatch({ whiteBalanceKelvin: num(e.target.value, entry.whiteBalanceKelvin) })
              }
            />
          </Field>
        </div>
      </section>

      <section aria-labelledby="cam-acq" className="flex flex-col gap-3">
        <h2 id="cam-acq" className="text-hmi-body font-semibold text-ca-ink">
          Acquisition
        </h2>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Trigger mode">
            <select
              className={inputCls}
              value={entry.triggerMode}
              onChange={(e) =>
                onPatch({ triggerMode: e.target.value as CameraSetting["triggerMode"] })
              }
            >
              <option value="Software">Software</option>
              <option value="Hardware">Hardware</option>
              <option value="Continuous">Continuous</option>
            </select>
          </Field>
          <Field label="Frame rate (Hz)">
            <input
              type="number"
              step="0.1"
              className={inputCls}
              value={entry.frameRateHz}
              onChange={(e) => onPatch({ frameRateHz: num(e.target.value, entry.frameRateHz) })}
            />
          </Field>
          <Field label="Pockets">
            <input
              type="number"
              min={1}
              step={1}
              className={inputCls}
              value={entry.pockets}
              onChange={(e) =>
                onPatch({ pockets: Math.max(1, Math.round(num(e.target.value, entry.pockets))) })
              }
            />
          </Field>
          <Field label="Focus mode">
            <select
              className={inputCls}
              value={entry.focusMode}
              onChange={(e) => onPatch({ focusMode: e.target.value as CameraSetting["focusMode"] })}
            >
              <option value="Auto">Auto</option>
              <option value="Manual">Manual</option>
            </select>
          </Field>
          {entry.focusMode === "Manual" ? (
            <Field label="Focus value (mm)">
              <input
                type="number"
                step="0.1"
                className={inputCls}
                value={entry.focusValue ?? ""}
                onChange={(e) =>
                  onPatch({
                    focusValue:
                      e.target.value === ""
                        ? undefined
                        : num(e.target.value, entry.focusValue ?? 0),
                  })
                }
              />
            </Field>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="cam-notes" className="flex flex-col gap-2">
        <h2 id="cam-notes" className="text-hmi-body font-semibold text-ca-ink">
          Notes
        </h2>
        <textarea
          rows={3}
          className={inputCls}
          value={entry.notes}
          onChange={(e) => onPatch({ notes: e.target.value })}
        />
      </section>

      <RoiEditor entry={entry} onPatch={onPatch} />

      <div className="flex items-center justify-between border-t border-ca-border pt-3 text-hmi-caption text-ca-ink-muted">
        <span className="font-hmi-mono">id: {entry.id}</span>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1 border border-ca-ng bg-ca-bg px-2 py-1 text-ca-ng hover:bg-ca-panel"
        >
          <Trash2 size={14} aria-hidden /> Delete
        </button>
      </div>
    </div>
  );
}

// Plan 78 slice 5 (I-SU-05 ROI overlay): visual ROI selector.
// Drag inside the preview to define an ROI in image-pixel coordinates.
// Hold Shift while dragging to constrain to a square.
function RoiEditor({
  entry,
  onPatch,
}: {
  entry: CameraSetting;
  onPatch: (p: Partial<CameraSetting>) => void;
}) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<null | { x: number; y: number; w: number; h: number }>(null);

  const clamp = useCallback(
    (r: { x: number; y: number; w: number; h: number }) => {
      const x = Math.max(0, Math.min(entry.resolutionW - 1, Math.round(r.x)));
      const y = Math.max(0, Math.min(entry.resolutionH - 1, Math.round(r.y)));
      const w = Math.max(1, Math.min(entry.resolutionW - x, Math.round(r.w)));
      const h = Math.max(1, Math.min(entry.resolutionH - y, Math.round(r.h)));

      return { x, y, w, h };
    },
    [entry.resolutionW, entry.resolutionH],
  );

  function toImage(clientX: number, clientY: number) {
    const el = surfaceRef.current;

    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;

    return { x: nx * entry.resolutionW, y: ny * entry.resolutionH };
  }

  const onPointerDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (ev.button !== 0) return;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    const p = toImage(ev.clientX, ev.clientY);
    setDrag({ x: p.x, y: p.y, w: 1, h: 1 });
  };
  const onPointerMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const p = toImage(ev.clientX, ev.clientY);
    let w = p.x - drag.x;
    let h = p.y - drag.y;

    if (ev.shiftKey) {
      const s = Math.min(Math.abs(w), Math.abs(h));
      w = Math.sign(w || 1) * s;
      h = Math.sign(h || 1) * s;
    }

    setDrag({ ...drag, w, h });
  };
  const onPointerUp = () => {
    if (!drag) return;
    const x = drag.w < 0 ? drag.x + drag.w : drag.x;
    const y = drag.h < 0 ? drag.y + drag.h : drag.y;
    const roi = clamp({ x, y, w: Math.abs(drag.w), h: Math.abs(drag.h) });
    setDrag(null);

    if (roi.w >= 4 && roi.h >= 4) onPatch({ roi });
  };

  const roi = entry.roi;
  const inputCls =
    "bg-ca-bg border border-ca-border px-2 py-1 text-ca-ink focus:outline-none focus:ring-1 focus:ring-ca-primary";

  function patchRoiField(k: "x" | "y" | "w" | "h", v: number) {
    const base = roi ?? { x: 0, y: 0, w: entry.resolutionW, h: entry.resolutionH };
    onPatch({ roi: clamp({ ...base, [k]: v }) });
  }

  // Overlay rect in percentages (image space -> surface space).
  const shown = drag
    ? {
        x: drag.w < 0 ? drag.x + drag.w : drag.x,
        y: drag.h < 0 ? drag.y + drag.h : drag.y,
        w: Math.abs(drag.w),
        h: Math.abs(drag.h),
      }
    : roi;
  const pct = shown
    ? {
        left: `${(shown.x / entry.resolutionW) * 100}%`,
        top: `${(shown.y / entry.resolutionH) * 100}%`,
        width: `${(shown.w / entry.resolutionW) * 100}%`,
        height: `${(shown.h / entry.resolutionH) * 100}%`,
      }
    : null;

  return (
    <section aria-labelledby="cam-roi" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="cam-roi" className="text-hmi-body font-semibold text-ca-ink">
          Region of Interest
        </h2>
        <button
          type="button"
          onClick={() => onPatch({ roi: null })}
          disabled={!roi}
          className="border border-ca-border bg-ca-bg px-2 py-1 text-hmi-caption text-ca-ink hover:bg-ca-panel disabled:opacity-50 disabled:hover:bg-ca-bg"
        >
          Clear ROI
        </button>
      </div>
      <p className="text-hmi-caption text-ca-ink-muted">
        Drag on the preview to select. Hold Shift to lock a square. Coordinates are in image pixels
        relative to {entry.resolutionW}x{entry.resolutionH}.
      </p>
      <div
        ref={surfaceRef}
        role="application"
        aria-label="ROI selection surface"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ aspectRatio: `${entry.resolutionW} / ${entry.resolutionH}` }}
        className="relative w-full max-w-xl select-none border border-ca-border bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.02)_0_8px,transparent_8px_16px)] bg-ca-panel-2 touch-none"
      >
        {pct ? (
          <div
            data-testid="roi-rect"
            className="pointer-events-none absolute border border-ca-primary bg-ca-primary/15"
            style={pct}
          />
        ) : null}
      </div>
      <div className="grid grid-cols-4 gap-3 max-w-xl">
        <Field label="X (px)">
          <input
            type="number"
            min={0}
            className={inputCls}
            value={roi?.x ?? 0}
            onChange={(e) => patchRoiField("x", num(e.target.value, roi?.x ?? 0))}
          />
        </Field>
        <Field label="Y (px)">
          <input
            type="number"
            min={0}
            className={inputCls}
            value={roi?.y ?? 0}
            onChange={(e) => patchRoiField("y", num(e.target.value, roi?.y ?? 0))}
          />
        </Field>
        <Field label="W (px)">
          <input
            type="number"
            min={1}
            className={inputCls}
            value={roi?.w ?? entry.resolutionW}
            onChange={(e) => patchRoiField("w", num(e.target.value, roi?.w ?? entry.resolutionW))}
          />
        </Field>
        <Field label="H (px)">
          <input
            type="number"
            min={1}
            className={inputCls}
            value={roi?.h ?? entry.resolutionH}
            onChange={(e) => patchRoiField("h", num(e.target.value, roi?.h ?? entry.resolutionH))}
          />
        </Field>
      </div>
    </section>
  );
}
