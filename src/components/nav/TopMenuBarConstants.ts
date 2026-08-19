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
