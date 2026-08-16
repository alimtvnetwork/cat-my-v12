import { EmptyStateActionVariantType } from "@/components/common/EmptyState";
// Plan 87 step 19: read-only keyboard shortcut cheatsheet.
//
// The existing `settings/shortcuts` route (`src/routes/settings.shortcuts.tsx`)
// is an editor: bindings are inputs, recording state, conflict banners. That
// makes it noisy when the operator only wants to look up "what key adds a
// blob rule?" This route is the opposite: a compact, printable, grouped
// reference derived from the same `SHORTCUT_ACTIONS` registry so the two
// surfaces never drift.
//
// Route: `/shortcuts`. No auth, no loader, no side effects. Groups actions
// into "Rule creation" (`add-rule-*`), "Navigation" (`open-recent`) and
// "Editor" (everything else). A print button triggers `window.print()`;
// the print CSS at the bottom of the file collapses the page to the
// cheatsheet card only.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Keyboard, Printer, Search, X } from "lucide-react";
import { HmiShell } from "@/components/hmi";
import { EmptyState } from "@/components/common/EmptyState";
import {
  SHORTCUT_ACTIONS,
  useShortcutsStore,
  type ShortcutActionId,
  type ShortcutActionSpec,
} from "@/lib/stores/shortcuts-store";
import { formatComboForDisplay } from "@/lib/shortcut-format";

export const Route = createFileRoute("/shortcuts")({
  head: () => ({
    meta: [
      { title: "Keyboard shortcuts cheatsheet" },
      {
        name: "description",
        content:
          "Printable reference of every keyboard shortcut, grouped by editor, rule creation, and navigation. Bindings match your current settings.",
      },
      { property: "og:title", content: "Keyboard shortcuts cheatsheet" },
      {
        property: "og:description",
        content: "Printable reference of every keyboard shortcut in the app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShortcutsCheatsheet,
});

interface Group {
  id: "editor" | "rules" | "navigation";
  label: string;
  actions: readonly ShortcutActionSpec[];
}

function groupOf(id: ShortcutActionId): Group["id"] {
  if (id.startsWith("add-rule-")) return "rules";

  if (id === "open-recent") return "navigation";

  return "editor";
}

const GROUP_LABELS: Record<Group["id"], string> = {
  editor: "Editor",
  rules: "Rule creation",
  navigation: "Navigation",
};
const GROUP_ORDER: readonly Group["id"][] = ["editor", "rules", "navigation"];

function ShortcutsCheatsheet() {
  const bindings = useShortcutsStore((s) => s.bindings);
  const [query, setQuery] = useState("");

  const groups = useMemo<readonly Group[]>(() => {
    const q = query.trim().toLowerCase();
    const buckets: Record<Group["id"], ShortcutActionSpec[]> = {
      editor: [],
      rules: [],
      navigation: [],
    };
    for (const spec of SHORTCUT_ACTIONS) {
      if (q) {
        const combo = formatComboForDisplay(bindings[spec.id]).toLowerCase();

        if (
          spec.label.toLowerCase().includes(q) === false &&
          spec.description.toLowerCase().includes(q) === false &&
          combo.includes(q) === false
        )
          continue;
      }

      buckets[groupOf(spec.id)].push(spec);
    }

    return GROUP_ORDER.map((id) => ({
      id,
      label: GROUP_LABELS[id],
      actions: buckets[id],
    })).filter((g) => g.actions.length > 0);
  }, [query, bindings]);

  const total = groups.reduce((n, g) => n + g.actions.length, 0);

  return (
    <HmiShell
      program="Program 01"
      title="Shortcuts cheatsheet"
      actionBarLeft={
        <Link
          to="/settings/shortcuts"
          className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink"
        >
          Customize
        </Link>
      }
      actionBarRight={
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") window.print();
          }}
          className="inline-flex items-center gap-hmi-2 min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink"
          data-testid="shortcuts-print"
        >
          <Printer size={14} aria-hidden />
          Print
        </button>
      }
    >
      <div className="flex-1 overflow-auto p-hmi-4 space-y-hmi-4" id="cheatsheet-scroll">
        <section className="max-w-3xl space-y-hmi-2">
          <label className="flex items-center gap-hmi-2 rounded border border-ca-border bg-ca-panel px-hmi-3 py-hmi-2 focus-within:border-ca-select print:hidden">
            <Search size={14} aria-hidden className="text-ca-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search actions, descriptions, or keys"
              aria-label="Search keyboard shortcuts"
              className="w-full bg-transparent text-hmi-body text-ca-ink outline-none placeholder:text-ca-ink-muted"
              data-testid="cheatsheet-search"
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
          <div className="text-hmi-caption text-ca-ink-muted print:hidden" aria-live="polite">
            Showing {total} of {SHORTCUT_ACTIONS.length}
          </div>
        </section>

        <section
          id="cheatsheet-card"
          className="max-w-3xl rounded-lg border border-ca-border bg-ca-panel print:border-0 print:bg-transparent"
        >
          {groups.length === 0 ? (
            <EmptyState
              icon={Keyboard}
              title="No shortcuts match"
              description={`Nothing matches "${query}". Try a different action name or key.`}
              actions={[
                {
                  label: "Clear search",
                  onClick: () => setQuery(""),
                  variant: EmptyStateActionVariantType.Secondary,
                  testId: "cheatsheet-empty-clear",
                },
              ]}
              testId="cheatsheet-empty"
              compact
            />
          ) : (
            <ul className="divide-y divide-ca-border">
              {groups.map((group) => (
                <li key={group.id} className="p-hmi-3">
                  <h2 className="mb-hmi-2 text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
                    {group.label}
                  </h2>
                  <ul className="grid grid-cols-1 gap-hmi-1 sm:grid-cols-2">
                    {group.actions.map((spec) => (
                      <li
                        key={spec.id}
                        className="flex items-center justify-between gap-hmi-2 rounded px-hmi-2 py-hmi-1 hover:bg-ca-panel-2 print:hover:bg-transparent"
                      >
                        <div className="min-w-0">
                          <div className="text-hmi-body text-ca-ink">{spec.label}</div>
                          <div className="text-hmi-caption text-ca-ink-muted truncate">
                            {spec.description}
                          </div>
                        </div>
                        <kbd className="shrink-0 rounded bg-ca-panel-2 px-2 py-0.5 font-mono text-hmi-caption text-ca-ink print:bg-transparent print:border print:border-black">
                          {formatComboForDisplay(bindings[spec.id])}
                        </kbd>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Print-only styles: hide the app chrome and expand the card. */}
      <style>{`
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .hmi-shell-chrome, .hmi-shell-actionbar, .hmi-shell-header { display: none !important; }
          #cheatsheet-scroll { overflow: visible !important; padding: 0 !important; }
          #cheatsheet-card { max-width: 100% !important; }
        }
        
      `}</style>
    </HmiShell>
  );
}
