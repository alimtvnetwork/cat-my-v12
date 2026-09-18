# Step 16: SettingsDialog primitive

Root cause: SS-03 inventory required `hmi/SettingsDialog.tsx` but the file did not exist, blocking SS-01 settings route adoption.

Files read: `src/components/hmi/index.ts`, `src/components/hmi/ConfigPanel.tsx`, `SS-01-settings-dialog-adoption.md`, `notes-step-07-ss03-inventory.md`.

Change: created `src/components/hmi/SettingsDialog.tsx` (forwardRef div with `role="dialog"`, `aria-modal`, header/body/footer sections using ca-panel/ca-border tokens and `hmi-*` type scale). Escape key delegates to `onClose` prop so caller can wire `router.history.back()`. Exported from `src/components/hmi/index.ts`.

Verification: `ls src/components/hmi/` shows `SettingsDialog.tsx`; index.ts now exports both `SettingsDialog` and `SettingsDialogProps`.

Next 1 Step: Step 17, refactor `src/routes/settings.camera.tsx` to render its body inside `SettingsDialog`.
