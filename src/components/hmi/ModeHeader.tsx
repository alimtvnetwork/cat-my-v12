import type { ReactNode } from "react";

export interface ModeHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function ModeHeader({ title, actions }: ModeHeaderProps): React.JSX.Element | null {
  return (
    <section
      role="region"
      aria-label={title}
      className="flex h-9 items-center justify-between gap-3 bg-gradient-to-b from-ca-panel/40 to-ca-bg px-4 text-ca-ink font-hmi"
    >
      <h1 className="text-[0.82rem] font-semibold uppercase tracking-[0.14em] text-ca-ink/90">
        {title}
      </h1>
      {actions ? <div className="flex items-center gap-1.5">{actions}</div> : null}
    </section>
  );
}
