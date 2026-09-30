import { useEffect, useState } from "react";
import { defaultSampleUrl } from "@/lib/editor/sample-library";
import { getReferenceImage, subscribe } from "@/lib/stores/reference-image-store";

export interface MachineFrameProps {
  live?: boolean;
}

export function MachineFrame({ live = false }: MachineFrameProps): React.JSX.Element | null {
  const [src, setSrc] = useState<string>(() => getReferenceImage() ?? defaultSampleUrl);
  useEffect(() => subscribe((next) => setSrc(next ?? defaultSampleUrl)), []);

  return (
    <div className="relative h-full w-full flex items-center justify-center overflow-hidden bg-ca-viewport select-none">
      {/* Real Inspection Camera Frame */}
      <img
        src={src}
        alt="Camera Frame"
        className="max-h-full max-w-full object-contain drop-shadow-md transition-all duration-100"
      />

      {/* Industrial Optical HUD Overlay */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1200 700"
        preserveAspectRatio="none"
      >
        {/* Subtle Corner Caliper Targets */}
        <g stroke="var(--ca-primary)" strokeWidth="2.5" opacity="0.65">
          {/* Top-Left */}
          <path d="M 30 60 L 30 30 L 60 30" fill="none" />
          {/* Top-Right */}
          <path d="M 1140 30 L 1170 30 L 1170 60" fill="none" />
          {/* Bottom-Left */}
          <path d="M 30 640 L 30 670 L 60 670" fill="none" />
          {/* Bottom-Right */}
          <path d="M 1140 670 L 1170 670 L 1170 640" fill="none" />
        </g>

        {/* Center Optical Crosshair */}
        <g stroke="var(--ca-ink-muted)" strokeWidth="1" strokeDasharray="6 6" opacity="0.25">
          <line x1="600" y1="20" x2="600" y2="680" />
          <line x1="20" y1="350" x2="1180" y2="350" />
        </g>

        {/* Live Laser Scanline when running */}
        {live ? (
          <line
            className="hmi-frame-scanline"
            x1="0"
            y1="80"
            x2="1200"
            y2="80"
            stroke="var(--ca-primary)"
            strokeWidth="2.5"
            opacity="0.85"
          />
        ) : null}
      </svg>
    </div>
  );
}
