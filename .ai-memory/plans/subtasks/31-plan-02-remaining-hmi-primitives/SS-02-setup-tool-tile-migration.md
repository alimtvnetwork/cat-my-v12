# SS-02 Setup tool tile migration

Parent: 31-plan-02-remaining-hmi-primitives
Slug: setup-tool-tile-migration
Status: done
Created: 2026-07-15
Completed: 2026-07-15
Evidence: acceptance.md (SS-02 rows), hardcoded-hits.md (no violations in setup.tsx / ToolTile), notes-step-20 through notes-step-25, step-31 Playwright snapshot artifacts/setup.png.

Replace ad-hoc tool tile buttons in src/routes/setup.tsx with the shared
hmi/ToolTile primitive. Preserve selection state binding, keyboard
navigation, and disabled tile aria-hidden treatment (spec/24 evidence
notes for /setup axe fix). Verify no opacity-40 leaks that drop muted
text contrast below 4.5:1.
