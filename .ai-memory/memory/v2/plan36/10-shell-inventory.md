# Plan 36 current shell inventory

Version: v3.212.0
Source: `rg -n 'HmiShell|GlobalNav|ModeHeader|AppShell' src/routes/ src/components/`.

## Shell components (`src/components/hmi/`)

- `HmiShell.tsx` (52 lines): props include `title`, wraps children. Not a
  layout route; it is a component every leaf renders inline.
- `GlobalNav.tsx` (63 lines).
- `ModeHeader.tsx` (20 lines).
- Sibling widgets used inside shells: `ActionBar.tsx`, `Counter.tsx`,
  `MachineFrame.tsx`, `RunButton.tsx`, `SettingsDialog`, `CameraPreview`,
  `DeviceDiscoveryPanel`, `FeatureGate`.

## Routes that mount `HmiShell` (13 files, verified `grep -c`)

- `src/routes/index.tsx:75`
- `src/routes/ops.tsx:3`
- `src/routes/errors.tsx:3`
- `src/routes/results.tsx:3`
- `src/routes/run.tsx:3`
- `src/routes/trial-run.tsx:52`
- `src/routes/settings.index.tsx:155`
- `src/routes/settings.camera.tsx:17`
- `src/routes/settings.trigger.tsx:17`
- `src/routes/settings.lighting.tsx:3`
- `src/routes/projects.index.tsx:150`
- `src/routes/projects.$projectId.tsx:31 / 53 / 68` (three branches).
- `src/routes/projects.$projectId.index.tsx:1`

## Routes NOT using `HmiShell`

- `src/routes/__root.tsx` (root).
- `src/routes/diagnostics.tsx`, `src/routes/ai-testing.tsx`, `src/routes/api/*`.
- New: `src/routes/admin.security.denial-burst.tsx` (Plan 51 slice v3.211.0)
  renders its own bare frame; should adopt AppShell in Plan 36 slice-1.

## Providers in `__root.tsx` RootComponent

`QueryClientProvider` -> `<Outlet />` + `<BugErrorModal />` + `<ErrorDialogProvider />`. No theme provider, no toast root, no shell chrome at the layout level.
