// Plan 41 step 8. Rule color constants moved from SelectionOverlay.tsx

export enum RuleColorType {
  Default = "Default",
  Green = "Green",
  Blue = "Blue",
  Cyan = "Cyan",
  Amber = "Amber",
  Magenta = "Magenta",
  Black = "Black",
}

export const RULE_COLOR_LABEL: Readonly<Record<RuleColorType, string>> = Object.freeze({
  [RuleColorType.Default]: "Default (green)",
  [RuleColorType.Green]: "Green",
  [RuleColorType.Blue]: "Blue",
  [RuleColorType.Cyan]: "Cyan",
  [RuleColorType.Amber]: "Amber",
  [RuleColorType.Magenta]: "Magenta",
  [RuleColorType.Black]: "Black",
});

export const RULE_COLOR_HEX: Readonly<Record<RuleColorType, string | null>> = Object.freeze({
  [RuleColorType.Default]: null,
  [RuleColorType.Green]: "#22c55e",
  [RuleColorType.Blue]: "#3b82f6",
  [RuleColorType.Cyan]: "#06b6d4",
  [RuleColorType.Amber]: "#f59e0b",
  [RuleColorType.Magenta]: "#ec4899",
  [RuleColorType.Black]: "#111827",
});

export const COLOR_SWATCHES: readonly { id: RuleColorType; label: string; value: string | null }[] =
  [
    {
      id: RuleColorType.Default,
      label: RULE_COLOR_LABEL[RuleColorType.Default],
      value: RULE_COLOR_HEX[RuleColorType.Default],
    },
    {
      id: RuleColorType.Green,
      label: RULE_COLOR_LABEL[RuleColorType.Green],
      value: RULE_COLOR_HEX[RuleColorType.Green],
    },
    {
      id: RuleColorType.Blue,
      label: RULE_COLOR_LABEL[RuleColorType.Blue],
      value: RULE_COLOR_HEX[RuleColorType.Blue],
    },
    {
      id: RuleColorType.Cyan,
      label: RULE_COLOR_LABEL[RuleColorType.Cyan],
      value: RULE_COLOR_HEX[RuleColorType.Cyan],
    },
    {
      id: RuleColorType.Amber,
      label: RULE_COLOR_LABEL[RuleColorType.Amber],
      value: RULE_COLOR_HEX[RuleColorType.Amber],
    },
    {
      id: RuleColorType.Magenta,
      label: RULE_COLOR_LABEL[RuleColorType.Magenta],
      value: RULE_COLOR_HEX[RuleColorType.Magenta],
    },
    {
      id: RuleColorType.Black,
      label: RULE_COLOR_LABEL[RuleColorType.Black],
      value: RULE_COLOR_HEX[RuleColorType.Black],
    },
  ];

export namespace RuleColorType {
  export function isDefault(val: string | null | undefined): boolean {
    return val === RuleColorType.Default;
  }
  export function isGreen(val: string | null | undefined): boolean {
    return val === RuleColorType.Green;
  }
  export function isBlue(val: string | null | undefined): boolean {
    return val === RuleColorType.Blue;
  }
  export function isCyan(val: string | null | undefined): boolean {
    return val === RuleColorType.Cyan;
  }
  export function isAmber(val: string | null | undefined): boolean {
    return val === RuleColorType.Amber;
  }
  export function isMagenta(val: string | null | undefined): boolean {
    return val === RuleColorType.Magenta;
  }
  export function isBlack(val: string | null | undefined): boolean {
    return val === RuleColorType.Black;
  }
}
