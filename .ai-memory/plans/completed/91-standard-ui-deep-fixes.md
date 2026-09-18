# Plan 91: Standard UI Deep Fixes and Error Modals

## Objective

Fix the broken Standard Mode UI and enforce global error management as specified by the user verbatim: "the selections, windows in the standard mode, nothing is working very good. The UI is not flexible. I cannot, uh, resize the stuff on the right side panel... coloring of the buttons. It looks like faded. Uh, you should fix that button, especially the Cancel button... start like the grayscale version... no overlapping... everywhere there should be a error model."

## Root Cause Analysis

1. **Inflexible Layout:** The right side panel likely uses hardcoded `width` or `max-width` instead of CSS Grid/Flexbox with `resize: horizontal` or a resizable splitter component.
2. **Faded Buttons:** Button variants lack the correct grayscale contrast ratios. The `Cancel` button specifically uses a disabled or low-opacity state by default.
3. **Menu Overlapping:** Z-index or absolute positioning conflicts in the header menus.
4. **Missing Error Modals:** The application throws raw exceptions or swallows them without leveraging the `02-spec/03-error-manage` standardized error envelope and UI visualizer.

## Execution Strategy

We have divided this into exactly 100 detailed steps. Each step specifies the exact component, the root cause, and the actionable fix required by the agent.

- Steps 01-20: Right panel resizing and fluid layout enforcement.
- Steps 21-40: Menu overlapping and header z-index fixes.
- Steps 41-60: Grayscale button conversion (focusing on Cancel/OK).
- Steps 61-80: Global error modal wrappers for all interactive elements.
- Steps 81-100: Component clickability and test verification.
