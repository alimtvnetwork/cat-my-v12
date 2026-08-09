# Step 17: settings.camera adopts SettingsDialog

Root cause: `src/routes/settings.camera.tsx` rendered `CameraPreview` directly inside `HmiShell` with no locked dialog chrome, so SS-01 adoption (header/description/Escape-close contract) was unmet.

Files read: `src/routes/settings.camera.tsx`, `src/components/hmi/SettingsDialog.tsx`, `SS-01-settings-dialog-adoption.md`.

Change: wrapped `CameraPreview` in `<SettingsDialog title="Camera" description=... onClose={() => router.history.back()}>`. Added `useRouter` import.

Verification: file compiles against SettingsDialog exported from `src/components/hmi/index.ts` line 17.

Next 1 Step: Step 18, refactor `src/routes/settings.trigger.tsx` to use SettingsDialog.
