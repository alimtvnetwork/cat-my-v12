# SS-03 tools collapse chevron

Slug: tools-chevron
Parent: 73-ui-issues-closeout-sweep
Status: pending
Created: 2026-07-18

## Scope

Issue 20: Tools dock chevron looks unprofessional (raw arrow char, no hover, no focus ring, wrong size).

## Steps

1. Locate the chevron in the Tools dock per `panel-registry.ts`.
2. Replace with `lucide-react` `ChevronLeft` / `ChevronRight` at 16px inside an icon button with `hover:bg-ca-panel-2`, `focus-visible:ring-2 focus-visible:ring-ca-accent`, and `aria-label` for both states.
3. Animate rotate on state toggle via `transition-transform`.

## Verification

- Visual snapshot under `tests/visual/` shows the new button.
- Keyboard tab reaches the toggle and Enter fires it.
