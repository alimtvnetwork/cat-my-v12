import type { ReactNode } from "react";

export enum StatusSeverityType {
  Ok = "ok",
  Ng = "ng",
  Warn = "warn",
  Info = "info",
}
export type StatusSeverity = StatusSeverityType;

export interface StatusLogEntry {
  id: string;
  ts: string;
  severity: StatusSeverity;
  message: ReactNode;
}

const dotClass: Record<StatusSeverity, string> = {
  ok: "bg-ca-ok shadow-[0_0_6px_var(--ca-ok)]",
  ng: "bg-ca-ng shadow-[0_0_6px_var(--ca-ng)]",
  warn: "bg-ca-warn shadow-[0_0_6px_var(--ca-warn)]",
  info: "bg-ca-primary shadow-[0_0_6px_var(--ca-primary)]",
};

export function StatusLog({ entries }: { entries: StatusLogEntry[] }): React.JSX.Element | null {
  return (
    <div className="flex flex-col rounded-xl border border-ca-border/80 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--ca-panel)_94%,transparent),color-mix(in_oklab,var(--ca-bg)_96%,transparent))] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-md overflow-hidden">
      <div className="flex items-center justify-between border-b border-ca-border/60 bg-ca-panel/60 px-hmi-4 py-1.5">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ca-ink-muted">
          Realtime Event Stream
        </span>
        <span className="font-mono text-[10px] text-ca-ink-muted/70">
          {entries.length} events
        </span>
      </div>
      <ul className="divide-y divide-ca-border/40 max-h-64 overflow-y-auto font-mono text-xs text-ca-ink">
        {entries.length === 0 ? (
          <li className="px-hmi-4 py-hmi-4 text-ca-ink-muted text-center font-sans text-xs">
            No events registered yet
          </li>
        ) : (
          entries.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-hmi-3 px-hmi-4 py-1.5 min-h-8 hover:bg-ca-panel-2/60 transition-colors"
            >
              <span
                className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotClass[e.severity]}`}
                aria-hidden
              />
              <span className="hmi-tabular text-[11px] text-ca-ink-muted shrink-0 min-w-20">
                {e.ts}
              </span>
              <span className="flex-1 truncate text-ca-ink/90 font-medium">{e.message}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
