import React from "react";
import type { LightingState, LightingCapabilities } from "./LightingDrawer.types";

export interface HardwareLightingProps {
  value: LightingState;
  capabilities: LightingCapabilities;
  onChange: (patch: Partial<LightingState>) => void;
}

export function HardwareLighting({
  value,
  capabilities,
  onChange,
}: HardwareLightingProps): React.JSX.Element | null {
  if (!capabilities.hasFlashlight1 && !capabilities.hasFlashlight2) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 mt-1">
      <span className="text-xs text-ca-ink-muted">Hardware Lighting</span>
      <div className="flex gap-2">
        {capabilities.hasFlashlight1 && (
          <label className="flex items-center gap-1 text-sm text-ca-ink">
            <input
              type="checkbox"
              checked={value.isFlashlight1On}
              onChange={(e) => onChange({ isFlashlight1On: e.target.checked })}
              className="accent-ca-accent"
            />
            Flashlight 1
          </label>
        )}
        {capabilities.hasFlashlight2 && (
          <label className="flex items-center gap-1 text-sm text-ca-ink">
            <input
              type="checkbox"
              checked={value.isFlashlight2On}
              onChange={(e) => onChange({ isFlashlight2On: e.target.checked })}
              className="accent-ca-accent"
            />
            Flashlight 2
          </label>
        )}
      </div>
    </div>
  );
}
