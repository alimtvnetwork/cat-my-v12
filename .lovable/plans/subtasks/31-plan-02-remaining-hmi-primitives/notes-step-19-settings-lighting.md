# Step 19: settings.lighting adopts SettingsDialog

Root cause: `src/routes/settings.lighting.tsx` rendered `CameraPreview` directly under `HmiShell` without the SS-01 dialog chrome.

Files read: `src/routes/settings.lighting.tsx`.

Change: wrapped body in `<SettingsDialog title="Lighting" description=... onClose={router.history.back}>`. Added `useRouter`.

SS-01 adoption complete across camera + trigger + lighting.

Next 1 Step: Step 20, migrate `src/routes/run.tsx` primary action to the new `RunButton` primitive.
