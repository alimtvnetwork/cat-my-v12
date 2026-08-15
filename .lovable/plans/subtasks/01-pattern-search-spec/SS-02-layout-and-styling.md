# SS-02-layout-and-styling

## 1. Goal
Implement the core visual system, CSS tokens, and layout shell for the Standard UI as specified in Section 2 and 3 of `.lovable/plans/pending/01-pattern-search-spec.md`.

## 2. Instructions
1. Review Sections 2, 3, and 9 of the spec.
2. In `src/styles.css` (or equivalent theme file), add the semantic design tokens for the Standard UI (e.g. `--std-chrome`, `--std-panel`, `--std-panel-header`, `--std-accent-active`, `--std-primary-action`, etc.). Do NOT use hardcoded colors.
3. Build the fixed-aspect 2-column controller panel layout in `src/components/vision/standard/StandardPatternSearch.tsx`.
   - Left column (~62%): black chrome.
   - Right column (~38%): light warm-grey panel body.
   - Bottom strip (full width): Action bar.
4. Implement the `StandardHeaderReadouts` component (top-left) with placeholder or initial state values for `Unit Time`, `Counts`, `Judged Label`, `Pos. X/Y`, `Angle`, and `Match %`.
5. Implement the `StandardActionBar` component (bottom strip) with placeholders for Register Image, Run, Settings, OK, and Cancel buttons, ensuring the styling perfectly matches the spec description (bevels, blue primary action, dark secondary buttons).

## 3. Strict Rules
- Do NOT use hardcoded hex values or utility color classes in components. Use semantic CSS variables.
- The UI must look like an industrial HMI (high density, 28px control height, 8px gutters, flat-with-bevel).
- Implement horizontal scrolling below ~1024px, rather than reflowing into a stack.
