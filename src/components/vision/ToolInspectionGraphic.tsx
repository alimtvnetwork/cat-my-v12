import React from "react";

export interface ToolInspectionGraphicProps {
  toolCode: string;
  size?: number;
  className?: string;
}

export function ToolInspectionGraphic({
  toolCode,
  size = 52,
  className = "",
}: ToolInspectionGraphicProps): React.JSX.Element {
  const normalizedCode = toolCode.toUpperCase().trim();

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center shrink-0 select-none overflow-hidden rounded-lg ${className}`}
      data-testid={`tool-graphic-${normalizedCode}`}
      title={`Inspection Technique: ${normalizedCode}`}
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`bg-grad-${normalizedCode}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d121f" />
            <stop offset="100%" stopColor="#070a12" />
          </linearGradient>

          <linearGradient id="uv-coating-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="gold-pad-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          <radialGradient id="dimple-hole-grad" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="70%" stopColor="#090d16" />
            <stop offset="100%" stopColor="#020408" />
          </radialGradient>
        </defs>

        {/* Global Dark Frame Substrate */}
        <rect
          x="1"
          y="1"
          width="62"
          height="62"
          rx="7"
          fill={`url(#bg-grad-${normalizedCode})`}
          stroke="#1e293b"
          strokeWidth="1.2"
        />

        {/* Subtle Background Alignment Grid */}
        <line x1="8" y1="32" x2="56" y2="32" stroke="#1e293b" strokeWidth="0.75" strokeDasharray="2 3" />
        <line x1="32" y1="8" x2="32" y2="56" stroke="#1e293b" strokeWidth="0.75" strokeDasharray="2 3" />

        {/* Tool-specific Meaningful Schematics */}
        {renderGraphicByCode(normalizedCode)}
      </svg>
    </div>
  );
}

