# Specification 82: Menu Positioning and Hover Stability

## Root Cause Analysis: Menu Glitch & Left-Side Docking
1. **Clipping Container Conflict**:
   - `StandardAppShell.tsx` renders the header inside `<div data-app-shell-row="top" className="... flex-nowrap overflow-hidden">`.
   - Radix UI's Popper engine detects `overflow-hidden` on ancestor nodes.
   - When `avoidCollisions={true}` (the default), Popper attempts boundary evasion calculations. When colliding with the computed clipping box of the flex container, Popper shifts the floating element to coordinate `(0, 33px)`.
2. **Hover Jitter**:
   - The trigger button has Tailwind `transition-all hover:bg-ca-panel-2 hover:border-cyan-400/40`.
   - When the user's cursor hovers across the boundary, CSS transitions trigger re-layouts that cause Popper's `ResizeObserver` to re-measure mid-transition, producing flickering and jumps.

## Remediation Strategy
1. **Lock Anchoring**:
   - Specify `side="bottom"`, `align="start"`, `sideOffset={4}`, and `avoidCollisions={false}` on `<DropdownMenuContent>`.
   - Mount strictly through `DropdownMenuPrimitive.Portal` directly to `document.body` with fixed z-index (`z-[9999]`).
2. **Stable Hover & Click Behavior**:
   - Support both hover intent and click activation.
   - Provide a smooth mouseenter/mouseleave grace period so moving from trigger to menu does not drop state.
   - Strip unstable `transition-all` properties from the trigger element during open state.
