export interface LightingState {
  exposureMs: number; // LC-01: 0.1..100
  gainDb: number; // LC-02: 0..24
  whiteBalanceK: number; // LC-03: 2500..10000
  programPreset: string; // LC-06: named preset id, "" = custom
  isFlashlight1On: boolean;
  isFlashlight2On: boolean;
}

export interface LightingCapabilities {
  exposure: boolean;
  gain: boolean;
  whiteBalance: boolean;
  programPresets: readonly string[];
  hasFlashlight1: boolean;
  hasFlashlight2: boolean;
}

export interface LightingDrawerProps {
  value: LightingState;
  capabilities: LightingCapabilities;
  onChange: (patch: Partial<LightingState>) => void;
  onApply: (value: LightingState) => void; // LC-07 apply, emits I_CAM_LIGHTING_APPLIED
  onSavePreset: (name: string) => void; // LC-12 preset persistence
  disabled?: boolean; // LC-09 unavailable camera
}

export const RANGES = {
  exposureMs: { min: 0.1, max: 100, step: 0.1 },
  gainDb: { min: 0, max: 24, step: 0.5 },
  whiteBalanceK: { min: 2500, max: 10000, step: 50 },
} as const;
