import React from "react";

interface RoiBadgeProps {
  label: string;
  x: number; // percentage or pixel
  y: number;
  width: number;
  height: number;
  color?: string;
  isHovered?: boolean;
}

export function RoiBadge({
  label,
  x,
  y,
  width,
  height,
  color = "var(--ca-primary)",
  isHovered,
}: RoiBadgeProps): React.JSX.Element | null {
  return (
    <div
      className={`absolute border-2 pointer-events-none transition-all drop-shadow-md ${isHovered ? "ring-2 ring-ca-primary ring-offset-2 ring-offset-ca-panel z-50 shadow-lg" : ""}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        borderColor: color,
        backgroundColor: `${color}${isHovered ? "33" : "1A"}`, // 20% opacity on hover
      }}
    >
      <div
        className="absolute -top-6 left-[-2px] px-2 py-0.5 rounded-t-sm shadow-sm border border-white/80"
        style={{ backgroundColor: color }}
      >
        <span className="text-[13px] tabular-nums font-medium text-white tracking-wide shadow-sm">
          {label}
        </span>
      </div>
    </div>
  );
}
