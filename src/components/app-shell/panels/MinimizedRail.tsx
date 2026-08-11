/**
 * Plan 65 step 14: MinimizedRail.
 *
 * A 40px thin strip that collects minimized panels for one dock as icon
 * buttons. Click a button to restore the panel via
 * `restorePanel(id)`. The rail is vertical for `left` / `right` docks and
 * horizontal for the `top` / `bottom` docks; width / height comes from
 * `--panel-dock-rail` in `src/styles.css` so no px literal lives here.
 *
 * Panel components do not yet expose an icon in the registry, so we fall
 * back to the first uppercased letter of the title. That is deterministic
 * and keeps this file free of new registry churn.
 */

import * as React from "react";
import { DockSlotType } from "@/lib/enums/ui";
import { cn } from "@/lib/utils";
import { getPanel } from "@/lib/workspace/panel-registry";

export enum MinimizedRailOrientationType {
  Vertical = "vertical",
  Horizontal = "horizontal",
}
export type MinimizedRailOrientation = MinimizedRailOrientationType;

export interface MinimizedRailProps {
  slot: Exclude<DockSlotType, DockSlotType.Hidden | DockSlotType.Floating>;
  ids: readonly string[];
  onRestore: (id: string) => void;
}

function orientationFor(slot: MinimizedRailProps["slot"]): MinimizedRailOrientation {

  return DockSlotType.isTop(slot) || DockSlotType.isBottom(slot)
    ? MinimizedRailOrientationType.Horizontal
    : MinimizedRailOrientationType.Vertical;
}

function initialFor(title: string): string {
  const trimmed = title.trim();

  if (trimmed.length === 0) return "?";

  return trimmed.charAt(0).toUpperCase();
}

export function MinimizedRail({ slot, ids, onRestore }: MinimizedRailProps) {
  if (ids.length === 0) return null;
  const orientation = orientationFor(slot);

  return (
    <div
      data-testid={`minimized-rail-${slot}`}
      data-orientation={orientation}
      className={cn(
        "panel-dock-rail",
        orientation === "horizontal" && "panel-dock-rail-horizontal",
      )}
      role="toolbar"
      aria-label={`Minimized panels (${slot} dock)`}
    >
      {ids.map((id) => {
        const def = getPanel(id);

        if (def === undefined) return null;

        return (
          <button
            key={id}
            type="button"
            aria-label={`Restore ${def.title}`}
            title={`Restore ${def.title}`}
            data-testid={`minimized-rail-${slot}-${id}`}
            onClick={() => onRestore(id)}
            className="panel-dock-rail-btn"
          >
            <span aria-hidden>{initialFor(def.title)}</span>
          </button>
        );
      })}
    </div>
  );
}
