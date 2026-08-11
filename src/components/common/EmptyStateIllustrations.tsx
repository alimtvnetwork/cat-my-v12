// Plan 87 step 18: decorative SVG illustrations for empty states.
//
// Root cause addressed: the shared `EmptyState` primitive rendered only a
// small icon-in-a-circle, so route-level empty screens (Projects, Rule sets)
// looked identical and forgettable. These illustrations add a distinct,
// theme-aware SVG panel above the icon without introducing raster assets,
// so they stay SSR-safe, scale to any DPR, and inherit design tokens via
// `currentColor` (`text-ca-*`).
//
// Purely presentational, no imports beyond React. Each component renders
// a 160x88 viewBox glyph. Consumers pass one via `<EmptyState illustration={...}>`.
//
// Accessibility: illustrations are decorative (`aria-hidden`); the
// EmptyState `title`/`description` remain the accessible label.

import type { SVGProps } from "react";

const BASE: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 160 88",
  width: 160,
  height: 88,
  fill: "none",
  "aria-hidden": true,
  focusable: false,
};

// Stacked folders. Used on the Projects list when no projects exist.
export function ProjectsIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...BASE} {...props}>
      <rect
        x="24"
        y="30"
        width="72"
        height="46"
        rx="4"
        className="fill-ca-panel-2 stroke-ca-border"
        strokeWidth={1.25}
      />
      <rect
        x="36"
        y="22"
        width="72"
        height="46"
        rx="4"
        className="fill-ca-panel stroke-ca-border"
        strokeWidth={1.25}
      />
      <path d="M42 22 h20 l6 6 h34" className="stroke-ca-border" strokeWidth={1.25} fill="none" />
      <rect
        x="48"
        y="14"
        width="72"
        height="46"
        rx="4"
        className="fill-ca-panel-2 stroke-ca-select"
        strokeWidth={1.25}
        strokeDasharray="3 3"
      />
      <path
        d="M54 14 h20 l6 6 h34"
        className="stroke-ca-select"
        strokeWidth={1.25}
        fill="none"
        strokeDasharray="3 3"
      />
      <circle cx="132" cy="20" r="4" className="fill-ca-select" opacity={0.85} />
    </svg>
  );
}

// Grid of tiles with one highlighted "rule". Used for empty Rule-set lists.
export function RulesetsIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...BASE} {...props}>
      <rect
        x="24"
        y="14"
        width="112"
        height="60"
        rx="6"
        className="fill-ca-panel stroke-ca-border"
        strokeWidth={1.25}
      />
      {[0, 1, 2].map((col) => (
        <rect
          key={`c${col}`}
          x={32 + col * 34}
          y={22}
          width={30}
          height={20}
          rx={3}
          className="fill-ca-panel-2 stroke-ca-border"
          strokeWidth={1}
        />
      ))}
      {[0, 1, 2].map((col) => (
        <rect
          key={`r${col}`}
          x={32 + col * 34}
          y={46}
          width={30}
          height={20}
          rx={3}
          className="fill-ca-panel-2 stroke-ca-border"
          strokeWidth={1}
        />
      ))}
      <rect
        x="66"
        y="22"
        width="30"
        height="20"
        rx="3"
        className="fill-ca-select/15 stroke-ca-select"
        strokeWidth={1.25}
      />
      <path d="M72 32 h18 M72 36 h12" className="stroke-ca-select" strokeWidth={1.25} />
    </svg>
  );
}