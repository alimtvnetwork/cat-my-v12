# Write Memory V3 Execution & UI Fixes

## Session Summary

- **Completed Tasks:**
  - Resolved UI issues documented in `src/assets/issues/ui-breakages.md`:
    - Hidden `GlobalCliStatusWidget` when unavailable to remove "CLI unknown" error state.
    - Brought back the `WindowMenu` and `FlavorToggle` to the global nav / shell header.
    - Removed duplicate `Setup` navigation menus using tailwind `lg:hidden` and `lg:block` classes to differentiate between the global top nav (desktop) and drawer sidebar (compact screens).
    - Fixed flex overflows in `RecipeEditor.tsx` and `SegmentSelector.tsx` for compact screens by wrapping elements appropriately with `flex-wrap` and `sm:flex-row`.
    - Professionalised the layer styling for Channels and Paths in `LayersPalette.tsx` by using a custom tabular-nums badge layout.

## Learned Behaviors & Rules

- **User Preferences:**
  - The user prefers a "self-looping" execution style when running through large checklists. The user's directive is that they will type "next" or "Continue", and the AI should continue self-executing the plan consecutively unless it encounters a breakage or explicitly requires input.
  - "DRY is the highest priority."
  - "Everything on screen must exist."
  - "Avoid stupidity [bad code with too many conditions]; follow the coding guideline."
  - "The layer numbers are not very professional in the modern screen" (solved by adding badge styles).
