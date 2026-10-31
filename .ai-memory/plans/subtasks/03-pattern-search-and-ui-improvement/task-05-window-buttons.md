# Task 05 — Window buttons

Slug: pattern-search-and-ui-improvement - Task 05

Status: PARTIAL (window controls landed 31-Oct-26; minimize deliberately not rendered — no web API can minimize and spec forbids fake shims; real minimize awaits AI-01 shell decision with hook point left; maximize fullscreen toggle + close with fallback chip in titlebar-parts.tsx; E2E browser verification UNVERIFIED, no browser on VM).

## Spec

Spec file 03 §1 (window controls), §13 (worker boxes).

## Scope

- As-built truth: no OS window controls exist (web app in a --app=
  browser window; chromium-shell is a Chrome extension, not a shell).
  Never ship dead buttons.
- Panel chrome (the controls that do exist): unify or explicitly bridge
  the two panel systems (palette-store vs workspace layout); fix the
  hidden-mode dead end; make stale persisted layout resettable.
- Shell decision (AI-01, still unresolved): document browser-chrome
  reliance vs a real shell IPC contract as a written decision, never
  assume Tauri/Electron.

## File box (disjoint)

- Window-controls worker: `src/components/hmi/Titlebar.tsx`,
  `src/components/hmi/titlebar-parts.tsx` (new controls only), new
  shell-IPC module if created. No app-shell panel system, no run files,
  no packaging.
- Panel-chrome worker: `src/components/app-shell/PaletteFrame.tsx`,
  `src/lib/stores/palette-store.ts`,
  `src/components/app-shell/panels/MinimizedRail.tsx`. No workspace
  layout files.
- Window-menu worker: `src/components/app-shell/WindowMenu.tsx`,
  `src/components/nav/WindowMenubarGroup.tsx`,
  `src/lib/workspace/layout-slice.ts`,
  `src/lib/workspace/panel-registry.ts`. No palette-store.
- Sequence app-shell edits before 02-cicd-remediation SS-04 regenerates
  visual baselines.

## Acceptance

- [ ] Close/minimize/maximize behave per the written shell decision, or
  the decision documents browser-chrome reliance with no dead buttons.
- [ ] No hidden panel without a restore path; no stale layout surviving
  a reset.
- [ ] Visual baselines regenerated once, by a single writer.
