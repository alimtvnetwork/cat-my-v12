import type { ReactNode } from "react";

export interface ViewportProps {
  children?: ReactNode;
  overlay?: ReactNode;
}

export function Viewport({ children, overlay }: ViewportProps): React.JSX.Element | null {
  return (
    <div className="relative flex-1 min-h-[380px] m-hmi-2 rounded-lg bg-ca-viewport overflow-hidden border border-ca-border hmi-viewport-grid flex flex-col">
      <div className="relative flex-1 flex items-center justify-center text-ca-ink-muted font-hmi text-hmi-body overflow-hidden">
        {children}
      </div>
      {overlay ? <div className="absolute inset-0 pointer-events-none">{overlay}</div> : null}
      <div className="pointer-events-none absolute top-hmi-2 left-hmi-3 z-10 text-[0.65rem] font-mono uppercase tracking-widest text-ca-ink-muted bg-ca-panel/80 px-2 py-0.5 rounded border border-ca-border/40 backdrop-blur-sm shadow-sm">
        Camera 1 · Live Acquisition
      </div>
    </div>
  );
}
