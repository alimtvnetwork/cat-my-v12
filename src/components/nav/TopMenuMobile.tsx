import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu as MenuIcon, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PANELS } from "@/lib/workspace/panel-registry";
import { useWorkspaceLayoutStore } from "@/lib/workspace/layout-slice";
import { toggleWindowPanel, collapseFirstOpenPanel } from "./TopMenuBarConstants";
import { GROUPS } from "./TopMenuBar";
import { ACTION_HANDLERS } from "./TopMenuActionHandlers";
import { isActionEntry } from "./TopMenuUtils";

export function WindowMobileSection({ onClose }: { onClose: () => void }): React.JSX.Element | null {
  const panels = useWorkspaceLayoutStore((s) => s.panels);
  const togglePanel = useWorkspaceLayoutStore((s) => s.togglePanel);
  const openPanel = useWorkspaceLayoutStore((s) => s.openPanel);
  const restorePanel = useWorkspaceLayoutStore((s) => s.restorePanel);
  const resetLayout = useWorkspaceLayoutStore((s) => s.resetLayout);
  const collapseOthers = useWorkspaceLayoutStore((s) => s.collapseOthers);

  return (
    <section>
      <div className="px-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-ca-ink-muted">
        Window
      </div>
      <ul className="flex flex-col">
        {PANELS.map((panel) => (
          <li key={panel.id}>
            <button
              type="button"
              onClick={() => {
                toggleWindowPanel(panel.id, panels, openPanel, restorePanel, togglePanel);
                onClose();
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-hmi-body hover:bg-ca-panel-2"
            >
              <span className="inline-flex w-4 justify-center">
                {panels[panel.id]?.open && !panels[panel.id].minimized ? (
                  <Check aria-hidden size={14} />
                ) : null}
              </span>
              <span>{panel.title}</span>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => {
              collapseFirstOpenPanel(panels, collapseOthers);
              onClose();
            }}
            className="block w-full rounded-sm px-2 py-2 text-left text-hmi-body hover:bg-ca-panel-2"
          >
            Collapse Other Panels
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              resetLayout();
              onClose();
            }}
            className="block w-full rounded-sm px-2 py-2 text-left text-hmi-body hover:bg-ca-panel-2"
          >
            Reset Workspace Layout
          </button>
        </li>
      </ul>
    </section>
  );
}

export function MobileMenu({
  pathname,
  running,
  showWindowMenu,
}: {
  pathname: string;
  running: boolean;
  showWindowMenu: boolean;
}): React.JSX.Element | null {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          aria-haspopup="menu"
          aria-expanded={open}
          data-state={open ? "open" : "closed"}
          style={{ willChange: "background-color" }}
          className="hmi-focus-ring relative inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-ca-border bg-ca-panel/70 px-2 text-ca-chrome-ink transition-colors duration-150 ease-out hover:bg-ca-panel-2 data-[state=open]:bg-ca-panel-2 data-[state=open]:text-ca-chrome-ink"
        >
          <MenuIcon size={16} aria-hidden />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="hmi-drawer-surface w-72 overflow-y-auto border-ca-border bg-ca-panel p-0 text-ca-ink"
      >
        <SheetHeader className="border-b border-ca-border px-4 py-3 text-left">
          <SheetTitle className="text-hmi-body font-semibold">Menu</SheetTitle>
        </SheetHeader>
        <nav aria-label="Mobile primary" className="flex flex-col gap-3 p-3">
          {GROUPS.map((group) => (
            <section key={group.id} aria-labelledby={`m-group-${group.id}`}>
              <div
                id={`m-group-${group.id}`}
                className="px-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-ca-ink-muted"
              >
                {group.label}
              </div>
              <ul className="flex flex-col">
                {group.items.map((item, idx) => {
                  const active = isActionEntry(item) === false && item.to === pathname;
                  const locked =
                    isActionEntry(item) === false &&
                    Boolean(running && item.lockDuringRun && !active);
                  const key = isActionEntry(item) ? item.action : item.to;

                  return (
                    <li key={`m-${group.id}-${key}-${idx}`}>
                      {isActionEntry(item) ? (
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => {
                            ACTION_HANDLERS[item.action]?.();
                            setOpen(false);
                          }}
                          className="hmi-focus-ring block w-full truncate rounded-sm px-2 py-2 text-left text-hmi-body hover:bg-ca-panel-2 disabled:opacity-50"
                        >
                          {item.label}
                        </button>
                      ) : locked ? (
                        <span
                          aria-disabled="true"
                          className="block truncate rounded-sm px-2 py-2 text-hmi-body text-ca-ink-muted"
                        >
                          {item.label} · locked
                        </span>
                      ) : (
                        <Link
                          to={item.to}
                          search={{} as any}
                          params={{} as any}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={`hmi-focus-ring block truncate rounded-sm px-2 py-2 text-hmi-body hover:bg-ca-panel-2 ${
                            active ? "bg-ca-primary/10 text-ca-primary" : ""
                          }`}
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {showWindowMenu ? <WindowMobileSection onClose={() => setOpen(false)} /> : null}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
