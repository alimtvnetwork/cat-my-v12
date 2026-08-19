import { ClientLogger } from "@/lib/observability/client-logger";
// TopMenuBar: global dropdown menu bar shown in the app titlebar.
// Purpose: Dexter-style grouped HMI command surface for core workflows.
import { RunStatusType } from "@/types/run/RunStatus";
import { useEffect, useMemo, type ReactElement } from "react";
import { Link, useHydrated, useNavigate, useRouterState } from "@tanstack/react-router";
import { Check, LayoutTemplate, Menu as MenuIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useRunStore } from "@/lib/stores/run-store";
import { useUiPrefsStore } from "@/lib/stores/ui-prefs-store";
import { MenuGroupIdType } from "@/lib/enums/menu-group-id-type";
import { MenuShortcutType } from "@/lib/enums/menu-shortcut-type";
import { useMenuShortcuts, type MenuShortcutBinding } from "@/hooks/useMenuShortcuts";
import { registerShortcut } from "@/lib/shortcuts/registry";
import { useAriaKeyshortcuts } from "@/lib/shortcuts/useAriaKeyshortcuts";
import { ShortcutScopeBaseType } from "@/lib/shortcuts/scopes";
import { AppEvent } from "@/lib/constants";
import { WindowMenubarGroup } from "./WindowMenubarGroup";
import { PANELS } from "@/lib/workspace/panel-registry";
import { useWorkspaceLayoutStore } from "@/lib/workspace/layout-slice";
import { usePanelHostMounted } from "@/lib/workspace/panel-host-registry";

import { MenuRouteType, type MenuRoute, toggleWindowPanel, collapseFirstOpenPanel } from "./TopMenuBarConstants";

type NavEntry = {
  to: MenuRoute;
  label: string;
  shortcut?: MenuShortcutType;
  lockDuringRun?: boolean;
};
type ActionEntry = { action: string; label: string; shortcut?: MenuShortcutType };
type Entry = NavEntry | ActionEntry;
type MenuGroup = {
  id: MenuGroupIdType;
  label: string;
  activePaths: readonly string[];
  items: Entry[];
};
/**
 * Plan 100 Phase F step 52: Alt-mnemonic map for the top menu bar.
 * Each entry pairs the group id with the underlined letter index and the
 * Alt-triggered key. `AltMnemonicLayer` already toggles the `<u>` reveal
 * on Alt-hold; this map lets us render the underline at build time and
 * bind Alt+<letter> to open the matching Menubar trigger. Keys are
 * unique across groups so no two mnemonics collide.
 */
const GROUP_MNEMONIC: Record<MenuGroupIdType, { key: string; index: number }> = {
  [MenuGroupIdType.Home]: { key: "h", index: 0 },
  [MenuGroupIdType.Project]: { key: "p", index: 0 },
  [MenuGroupIdType.Setup]: { key: "u", index: 2 },
  [MenuGroupIdType.Rules]: { key: "r", index: 0 },
  [MenuGroupIdType.Test]: { key: "t", index: 0 },
  [MenuGroupIdType.Run]: { key: "n", index: 2 },
  [MenuGroupIdType.Settings]: { key: "s", index: 0 },
  [MenuGroupIdType.Help]: { key: "l", index: 2 },
};

function MnemonicLabel({ label, index }: { label: string; index: number }): ReactElement {
  const before = label.slice(0, index);
  const letter = label.charAt(index);
  const after = label.slice(index + 1);

  return (
    <span data-mnemonic>
      {before}
      <u>{letter}</u>
      {after}
    </span>
  );
}

/**
 * Plan 100 Phase F step 53: register each Alt+<letter> menu mnemonic
 * with the shortcut registry so ShortcutCheatSheet lists them under
 * "Menu bar" and dispatch flows through the single `ShortcutProvider`
 * window listener instead of a parallel one. Missing trigger nodes log
 * a warning with `{groupId, key}` so a menu that never mounted stays
 * visible in the console.
 */
