import React from "react";
import {
  Camera,
  CheckCircle2,
  Crosshair,
  Eye,
  EyeOff,
  Layers,
  Trash2,
  Upload,
  AlertOctagon,
} from "lucide-react";

export interface DefectMatchHeaderProps {
  isMatching: boolean;
  hasOverlays: boolean;
  statusScore?: number;
  isPass?: boolean;
  hasDefect?: boolean;
  onLoadFile: (file: File | undefined) => void;
  onOpenCamera: () => void;
  onMatch: () => void;
  onClear: () => void;
  onToggleOverlays: () => void;
}

export function DefectMatchHeader(props: DefectMatchHeaderProps): React.JSX.Element {
  return (
    <header className="flex h-11 shrink-0 flex-wrap items-center justify-between border-b border-ca-border bg-ca-panel px-3 py-1 text-xs select-none">
      {/* Left controls: file upload, camera, matching */}
      <div className="flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-ca-border bg-ca-panel-2 px-2.5 py-1 font-semibold text-ca-ink hover:bg-ca-bg transition-colors">
          <Upload className="h-3.5 w-3.5 text-ca-ink-muted" />
          <span>Load Test Frame</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => props.onLoadFile(e.target.files?.[0])}
            className="sr-only"
          />
        </label>

        <button
          type="button"
          onClick={props.onOpenCamera}
          className="inline-flex items-center gap-1.5 rounded border border-ca-border bg-ca-panel-2 px-2.5 py-1 font-semibold text-ca-ink hover:bg-ca-bg transition-colors"
        >
          <Camera className="h-3.5 w-3.5 text-ca-select" />
          <span>Live Camera</span>
        </button>

        <div className="h-4 w-px bg-ca-border mx-0.5" />

        <button
          type="button"
          onClick={props.onMatch}
          disabled={props.isMatching}
          className="inline-flex items-center gap-1.5 rounded border border-ca-select/50 bg-ca-select/10 px-3 py-1 font-bold text-ca-select hover:bg-ca-select/20 disabled:opacity-50 transition-colors"
        >
          <Crosshair className={`h-3.5 w-3.5 ${props.isMatching ? "animate-spin" : ""}`} />
          <span>{props.isMatching ? "Inspecting..." : "Run Inspection"}</span>
        </button>

        <button
          type="button"
          onClick={props.onClear}
          className="inline-flex items-center gap-1 rounded border border-ca-border bg-ca-panel-2 px-2 py-1 text-ca-ink-muted hover:text-ca-danger hover:bg-ca-bg transition-colors"
          title="Clear Frame"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Clear</span>
        </button>
      </div>

      {/* Right controls: Inverted verdict badge & overlay toggles */}
      <div className="flex items-center gap-2">
        {props.statusScore !== undefined && (
          <div
            className={`flex items-center gap-1.5 rounded border px-2.5 py-0.5 font-mono text-xs font-bold ${
              props.hasDefect
                ? "border-rose-500/50 bg-rose-950/60 text-rose-300"
                : "border-emerald-500/50 bg-emerald-950/60 text-emerald-300"
            }`}
          >
            {props.hasDefect ? (
              <>
                <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />
                <span>REJECT — DEFECT DETECTED ({props.statusScore}%)</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>PASS — CLEAN ({props.statusScore}%)</span>
              </>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={props.onToggleOverlays}
          className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold transition-colors ${
            props.hasOverlays
              ? "border-ca-select/40 bg-ca-select/15 text-ca-select"
              : "border-ca-border bg-ca-panel-2 text-ca-ink-muted hover:bg-ca-bg"
          }`}
          title={props.hasOverlays ? "Hide overlays" : "Show overlays"}
        >
          {props.hasOverlays ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          <span>Overlays</span>
        </button>
      </div>
    </header>
  );
}
