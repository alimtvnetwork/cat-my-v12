// Plan 42 step 7. Enum for the per-rule condition family. Additional detail
// (Presence -> Present/Absent, Color -> Current/Dense2/Dense3/Picked) lives
// in the sibling enums PresenceModeType and ColorMode. No logic ships here.

export const ConditionType = {
  SameImage: "same-image",
  Presence: "presence",
  Color: "color",
} as const;

export type ConditionType = (typeof ConditionType)[keyof typeof ConditionType];

export const CONDITION_TYPE_LABEL: Readonly<Record<ConditionType, string>> = Object.freeze({
  [ConditionType.SameImage]: "Same image",
  [ConditionType.Presence]: "Presence",
  [ConditionType.Color]: "Color",
});

export const ALL_CONDITION_TYPES: readonly ConditionType[] = Object.freeze([
  ConditionType.SameImage,
  ConditionType.Presence,
  ConditionType.Color,
]);

export function isConditionType(value: unknown): value is ConditionType {
  return typeof value === "string" && (ALL_CONDITION_TYPES as readonly string[]).includes(value);
}
