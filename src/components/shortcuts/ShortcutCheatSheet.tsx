/**
 * Shortcut cheat sheet overlay for Plan 100 §13 (step 13).
 *
 * Lists every shortcut currently in the registry, grouped by `group` and
 * sorted by scope precedence. Toggled by `Ctrl+/` (or `Cmd+/` on macOS)
 * via a self-registered `global`-scope shortcut so the dispatcher owns
 * every keybinding. Combos render through `formatCombo` for platform-
 * correct glyphs.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { formatCombo } from "@/lib/shortcuts/formatCombo";
import {
  registerShortcut,
  useDuplicateCombos,
  useShortcuts,
  type ShortcutDefinition,
} from "@/lib/shortcuts/registry";
import { scopeRank, ShortcutScopeBaseType } from "@/lib/shortcuts/scopes";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

/**
 * Preferred display order for well-known group names. Anything outside
 * this list is appended alphabetically after the ranked entries, keeping
 * the sheet stable regardless of registration order.
 */
const GROUP_ORDER: readonly string[] = [
  "Editor",
  "Tools",
  "HUD",
  "Navigation",
  "Menu",
  "View",
  "Help",
  "General",
];

function groupRank(name: string): number {
  const i = GROUP_ORDER.indexOf(name);

  return i === -1 ? GROUP_ORDER.length : i;
}

function groupAndSort(defs: ShortcutDefinition[]): Array<[string, ShortcutDefinition[]]> {
  const sorted = [...defs].sort((a, b) => {
    const r = scopeRank(a.scope) - scopeRank(b.scope);

    if (r !== 0) return r;

    return a.label.localeCompare(b.label);
  });
  const buckets = new Map<string, ShortcutDefinition[]>();
  for (const def of sorted) {
    const g = def.group || "General";
    const list = buckets.get(g);

    if (list) list.push(def);
    else buckets.set(g, [def]);
  }

  return Array.from(buckets.entries()).sort(([a], [b]) => {
    const r = groupRank(a) - groupRank(b);

    if (r !== 0) return r;

    return a.localeCompare(b);
  });
}

export function ShortcutCheatSheet() {
  const [open, setOpen] = useState(false);
  const defs = useShortcuts();
  const duplicates = useDuplicateCombos();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Register the toggle as a proper registry entry so it appears in the
  // sheet itself and participates in scope precedence.
  useEffect(() => {
    const unregister = registerShortcut({
      id: "cheatsheet.toggle",
      scope: ShortcutScopeBaseType.Global,
      combo: "Ctrl+/",
      label: "Show keyboard shortcuts",
      group: "Help",
      run: () => setOpen((prev) => !prev),
    });
    // macOS combo also registered so ⌘/ works without duplicating the id.
    const unregisterMac = registerShortcut({
      id: "cheatsheet.toggle.mac",
      scope: ShortcutScopeBaseType.Global,
      combo: "Meta+/",
      label: "Show keyboard shortcuts (⌘/)",
      group: "Help",
      run: () => setOpen((prev) => !prev),
    });

    return () => {
      unregister();
      unregisterMac();
    };
  }, []);

  const groups = useMemo(() => groupAndSort(defs), [defs]);

  // Escape must dismiss regardless of focus location, and opening the
  // sheet must move focus into the panel (and restore it on close) so
  // keyboard operators can actually reach the close button.
  const isClosed = !open;

  useEffect(() => {
    if (isClosed) return;
    returnFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const raf = requestAnimationFrame(() => {
      panelRef.current?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (KeyboardKeyType.isEscape(e.key)) {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey, true);
      const target = returnFocusRef.current;

      if (target && typeof target.focus === "function") target.focus();
    };
  }, [open]);

  if (!open) return null;

  const totalCount = defs.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cheatsheet-title"
      aria-describedby="cheatsheet-desc"
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-6"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[80vh] overflow-auto rounded-lg border border-ca-border bg-ca-panel p-5 shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-ca-accent"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <h2
              id="cheatsheet-title"
              className="text-[13px] font-semibold uppercase tracking-wide text-ca-ink"
            >
              Keyboard shortcuts
            </h2>
            <span id="cheatsheet-desc" className="text-[11px] tabular-nums text-ca-ink-muted">
              {totalCount} registered
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[12px] text-ca-ink-muted hover:text-ca-ink"
            aria-label="Close shortcuts"
          >
            Esc
          </button>
        </div>
        {groups.length === 0 ? (
          <p className="mt-4 text-[12px] text-ca-ink-muted">No shortcuts registered yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-5">
            {duplicates.length > 0 ? (
              <section
                role="alert"
                className="rounded border border-ca-warn/40 bg-ca-warn/10 p-2 text-[12px] text-ca-ink"
              >
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ca-warn">
                  Combo collisions ({duplicates.length})
                </h3>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {duplicates.map((d) => (
                    <li key={d.key} className="font-mono text-[11px]">
                      <span className="text-ca-ink-muted">{d.scope}</span>{" "}
                      <kbd className="rounded border border-ca-border bg-ca-panel-2 px-1">
                        {formatCombo(d.combo)}
                      </kbd>{" "}
                      <span className="text-ca-ink-muted">
                        → {d.defs.map((def) => def.id).join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {groups.map(([group, entries]) => (
              <section key={group}>
                <h3 className="flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-wider text-ca-ink-muted">
                  <span>{group}</span>
                  <span className="tabular-nums text-ca-ink-muted/70">{entries.length}</span>
                </h3>
                <ul className="mt-2 flex flex-col gap-1">
                  {entries.map((def) => (
                    <li
                      key={def.id}
                      className="flex items-center justify-between gap-4 rounded px-2 py-1 hover:bg-ca-panel-2"
                    >
                      <span className="text-[13px] text-ca-ink">{def.label}</span>
                      <kbd className="rounded border border-ca-border bg-ca-panel-2 px-2 py-0.5 font-mono text-[12px] tabular-nums text-ca-ink-muted">
                        {formatCombo(def.combo)}
                      </kbd>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
