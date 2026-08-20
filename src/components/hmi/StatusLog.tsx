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
    <ul className="font-hmi text-hmi-body text-ca-ink divide-y divide-ca-border bg-ca-panel border border-ca-border rounded-lg max-h-72 overflow-y-auto">
      {entries.length === 0 ? (
        <li className="px-hmi-4 py-hmi-4 text-ca-ink-muted text-center">No events yet</li>
      ) : (
        entries.map((e) => (
          <li
            key={e.id}
            className="flex items-center gap-hmi-3 px-hmi-4 py-hmi-2 min-h-10 hover:bg-ca-panel-2 transition-colors"
          >
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass[e.severity]}`}
              aria-hidden
            />
            <span className="hmi-tabular text-hmi-badge text-ca-ink-muted min-w-24">{e.ts}</span>
            <span className="flex-1">{e.message}</span>
          </li>
        ))
      )}
    </ul>
  );
}