function renderGraphicByCode(code: string): React.JSX.Element {
  switch (code) {
    // ----------------------------------------------------
    // T102: Greyscale Pattern Matching (Constellation Template)
    // ----------------------------------------------------
    case "T102":
      return (
        <g>
          {/* IC Chip Body */}
          <rect x="16" y="16" width="32" height="32" rx="3" fill="#131d2e" stroke="#334155" strokeWidth="1.5" />
          {/* Side Lead Terminals */}
          <rect x="22" y="11" width="3" height="5" fill="#64748b" rx="0.5" />
          <rect x="30" y="11" width="3" height="5" fill="#64748b" rx="0.5" />
          <rect x="38" y="11" width="3" height="5" fill="#64748b" rx="0.5" />
          <rect x="22" y="48" width="3" height="5" fill="#64748b" rx="0.5" />
          <rect x="30" y="48" width="3" height="5" fill="#64748b" rx="0.5" />
          <rect x="38" y="48" width="3" height="5" fill="#64748b" rx="0.5" />
          {/* Template Bounding Box (ROI) */}
          <rect
            x="12"
            y="12"
            width="40"
            height="40"
            rx="2"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="1.2"
            strokeDasharray="3 2"
          />
          {/* 4 Constellation Reference Boxes */}
          <rect x="20" y="20" width="7" height="7" rx="1" fill="#22d3ee" stroke="#ffffff" strokeWidth="1" />
          <rect x="37" y="20" width="7" height="7" rx="1" fill="#22d3ee" stroke="#ffffff" strokeWidth="1" />
          <rect x="20" y="37" width="7" height="7" rx="1" fill="#22d3ee" stroke="#ffffff" strokeWidth="1" />
          <rect x="37" y="37" width="7" height="7" rx="1" fill="#22d3ee" stroke="#ffffff" strokeWidth="1" />
          {/* Constellation link lines */}
          <line x1="27" y1="23.5" x2="37" y2="23.5" stroke="#38bdf8" strokeWidth="1" strokeDasharray="1 1.5" />
          <line x1="23.5" y1="27" x2="23.5" y2="37" stroke="#38bdf8" strokeWidth="1" strokeDasharray="1 1.5" />
          <line x1="40.5" y1="27" x2="40.5" y2="37" stroke="#38bdf8" strokeWidth="1" strokeDasharray="1 1.5" />
          <line x1="27" y1="40.5" x2="37" y2="40.5" stroke="#38bdf8" strokeWidth="1" strokeDasharray="1 1.5" />
          {/* Center Crosshair Target */}
          <circle cx="32" cy="32" r="3" fill="none" stroke="#22d3ee" strokeWidth="1" />
          <line x1="32" y1="27" x2="32" y2="37" stroke="#22d3ee" strokeWidth="1" />
          <line x1="27" y1="32" x2="37" y2="32" stroke="#22d3ee" strokeWidth="1" />
        </g>
      );

    // ----------------------------------------------------
    // T105: Pin 1 Orientation Config (Polarity Hole Reticle)
    // ----------------------------------------------------
    case "T105":
      return (
        <g>
          {/* IC Chip Corner with 45-deg notch */}
          <path
            d="M 12 24 L 24 12 L 52 12 L 52 52 L 12 52 Z"
            fill="#121a2a"
            stroke="#334155"
            strokeWidth="1.5"
          />
          {/* IC body notch chamfer line */}
          <line x1="12" y1="24" x2="24" y2="12" stroke="#f43f5e" strokeWidth="2" />
          {/* Pin 1 Dimple Hole */}
          <circle cx="28" cy="28" r="8" fill="url(#dimple-hole-grad)" stroke="#475569" strokeWidth="1" />
          {/* Concentric Inspection Reticle */}
          <circle cx="28" cy="28" r="13" fill="none" stroke="#22d3ee" strokeWidth="1.2" strokeDasharray="3 2" />
          <circle cx="28" cy="28" r="3" fill="#22d3ee" />
          {/* Crosshair Alignment Guides */}
          <line x1="13" y1="28" x2="43" y2="28" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.8" />
          <line x1="28" y1="13" x2="28" y2="43" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.8" />
          {/* Polarity Pin 1 text tag */}
          <text x="44" y="46" fill="#22d3ee" fontSize="7" fontFamily="monospace" fontWeight="bold">
            #1
          </text>
        </g>
      );

    // ----------------------------------------------------
    // T101: Area Gate (Pixel Intensity Fill Threshold)
    // ----------------------------------------------------
    case "T101":
      return (
        <g>
          {/* Rectangular Solder Pad */}
          <rect x="14" y="16" width="36" height="32" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
          {/* Active Area Gate Bracket */}
          <rect
            x="11"
            y="13"
            width="42"
            height="38"
            rx="2"
            fill="none"
            stroke="#10b981"
            strokeWidth="1.2"
            strokeDasharray="4 2"
          />
          {/* Thresholded Foreground Pixels (Fillet fill density) */}
          <rect x="18" y="20" width="28" height="24" rx="2" fill="#0284c7" fillOpacity="0.3" />
          {/* Pixel Matrix (Active Dots) */}
          <circle cx="23" cy="25" r="1.8" fill="#38bdf8" />
          <circle cx="29" cy="25" r="1.8" fill="#38bdf8" />
          <circle cx="35" cy="25" r="1.8" fill="#38bdf8" />
          <circle cx="41" cy="25" r="1.8" fill="#38bdf8" />
          <circle cx="23" cy="32" r="1.8" fill="#38bdf8" />
          <circle cx="29" cy="32" r="1.8" fill="#38bdf8" />
          <circle cx="35" cy="32" r="1.8" fill="#38bdf8" />
          <circle cx="41" cy="32" r="1.8" fill="#38bdf8" />
          <circle cx="23" cy="39" r="1.8" fill="#38bdf8" />
          <circle cx="29" cy="39" r="1.8" fill="#38bdf8" />
          <circle cx="35" cy="39" r="1.8" fill="#38bdf8" />
          <circle cx="41" cy="39" r="1.8" fill="#38bdf8" />
          {/* Pass Gate Meter Bar */}
          <rect x="14" y="52" width="36" height="3" rx="1.5" fill="#1e293b" />
          <rect x="14" y="52" width="26" height="3" rx="1.5" fill="#10b981" />
        </g>
      );

    // ----------------------------------------------------
    // T104: Edge Count & Lead Presence (Linear Profile Wave)
    // ----------------------------------------------------
    case "T104":
      return (
        <g>
          {/* 5 Vertical Metallic Leads */}
          <rect x="13" y="10" width="5" height="42" rx="1" fill="#475569" stroke="#94a3b8" strokeWidth="0.8" />
          <rect x="21" y="10" width="5" height="42" rx="1" fill="#475569" stroke="#94a3b8" strokeWidth="0.8" />
          <rect x="29" y="10" width="5" height="42" rx="1" fill="#475569" stroke="#94a3b8" strokeWidth="0.8" />
          <rect x="37" y="10" width="5" height="42" rx="1" fill="#475569" stroke="#94a3b8" strokeWidth="0.8" />
          <rect x="45" y="10" width="5" height="42" rx="1" fill="#475569" stroke="#94a3b8" strokeWidth="0.8" />
          {/* Linear Laser Profile Scan Line */}
          <line x1="7" y1="31" x2="57" y2="31" stroke="#f43f5e" strokeWidth="1.8" />
          {/* Detected Edge Peak Arrows */}
          <polygon points="15.5,27 13.5,23 17.5,23" fill="#10b981" />
          <polygon points="23.5,27 21.5,23 25.5,23" fill="#10b981" />
          <polygon points="31.5,27 29.5,23 33.5,23" fill="#10b981" />
          <polygon points="39.5,27 37.5,23 41.5,23" fill="#10b981" />
          <polygon points="47.5,27 45.5,23 49.5,23" fill="#10b981" />
          {/* Profile Pulse Waveform at Bottom */}
          <path
            d="M 8 57 L 13 57 L 13 53 L 18 53 L 18 57 L 21 57 L 21 53 L 26 53 L 26 57 L 29 57 L 29 53 L 34 53 L 34 57 L 37 57 L 37 53 L 42 53 L 42 57 L 45 57 L 45 53 L 50 53 L 50 57 L 56 57"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="1.2"
          />
        </g>
      );

    // ----------------------------------------------------
    // T109: Binary Blob (Solder Bridge Detector)
    // ----------------------------------------------------
    case "T109":
      return (
        <g>
          {/* Two Lead Pads */}
          <rect x="12" y="14" width="11" height="36" rx="2" fill="#334155" stroke="#64748b" strokeWidth="1" />
          <rect x="41" y="14" width="11" height="36" rx="2" fill="#334155" stroke="#64748b" strokeWidth="1" />
          {/* Unwanted Solder Bridge Defect Blob */}
          <path
            d="M 23 26 C 29 20, 36 22, 41 28 C 37 38, 27 40, 23 30 Z"
            fill="#ef4444"
            fillOpacity="0.8"
            stroke="#fca5a5"
            strokeWidth="1.5"
          />
          {/* Bridge Detection Bounding Box */}
          <rect
            x="20"
            y="19"
            width="24"
            height="24"
            rx="2"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
          {/* Cross Alert Marker */}
          <line x1="28" y1="27" x2="36" y2="35" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <line x1="36" y1="27" x2="28" y2="35" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <text x="32" y="56" textAnchor="middle" fill="#ef4444" fontSize="7" fontFamily="monospace" fontWeight="bold">
            BRIDGE
          </text>
        </g>
      );

    // ----------------------------------------------------
    // T108: Void & Porosity Detector (Solder Joint Voids)
    // ----------------------------------------------------
    case "T108":
      return (
        <g>
          {/* Solder Joint Ball Cross-Section */}
          <circle cx="32" cy="32" r="22" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
          <circle cx="32" cy="32" r="18" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="2 3" />
          {/* Detected Porosity Voids (Air Bubbles) */}
          <circle cx="26" cy="25" r="5" fill="#080d1a" stroke="#f59e0b" strokeWidth="1.5" />
          <circle cx="40" cy="34" r="4.2" fill="#080d1a" stroke="#f59e0b" strokeWidth="1.5" />
          <circle cx="28" cy="39" r="3.2" fill="#080d1a" stroke="#f59e0b" strokeWidth="1.2" />
          <circle cx="37" cy="22" r="2.5" fill="#080d1a" stroke="#f59e0b" strokeWidth="1" />
          {/* Void % Callout */}
          <text x="32" y="32" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="monospace" fontWeight="bold">
            18%
          </text>
        </g>
      );

    // ----------------------------------------------------
    // T107: Scratch & Crack Detector (High-pass Spatial Filter)
    // ----------------------------------------------------
    case "T107":
      return (
        <g>
          {/* Silicon Die Passivation Surface */}
          <rect x="10" y="10" width="44" height="44" rx="3" fill="#111827" stroke="#2563eb" strokeWidth="1" strokeOpacity="0.5" />
          {/* Micro-Crack Gradient Glow */}
          <path
            d="M 15 47 L 24 38 L 22 31 L 34 24 L 38 25 L 49 13"
            fill="none"
            stroke="#ef4444"
            strokeWidth="4"
            strokeOpacity="0.25"
          />
          {/* Sharp Hairline Fracture */}
          <path
            d="M 15 47 L 24 38 L 22 31 L 34 24 L 38 25 L 49 13"
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Sobel Spatial Gradient Derivative Vectors */}
          <line x1="21" y1="41" x2="26" y2="44" stroke="#38bdf8" strokeWidth="1" />
          <line x1="30" y1="26" x2="33" y2="30" stroke="#38bdf8" strokeWidth="1" />
          <line x1="41" y1="18" x2="45" y2="21" stroke="#38bdf8" strokeWidth="1" />
          {/* Crack Alert Banner */}
          <text x="32" y="59" textAnchor="middle" fill="#ef4444" fontSize="7" fontFamily="monospace" fontWeight="bold">
            CRACK DETECT
          </text>
        </g>
      );

    // ----------------------------------------------------
    // T110: Caliper & Edge (Sub-pixel Pitch / Width Metrology)
    // ----------------------------------------------------
    case "T110":
      return (
        <g>
          {/* Two Terminal Leads */}
          <rect x="13" y="16" width="10" height="34" rx="2" fill="#334155" stroke="#64748b" strokeWidth="1" />
          <rect x="41" y="16" width="10" height="34" rx="2" fill="#334155" stroke="#64748b" strokeWidth="1" />
          {/* Sub-pixel Caliper Jaws */}
          <line x1="23" y1="10" x2="23" y2="54" stroke="#06b6d4" strokeWidth="1.5" />
          <line x1="41" y1="10" x2="41" y2="54" stroke="#06b6d4" strokeWidth="1.5" />
          {/* Bilateral Dimension Line with Dual Arrows */}
          <line x1="23" y1="32" x2="41" y2="32" stroke="#22d3ee" strokeWidth="1.5" />
          <polygon points="23,32 27,29.5 27,34.5" fill="#22d3ee" />
          <polygon points="41,32 37,29.5 37,34.5" fill="#22d3ee" />
          {/* Nominal Caliper Readout */}
          <rect x="25" y="24" width="14" height="8" rx="1.5" fill="#080d1a" stroke="#22d3ee" strokeWidth="0.8" />
          <text x="32" y="30.5" textAnchor="middle" fill="#22d3ee" fontSize="6.5" fontFamily="monospace" fontWeight="bold">
            0.50
          </text>
        </g>
      );

    // ----------------------------------------------------
    // T111: Circle & Via Gauge (RANSAC Circle & Annular Ring)
    // ----------------------------------------------------
    case "T111":
      return (
        <g>
          {/* Plated Through-Hole Copper Ring */}
          <circle cx="32" cy="32" r="21" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
          {/* Inner Drill Hole */}
          <circle cx="32" cy="32" r="12" fill="#050811" stroke="#334155" strokeWidth="1" />
          {/* RANSAC Circle Fit Perimeter */}
          <circle
            cx="32"
            cy="32"
            r="16.5"
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="4 2.5"
          />
          {/* Center Crosshair */}
          <line x1="32" y1="11" x2="32" y2="53" stroke="#10b981" strokeWidth="0.8" strokeDasharray="2 2" />
          <line x1="11" y1="32" x2="53" y2="32" stroke="#10b981" strokeWidth="0.8" strokeDasharray="2 2" />
          {/* Diameter Dimension Arrow Line */}
          <line x1="21" y1="21" x2="43" y2="43" stroke="#34d399" strokeWidth="1.5" />
          <polygon points="21,21 26,22 22,26" fill="#34d399" />
          <polygon points="43,43 38,42 42,38" fill="#34d399" />
          <text x="44" y="21" fill="#10b981" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
            Ø1.2
          </text>
        </g>
      );

    // ----------------------------------------------------
    // T103: 2D DataMatrix & QR Code Reader
    // ----------------------------------------------------
    case "T103":
      return (
        <g>
          {/* ECC200 DataMatrix Boundary */}
          <rect x="16" y="16" width="32" height="32" rx="2" fill="#080c14" stroke="#334155" strokeWidth="1" />
          {/* Solid L-Finder Pattern (Left & Bottom) */}
          <rect x="18" y="18" width="3.5" height="28" fill="#f8fafc" />
          <rect x="18" y="42.5" width="28" height="3.5" fill="#f8fafc" />
          {/* Alternating Timing Pattern (Top & Right) */}
          <rect x="25" y="18" width="3" height="3" fill="#f8fafc" />
          <rect x="32" y="18" width="3" height="3" fill="#f8fafc" />
          <rect x="39" y="18" width="3" height="3" fill="#f8fafc" />
          <rect x="42.5" y="24" width="3.5" height="3" fill="#f8fafc" />
          <rect x="42.5" y="31" width="3.5" height="3" fill="#f8fafc" />
          <rect x="42.5" y="38" width="3.5" height="3" fill="#f8fafc" />
          {/* Data Modules (Pixel Grid Matrix) */}
          <rect x="25" y="25" width="4" height="4" fill="#f8fafc" />
          <rect x="33" y="25" width="4" height="4" fill="#f8fafc" />
          <rect x="25" y="33" width="4" height="4" fill="#f8fafc" />
          <rect x="33" y="33" width="4" height="4" fill="#f8fafc" />
          <rect x="29" y="29" width="4" height="4" fill="#f8fafc" />
          {/* Laser Scanner Alignment Bracket Corners */}
          <path d="M 12 22 L 12 12 L 22 12" stroke="#22d3ee" strokeWidth="1.8" fill="none" />
          <path d="M 52 22 L 52 12 L 42 12" stroke="#22d3ee" strokeWidth="1.8" fill="none" />
          <path d="M 12 42 L 12 52 L 22 52" stroke="#22d3ee" strokeWidth="1.8" fill="none" />
          <path d="M 52 42 L 52 52 L 42 52" stroke="#22d3ee" strokeWidth="1.8" fill="none" />
          {/* Red Laser Scan Sweep Line */}
          <line x1="10" y1="32" x2="54" y2="32" stroke="#f43f5e" strokeWidth="1.5" strokeOpacity="0.9" />
        </g>
      );

    // ----------------------------------------------------
    // T106: Laser Marking OCR (Character Segment Boxes)
    // ----------------------------------------------------
    case "T106":
      return (
        <g>
          {/* IC Package Top Surface */}
          <rect x="11" y="17" width="42" height="28" rx="3" fill="#131b2e" stroke="#334155" strokeWidth="1.2" />
          {/* Laser Etched Text ("IC1") */}
          <text x="18" y="35" fontSize="13" fill="#f8fafc" fontFamily="monospace" fontWeight="bold">
            I
          </text>
          <text x="26" y="35" fontSize="13" fill="#f8fafc" fontFamily="monospace" fontWeight="bold">
            C
          </text>
          <text x="37" y="35" fontSize="13" fill="#f8fafc" fontFamily="monospace" fontWeight="bold">
            1
          </text>
          {/* Individual Character Segmentation Bounding Boxes */}
          <rect
            x="16"
            y="21"
            width="8"
            height="18"
            rx="1"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="1"
            strokeDasharray="2 1.5"
          />
          <rect
            x="25"
            y="21"
            width="10"
            height="18"
            rx="1"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="1"
            strokeDasharray="2 1.5"
          />
          <rect
            x="36"
            y="21"
            width="9"
            height="18"
            rx="1"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="1"
            strokeDasharray="2 1.5"
          />
          {/* Baseline Alignment Guide */}
          <line x1="14" y1="40" x2="48" y2="40" stroke="#10b981" strokeWidth="1" />
          {/* OCR 99% Confidence Tag */}
          <text x="32" y="55" textAnchor="middle" fill="#10b981" fontSize="7" fontFamily="monospace" fontWeight="bold">
            OCR: 99%
          </text>
        </g>
      );

    // ----------------------------------------------------
    // T112: Conformal Coating UV Fluorescence
    // ----------------------------------------------------
    case "T112":
      return (
        <g>
          {/* Uncoated Bare PCB Base */}
          <rect x="11" y="13" width="42" height="40" rx="3" fill="#111827" stroke="#374151" strokeWidth="1.2" />
          {/* Fluorescent UV Coated Wet-Out Layer (Glowing Gradient Fill) */}
          <path
            d="M 11 27 C 23 25, 35 33, 53 23 L 53 53 L 11 53 Z"
            fill="url(#uv-coating-grad)"
          />
          {/* Coating Wet-Out Margin Line */}
          <path
            d="M 11 27 C 23 25, 35 33, 53 23"
            fill="none"
            stroke="#c084fc"
            strokeWidth="1.8"
          />
          {/* UV Blacklight Wave Beams */}
          <line x1="16" y1="9" x2="22" y2="21" stroke="#a855f7" strokeWidth="1.2" strokeDasharray="2 2" />
          <line x1="28" y1="7" x2="34" y2="19" stroke="#a855f7" strokeWidth="1.2" strokeDasharray="2 2" />
          <line x1="40" y1="9" x2="46" y2="21" stroke="#a855f7" strokeWidth="1.2" strokeDasharray="2 2" />
          {/* UV Tag */}
          <text x="32" y="47" textAnchor="middle" fill="#ffffff" fontSize="7" fontFamily="monospace" fontWeight="bold">
            UV COATING
          </text>
        </g>
      );

    // Default Fallback Graphic for any unspecified tool
    default:
      return (
        <g>
          <rect x="14" y="14" width="36" height="36" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="10" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="3 2" />
          <circle cx="32" cy="32" r="3" fill="#38bdf8" />
        </g>
      );
  }
}
