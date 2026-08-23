# Subtask 39: Menu Overlapping and Header Z-Index Part 19

## Issue Description
User reported: "I cannot resize the stuff on the right side panel. Everything looks like just there, but it does not work. I cannot click stuff. Things are broken. And the most important part is the coloring of the buttons."

## Root Cause Analysis
Dropdown menus in the standard mode have conflicting z-indexes or lack absolute positioning isolation, causing them to clip under the canvas.

## Required Action (What to Fix)
Audit header drop-downs. Apply a strict z-index scale (e.g., z-50 for menus). Ensure popper/floating UI libraries are anchored correctly to the bounding box.
- Component Target: Component chunk #39
- Strict Rules: Apply <= 15 lines per function, no nested if statements, and ensure boolean variables use positive prefixes (is/has).

## Instructions for Agent
1. Read `spec/03-error-manage` for error architecture.
2. Isolate the target component code.
3. Apply the fix as described in 'Required Action'.
4. Commit your changes locally.
