export enum StandardActionLabel {
  OriginPoint = "Origin / Point",
  Display = "Display",
  RegisterImage = "Register Image",
  EvaluateRule = "Evaluate Rule",
  Settings = "Settings",
  Cancel = "Cancel",
  Ok = "OK",
}

export enum OcrFontFamilyType {
  StandardSans = "StandardSans",
  DotMatrix = "DotMatrix",
  OcrA = "OcrA",
  Custom = "Custom",
}

export namespace OcrFontFamilyType {
  export function isStandardSans(val: string | null | undefined): boolean {
    return val === OcrFontFamilyType.StandardSans;
  }
  export function isDotMatrix(val: string | null | undefined): boolean {
    return val === OcrFontFamilyType.DotMatrix;
  }
  export function isOcrA(val: string | null | undefined): boolean {
    return val === OcrFontFamilyType.OcrA;
  }
  export function isCustom(val: string | null | undefined): boolean {
    return val === OcrFontFamilyType.Custom;
  }
}

export const OCR_FONT_FAMILY_OPTIONS: readonly {
  readonly value: OcrFontFamilyType;
  readonly label: string;
}[] = [
  { value: OcrFontFamilyType.StandardSans, label: "Standard Alphanumeric Sans" },
  { value: OcrFontFamilyType.DotMatrix, label: "Dot Matrix Print" },
  { value: OcrFontFamilyType.OcrA, label: "OCR-A Standard" },
  { value: OcrFontFamilyType.Custom, label: "Custom Trained Font Dictionary" },
] as const;

export const OCR_DEFAULT_CHARACTER_COUNT = 8;
export const OCR_MIN_CHARACTER_COUNT = 1;
export const OCR_MAX_CHARACTER_COUNT = 64;
export const OCR_DEFAULT_EXPECTED_FORMAT = "^[A-Z0-9]{8}$";
export const OCR_DEFAULT_MIN_CONFIDENCE = 80;
export const OCR_MIN_CONFIDENCE_PERCENT = 0;
export const OCR_MAX_CONFIDENCE_PERCENT = 100;
