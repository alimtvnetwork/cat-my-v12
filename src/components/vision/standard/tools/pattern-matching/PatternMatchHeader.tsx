import { Camera, Layers, Play, RefreshCw, RotateCcw, Upload } from "lucide-react";

export interface PatternMatchHeaderProps {
  isMatching: boolean;
  hasOverlays: boolean;
  statusScore?: number;
  isPass?: boolean;
  onLoadFile: (file: File | undefined) => void;
  onOpenCamera: () => void;
  onMatch: () => void;
  onClear?: () => void;
  onToggleOverlays: () => void;
}

export function PatternMatchHeader(props: PatternMatchHeaderProps): React.JSX.Element {
  return (
    <header className="flex h-10 shrink-0 flex-wrap items-center gap-2.5 border-b border-ca-border bg-ca-panel-2 px-3 py-1.5 text-xs font-sans">
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 font-semibold text-ca-ink hover:bg-ca-bg">
        <Upload className="h-3.5 w-3.5" />
        <span>Load Test Image</span>
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
        className="inline-flex items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 font-semibold text-ca-ink hover:bg-ca-bg"
      >
        <Camera className="h-3.5 w-3.5 text-ca-select" />
        <span>Live Camera</span>
      </button>

      <button
        type="button"
        onClick={props.onMatch}
        disabled={props.isMatching}
        className="inline-flex items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 font-semibold text-ca-ink hover:bg-ca-bg disabled:opacity-50"
      >
        {props.isMatching ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Play className="h-3.5 w-3.5 fill-ca-select text-ca-select" />
        )}
        <span>{props.isMatching ? "Matching..." : "Match"}</span>
      </button>

      <button
        type="button"
        onClick={props.onToggleOverlays}
        className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-semibold ${
          props.hasOverlays
            ? "border-ca-select bg-ca-select/15 text-ca-select"
            : "border-ca-border bg-ca-panel text-ca-ink-muted hover:bg-ca-bg"
        }`}
      >
        <Layers className="h-3.5 w-3.5" />
        <span>Overlays</span>
      </button>

      {props.onClear && (
        <button
          type="button"
          onClick={props.onClear}
          className="inline-flex items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 font-semibold text-ca-ink hover:bg-ca-bg"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Clear</span>
        </button>
      )}

      {props.statusScore !== undefined && (
        <div className="ml-auto flex items-center gap-2 font-mono text-[11px]">
          <span
            className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] ${
              props.isPass ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
            }`}
          >
            {props.isPass ? "PASS" : "FAIL"}
          </span>
          <span className="text-ca-ink font-semibold">{props.statusScore}% match</span>
        </div>
      )}
    </header>
  );
}
