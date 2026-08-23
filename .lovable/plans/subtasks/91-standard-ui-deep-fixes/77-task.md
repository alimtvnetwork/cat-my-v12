# Subtask 77: Global Error Modal Integration Part 17

## Issue Description
User reported: "I cannot resize the stuff on the right side panel. Everything looks like just there, but it does not work. I cannot click stuff. Things are broken. And the most important part is the coloring of the buttons."

## Root Cause Analysis
Silent failures exist because actions do not wrap their API calls or state mutations in the spec/03-error-manage envelope.

## Required Action (What to Fix)
Wrap the assigned component's actions in `apperror.Wrap()` or the frontend equivalent. Trigger the global Error Modal on failure. Never swallow errors.
- Component Target: Component chunk #77
- Strict Rules: Apply <= 15 lines per function, no nested if statements, and ensure boolean variables use positive prefixes (is/has).

## Instructions for Agent
1. Read `spec/03-error-manage` for error architecture.
2. Isolate the target component code.
3. Apply the fix as described in 'Required Action'.
4. Commit your changes locally.
