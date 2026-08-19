import { ClientLogger } from "@/lib/observability/client-logger";
import { useCallback, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Undo2, Trash2, Save, Download, MousePointer2, Pencil, FileCode2 } from "lucide-react";
import { ToolType } from "@/lib/enums/editor";
import { compileShape } from "@/lib/shapes.functions";
import { pointsToAbsolutePath, simplify, type Point } from "./svg-path";
import { compileDesignShape } from "./compile-shape";
import { cn } from "@/lib/utils";

/**
 * Design Mode overlay, Plan 64 step 90.
 *
 * Root cause the overlay addresses: the rule editor could only produce
 * axis-aligned rectangles, so operators had no way to author custom
 * shapes / masks from the reference image, and the `compileShape` server
 * fn (already shipped in step 68) had no caller in the UI.
 *
 * Design:
 * - Full-viewport modal above the ruleset editor, reference image is
 *   the background. If there is no reference image, a hatched canvas
 *   is shown so the drawing still has a bounded surface.
 * - Two tools:
 *   - Point tool, click to add polygon vertices, Enter or Close closes
 *     the polygon.
 *   - Freehand tool, mouse-down + drag traces a stroke that is
 *     Ramer-Douglas-Peucker simplified before compile so payload stays
 *     under the server's 64 kB SVG cap.
 * - Compile builds the absolute-command SVG path, always saves a local
 *   `.shape.svg` download so operators can round-trip offline, and best-
 *   effort calls the `compileShape` server fn. A cloud failure is logged
 *   and surfaced in the alert region, it does not lose the local file.
 *
 * Every failure path logs with a `[design-mode]` tag; no try/catch is
 * used to swallow errors silently.
 */

interface Props {
  open: boolean;
  imageRef: string | null;
  suggestedName: string;
  onClose: () => void;
  onCompiled?: (result: {
    name: string;
    svgPath: string;
    viewBoxW: number;
    viewBoxH: number;
  }) => void;
}

