// ReferenceAssetPanel, Plan 31 step 12.
// Spec: spec/24-app-ui-design-system/05-rule-controller.md L47 (Pattern row).
// Contract: matches ParamsPattern from src/lib/editor/schema.ts.
// Persists { referenceAsset: string, matchThreshold: number (0..1) }.

import { useId, useRef } from "react";
import type { ParamsPattern } from "@/lib/editor/schema";

export interface ReferenceAssetPanelProps {
  value: ParamsPattern;
  onChange: (patch: Partial<ParamsPattern>) => void;
  onUpload: (file: File) => Promise<string>; // returns programs/<id>/assets/... path (K-9)
  disabled?: boolean;
}

export function ReferenceAssetPanel({
  value,
  onChange,
  onUpload,
  disabled,
}: ReferenceAssetPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fieldId = useId();

  const pick = () => inputRef.current?.click();
  const handleFile = async (f: File) => {
    const path = await onUpload(f);
    onChange({ referenceAsset: path });
  };

  return (
    <section
      aria-label="Reference asset"
      className="flex flex-col gap-hmi-3 border border-ca-border bg-ca-panel p-hmi-3"
    >
      <header className="text-hmi-heading text-ca-ink">Reference</header>

      <div className="flex items-start gap-hmi-3">
        <div
          aria-label="Reference thumbnail"
          className="flex h-16 w-16 shrink-0 items-center justify-center border border-ca-border bg-ca-panel-2 text-hmi-caption text-ca-ink-muted"
        >
          {value.referenceAsset ? (
            <img
              src={value.referenceAsset}
              alt="Reference"
              className="h-full w-full object-contain"
            />
          ) : (
            <span>none</span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-hmi-1">
          <button
            type="button"
            onClick={pick}
            disabled={disabled}
            className="border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink hover:bg-ca-panel disabled:opacity-50"
          >
            Upload reference
          </button>
          <span className="truncate text-hmi-caption text-ca-ink-muted">
            {value.referenceAsset || "programs/<id>/assets/..."}
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";

            if (f) void handleFile(f);
          }}
        />
      </div>

      <label htmlFor={fieldId} className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
        <span className="flex items-center justify-between">
          <span>Match threshold</span>
          <span className="tabular-nums text-ca-ink-muted">{value.matchThreshold.toFixed(2)}</span>
        </span>
        <input
          id={fieldId}
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value.matchThreshold}
          onChange={(e) => onChange({ matchThreshold: Number(e.target.value) })}
          disabled={disabled}
          className="w-full accent-ca-accent"
        />
      </label>
    </section>
  );
}
