import { useEffect, useRef } from "react";
import type { RunError } from "@/lib/run-store";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

export function RunErrorDrawer({
  error,
  onClose,
}: {
  error: RunError | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const isFail = error !== null;

  useEffect(() => {
    if (isFail === true) {
      closeRef.current?.focus();
      const onKey = (e: KeyboardEvent) => {
        if (KeyboardKeyType.isEscape(e.key)) onClose();
      };
      window.addEventListener("keydown", onKey);

      return () => window.removeEventListener("keydown", onKey);
    }
  }, [error, onClose]);

  if (!error) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-error-title"
      className="fixed inset-0 z-50 flex justify-end"
    >
      <div className="absolute inset-0 bg-ca-viewport/60" onClick={onClose} aria-hidden />
      <section className="relative flex h-full w-full max-w-md flex-col border-l border-ca-border bg-ca-panel shadow-hmi-panel">
        <header className="flex items-center justify-between border-b border-ca-border bg-ca-ng/10 px-hmi-4 py-hmi-3">
          <h2
            id="run-error-title"
            className="text-hmi-title font-semibold uppercase tracking-wide text-ca-ng"
          >
            Run error
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close run error drawer"
            className="text-ca-ink hover:text-ca-ng px-hmi-2 py-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
          >
            Close
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-hmi-4 space-y-hmi-3">
          <div>
            <p className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">Time</p>
            <p className="font-mono text-hmi-body text-ca-ink">{error.ts}</p>
          </div>
          <div>
            <p className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">Message</p>
            <p className="text-hmi-body text-ca-ink">{error.message}</p>
          </div>
          {error.stack ? (
            <div>
              <p className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
                Stack trace
              </p>
              <pre className="mt-1 whitespace-pre-wrap break-words rounded border border-ca-border bg-ca-panel-2 p-hmi-2 font-mono text-hmi-caption text-ca-ink">
                {error.stack}
              </pre>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
