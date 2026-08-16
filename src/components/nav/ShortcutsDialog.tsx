import { useMemo, useState } from "react";
import { useHotkeys } from "@/hooks/useHotkeys";
import { SHORTCUT_ACTIONS, useShortcutsStore } from "@/lib/stores/shortcuts-store";
import { formatComboForDisplay } from "@/lib/shortcut-format";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

/**
 * Keyboard shortcuts help overlay, Plan 64 step 94.
 *
 * `?` (shift+/) opens, Escape closes. Static list mirrors the bindings
 * wired in `HmiShell` and the Command Palette.
 */
interface Shortcut {
  keys: string;
  label: string;
}

const STATIC_SHORTCUTS: readonly Shortcut[] = [
  { keys: "Cmd K / Ctrl K", label: "Open Command Palette" },
  { keys: "Cmd Shift P / Ctrl Shift P", label: "Open Command Palette (alt)" },
  { keys: "?", label: "Show this shortcuts help" },
  { keys: "Esc", label: "Close dialogs and overlays" },
  { keys: "Arrow Up / Down", label: "Move selection in Command Palette" },
  { keys: "Enter", label: "Confirm selection in Command Palette" },
  { keys: "Cmd Alt 0 / Ctrl Alt 0", label: "Reset workspace layout" },
  { keys: "Shift (while resizing)", label: "Lock aspect ratio (keeps circles round)" },
] as const;

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const bindings = useShortcutsStore((s) => s.bindings);

  useHotkeys(
    useMemo(
      () => [
        { combo: "shift+?", handler: () => setOpen((o) => !o) },
        { combo: "?", handler: () => setOpen((o) => !o) },
      ],
      [],
    ),
  );

  if (!open) return null;

  const dynamic: readonly Shortcut[] = SHORTCUT_ACTIONS.map((spec) => ({
    keys: formatComboForDisplay(bindings[spec.id]),
    label: spec.label,
  }));
  const rows = [...STATIC_SHORTCUTS, ...dynamic];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onKeyDown={(e) => {
        if (KeyboardKeyType.isEscape(e.key)) setOpen(false);
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-hmi-6"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-ca-border bg-ca-panel p-hmi-5 shadow-2xl"
      >
        <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
          Keyboard shortcuts
        </h2>
        <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">
          Press Esc to close. Customize in Settings / Shortcuts.
        </p>
        <ul className="mt-hmi-4 flex flex-col gap-hmi-2">
          {rows.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-hmi-3">
              <span className="text-hmi-body text-ca-ink">{s.label}</span>
              <kbd className="rounded border border-ca-border bg-ca-panel-2 px-2 py-0.5 font-mono text-hmi-caption text-ca-ink-muted">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
