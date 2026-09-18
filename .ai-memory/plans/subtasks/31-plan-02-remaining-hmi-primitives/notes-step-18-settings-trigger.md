# Step 18: settings.trigger adopts SettingsDialog

Root cause: `src/routes/settings.trigger.tsx` rendered a bare div under `HmiShell`, missing the SS-01 dialog chrome (header, description, Escape close).

Files read: `src/routes/settings.trigger.tsx`, `src/components/hmi/SettingsDialog.tsx`.

Change: wrapped body in `<SettingsDialog title="Trigger" description=... onClose={router.history.back}>`. Added `useRouter` import.

Next 1 Step: Step 19, refactor `src/routes/settings.lighting.tsx` to use SettingsDialog.
