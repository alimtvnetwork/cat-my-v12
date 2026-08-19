export enum MenuRouteType {
  Root = "/",
  Projects = "/projects",
  Results = "/results",
  Errors = "/errors",
  Settings = "/settings",
  Setup = "/setup",
  SetupRules = "/setup/rules",
  SetupRoi = "/setup/roi",
  SetupReference = "/setup/reference",
  Run = "/run",
  TrialRun = "/trial-run",
  AiTesting = "/ai-testing",
  SettingsCamera = "/settings/camera",
  SettingsTrigger = "/settings/trigger",
  SettingsLighting = "/settings/lighting",
  SettingsLicense = "/settings/license",
  Ops = "/ops",
}

export type MenuRoute = MenuRouteType;

import { PANELS } from "@/lib/workspace/panel-registry";
import { useWorkspaceLayoutStore } from "@/lib/workspace/layout-slice";

export type PanelMap = ReturnType<typeof useWorkspaceLayoutStore.getState>["panels"];
export type PanelToggle = (id: string) => void;

export function toggleWindowPanel(
  id: string,
  panels: PanelMap,
  openPanel: PanelToggle,
  restorePanel: PanelToggle,
  togglePanel: PanelToggle,
): void {
  const state = panels[id];

  if (!state?.open) openPanel(id);
  else if (state.minimized) restorePanel(id);
  else togglePanel(id);
}

export function collapseFirstOpenPanel(panels: PanelMap, collapseOthers: PanelToggle): void {
  const firstOpen = PANELS.find((panel) => panels[panel.id]?.open && !panels[panel.id].minimized);

  if (firstOpen) collapseOthers(firstOpen.id);
}
