import type { ReactNode } from "react";

export interface ViewportProps {
  children?: ReactNode;
  overlay?: ReactNode;
}

export function Viewport({ children, overlay }: ViewportProps): React.JSX.Element | null {

  return (
    <div className="relative flex-1 m-hmi-3 rounded-lg bg-ca-viewport overflow-hidden border border-ca-border hmi-viewport-grid">
      <div className="absolute inset-0 flex items-center justify-center text-ca-ink-muted font-hmi text-hmi-body">
        {children}
      </div>
      {overlay ? <div className="absolute inset-0 pointer-events-none">{overlay}</div> : null}
      <div className="pointer-events-none absolute top-hmi-2 left-hmi-3 text-[0.65rem] uppercase tracking-widest text-ca-ink-muted/60">
        Camera 1 · Live
      </div>
    </div>
  );
}
