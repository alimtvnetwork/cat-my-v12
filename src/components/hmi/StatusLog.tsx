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
  ok: "bg-ca-ok",
  ng: "bg-ca-ng",
  warn: "bg-ca-warn",
  info: "bg-ca-primary",
};

export function StatusLog({ entries }: { entries: StatusLogEntry[] }): React.JSX.Element | null {
  return (
    <ul className="font-hmi text-xs text-ca-ink divide-y divide-ca-border/60 bg-ca-panel border border-ca-border rounded-lg max-h-40 overflow-y-auto shrink-0 shadow-sm">
      {entries.length === 0 ? (
        <li className="px-3 py-2 text-ca-ink-muted text-center">No inspection events yet</li>
      ) : (
        entries.map((e) => (
          <li
            key={e.id}
            className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-ca-panel-2 transition-colors font-mono"
          >
            <span
              className={`inline-block h-2 w-2 rounded-full shrink-0 ${dotClass[e.severity]}`}
              aria-hidden
            />
            <span className="tabular-nums text-ca-ink-muted shrink-0 text-[11px]">{e.ts}</span>
            <span className="flex-1 truncate text-ca-ink">{e.message}</span>
          </li>
        ))
      )}
    </ul>
  );
}