function useAltMnemonicOpen(): void {
  useEffect(() => {
    const disposers = (Object.entries(GROUP_MNEMONIC) as [MenuGroupIdType, { key: string }][]).map(
      ([groupId, { key }]) => {
        const group = GROUPS.find((g) => g.id === groupId);
        const label = group ? `Open ${group.label} menu` : `Open ${groupId} menu`;

        return registerShortcut({
          id: `menubar.open.${groupId}`,
          scope: ShortcutScopeBaseType.Global,
          combo: `Alt+${key.toUpperCase()}`,
          label,
          group: "Menu bar",
          run: () => {
            const target = document.querySelector<HTMLElement>(`[data-group="${groupId}"]`);

            if (!target) {
              ClientLogger.warn("[top-menu mnemonic] trigger not mounted", { groupId, key });

              return;
            }

            target.click();
            target.focus();
            ClientLogger.info("[top-menu mnemonic] opened", { groupId, key });
          },
        });
      },
    );

    return () => {
      for (const dispose of disposers) dispose();
    };
  }, []);
}

type AppNavigate = ReturnType<typeof useNavigate>;

const MENU_COMMAND_EVENT = AppEvent.MenuCommand;

function isActionEntry(entry: Entry): entry is ActionEntry {
  return "action" in entry;
}

function hasShortcut(entry: Entry): entry is Entry & { shortcut: MenuShortcutType } {
  return entry.shortcut !== undefined;
}

function hasLockedState(entry: NavEntry, pathname: string, running: boolean): boolean {
  return running && entry.lockDuringRun === true && entry.to !== pathname;
}

function isGroupActive(group: MenuGroup, pathname: string): boolean {
  const hasHomePath = group.activePaths.includes("/");

  if (hasHomePath) return pathname === "/";

  return group.activePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isSetupEditorPath(pathname: string): boolean {
  return (
    pathname === "/setup" ||
    pathname === "/setup/roi" ||
    pathname === "/setup/reference" ||
    pathname === "/setup/rules" ||
    pathname.startsWith("/setup/rules/")
  );
}

function isRulesetEditorPath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);

  return parts.length === 4 && parts[0] === "projects" && parts[2] === "rulesets";
}

function isEditorPath(pathname: string): boolean {
  return isSetupEditorPath(pathname) || isRulesetEditorPath(pathname);
}

function activateMenuEntry(
  entry: Entry,
  navigate: AppNavigate,
  pathname: string,
  running: boolean,
): void {
  if (isActionEntry(entry)) {
    runMenuAction(entry.action);

    return;
  }

  if (hasLockedState(entry, pathname, running)) {
    ClientLogger.info("[top-menu] shortcut blocked while running", { to: entry.to });

    return;
  }

  void navigate({ to: entry.to, search: {} as any, params: {} as any });
}

function buildShortcutBindings(
  navigate: AppNavigate,
  pathname: string,
  running: boolean,
): MenuShortcutBinding[] {
  return GROUPS.flatMap((group) => group.items)
    .filter(hasShortcut)
    .map((entry) => ({
      shortcut: entry.shortcut,
      handler: () => activateMenuEntry(entry, navigate, pathname, running),
    }));
}

