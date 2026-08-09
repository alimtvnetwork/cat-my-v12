# Plan 36 baseline (read-phase)

Version: v3.212.0
Slice: Plan 36 read-phase (`.lovable/plans/pending/60-plan36-app-shell-src-v3-read-phase.md`).

## Scope

Plan 36 file: `.lovable/plans/pending/36-ui-app-shell-and-src-v3-port.md`. Two
threads:

1. App shell (chrome, nav, footer, mode header, settings overlays).
2. Port of a `src-v3/` reference tree into `src/`.

## Current shell entry points

- `src/routes/__root.tsx` provides `RootShell` (html/head/body) plus `RootComponent` mounting `QueryClientProvider`, `<Outlet />`, `<BugErrorModal />`, and (v3.210.0) `<ErrorDialogProvider />`.
- `src/components/hmi/HmiShell.tsx` (52 lines) is the per-page shell used by every leaf route. Rendered inside the component, not the layout, so route-level metadata and shell chrome are decoupled.

## src v3 reference tree

`src-v3/` does NOT exist on disk (verified `ls src-v3` returns "No such file or directory"). Plan 36 wording assumes an external reference we have not received. This is the biggest read-phase blocker: without the source tree, mapping steps 3-4 cannot be completed as written.

Two honest paths for slice-1:

- Ask the user for the `src-v3/` archive location (drop-in folder or zip).
- Treat "src v3 port" as a rename of the current `HmiShell` + hmi/\* into an
  explicit `AppShell` module, since the shipped shell already covers most of
  the plan's target capabilities.

## Spec anchors (grep hits)

`rg -n 'app shell|src v3|chrome'` over `spec/` returned no direct anchor
files this turn. Deferring detailed spec citations until step 2 grep expands
into `spec/21-app/` and `spec/24-app-ui-design-system/`.
