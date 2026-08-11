// Plan 81 step 16. Rule preview thumbnail.
//
// Renders a compact inline SVG (default 40 x 26) that visualises the ROIs
// attached to a Rule. The rule condition shape is passthrough (see
// `src/lib/rules/model.ts`), so we duck-type any `rois: {x,y,w,h}[]`
// entries defensively; unknown / malformed conditions render as an empty
// stage rather than throwing. Categories render as a stacked layers glyph
// so the list stays legible at a glance.
//
// This is a pure presentational component: no persistence, no facade
// reads. Later steps will replace the on-the-fly SVG with a cached raster
// thumbnail generated on save.

import { FolderOpen } from "lucide-react";
import type { Rule } from "@/lib/rules/model";

interface Props {
  rule: Rule;
  width?: number;
  height?: number;
  className?: string;
}

interface RectRoi {
  x: number;
  y: number;
  w: number;
  h: number;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function extractRois(rule: Rule): RectRoi[] {
  const out: RectRoi[] = [];
  for (const cond of rule.conditions ?? []) {
    const rois = (cond as { rois?: unknown }).rois;

    if (Array.isArray(rois) === false) continue;
    for (const r of rois) {
      if (!r || typeof r !== "object") continue;
      const rec = r as Record<string, unknown>;

      if (
        isFiniteNumber(rec.x) &&
        isFiniteNumber(rec.y) &&
        isFiniteNumber(rec.w) &&
        isFiniteNumber(rec.h)
      ) {
        out.push({ x: rec.x, y: rec.y, w: rec.w, h: rec.h });
      }
    }
  }

  return out;
}

export function RulePreviewThumbnail({ rule, width = 40, height = 26, className }: Props) {
  const rois = extractRois(rule);
  const containerClass = [
    "inline-flex shrink-0 items-center justify-center rounded-sm border border-ca-border bg-ca-panel-2 text-ca-ink-muted",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (rule.isCategory) {
    return (
      <span
        className={containerClass}
        style={{ width, height }}
        aria-hidden
        data-testid="rule-preview-thumbnail"
        data-kind="category"
      >
        <FolderOpen size={12} strokeWidth={1.75} />
      </span>
    );
  }

  // Normalise ROIs into a 0-1 space so we don't need to know the source
  // canvas dimensions. If everything is inside [0,1] already, assume
  // normalised space; otherwise scale by the bounding box.
  const maxX = rois.reduce((m, r) => Math.max(m, r.x + r.w), 0);
  const maxY = rois.reduce((m, r) => Math.max(m, r.y + r.h), 0);
  const scaleX = maxX > 1.0001 ? 1 / maxX : 1;
  const scaleY = maxY > 1.0001 ? 1 / maxY : 1;

  return (
    <span
      className={containerClass}
      style={{ width, height }}
      aria-hidden
      data-testid="rule-preview-thumbnail"
      data-kind="rule"
      data-roi-count={rois.length}
    >
      <svg
        viewBox="0 0 100 65"
        width={width - 4}
        height={height - 4}
        preserveAspectRatio="none"
        role="presentation"
      >
        <rect x="0" y="0" width="100" height="65" fill="var(--ca-panel, #1c1f26)" />
        {rois.length === 0 ? (
          <text
            x="50"
            y="38"
            textAnchor="middle"
            fontSize="14"
            fill="var(--ca-ink-muted, #7a8290)"
            fontFamily="monospace"
          >
            —
          </text>
        ) : (
          rois
            .slice(0, 8)
            .map((r, i) => (
              <rect
                key={i}
                x={Math.max(0, r.x * scaleX * 100)}
                y={Math.max(0, r.y * scaleY * 65)}
                width={Math.max(1, r.w * scaleX * 100)}
                height={Math.max(1, r.h * scaleY * 65)}
                fill="none"
                stroke="var(--ca-select, #4ea1ff)"
                strokeWidth={1.5}
                opacity={0.85}
              />
            ))
        )}
      </svg>
    </span>
  );
}