export function DesignModeOverlay({
  open,
  imageRef,
  suggestedName,
  onClose,
  onCompiled,
}: Props): React.JSX.Element | null {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tool, setTool] = useState<ToolType>(ToolType.Point);
  const [points, setPoints] = useState<Point[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [name, setName] = useState(suggestedName);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const compile = useServerFn(compileShape);

  const localCoords = useCallback((evt: React.PointerEvent<SVGSVGElement>): Point | null => {
    const svg = svgRef.current;

    if (!svg) return null;
    const rect = svg.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) return null;

    return {
      x: ((evt.clientX - rect.left) / rect.width) * 1000,
      y: ((evt.clientY - rect.top) / rect.height) * 1000,
    };
  }, []);

  const onPointerDown = useCallback(
    (evt: React.PointerEvent<SVGSVGElement>) => {
      const p = localCoords(evt);

      if (!p) return;

      if (ToolType.isPoint(tool)) {
        setPoints((prev) => [...prev, p]);

        return;
      }
      // Freehand: start a fresh stroke on each pointer-down.
      setDrawing(true);
      setPoints([p]);
      svgRef.current?.setPointerCapture(evt.pointerId);
    },
    [tool, localCoords],
  );

  const onPointerMove = useCallback(
    (evt: React.PointerEvent<SVGSVGElement>) => {
      if (ToolType.isFreehand(tool) === false || !drawing) return;
      const p = localCoords(evt);

      if (!p) return;
      setPoints((prev) => [...prev, p]);
    },
    [tool, drawing, localCoords],
  );

  const onPointerUp = useCallback(
    (evt: React.PointerEvent<SVGSVGElement>) => {
      if (ToolType.isFreehand(tool) === false) return;
      setDrawing(false);
      try {
        svgRef.current?.releasePointerCapture(evt.pointerId);
      } catch {
        // releasePointerCapture throws if the pointer was never captured; safe to ignore.
      }
    },
    [tool],
  );

  const undo = useCallback(() => {
    setPoints((prev) => prev.slice(0, -1));
  }, []);

  const clear = useCallback(() => {
    setPoints([]);
    setStatus(null);
  }, []);

  const previewPath = useMemo(
    () => pointsToAbsolutePath(points, { close: points.length >= 3 }),
    [points],
  );

  const canCompile = points.length >= 3 && name.trim().length > 0 && !busy;
  const canExportSvg = points.length >= 3 && name.trim().length > 0;

  /**
   * Plan 67 step 24 (RE-08 UI wiring): expose a lightweight preview
   * that runs the shared `compileDesignShape` util against the current
   * points. Surfaces point-count-after-RDP and byte length in the
   * status region so operators can see the round-trip payload before
   * committing to cloud compile or file export. No side effects.
   */
  const previewCompile = useCallback(() => {
    if (points.length < 3) {
      setStatus("Draw at least 3 points to preview the compiled shape.");

      return;
    }

    const source = ToolType.isFreehand(tool) ? simplify(points, 1.5) : points;
    const compiled = compileDesignShape(source, {
      simplifyEpsilon: ToolType.isFreehand(tool) ? 0 : 0.5,
    });
    ClientLogger.info("[design-mode] preview compile", {
      pointCount: compiled.pointCount,
      bytes: compiled.svg.length,
      viewBox: [compiled.viewBoxW, compiled.viewBoxH],
    });
    setStatus(
      `Preview: ${compiled.pointCount} pts, ${compiled.svg.length} B, viewBox ` +
        `${compiled.viewBoxW.toFixed(1)}×${compiled.viewBoxH.toFixed(1)}.`,
    );
  }, [points, tool]);

  /**
   * Plan 66 step 12 (RE-09): explicit "Export SVG" that saves the
   * current in-progress overlay to a `.shape.svg` without invoking the
   * cloud compile fn. Compile keeps its own auto-save; this button is
   * for the "just give me the file" flow (round-trip into Layers import).
   */
  const exportSvg = useCallback(() => {
    const trimmedName = name.trim();

    if (points.length < 3 || !trimmedName) {
      setStatus("Draw at least 3 points and name the shape before exporting.");

      return;
    }
    // Step 25 (RE-09 polish): use compileDesignShape as the single source
    // of truth for the exported document, so exports match what the SVG
    // importer parses on the receiving side. Previously exportSvg emitted
    // its own local renderStandaloneSvg with different formatting, which
    // caused round-trip drift.
    const source = ToolType.isFreehand(tool) ? simplify(points, 1.5) : points;
    const compiled = compileDesignShape(source, {
      simplifyEpsilon: ToolType.isFreehand(tool) ? 0 : 0.5,
    });
    const payload = {
      name: trimmedName,
      svgPath: compiled.svgPath,
      viewBoxW: compiled.viewBoxW,
      viewBoxH: compiled.viewBoxH,
    };
    try {
      downloadBlob(`${sanitiseFilename(trimmedName)}.shape.svg`, compiled.svg, "image/svg+xml");
      ClientLogger.info("[design-mode] export svg ok", {
        name: trimmedName,
        bytes: compiled.svg.length,
        pointCount: compiled.pointCount,
      });
      setStatus(
        `SVG "${trimmedName}" downloaded (${compiled.pointCount} pts, ${compiled.svg.length} B).`,
      );
      onCompiled?.(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ClientLogger.error("[design-mode] export svg failed", { error: message });
      setStatus(`SVG export failed: ${message}`);
    }
  }, [name, points, tool, onCompiled]);

  const doCompile = useCallback(async () => {
    const trimmedName = name.trim();

    if (points.length < 3 || !trimmedName) {
      setStatus("Draw at least 3 points and name the shape before compiling.");

      return;
    }

    setBusy(true);
    setStatus(null);

    // Step 25: use compileDesignShape for the local save too so the
    // .shape.svg on disk is byte-identical to the file exportSvg would
    // have produced. The cloud compile payload continues to send only
    // the path + viewBox (no full doc).
    const source = ToolType.isFreehand(tool) ? simplify(points, 1.5) : points;
    const compiled = compileDesignShape(source, {
      simplifyEpsilon: ToolType.isFreehand(tool) ? 0 : 0.5,
    });
    const payload = {
      name: trimmedName,
      svgPath: compiled.svgPath,
      viewBoxW: compiled.viewBoxW,
      viewBoxH: compiled.viewBoxH,
    };
    ClientLogger.info("[design-mode] compile start", {
      name: payload.name,
      points: compiled.pointCount,
      bytes: compiled.svgPath.length,
    });

    // Always emit a local .shape.svg so operators can round-trip even
    // when Lovable Cloud is not enabled (step 85 migration pending).
    try {
      downloadBlob(`${sanitiseFilename(payload.name)}.shape.svg`, compiled.svg, "image/svg+xml");
      ClientLogger.info("[design-mode] local svg saved", { bytes: compiled.svg.length });
    } catch (err) {
      ClientLogger.error("[design-mode] local save failed", err);
      setStatus("Local shape file could not be saved. Check browser download permissions.");
      setBusy(false);

      return;
    }

    // Best-effort cloud compile. Failure is surfaced but never blocks
    // the local save that already succeeded above.
    try {
      const shape = await compile({ data: payload });
      ClientLogger.info("[design-mode] compile ok", { id: shape.id, sha256: shape.sha256 });
      setStatus(`Shape "${payload.name}" saved (id ${shape.id.slice(0, 8)}...).`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ClientLogger.warn("[design-mode] cloud compile failed, local file kept", { message });
      setStatus(
        `Local shape saved. Cloud compile failed: ${message}. Enable Cloud to store shape assets.`,
      );
    }

    onCompiled?.(payload);
    setBusy(false);
  }, [name, points, tool, compile, onCompiled]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Design mode"
      className="fixed inset-0 z-[90] flex flex-col bg-ca-bg/95 backdrop-blur"
    >
      <header className="flex items-center justify-between gap-hmi-3 border-b border-ca-border bg-ca-panel px-hmi-4 py-hmi-2">
        <div className="flex items-center gap-hmi-3">
          <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            Design mode
          </h2>
          <div role="group" aria-label="Tool" className="flex items-center gap-hmi-1">
            <ToolButton
              active={ToolType.isPoint(tool)}
              onClick={() => setTool(ToolType.Point)}
              label="Point tool"
              Icon={MousePointer2}
            />
            <ToolButton
              active={ToolType.isFreehand(tool)}
              onClick={() => setTool(ToolType.Freehand)}
              label="Freehand tool"
              Icon={Pencil}
            />
          </div>
          <label className="flex items-center gap-hmi-2 text-hmi-caption text-ca-ink-muted">
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-48 rounded-sm border border-ca-border bg-ca-bg px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink outline-none focus-visible:border-ca-focus"
              aria-label="Shape name"
            />
          </label>
        </div>
        <div className="flex items-center gap-hmi-2">
          <IconButton onClick={undo} disabled={points.length === 0} label="Undo last point">
            <Undo2 size={16} />
          </IconButton>
          <IconButton onClick={clear} disabled={points.length === 0} label="Clear">
            <Trash2 size={16} />
          </IconButton>
          <IconButton
            onClick={previewCompile}
            disabled={points.length < 3}
            label="Preview compiled shape"
          >
            <FileCode2 size={16} />
          </IconButton>
          <button
            type="button"
            onClick={doCompile}
            disabled={!canCompile}
            className="inline-flex items-center gap-hmi-2 rounded-sm bg-ca-select px-hmi-3 py-hmi-1.5 text-hmi-body font-semibold text-ca-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
          >
            <Save size={16} aria-hidden />
            Compile shape
          </button>
          <IconButton
            onClick={exportSvg}
            disabled={!canExportSvg}
            label="Export SVG only (no cloud compile)"
          >
            <Download size={16} />
          </IconButton>
          <IconButton onClick={onClose} label="Close design mode">
            <X size={16} />
          </IconButton>
        </div>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-hmi-4">
        <div className="relative aspect-square h-full max-h-full max-w-full">
          {imageRef ? (
            <img
              src={imageRef}
              alt="Design mode reference"
              className="absolute inset-0 h-full w-full select-none rounded-sm object-contain opacity-90"
              draggable={false}
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 h-full w-full rounded-sm"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, var(--ca-panel) 0 8px, var(--ca-panel-2) 8px 16px)",
              }}
            />
          )}
          <svg
            ref={svgRef}
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {previewPath ? (
              <path
                d={previewPath}
                fill="rgba(0, 200, 255, 0.18)"
                stroke="rgb(0, 200, 255)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={4}
                fill={i === 0 ? "rgb(255, 200, 0)" : "rgb(0, 200, 255)"}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-hmi-3 border-t border-ca-border bg-ca-panel px-hmi-4 py-hmi-2">
        <p className="text-hmi-caption text-ca-ink-muted">
          {ToolType.isPoint(tool)
            ? "Click to add polygon vertices. First vertex closes the shape."
            : "Click and drag to trace a freehand outline. Release to finish the stroke."}{" "}
          {points.length > 0 ? `${points.length} points.` : null}
        </p>
        {status ? (
          <p role="alert" className="text-hmi-caption text-ca-ink">
            <Download aria-hidden size={12} className="mr-1 inline align-text-bottom" />
            {status}
          </p>
        ) : null}
      </footer>
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  label,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  Icon: typeof MousePointer2;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={
        "inline-flex items-center justify-center rounded-sm border px-hmi-2 py-hmi-1 text-hmi-caption transition " +
        (active
          ? "border-ca-select bg-ca-select/10 text-ca-ink"
          : "border-ca-border text-ca-ink-muted hover:border-ca-ink-muted hover:text-ca-ink")
      }
    >
      <Icon size={14} aria-hidden />
    </button>
  );
}

function IconButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-ca-border text-ca-ink-muted transition hover:border-ca-ink-muted hover:text-ca-ink disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
    >
      {children}
    </button>
  );
}

function sanitiseFilename(input: string): string {
  return (
    input
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "shape"
  );
}

function downloadBlob(filename: string, contents: string, mime: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
