export enum SelectionModeType {
  Replace = "replace",
  Toggle = "toggle",
  Range = "range",
}

export namespace SelectionModeType {
  export function isReplace(val: string | null | undefined): boolean {
    return val === SelectionModeType.Replace;
  }
  export function isToggle(val: string | null | undefined): boolean {
    return val === SelectionModeType.Toggle;
  }
  export function isRange(val: string | null | undefined): boolean {
    return val === SelectionModeType.Range;
  }
}

export enum PresenceModeType {
  Present = "present",
  Absent = "absent",
  Ignore = "ignore",
}

export namespace PresenceModeType {
  export function isPresent(val: string | null | undefined): boolean {
    return val === PresenceModeType.Present;
  }
  export function isAbsent(val: string | null | undefined): boolean {
    return val === PresenceModeType.Absent;
  }
  export function isIgnore(val: string | null | undefined): boolean {
    return val === PresenceModeType.Ignore;
  }
}

export enum OcrMatchModeType {
  Exact = "exact",
  Contains = "contains",
  Regex = "regex",
  Fuzzy = "fuzzy",
}

export namespace OcrMatchModeType {
  export function isExact(val: string | null | undefined): boolean {
    return val === OcrMatchModeType.Exact;
  }
  export function isContains(val: string | null | undefined): boolean {
    return val === OcrMatchModeType.Contains;
  }
  export function isRegex(val: string | null | undefined): boolean {
    return val === OcrMatchModeType.Regex;
  }
  export function isFuzzy(val: string | null | undefined): boolean {
    return val === OcrMatchModeType.Fuzzy;
  }
}

export enum LayerSourceType {
  Path = "path",
  Polygon = "polygon",
  Polyline = "polyline",
  Rect = "rect",
}

export namespace LayerSourceType {
  export function isPath(val: string | null | undefined): boolean {
    return val === LayerSourceType.Path;
  }
  export function isPolygon(val: string | null | undefined): boolean {
    return val === LayerSourceType.Polygon;
  }
  export function isPolyline(val: string | null | undefined): boolean {
    return val === LayerSourceType.Polyline;
  }
  export function isRect(val: string | null | undefined): boolean {
    return val === LayerSourceType.Rect;
  }
}

export enum ToolType {
  Point = "point",
  Freehand = "freehand",
}

export namespace ToolType {
  export function isPoint(val: string | null | undefined): boolean {
    return val === ToolType.Point;
  }
  export function isFreehand(val: string | null | undefined): boolean {
    return val === ToolType.Freehand;
  }
}