import { useEffect, useState } from "react";
import { defaultSampleUrl } from "@/lib/editor/sample-library";
import { getReferenceImage, subscribe } from "@/lib/stores/reference-image-store";

export interface MachineFrameProps {
  isLive?: boolean;
  live?: boolean;
}

const PANEL_X = [118, 334, 550, 766, 982];

export function MachineFrame({ isLive, live = false }: MachineFrameProps): React.JSX.Element | null {
  const isRunningLive = isLive ?? live;
  const [src, setSrc] = useState<string>(() => getReferenceImage() ?? defaultSampleUrl);

  useEffect(() => {
    const unsubscribe = subscribe((next) => {
      const nextSrc = next ?? defaultSampleUrl;
      setSrc((prev) => (prev === nextSrc ? prev : nextSrc));
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-ca-viewport" aria-hidden="true">
      <img
        src={src}
        alt=""
        aria-hidden="true"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-70 filter contrast-[1.05] transition-opacity duration-150 ease-out"
      />

      {/* Cyber-industrial vignette gradient */}
      <div className="pointer-events-none absolute inset-0 bg-radial from-transparent via-ca-viewport/30 to-ca-viewport/80" />

      <svg
        className="relative h-full w-full"
        viewBox="0 0 1200 700"
        preserveAspectRatio="xMidYMid slice"
      >
        <rect width="1200" height="700" fill="var(--ca-viewport)" opacity="0.3" />
        <g opacity="0.14" stroke="var(--ca-ink-muted)" strokeWidth="1">
          {Array.from({ length: 18 }, (_, i) => (
            <line key={`v-${i}`} x1={i * 72} y1="0" x2={i * 72} y2="700" />
          ))}
          {Array.from({ length: 12 }, (_, i) => (
            <line key={`h-${i}`} x1="0" y1={i * 64} x2="1200" y2={i * 64} />
          ))}
        </g>

        {/* Carrier rails and PCB stage */}
        <g transform="translate(0 48)">
          <rect x="62" y="174" width="1076" height="272" fill="var(--ca-panel)" opacity="0.86" />
          <rect
            x="62"
            y="174"
            width="1076"
            height="272"
            fill="none"
            stroke="var(--ca-border)"
            strokeWidth="2"
          />
          <rect x="78" y="204" width="1044" height="18" fill="var(--ca-ink-muted)" opacity="0.22" />
          <rect x="78" y="396" width="1044" height="16" fill="var(--ca-ink-muted)" opacity="0.18" />
          <rect x="78" y="236" width="1044" height="2" fill="var(--ca-border)" />
          <rect x="78" y="378" width="1044" height="2" fill="var(--ca-border)" />

          {PANEL_X.map((x, i) => (
            <g key={x} opacity={i === 2 ? 1 : 0.86}>
              <rect
                x={x}
                y="254"
                width="134"
                height="104"
                rx="3"
                fill="var(--ca-bg)"
                opacity="0.75"
              />
              <rect
                x={x + 10}
                y="264"
                width="114"
                height="84"
                rx="2"
                fill="none"
                stroke={i === 2 ? "var(--ca-primary)" : "var(--ca-border)"}
                strokeWidth={i === 2 ? "2" : "1.5"}
                strokeDasharray={i === 2 ? "none" : "4 2"}
                opacity={i === 2 ? 0.9 : 0.6}
              />
              <circle cx={x - 42} cy="306" r="29" fill="var(--ca-viewport)" opacity="0.92" />
              <circle
                cx={x - 42}
                cy="306"
                r="30"
                fill="none"
                stroke="var(--ca-border)"
                strokeWidth="2"
              />
            </g>
          ))}

          <g opacity="0.2" stroke="var(--ca-ink-muted)" strokeWidth="1">
            {Array.from({ length: 34 }, (_, i) => (
              <line key={i} x1={86 + i * 30} y1="184" x2={102 + i * 30} y2="444" />
            ))}
          </g>
        </g>

        {/* Optical alignment ticks */}
        <g opacity="0.85" stroke="var(--ca-primary)" strokeWidth="2">
          <line x1="116" y1="104" x2="246" y2="104" />
          <line x1="332" y1="104" x2="462" y2="104" />
          <line x1="548" y1="104" x2="678" y2="104" />
          <line x1="764" y1="104" x2="894" y2="104" />
          <line x1="980" y1="104" x2="1110" y2="104" />
          <line x1="116" y1="596" x2="246" y2="596" />
          <line x1="332" y1="596" x2="462" y2="596" />
          <line x1="548" y1="596" x2="678" y2="596" />
          <line x1="764" y1="596" x2="894" y2="596" />
          <line x1="980" y1="596" x2="1110" y2="596" />
        </g>

        {isRunningLive ? (
          <g>
            <rect
              className="hmi-frame-scanline"
              x="0"
              y="132"
              width="1200"
              height="4"
              fill="var(--ca-primary)"
              opacity="0.75"
            />
          </g>
        ) : null}
      </svg>
    </div>
  );
}
