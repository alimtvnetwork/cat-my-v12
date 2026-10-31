import type { ReactNode } from "react";

export interface ViewportProps {
  children?: ReactNode;
  overlay?: ReactNode;
  isLive?: boolean;
}

export function Viewport({ children, overlay, isLive = false }: ViewportProps): React.JSX.Element | null {
  return (
    <div className="relative flex-1 m-hmi-3 rounded-2xl bg-[#06090d] overflow-hidden border border-ca-border/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_36px_-6px_rgba(0,0,0,0.7)]">
      {/* Background CAD Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        aria-hidden="true"
      />

      {/* Optical Center Reticle */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-35" aria-hidden="true">
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 rounded-full border border-ca-primary/50" />
          <div className="absolute inset-3 rounded-full border border-dashed border-ca-primary/40" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-ca-primary/50 -translate-y-1/2" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-ca-primary/50 -translate-x-1/2" />
          <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ca-primary shadow-[0_0_6px_var(--ca-primary)]" />
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center text-ca-ink-muted font-hmi text-hmi-body">
        {children}
      </div>

      {overlay ? <div className="absolute inset-0 pointer-events-none">{overlay}</div> : null}

      {/* Optical HUD corner brackets with diamond chamfers */}
      <div className="pointer-events-none absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-ca-primary/80 rounded-tl-sm shadow-[0_0_8px_color-mix(in_oklab,var(--ca-primary)_40%,transparent)]" aria-hidden="true" />
      <div className="pointer-events-none absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-ca-primary/80 rounded-tr-sm shadow-[0_0_8px_color-mix(in_oklab,var(--ca-primary)_40%,transparent)]" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 border-ca-primary/80 rounded-bl-sm shadow-[0_0_8px_color-mix(in_oklab,var(--ca-primary)_40%,transparent)]" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 border-ca-primary/80 rounded-br-sm shadow-[0_0_8px_color-mix(in_oklab,var(--ca-primary)_40%,transparent)]" aria-hidden="true" />

      {/* Camera Live Status Badge */}
      <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-ca-border/80 bg-ca-panel/90 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ca-ink shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-xl">
          <span className="relative flex h-2 w-2 items-center justify-center" aria-hidden="true">
            {isLive ? (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ca-ok opacity-75" />
            ) : null}
            <span
              className={`relative inline-block h-1.5 w-1.5 rounded-full ${
                isLive
                  ? "bg-ca-ok shadow-[0_0_8px_var(--ca-ok)]"
                  : "bg-ca-ink-muted/60"
              }`}
            />
          </span>
          <span className={isLive ? "text-ca-ink" : "text-ca-ink-muted"}>
            {isLive ? "CAM-01 · LIVE STREAM" : "CAM-01 · STANDBY"}
          </span>
        </div>
      </div>

      {/* Telemetry Stream Info */}
      <div className="pointer-events-none absolute top-14 right-3 hidden sm:flex items-center gap-2">
        <span className="rounded-lg border border-ca-border/80 bg-ca-panel/90 px-2.5 py-1 font-mono text-[10px] font-semibold text-ca-ink-muted shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
          1920×1080 @ 60 FPS · 800µs
        </span>
      </div>

      {/* Precision Caliper Scale */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-6 rounded-full border border-ca-border/70 bg-ca-panel/85 px-4 py-0.5 font-mono text-[9px] text-ca-ink-muted shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-xl" aria-hidden="true">
        <span>-50mm</span>
        <span className="text-ca-border/60">│</span>
        <span>-25mm</span>
        <span className="text-ca-primary font-bold shadow-[0_0_6px_color-mix(in_oklab,var(--ca-primary)_40%,transparent)]">0mm</span>
        <span>+25mm</span>
        <span className="text-ca-border/60">│</span>
        <span>+50mm</span>
      </div>
    </div>
  );
}
