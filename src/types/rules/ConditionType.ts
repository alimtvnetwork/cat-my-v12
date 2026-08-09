// Plan 42 step 7. Enum for the per-rule condition family. Additional detail
// (Presence -> Present/Absent, Color -> Current/Dense2/Dense3/Picked) lives
// in the sibling enums PresenceModeType and ColorModeType. No logic ships here.

export enum ConditionTypeType {
  SameImage = "same-image",
  Presence = "presence",
  Color = "color",
}

export const CONDITION_TYPE_LABEL: Readonly<Record<ConditionTypeType, string>> = Object.freeze({
  [ConditionTypeType.SameImage]: "Same image",
  [ConditionTypeType.Presence]: "Presence",
  [ConditionTypeType.Color]: "Color",
});

export const ALL_CONDITION_TYPES: readonly ConditionTypeType[] = Object.freeze([
  ConditionTypeType.SameImage,
  ConditionTypeType.Presence,
  ConditionTypeType.Color,
]);

export function isConditionTypeType(value: unknown): value is ConditionTypeType {
  return typeof value === "string" && (ALL_CONDITION_TYPES as readonly string[]).includes(value);
}
