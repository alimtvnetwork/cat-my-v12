// Plan 42 step 8. Presence-condition sub-mode enum.

import { PresenceModeType } from "@/lib/enums/editor";
export { PresenceModeType };

export const PRESENCE_MODE_LABEL: Readonly<Record<PresenceModeType, string>> = Object.freeze({
  [PresenceModeType.Present]: "Present",
  [PresenceModeType.Absent]: "Absent",
  [PresenceModeType.Ignore]: "Ignore",
});

export const ALL_PRESENCE_MODES: readonly PresenceModeType[] = Object.freeze([
  PresenceModeType.Present,
  PresenceModeType.Absent,
  PresenceModeType.Ignore,
]);

export function isPresenceMode(value: unknown): value is PresenceModeType {
  return typeof value === "string" && (ALL_PRESENCE_MODES as readonly string[]).includes(value);
}
