// Plan 100 Phase E step 25: kind-aware Properties palette routing.
//
// Root cause the map fixes, in one sentence: `PropertiesPalette` exposed
// all 10 panes for every ROI kind, so freehand-only ("brush") and
// text-overlay panes ("type", "paragraph") sat active even when the
// selected shape could never use them, leading users to open dead
// palettes instead of the panes that actually drive their kind.
//
// Contract:
// - `sharedKind === null` means no selection OR mixed-kind selection. In
//   both cases we treat every pane as applicable so the palette stays
//   fully browsable.
// - When a single-kind selection is active, panes not listed in
//   `APPLICABLE_KINDS` for that pane are considered inapplicable and the
//   caller renders them as visually disabled (still discoverable, but
//   `aria-disabled` + no-op click) so layout / tile positions stay
//   stable across selections.
import { EditorRuleKindType, type EditorRule } from "@/lib/editor/types";
import type { PropertyPaletteId } from "@/components/rules/PropertiesPalette";

type Kind = EditorRule["kind"];

// Whitelist per pane. Panes with `null` mean "applicable to every kind".
const APPLICABLE_KINDS: Record<PropertyPaletteId, ReadonlySet<Kind> | null> = {
  info: null,
  history: null,
  adjust: null,
  grid: new Set<Kind>([EditorRuleKindType.C, EditorRuleKindType.R, EditorRuleKindType.K]),
  brush: new Set<Kind>([]), // freehand-only; no current kind uses it
  layers: null,
  type: new Set<Kind>([]), // text-overlay only
  paragraph: new Set<Kind>([]),
  css: null,
  image: null,
};

export function isPaletteApplicable(id: PropertyPaletteId, sharedKind: Kind | null): boolean {
  if (sharedKind == null) return true;
  const allowed = APPLICABLE_KINDS[id];

  if (allowed == null) return true;

  return allowed.has(sharedKind);
}

/**
 * Nearest applicable pane fallback. When the currently-open pane becomes
 * inapplicable after a selection change, callers use this to land on
 * `info` (always applicable) instead of leaving a disabled pane open.
 */
export function fallbackPaletteFor(sharedKind: Kind | null): PropertyPaletteId {
  // `info` is unconditionally applicable per the whitelist above.
  void sharedKind;

  return "info";
}
