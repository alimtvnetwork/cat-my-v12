import { useEffect, useState } from "react";
import { last, subscribe, tail } from "@/lib/editor/log-stream";
import type { LogEntry } from "@/lib/editor/types";
import { formatIdentifierLabel } from "@/lib/display-labels";

const chipClass: Record<LogEntry["level"], string> = {
  info: "bg-ca-ok",
  warn: "bg-ca-warn",
  error: "bg-ca-ng",
};

export function LastLogChip() {
  const [entry, setEntry] = useState<LogEntry | null>(() => last());
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setEntry(last());
    window.requestAnimationFrame(() => setEntry(last()));

    // Defer setState so that if `push()` fires synchronously inside
    // another component's render (e.g. any logger.* call reached from a
    // render path), React does not throw "Cannot update a component
    // (LastLogChip) while rendering a different component" and cascade
    // into the Setup error boundary as a hook-count crash.
    return subscribe((next) => {
      queueMicrotask(() => setEntry(next));
    });
  }, []);
  const code = entry?.code ?? "Ready";
  const level = entry?.level ?? "info";

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        aria-label="Open log console"
        onClick={() => setOpen(true)}
        className="editor-log-chip"
      >
        <span className={`h-3 w-3 shrink-0 rounded-full ${chipClass[level]}`} />
        <span
          className="editor-log-code text-hmi-badge"
          data-testid="last-log-code"
          data-raw-code={code}
        >
          {formatIdentifierLabel(code)}
        </span>
      </button>
      {open ? <LogConsole onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function LogConsole({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      className="absolute bottom-full left-0 z-20 mb-hmi-2 max-h-72 w-96 overflow-auto border border-ca-border bg-ca-panel p-hmi-3 shadow-hmi-modal"
    >
      <button type="button" onClick={onClose} className="editor-topbar-button mb-hmi-2">
        Close
      </button>
      {tail(50).map((entry) => (
        <div
          key={entry.correlationId}
          className="text-hmi-caption text-ca-ink-muted"
          data-raw-code={entry.code}
        >
          {formatIdentifierLabel(entry.code)}
        </div>
      ))}
    </div>
  );
}
