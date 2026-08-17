import React from "react";

interface RoiBadgeProps {
  label: string;
  x: number; // percentage or pixel
  y: number;
  width: number;
  height: number;
  color?: string;
}

export function RoiBadge({ label, x, y, width, height, color = "var(--ca-primary)" }: RoiBadgeProps) {
  return (
    <div
      className="absolute border-2 pointer-events-none transition-all drop-shadow-md"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
        borderColor: color,
        backgroundColor: `${color}1A`, // 10% opacity
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
