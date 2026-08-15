// MicSettings sample seed.
//
// Populates the MicSettingsFacade (IndexedDB-backed) with three realistic
// presets when empty so operators can bind mic profiles to projects out of
// the box. Idempotent: no-op when the facade already has rows.

import { makeMicSettingsFacade } from "./facade";
import { MicSettingsIdSchema, type MicSettings } from "./model";

function iso(now: number, offset = 0): string {
  return new Date(now + offset).toISOString();
}

function preset(
  id: string,
  name: string,
  params: Record<string, unknown>,
  notes: string,
  now: number,
): MicSettings {
  return {
    id: MicSettingsIdSchema.parse(id),
    name,
    params,
    notes,
    createdAt: iso(now),
    updatedAt: iso(now),
  };
}

export async function autoSeedMicSettingsIfEmpty(): Promise<void> {
  if (typeof window === "undefined") return;
  const facade = makeMicSettingsFacade();
  await facade.__hydrate();

  if (facade.list().length > 0) return;
  const now = Date.now();
  const rows = [
    preset(
      "mic-seed-clean-room",
      "Clean room baseline",
      { gainDb: 6, noiseGate: -48, sampleRateHz: 48000, channels: 1 },
      "Baseline audio profile for cleanroom cell 3.",
      now,
    ),
    preset(
      "mic-seed-line-side",
      "Line-side ambient",
      { gainDb: 12, noiseGate: -36, sampleRateHz: 44100, channels: 2 },
      "Higher gain, dual-channel capture for line-side stations.",
      now,
    ),
    preset(
      "mic-seed-diagnostic",
      "Diagnostic capture",
      { gainDb: 0, noiseGate: -60, sampleRateHz: 96000, channels: 2, highPassHz: 80 },
      "High-fidelity diagnostic capture for anomaly reproduction.",
      now,
    ),
  ];
  for (const row of rows) {
    try {
      await facade.save(row);
    } catch (err) {
      console.warn("[mic-settings/seed] save failed", { id: row.id, err });
    }
  }

  console.info("[mic-settings/seed] seeded %d preset(s)", rows.length);
}
