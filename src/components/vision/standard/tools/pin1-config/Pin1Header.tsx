import React from "react";
import {
  Binary,
  Camera,
  Eye,
  EyeOff,
  Play,
  RotateCcw,
  Upload,
} from "lucide-react";

export interface Pin1HeaderProps {
  hasOverlays: boolean;
  hasGreyscalePreview: boolean;
  isDetecting?: boolean;
  onLoadFile: (file: File) => void;
  onOpenCamera: () => void;
  onDetect: () => void;
  onClear: () => void;
  onToggleOverlays: () => void;
  onToggleGreyscalePreview: () => void;
}

export function Pin1Header(props: Pin1HeaderProps): React.JSX.Element {
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      props.onLoadFile(file);
      e.target.value = "";
    }
  };

  return (
    <header className="flex h-11 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-ca-border bg-ca-panel-2 px-3 py-1.5 text-xs font-sans select-none">
      <div className="flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 font-semibold text-ca-ink hover:bg-ca-bg hover:text-ca-select transition-colors">
          <Upload className="h-3.5 w-3.5 text-ca-select" />
          <span>Upload Image</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="sr-only"
          />
        </label>

        <button
          type="button"
          onClick={props.onOpenCamera}
          className="inline-flex items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 font-semibold text-ca-ink hover:bg-ca-bg transition-colors"
        >
          <Camera className="h-3.5 w-3.5 text-ca-ink-muted" />
          <span>Live Camera</span>
        </button>

        <div className="h-4 w-px bg-ca-border" />

        <button
          type="button"
          onClick={props.onDetect}
          disabled={props.isDetecting}
          className="inline-flex items-center gap-1.5 rounded border border-ca-select/40 bg-ca-select/20 px-3 py-1 font-bold text-ca-select hover:bg-ca-select/30 transition-colors disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5 fill-current text-ca-select" />
          <span>{props.isDetecting ? "Verifying..." : "Detect & Verify"}</span>
        </button>

        <button
          type="button"
          onClick={props.onToggleGreyscalePreview}
          className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-semibold transition-colors ${
            props.hasGreyscalePreview
              ? "border-ca-select bg-ca-select/20 text-ca-select"
              : "border-ca-border bg-ca-panel text-ca-ink-muted hover:text-ca-ink"
          }`}
        >
          <Binary className="h-3.5 w-3.5" />
          <span>{props.hasGreyscalePreview ? "Binarized View" : "RGB View"}</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={props.onToggleOverlays}
          className="inline-flex items-center gap-1 rounded border border-ca-border bg-ca-panel px-2 py-1 text-ca-ink-muted hover:text-ca-ink"
        >
          {props.hasOverlays ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          <span>{props.hasOverlays ? "Hide HUD" : "Show HUD"}</span>
        </button>

        <button
          type="button"
          onClick={props.onClear}
          className="inline-flex items-center gap-1 rounded border border-ca-border bg-ca-panel px-2 py-1 text-ca-ink-muted hover:text-ca-ink"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Clear</span>
        </button>
      </div>
    </header>
  );
}
