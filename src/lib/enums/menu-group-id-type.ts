export enum MenuGroupIdType {
  Home = "home",
  Project = "project",
  Setup = "setup",
  Rules = "rules",
  Test = "test",
  Run = "run",
  Settings = "settings",
  Help = "help",
}

export namespace MenuGroupIdType {
  export function isHome(val: string | null | undefined): boolean {
    return val === MenuGroupIdType.Home;
  }
  export function isProject(val: string | null | undefined): boolean {
    return val === MenuGroupIdType.Project;
  }
  export function isSetup(val: string | null | undefined): boolean {
    return val === MenuGroupIdType.Setup;
  }
  export function isRules(val: string | null | undefined): boolean {
    return val === MenuGroupIdType.Rules;
  }
  export function isTest(val: string | null | undefined): boolean {
    return val === MenuGroupIdType.Test;
  }
  export function isRun(val: string | null | undefined): boolean {
    return val === MenuGroupIdType.Run;
  }
  export function isSettings(val: string | null | undefined): boolean {
    return val === MenuGroupIdType.Settings;
  }
  export function isHelp(val: string | null | undefined): boolean {
    return val === MenuGroupIdType.Help;
  }
}
