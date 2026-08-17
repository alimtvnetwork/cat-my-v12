import React from "react";
import { Star } from "lucide-react";

interface GoldenBadgeProps {
  /** Whether this image is the golden baseline */
  isGolden: boolean;
}

/**
 * GoldenBadge — star icon overlay for golden baseline images.
 * Displays on image thumbnails in the history rail.
 */
export function GoldenBadge({ isGolden }: GoldenBadgeProps): React.JSX.Element | null {
  if (!isGolden) return null;

  return (
    <div
      aria-label="Golden baseline image"
      title="Golden baseline"
      className="absolute top-1 left-1 z-10 flex items-center gap-0.5 rounded px-1 py-0.5 bg-yellow-400/90 text-yellow-900"
    >
      <Star className="h-3 w-3 fill-current" aria-hidden="true" />
      <span className="text-[11px] font-semibold tabular-nums leading-none">GOLDEN</span>
    </div>
  );
}