const GROUPS: MenuGroup[] = [
  {
    id: MenuGroupIdType.Home,
    label: "Home",
    activePaths: ["/"],
    items: [
      { to: MenuRouteType.Root, label: "Home hub" },
      { to: MenuRouteType.Projects, label: "Projects" },
      { to: MenuRouteType.Setup, label: "Setup", lockDuringRun: true },
      { to: MenuRouteType.TrialRun, label: "Trial run" },
      { to: MenuRouteType.AiTesting, label: "AI testing" },
      {
        action: "view.toggleStatusBar",
        label: "Toggle status bar",
        shortcut: MenuShortcutType.ToggleStatusBar,
      },
      {
        action: "view.toggleDensity",
        label: "Toggle header density",
        shortcut: MenuShortcutType.ToggleDensity,
      },
    ],
  },
  {
    id: MenuGroupIdType.Project,
    label: "Project",
    activePaths: ["/projects"],
    items: [
      { to: MenuRouteType.Projects, label: "Project browser" },
      { to: MenuRouteType.SetupRules, label: "Rule Sets", lockDuringRun: true },
      {
        to: MenuRouteType.Settings,
        label: "Project settings",
        shortcut: MenuShortcutType.Preferences,
        lockDuringRun: true,
      },
      { to: MenuRouteType.SettingsLicense, label: "License" },
    ],
  },
  {
    id: MenuGroupIdType.Setup,
    label: "Setup",
    // Only `/setup*` activates the Setup menu. Previously `/settings` was
    // listed here too, which lit up both the Setup and Settings menus on
    // any `/settings/*` route. Home has a single active group at a time
    // (`activePaths: ["/"]`); mirror that discipline here so every /setup
    // page shows exactly one active top-menu group.
    activePaths: ["/setup"],
    items: [
      { to: MenuRouteType.Setup, label: "Overview", lockDuringRun: true },
      { to: MenuRouteType.SetupRules, label: "Rule Sets", lockDuringRun: true },
      { to: MenuRouteType.SetupRoi, label: "ROI", lockDuringRun: true },
      { to: MenuRouteType.SetupReference, label: "Reference image", lockDuringRun: true },
      { to: MenuRouteType.SettingsCamera, label: "Camera", lockDuringRun: true },
      { to: MenuRouteType.SettingsTrigger, label: "Trigger", lockDuringRun: true },
      { to: MenuRouteType.SettingsLighting, label: "Lighting", lockDuringRun: true },
    ],
  },
  {
    id: MenuGroupIdType.Rules,
    label: "Rules",
    // Rules is a dropdown-only pivot; letting it claim /setup/rules et al.
    // meant two groups (Setup + Rules) lit up simultaneously on those
    // routes. Home's rule of one active group at a time applies: leave
    // Rules discoverable from the menu but not competing for the active
    // pill on /setup subroutes.
    activePaths: [],
    items: [
      { to: MenuRouteType.SetupRules, label: "Rules CRUD", lockDuringRun: true },
      { to: MenuRouteType.SetupRoi, label: "ROI rules", lockDuringRun: true },
      { to: MenuRouteType.SetupReference, label: "Reference rules", lockDuringRun: true },
      { to: MenuRouteType.Results, label: "Result review" },
      { to: MenuRouteType.Errors, label: "NG events" },
    ],
  },
  {
    id: MenuGroupIdType.Test,
    label: "Test",
    activePaths: ["/trial-run", "/ai-testing", "/results", "/errors"],
    items: [
      { to: MenuRouteType.TrialRun, label: "Trial run" },
      { to: MenuRouteType.AiTesting, label: "AI testing" },
      { to: MenuRouteType.Results, label: "Results" },
      { to: MenuRouteType.Errors, label: "NG events" },
    ],
  },
  {
    id: MenuGroupIdType.Run,
    label: "Run",
    activePaths: ["/run", "/ops"],
    items: [
      { to: MenuRouteType.Run, label: "Live run", shortcut: MenuShortcutType.LiveRun },
      { to: MenuRouteType.TrialRun, label: "Trial run" },
      { to: MenuRouteType.Results, label: "Run results" },
      { to: MenuRouteType.Ops, label: "Ops console" },
    ],
  },
  {
    id: MenuGroupIdType.Settings,
    label: "Settings",
    activePaths: ["/settings"],
    items: [
      {
        to: MenuRouteType.Settings,
        label: "All settings",
        shortcut: MenuShortcutType.Preferences,
        lockDuringRun: true,
      },
      { to: MenuRouteType.SettingsCamera, label: "Camera", lockDuringRun: true },
      { to: MenuRouteType.SettingsTrigger, label: "Trigger", lockDuringRun: true },
      { to: MenuRouteType.SettingsLighting, label: "Lighting", lockDuringRun: true },
      { to: MenuRouteType.SettingsLicense, label: "License" },
    ],
  },
  {
    id: MenuGroupIdType.Help,
    label: "Help",
    activePaths: [],
    items: [
      { action: "help.shortcuts", label: "Keyboard shortcuts" },
      { action: "help.docs", label: "Open documentation" },
      { action: "help.about", label: "About Control Automation" },
    ],
  },
];

