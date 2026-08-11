export enum MenuShortcutType {
  NewJob = "Ctrl+N",
  OpenJob = "Ctrl+O",
  Save = "Ctrl+S",
  SaveAs = "Ctrl+Shift+S",
  Undo = "Ctrl+Z",
  Redo = "Ctrl+Y",
  Cut = "Ctrl+X",
  Copy = "Ctrl+C",
  Paste = "Ctrl+V",
  Delete = "Del",
  Preferences = "Ctrl+,",
  LiveRun = "R",
  ZoomIn = "Ctrl++",
  ZoomOut = "Ctrl+-",
  Fit = "Ctrl+0",
  ResetZoom = "Ctrl+1",
  Fullscreen = "F11",
  Quit = "Ctrl+Q",
  CommandPalette = "Ctrl+K",
  ToggleStatusBar = "Ctrl+/",
  ToggleDensity = "Ctrl+Shift+D",
}

export namespace MenuShortcutType {
  export function isNewJob(val: string | null | undefined): boolean {
    return val === MenuShortcutType.NewJob;
  }
  export function isOpenJob(val: string | null | undefined): boolean {
    return val === MenuShortcutType.OpenJob;
  }
  export function isSave(val: string | null | undefined): boolean {
    return val === MenuShortcutType.Save;
  }
  export function isSaveAs(val: string | null | undefined): boolean {
    return val === MenuShortcutType.SaveAs;
  }
  export function isUndo(val: string | null | undefined): boolean {
    return val === MenuShortcutType.Undo;
  }
  export function isRedo(val: string | null | undefined): boolean {
    return val === MenuShortcutType.Redo;
  }
  export function isCut(val: string | null | undefined): boolean {
    return val === MenuShortcutType.Cut;
  }
  export function isCopy(val: string | null | undefined): boolean {
    return val === MenuShortcutType.Copy;
  }
  export function isPaste(val: string | null | undefined): boolean {
    return val === MenuShortcutType.Paste;
  }
  export function isDelete(val: string | null | undefined): boolean {
    return val === MenuShortcutType.Delete;
  }
  export function isPreferences(val: string | null | undefined): boolean {
    return val === MenuShortcutType.Preferences;
  }
  export function isLiveRun(val: string | null | undefined): boolean {
    return val === MenuShortcutType.LiveRun;
  }
  export function isZoomIn(val: string | null | undefined): boolean {
    return val === MenuShortcutType.ZoomIn;
  }
  export function isZoomOut(val: string | null | undefined): boolean {
    return val === MenuShortcutType.ZoomOut;
  }
  export function isFit(val: string | null | undefined): boolean {
    return val === MenuShortcutType.Fit;
  }
  export function isResetZoom(val: string | null | undefined): boolean {
    return val === MenuShortcutType.ResetZoom;
  }
  export function isFullscreen(val: string | null | undefined): boolean {
    return val === MenuShortcutType.Fullscreen;
  }
  export function isQuit(val: string | null | undefined): boolean {
    return val === MenuShortcutType.Quit;
  }
  export function isCommandPalette(val: string | null | undefined): boolean {
    return val === MenuShortcutType.CommandPalette;
  }
  export function isToggleStatusBar(val: string | null | undefined): boolean {
    return val === MenuShortcutType.ToggleStatusBar;
  }
  export function isToggleDensity(val: string | null | undefined): boolean {
    return val === MenuShortcutType.ToggleDensity;
  }
}