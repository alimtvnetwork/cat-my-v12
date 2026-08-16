import { ClientLogger } from "@/lib/observability/client-logger";
import { CommandIdType } from "@/lib/command-bus";
// Plan 86 Step 35: seeded empty-state action helper.
//
// Centralises the "seed CTA" pattern so every empty state routes through the
// orchestrator via the command bus (cmd:apply-seed-profile) instead of calling
// slice-specific seed code inline. Returns hardcoded fallbacks (or null) when
// no v2 seed profile is active, so callers can keep their existing copy.
import { useMemo } from "react";
import { useSeededEmptyState } from "@/lib/seed/useSeededSurfaces";
import { emitCommand, type CommandId, type CommandPayloads } from "@/lib/command-bus";
import { FROZEN_PROFILE_IDS } from "@/lib/seed/schemas-v2";
type FrozenProfileId = (typeof FROZEN_PROFILE_IDS)[number];

export interface SeededEmptyStateAction {
  readonly title: string | undefined;
  readonly body: string | undefined;
  readonly cta: {
    readonly label: string;
    readonly onClick: () => void;
    readonly testId: string;
  } | null;
}

/**
 * Read the seeded empty state for `surface` and, when it carries a
 * `ctaCommandId` + `ctaArgs`, return a click handler that dispatches through
 * the command bus. No fallback copy: callers keep their own defaults.
 */
export function useSeededEmptyStateAction(surface: string): SeededEmptyStateAction {
  const row = useSeededEmptyState(surface);

  return useMemo(() => {
    if (!row) return { title: undefined, body: undefined, cta: null };
    let cta: SeededEmptyStateAction["cta"] = null;

    if (row.ctaLabel && row.ctaCommandId) {
      const commandId = row.ctaCommandId as CommandId;
      const args = (row.ctaArgs ?? {}) as CommandPayloads[CommandId];
      cta = {
        label: row.ctaLabel,
        testId: `seed-cta-${row.id}`,
        onClick: () => {
          ClientLogger.info("[seeded-empty-cta] dispatch", { surface, commandId, args });
          try {
            emitCommand(commandId, args);
          } catch (err) {
            ClientLogger.error("[seeded-empty-cta] emit failed", { surface, commandId, err });
          }
        },
      };
    }

    return { title: row.title, body: row.body, cta };
  }, [row, surface]);
}

/** Convenience helper: dispatch a seed-profile apply from any callsite. */
export function applySeedProfileFromUi(profileId: FrozenProfileId): void {
  emitCommand(CommandIdType.CmdApplySeedProfile, { profileId });
}