export function TopMenuBar(): React.JSX.Element | null {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const running = useRunStore((s) => RunStatusType.isRunning(s.status));
  const isHydrated = useHydrated();
  const showWindowMenu = isEditorPath(pathname);
  // Plan 67 step 9: even on an editor route, hide Window entries until at
  // least one DockableFrame has mounted. Prevents dispatching toggles at
  // a moment when no panel host exists to react to them.
  const panelHostMounted = usePanelHostMounted();
  const showWindowMenuGated = showWindowMenu && panelHostMounted;
  const shortcutBindings = useMemo(
    () => buildShortcutBindings(navigate, pathname, running),
    [navigate, pathname, running],
  );
  useMenuShortcuts(shortcutBindings);
  useAltMnemonicOpen();

  // Hamburger-only nav: show a single trigger with the active section's
  // label; the full menu opens in a Sheet (was mobile-only, now global).
  const activeGroup = GROUPS.find((g) => isGroupActive(g, pathname));
  const activeLabel = activeGroup ? activeGroup.label : "Menu";

  return (
    <>
      <nav aria-label="Primary" className="contents">
        {running ? (
          <span
            role="status"
            aria-live="polite"
            aria-label="Inspection is currently running"
            className="ml-1 hidden items-center gap-1.5 rounded-full bg-ca-ok/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-ca-ok sm:flex"
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ca-ok animate-pulse" />
            Live
          </span>
        ) : null}

        <Menubar className="hidden border-none bg-transparent p-0 lg:flex">
          {GROUPS.map((group) => (
            <MenubarMenu key={group.id}>
              <MenuTriggerWithMnemonic group={group} groupActive={isGroupActive(group, pathname)} />
              <MenubarContent
                align="start"
                sideOffset={6}
                className="min-w-[14rem] border-ca-border bg-ca-panel p-1.5 text-ca-ink shadow-hmi-panel"
              >
                {group.items.map((item, idx) => {
                  const active = isActionEntry(item) === false && item.to === pathname;
                  const locked =
                    isActionEntry(item) === false &&
                    Boolean(running && item.lockDuringRun && !active);

                  return (
                    <MenubarItemRow
                      key={`item-${idx}`}
                      item={item}
                      active={active}
                      locked={locked}
                      isHydrated={isHydrated}
                    />
                  );
                })}
              </MenubarContent>
            </MenubarMenu>
          ))}
          {showWindowMenuGated ? <WindowMenubarGroup /> : null}
        </Menubar>
      </nav>
      <div className="lg:hidden">
        <MobileMenu
          navigate={navigate}
          pathname={pathname}
          running={running}
          showWindowMenu={showWindowMenuGated}
        />
      </div>
    </>
  );
}

/**
 * Plan 100 Phase F step 58: menubar trigger with `aria-keyshortcuts`
 * pulled from the shortcut registry so screen readers announce the
 * Alt+<letter> mnemonic alongside the visible underline.
 */
function MenuTriggerWithMnemonic({
  group,
  groupActive,
}: {
  group: MenuGroup;
  groupActive: boolean;
}): ReactElement {
  const aria = useAriaKeyshortcuts(`menubar.open.${group.id}`);

  return (
    <MenubarTrigger
      data-group={group.id}
      data-active={groupActive ? "true" : "false"}
      data-testid="topnav-trigger"
      aria-label={groupActive ? `${group.label} menu, current section` : `${group.label} menu`}
      aria-current={groupActive ? "page" : undefined}
      aria-keyshortcuts={aria}
      style={{ willChange: "background-color" }}
      className={`hmi-focus-ring-inset relative inline-flex h-6 shrink-0 items-center justify-center rounded-sm px-hmi-2 text-[12px] font-medium leading-none tracking-normal transition-colors duration-150 ease-out focus-visible:outline-none after:pointer-events-none after:absolute after:left-hmi-2 after:right-hmi-2 after:bottom-0 after:h-[2px] after:rounded-full after:bg-current after:opacity-0 after:transition-opacity after:duration-150 after:ease-out hover:after:opacity-60 data-[state=open]:after:opacity-100 data-[active=true]:after:opacity-100 ${
        groupActive
          ? "bg-ca-primary/15 text-ca-primary data-[state=open]:bg-ca-primary/20 data-[state=open]:text-ca-primary"
          : "text-ca-chrome-ink/75 hover:bg-ca-panel-2 hover:text-ca-chrome-ink data-[state=open]:bg-ca-panel-2 data-[state=open]:text-ca-chrome-ink"
      }`}
    >
      <MnemonicLabel label={group.label} index={GROUP_MNEMONIC[group.id].index} />
    </MenubarTrigger>
  );
}



