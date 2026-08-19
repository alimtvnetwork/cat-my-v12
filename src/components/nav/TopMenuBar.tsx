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
import { useAltMnemonicOpen } from "./TopMenuMnemonics";
export { MenuTriggerWithMnemonic, GROUP_MNEMONIC, MnemonicLabel } from "./TopMenuMnemonics";



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









