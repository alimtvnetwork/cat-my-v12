import { useEffect, useRef } from "react";

/**
 * Header anchor that the floating <RunningPill> portals into when docked.
 * The slot only reserves layout space and exposes a stable DOM node.
 * Wiring to the pill lands in Plan 64 step 65.
 * See spec/24-app-ui-design-system/42-drag-drop-running-pill.md.
 */
export const RUNNING_PILL_SLOT_ID = "app-shell-running-pill-slot";

export function RunningPillSlot(): React.JSX.Element | null {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // Broadcast so the RunningPill can find this slot without prop drilling.
    if (ref.current) {
      window.dispatchEvent(
        new CustomEvent("running-pill:slot-ready", {
          detail: { id: RUNNING_PILL_SLOT_ID },
        }),
      );
    }
  }, []);

  return (
    <div
      ref={ref}
      id={RUNNING_PILL_SLOT_ID}
      data-slot="running-pill"
      className="flex items-center"
      aria-label="Running operations"
      style={{ minWidth: 0 }}
    />
  );
}