function MobileMenu({
  pathname,
  running,
  showWindowMenu,
}: {
  navigate: AppNavigate;
  pathname: string;
  running: boolean;
  showWindowMenu: boolean;
}) {
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



function WindowMobileSection({ onClose }: { onClose: () => void }) {
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

function MenubarItemRow({
  item,
  active,
  locked,
  isHydrated,
}: {
  item: Entry;
  active: boolean;
  locked: boolean;
  isHydrated: boolean;
}) {
  const rowClass = `flex cursor-pointer items-center justify-between gap-4 rounded-md px-3 py-2 text-[0.9rem] ${
    active ? "bg-ca-primary/10 text-ca-primary" : "text-ca-ink hover:bg-ca-panel-2"
  }`;

  if (locked) {
    return (
      <MenubarItem
        disabled
        className="flex items-center justify-between gap-4 rounded-md px-3 py-2 text-[0.9rem] text-ca-ink-muted"
        title="Locked while running"
      >
        <span>{item.label}</span>
        <span className="text-[0.65rem] uppercase tracking-widest">locked</span>
      </MenubarItem>
    );
  }

  if (isActionEntry(item)) {
    return <MenubarActionRow item={item} isHydrated={isHydrated} />;
  }

  return (
    <MenubarItem asChild className={rowClass}>
      <Link
        to={item.to}
        search={{} as any}
        params={{} as any}
        preload="intent"
        data-item={item.to}
        aria-current={active ? "page" : undefined}
      >
        <span>{item.label}</span>
        {item.shortcut ? (
          <MenubarShortcut className="text-ca-ink-muted">{item.shortcut}</MenubarShortcut>
        ) : null}
      </Link>
    </MenubarItem>
  );
}

const ACTION_HANDLERS: Record<string, () => void> = {
  "edit.undo": () => dispatchMenuCommand("edit.undo"),
  "edit.redo": () => dispatchMenuCommand("edit.redo"),
  "edit.cut": () => dispatchMenuCommand("edit.cut"),
  "edit.copy": () => dispatchMenuCommand("edit.copy"),
  "edit.paste": () => dispatchMenuCommand("edit.paste"),
  "edit.delete": () => dispatchMenuCommand("edit.delete"),
  "view.zoomIn": () => dispatchMenuCommand("view.zoomIn"),
  "view.zoomOut": () => dispatchMenuCommand("view.zoomOut"),
  "view.fit": () => dispatchMenuCommand("view.fit"),
  "view.resetZoom": () => dispatchMenuCommand("view.resetZoom"),
  "view.toggleStatusBar": () => useUiPrefsStore.getState().toggleStatusBar(),
  "view.toggleDensity": () => useUiPrefsStore.getState().toggleHeaderDensity(),
  "view.toggleSidebar": () => dispatchMenuCommand("view.toggleSidebar"),
  "view.fullscreen": () => requestAppFullscreen(),
  "help.shortcuts": () => dispatchMenuCommand("help.shortcuts"),
  "help.docs": () => openHelpDocs(),
  "help.about": () => dispatchMenuCommand("help.about"),
};

function runMenuAction(action: string): void {
  const handler = ACTION_HANDLERS[action];

  if (handler === undefined) {
    ClientLogger.error("[top-menu] command handler missing", { action });

    return;
  }

  handler();
}

function dispatchMenuCommand(command: string): void {
  window.dispatchEvent(new CustomEvent(MENU_COMMAND_EVENT, { detail: { command } }));
  ClientLogger.info("[top-menu] command dispatched", { command });
}

function requestAppFullscreen(): void {
  const root = document.documentElement;
  root
    .requestFullscreen()
    .then(() => ClientLogger.info("[top-menu] fullscreen requested"))
    .catch((error: unknown) => ClientLogger.error("[top-menu] fullscreen failed", error));
}

function openHelpDocs(): void {
  window.open("https://docs.lovable.dev/", "_blank", "noopener,noreferrer");
  ClientLogger.info("[top-menu] help docs opened");
}

function MenubarActionRow({ item, isHydrated }: { item: ActionEntry; isHydrated: boolean }) {
  const rowClass =
    "flex cursor-pointer items-center justify-between gap-4 rounded-md px-3 py-2 text-[0.9rem] text-ca-ink hover:bg-ca-panel-2";
  const isFullscreen = item.action === "view.fullscreen";
  const isDisabled = isFullscreen && !isHydrated;

  return (
    <MenubarItem
      className={rowClass}
      disabled={isDisabled}
      onSelect={() => ACTION_HANDLERS[item.action]?.()}
      data-action={item.action}
    >
      <span>{item.label}</span>
      {item.shortcut ? (
        <MenubarShortcut className="text-ca-ink-muted">{item.shortcut}</MenubarShortcut>
      ) : null}
    </MenubarItem>
  );
}
