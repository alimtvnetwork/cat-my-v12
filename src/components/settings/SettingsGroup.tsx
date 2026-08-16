import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useUiPrefsStore, type SettingsGroupId } from "@/lib/stores/ui-prefs-store";

// Plan 81 step 5: collapsible group wrapper for the Settings hub. State
// lives in `useUiPrefsStore.settingsGroupsCollapsed` so collapse persists
// per user via the facade-backed UI-prefs store. Content stays mounted
// (visibility toggled via `hidden`) so React state inside the cards
// (savedAt timestamps, retention edits) is preserved across collapses.
export interface SettingsGroupProps {
  id: SettingsGroupId;
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsGroup({ id, title, description, children }: SettingsGroupProps) {
  const collapsed = useUiPrefsStore((s) => s.settingsGroupsCollapsed[id] ?? false);
  const toggle = useUiPrefsStore((s) => s.toggleSettingsGroup);
  const bodyId = `settings-group-${id}-body`;

  return (
    <section className="space-y-hmi-3" data-testid={`settings-group-${id}`}>
      <button
        type="button"
        onClick={() => toggle(id)}
        aria-expanded={!collapsed}
        aria-controls={bodyId}
        className="flex w-full items-center justify-between gap-hmi-3 rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-left transition hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-select"
      >
        <div className="min-w-0">
          <h2 className="font-display text-hmi-body font-bold uppercase tracking-wide text-ca-ink">
            {title}
          </h2>
          {description ? (
            <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">{description}</p>
          ) : null}
        </div>
        <ChevronDown
          size={16}
          aria-hidden
          className="shrink-0 text-ca-ink-muted transition-transform"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
        />
      </button>
      <div id={bodyId} hidden={collapsed} className="grid grid-cols-1 gap-hmi-4 lg:grid-cols-2">
        {children}
      </div>
    </section>
  );
}
