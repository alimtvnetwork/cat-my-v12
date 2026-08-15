# SS-01-domain-and-mode-switch

## 1. Goal
Implement the shared domain layer and UI mode switch as specified in section 1 of `.lovable/plans/pending/01-pattern-search-spec.md`.

## 2. Instructions
1. Review `.lovable/plans/pending/01-pattern-search-spec.md` Section 1.
2. Create `src/domain/vision/pattern-search.ts` providing the `PatternShape`, `MaskShape`, and `PatternSearchSettings` interfaces as well as the shape catalogues.
3. Update or create the `UiMode` context ("modern" | "standard") and the `<UiModeSwitch />` component.
4. Integrate the `<UiModeSwitch />` into the tool editor route (`/setup/rules/:id`) to branch presentation between `<ModernPatternSearch />` (existing) and a stubbed `<StandardPatternSearch />` component.
5. Create a basic `<StandardPatternSearch />` component shell in `src/components/vision/standard/StandardPatternSearch.tsx` that receives `settings` and `onChange` props exactly like the modern one.

## 3. Strict Rules
- The shared domain layer MUST be UI-agnostic and serve as the single source of truth for both UIs.
- Do NOT degrade the Modern UI; it must continue to function unchanged, eventually importing from this new shared layer.
- Switching between UIs mid-edit must preserve state with no data loss.
- Always use Enum keys with the `Type` suffix (e.g. `UiModeType`).
