import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { HmiShell } from "@/components/hmi";
import {
  SHORTCUT_ACTIONS,
  comboFromEvent,
  findShortcutConflicts,
  useShortcutsStore,
  type ShortcutActionId,
} from "@/lib/stores/shortcuts-store";
import { formatComboForDisplay } from "@/lib/shortcut-format";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

export const Route = createFileRoute("/settings/shortcuts")({
  head: () => ({
    meta: [
      { title: "Keyboard shortcuts - Settings" },
      {
        name: "description",
        content:
          "View and customize the V/R/C/M/T/O/B/F/J keyboard shortcuts used across the editor.",
      },
    ],
  }),
  component: ShortcutsSettings,
});

function ShortcutsSettings() {
  const bindings = useShortcutsStore((s) => s.bindings);
  const setBinding = useShortcutsStore((s) => s.setBinding);
  const reset = useShortcutsStore((s) => s.reset);
  const resetAll = useShortcutsStore((s) => s.resetAll);

  const [recording, setRecording] = useState<ShortcutActionId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const conflicts = useMemo(() => findShortcutConflicts(bindings), [bindings]);
  const conflictIds = useMemo(() => new Set(conflicts.flat()), [conflicts]);

  // Plan 81 step 11: searchable table. Query matches label, description,
  // and formatted combo (so "shift+r" finds Reset even before the user
  // types the action name).
  const [query, setQuery] = useState("");
  const visibleActions = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return SHORTCUT_ACTIONS;

    return SHORTCUT_ACTIONS.filter((spec) => {
      const combo = formatComboForDisplay(bindings[spec.id]).toLowerCase();

      return (
        spec.label.toLowerCase().includes(q) ||
        spec.description.toLowerCase().includes(q) ||
        combo.includes(q)
      );
    });
  }, [query, bindings]);

  const stopRecording = useCallback(() => {
    setRecording(null);
  }, []);

  // Escape cancels; Tab exits recording without capturing.
  const isIdle = !recording;

  useEffect(() => {
    if (isIdle) return;
    const onKey = (event: KeyboardEvent) => {
      if (KeyboardKeyType.isEscape(event.key) || KeyboardKeyType.isTab(event.key)) {
        event.preventDefault();
        setError(null);
        stopRecording();

        return;
      }

      const combo = comboFromEvent(event);

      if (!combo) return; // waiting for a non-modifier
      event.preventDefault();
      setBinding(recording, combo);
      setError(null);
      stopRecording();
    };
    window.addEventListener("keydown", onKey, true);

    return () => window.removeEventListener("keydown", onKey, true);
  }, [recording, setBinding, stopRecording]);

  return (
    <HmiShell
      program="Program 01"
      title="Keyboard shortcuts"
      actionBarLeft={
        <Link
          to="/settings"
          className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink"
        >
          Back to Settings
        </Link>
      }
      actionBarRight={
        <button
          type="button"
          onClick={() => {
            resetAll();
            setError(null);
          }}
          className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink"
        >
          Reset all to defaults
        </button>
      }
    >
      <div className="flex-1 overflow-auto p-hmi-4 space-y-hmi-4">
        <section className="max-w-3xl space-y-hmi-2">
          <h2 className="text-hmi-title uppercase tracking-wide text-ca-ink">Editor shortcuts</h2>
          <p className="text-hmi-body text-ca-ink-muted">
            Click a binding to record a new key. Escape cancels. Bindings are ignored while focus is
            inside a text field so typing is never intercepted.
          </p>
          {conflicts.length > 0 && (
            <div
              role="alert"
              className="rounded border border-ca-ng bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-caption text-ca-ng"
            >
              {conflicts.length === 1 ? "1 conflict" : `${conflicts.length} conflicts`}: multiple
              actions share the same key. Only the first match will fire.
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="rounded border border-ca-ng bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-caption text-ca-ng"
            >
              {error}
            </div>
          )}
        </section>

        <section className="max-w-3xl space-y-hmi-2">
          <label className="flex items-center gap-hmi-2 rounded border border-ca-border bg-ca-panel px-hmi-3 py-hmi-2 focus-within:border-ca-select">
            <Search size={14} aria-hidden className="text-ca-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search actions, descriptions, or keys"
              aria-label="Search keyboard shortcuts"
              className="w-full bg-transparent text-hmi-body text-ca-ink outline-none placeholder:text-ca-ink-muted"
              data-testid="shortcuts-search"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="text-ca-ink-muted hover:text-ca-ink"
              >
                <X size={14} aria-hidden />
              </button>
            ) : null}
          </label>
          <div className="text-hmi-caption text-ca-ink-muted" aria-live="polite">
            Showing {visibleActions.length} of {SHORTCUT_ACTIONS.length}
          </div>
          <div
            role="table"
            aria-label="Keyboard shortcuts"
            className="overflow-hidden rounded border border-ca-border bg-ca-panel"
          >
            <div
              role="row"
              className="grid grid-cols-[minmax(0,1fr)_150px_120px] items-center gap-hmi-3 border-b border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-caption uppercase tracking-wide text-ca-ink-muted"
            >
              <span role="columnheader">Action</span>
              <span role="columnheader">Shortcut</span>
              <span role="columnheader" className="text-right">
                Manage
              </span>
            </div>
            {visibleActions.length === 0 ? (
              <div className="px-hmi-3 py-hmi-4 text-hmi-body text-ca-ink-muted" role="row">
                No shortcuts match "{query}".
              </div>
            ) : (
              <ul className="divide-y divide-ca-border">
                {visibleActions.map((spec) => {
                  const combo = bindings[spec.id];
                  const isRecording = recording === spec.id;
                  const inConflict = conflictIds.has(spec.id);

                  return (
                    <Row
                      key={spec.id}
                      label={spec.label}
                      description={spec.description}
                      combo={combo}
                      defaultCombo={spec.defaultCombo}
                      isRecording={isRecording}
                      inConflict={inConflict}
                      onRecord={() => {
                        setError(null);
                        setRecording(spec.id);
                      }}
                      onCancel={stopRecording}
                      onReset={() => reset(spec.id)}
                    />
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </HmiShell>
  );
}

interface RowProps {
  label: string;
  description: string;
  combo: string;
  defaultCombo: string;
  isRecording: boolean;
  inConflict: boolean;
  onRecord: () => void;
  onCancel: () => void;
  onReset: () => void;
}

function Row({
  label,
  description,
  combo,
  defaultCombo,
  isRecording,
  inConflict,
  onRecord,
  onCancel,
  onReset,
}: RowProps) {
  const recordBtnRef = useRef<HTMLButtonElement | null>(null);
  const isCustom = combo !== defaultCombo;

  return (
    <li
      role="row"
      className="grid grid-cols-[minmax(0,1fr)_150px_120px] items-center gap-hmi-3 px-hmi-3 py-hmi-2 hover:bg-ca-panel-2"
    >
      <div role="cell" className="min-w-0">
        <div className="text-hmi-body text-ca-ink">{label}</div>
        <div className="text-hmi-caption text-ca-ink-muted">{description}</div>
      </div>
      <div role="cell" className="flex items-center gap-hmi-2">
        {isRecording ? (
          <>
            <span role="status" aria-live="polite" className="text-hmi-caption text-ca-ink-muted">
              Press a key...
            </span>
          </>
        ) : (
          <button
            ref={recordBtnRef}
            type="button"
            onClick={onRecord}
            aria-label={`Change shortcut for ${label}. Current: ${formatComboForDisplay(combo)}.`}
            className={
              inConflict
                ? "inline-flex items-center min-h-9 px-hmi-2 py-hmi-1 border border-ca-ng text-hmi-body text-ca-ink"
                : "inline-flex items-center min-h-9 px-hmi-2 py-hmi-1 border border-ca-border text-hmi-body text-ca-ink hover:border-ca-select"
            }
          >
            <kbd className="rounded bg-ca-panel-2 px-2 py-0.5 font-mono text-hmi-caption text-ca-ink">
              {formatComboForDisplay(combo)}
            </kbd>
          </button>
        )}
      </div>
      <div role="cell" className="flex items-center justify-end gap-hmi-2">
        {isRecording ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center min-h-9 px-hmi-2 py-hmi-1 border border-ca-border text-hmi-body text-ca-ink"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={onReset}
            disabled={!isCustom}
            className="inline-flex items-center min-h-9 px-hmi-2 py-hmi-1 border border-ca-border text-hmi-body text-ca-ink disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={`Reset ${label} to default (${formatComboForDisplay(defaultCombo)})`}
          >
            Reset
          </button>
        )}
      </div>
    </li>
  );
}
