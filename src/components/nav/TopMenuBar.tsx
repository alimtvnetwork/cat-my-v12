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
import { WindowMenubarGroup } from "./WindowMenubarGroup";
import {
  isActionEntry,
  isGroupActive,
  isEditorPath,
  buildShortcutBindings,
  dispatchMenuCommand,
  requestAppFullscreen,
  openHelpDocs,
} from "./TopMenuUtils";
import { PANELS } from "@/lib/workspace/panel-registry";
import { useWorkspaceLayoutStore } from "@/lib/workspace/layout-slice";
import { usePanelHostMounted } from "@/lib/workspace/panel-host-registry";

import { MenuRouteType, type MenuRoute, toggleWindowPanel, collapseFirstOpenPanel } from "./TopMenuBarConstants";
import { MobileMenu } from "./TopMenuMobile";
import { MenubarItemRow } from "./TopMenuRows";
import { TopMenuGroup } from "./TopMenuGroup";

export type NavEntry = {
  to: MenuRoute;
  label: string;
  shortcut?: MenuShortcutType;
  lockDuringRun?: boolean;
};
export type ActionEntry = { action: string; label: string; shortcut?: MenuShortcutType };
export type Entry = NavEntry | ActionEntry;
export type MenuGroup = {
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



export const GROUPS: MenuGroup[] = [
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
            <TopMenuGroup
              key={group.id}
              group={group}
              pathname={pathname}
              running={running}
              isHydrated={isHydrated}
            />
          ))}
          {showWindowMenuGated ? <WindowMenubarGroup /> : null}
        </Menubar>
      </nav>
      <div className="lg:hidden">
        <MobileMenu
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
export function MenuTriggerWithMnemonic({
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







