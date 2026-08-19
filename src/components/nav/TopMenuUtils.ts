import { useNavigate } from "@tanstack/react-router";
import { ClientLogger } from "@/lib/observability/client-logger";
import { AppEvent } from "@/lib/constants";
import { MenuShortcutType } from "@/lib/enums/menu-shortcut-type";
import { type MenuShortcutBinding } from "@/hooks/useMenuShortcuts";
import type { NavEntry, ActionEntry, Entry, MenuGroup } from "./TopMenuBar";
import { ACTION_HANDLERS, GROUPS } from "./TopMenuBar";

const MENU_COMMAND_EVENT = AppEvent.MenuCommand;
type AppNavigate = ReturnType<typeof useNavigate>;

export function isActionEntry(entry: Entry): entry is ActionEntry {
  return "action" in entry;
}

export function hasShortcut(entry: Entry): entry is Entry & { shortcut: MenuShortcutType } {
  return entry.shortcut !== undefined;
}

export function hasLockedState(entry: NavEntry, pathname: string, running: boolean): boolean {
  return running && entry.lockDuringRun === true && entry.to !== pathname;
}

export function isGroupActive(group: MenuGroup, pathname: string): boolean {
  const hasHomePath = group.activePaths.includes("/");

  if (hasHomePath) return pathname === "/";

  return group.activePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function isSetupEditorPath(pathname: string): boolean {
  return (
    pathname === "/setup" ||
    pathname === "/setup/roi" ||
    pathname === "/setup/reference" ||
    pathname === "/setup/rules" ||
    pathname.startsWith("/setup/rules/")
  );
}

export function isRulesetEditorPath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);

  return parts.length === 4 && parts[0] === "projects" && parts[2] === "rulesets";
}

export function isEditorPath(pathname: string): boolean {
  return isSetupEditorPath(pathname) || isRulesetEditorPath(pathname);
}

export function activateMenuEntry(
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

export function buildShortcutBindings(
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

export function runMenuAction(action: string): void {
  const handler = ACTION_HANDLERS[action];

  if (handler === undefined) {
    ClientLogger.error("[top-menu] command handler missing", { action });

    return;
  }

  handler();
}

export function dispatchMenuCommand(command: string): void {
  window.dispatchEvent(new CustomEvent(MENU_COMMAND_EVENT, { detail: { command } }));
  ClientLogger.info("[top-menu] command dispatched", { command });
}

export function requestAppFullscreen(): void {
  const root = document.documentElement;
  root
    .requestFullscreen()
    .then(() => ClientLogger.info("[top-menu] fullscreen requested"))
    .catch((error: unknown) => ClientLogger.error("[top-menu] fullscreen failed", error));
}

export function openHelpDocs(): void {
  window.open("https://docs.lovable.dev/", "_blank", "noopener,noreferrer");
  ClientLogger.info("[top-menu] help docs opened");
}
