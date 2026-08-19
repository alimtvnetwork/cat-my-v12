import { PresenceModeType } from "@/lib/enums/editor";
import type { EditorRule, EditorRuleParams } from "@/lib/editor/types";

export interface AcceptanceCondition {
  id: string;
  presence: PresenceModeType;
  targetColor: string;
  similarityPct: number;
}

export function readConditions(rule: EditorRule): AcceptanceCondition[] {
  const p = rule.params ?? {};
  const raw = typeof p.acceptanceConditions === "string" ? p.acceptanceConditions : "";

  if (raw) {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed))
        return parsed.map(normalize).filter(Boolean) as AcceptanceCondition[];
    } catch {
      // fall through to legacy migration
    }
  }
  // Legacy single-condition migration. Two historical shapes exist:
  //   1. `acceptancePresence: "present" | "absent" | "ignore"` (later flat form)
  //   2. `acceptanceAbsence: boolean` (older form, true meant "must be absent")
  // Either one, plus the flat targetColor / similarity fields, maps to a
  // single-condition list.
  const legacyPresenceStr = typeof p.acceptancePresence === "string" ? p.acceptancePresence : null;
  const legacyAbsenceBool = typeof p.acceptanceAbsence === "boolean" ? p.acceptanceAbsence : null;
  const hasLegacy =
    legacyPresenceStr !== null ||
    legacyAbsenceBool !== null ||
    typeof p.acceptanceTargetColor === "string" ||
    typeof p.acceptanceSimilarityPct === "number";

  if (!hasLegacy) return [];
  // Explicit presence string wins; otherwise derive from the boolean.
  const presence: PresenceModeType =
    legacyPresenceStr !== null
      ? coercePresence(legacyPresenceStr)
      : legacyAbsenceBool === true
        ? PresenceModeType.Absent
        : legacyAbsenceBool === false
          ? PresenceModeType.Present
          : PresenceModeType.Ignore;

  return [
    {
      id: freshId(),
      presence,
      targetColor: typeof p.acceptanceTargetColor === "string" ? p.acceptanceTargetColor : "",
      similarityPct: clampPct(
        typeof p.acceptanceSimilarityPct === "number" ? p.acceptanceSimilarityPct : 80,
      ),
    },
  ];
}

export function writeConditions(rule: EditorRule, next: AcceptanceCondition[]): EditorRuleParams {
  const first = next[0];

  return {
    ...(rule.params ?? {}),
    acceptanceConditions: JSON.stringify(next),
    // Mirror the first condition into every legacy flat field so backends
    // still on the old contract keep working. `acceptanceAbsence` is the
    // pre-`acceptancePresence` boolean shape: true iff the primary
    // condition marks the target as "must be absent".
    acceptancePresence: first ? first.presence : PresenceModeType.Ignore,
    acceptanceAbsence: first ? PresenceModeType.isAbsent(first.presence) : false,
    acceptanceTargetColor: first ? first.targetColor : "",
    acceptanceSimilarityPct: first ? first.similarityPct : 80,
  };
}

export function coercePresence(v: unknown): PresenceModeType {
  const val = v as string | null | undefined;

  return PresenceModeType.isPresent(val) || PresenceModeType.isAbsent(val)
    ? (v as PresenceModeType)
    : PresenceModeType.Ignore;
}

export function normalize(raw: unknown): AcceptanceCondition | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  return {
    id: typeof r.id === "string" && r.id ? r.id : freshId(),
    presence: coercePresence(r.presence),
    targetColor: typeof r.targetColor === "string" ? r.targetColor : "",
    similarityPct: clampPct(typeof r.similarityPct === "number" ? r.similarityPct : 80),
  };
}

export function freshId(): string {
  return `ac-${Math.random().toString(36).slice(2, 10)}`;
}

export function clampPct(n: number): number {
  if (Number.isFinite(n) === false) return 0;

  if (n < 0) return 0;

  if (n > 100) return 100;

  return Math.round(n);
}
