import React from "react";
import { Ruler, Camera } from "lucide-react";

interface VisionEmptyStateProps {
  variant: "no-rules" | "no-images";
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * VisionEmptyState — guidance for first-time users.
 * - "no-rules": Guide user to create their first rule.
 * - "no-images": Guide user to capture or load their first image.
 *
 * Tasks 256-258.
 */
export function VisionEmptyState({
  variant,
  actionLabel,
  onAction,
}: VisionEmptyStateProps): React.JSX.Element {
  const isNoRules = variant === "no-rules";

  return (
    <div
      role="status"
      aria-label={isNoRules ? "No rules configured" : "No images captured"}
      className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ca-panel-2">
        {isNoRules ? (
          <Ruler className="h-5 w-5 text-ca-ink-muted" aria-hidden="true" />
        ) : (
          <Camera className="h-5 w-5 text-ca-ink-muted" aria-hidden="true" />
        )}
      </div>
      <div className="space-y-1">
        <p className="text-[13px] font-semibold text-ca-text">
          {isNoRules ? "No rules configured" : "No images captured"}
        </p>
        <p className="text-[12px] text-ca-ink-muted leading-relaxed">
          {isNoRules
            ? "Draw a region on the canvas to add your first inspection rule."
            : "Capture an image from the camera or load a static reference image."}
        </p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 min-h-[40px] rounded-md bg-ca-accent px-4 py-2 text-[13px] font-medium text-white hover:bg-ca-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ca-accent"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
