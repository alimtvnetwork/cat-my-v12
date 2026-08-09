# SS-01 SettingsDialog adoption

Parent: 31-plan-02-remaining-hmi-primitives
Slug: settings-dialog-adoption
Status: done
Created: 2026-07-15
Completed: 2026-07-15
Evidence: acceptance.md (SS-01 rows), hardcoded-hits.md (no violations in settings.\*.tsx), notes-step-16 through notes-step-19.

Migrate settings.camera.tsx, settings.trigger.tsx, settings.lighting.tsx
to render their body inside the new hmi/SettingsDialog shell. Preserve
existing form fields and submit handlers; only the outer chrome, header,
and footer action bar move to the shared primitive. Ensure Escape closes
via router.history.back() and focus returns to invoker.
