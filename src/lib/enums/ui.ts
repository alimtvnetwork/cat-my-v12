export enum DockSlotType {
  Top = "top",
  Left = "left",
  Right = "right",
  Bottom = "bottom",
  Floating = "floating",
  Hidden = "hidden",
}

export namespace DockSlotType {
  export function isTop(val: string | null | undefined): boolean {
    return val === DockSlotType.Top;
  }
  export function isLeft(val: string | null | undefined): boolean {
    return val === DockSlotType.Left;
  }
  export function isRight(val: string | null | undefined): boolean {
    return val === DockSlotType.Right;
  }
  export function isBottom(val: string | null | undefined): boolean {
    return val === DockSlotType.Bottom;
  }
  export function isFloating(val: string | null | undefined): boolean {
    return val === DockSlotType.Floating;
  }
  export function isHidden(val: string | null | undefined): boolean {
    return val === DockSlotType.Hidden;
  }
}

export enum PanelModeType {
  Dock = "dock",
  Float = "float",
  Min = "min",
  Hidden = "hidden",
}

export namespace PanelModeType {
  export function isDock(val: string | null | undefined): boolean {
    return val === PanelModeType.Dock;
  }
  export function isFloat(val: string | null | undefined): boolean {
    return val === PanelModeType.Float;
  }
  export function isMin(val: string | null | undefined): boolean {
    return val === PanelModeType.Min;
  }
  export function isHidden(val: string | null | undefined): boolean {
    return val === PanelModeType.Hidden;
  }
}

export enum StatusToneType {
  Success = "success",
  Warning = "warning",
  Destructive = "destructive",
  Info = "info",
  Muted = "muted",
}

export namespace StatusToneType {
  export function isSuccess(val: string | null | undefined): boolean {
    return val === StatusToneType.Success;
  }
  export function isWarning(val: string | null | undefined): boolean {
    return val === StatusToneType.Warning;
  }
  export function isDestructive(val: string | null | undefined): boolean {
    return val === StatusToneType.Destructive;
  }
  export function isInfo(val: string | null | undefined): boolean {
    return val === StatusToneType.Info;
  }
  export function isMuted(val: string | null | undefined): boolean {
    return val === StatusToneType.Muted;
  }
}

export enum WorkerStateType {
  Unknown = "unknown",
  Idle = "idle",
  Running = "running",
  Error = "error",
}

export namespace WorkerStateType {
  export function isUnknown(val: string | null | undefined): boolean {
    return val === WorkerStateType.Unknown;
  }
  export function isIdle(val: string | null | undefined): boolean {
    return val === WorkerStateType.Idle;
  }
  export function isRunning(val: string | null | undefined): boolean {
    return val === WorkerStateType.Running;
  }
  export function isError(val: string | null | undefined): boolean {
    return val === WorkerStateType.Error;
  }
}
