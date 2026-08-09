---
Slug: address-bar-nav
Parent: 82-plan100-ui-v4-100steps
Status: pending
Created: 2026-07-19
---

# Windows-Explorer-style Address Bar

## Goal

Replace duplicated breadcrumbs (issue #31) with a single address-bar-style nav
in the Titlebar. Back/forward buttons on the left, breadcrumb segments as
clickable chips in the middle, path editor (Ctrl+L) that turns the chip strip
into an editable input.

## Files

- `src/components/shell/AddressBar.tsx`
- `src/components/layout/Titlebar.tsx` (mount, remove duplicate breadcrumb)
- Delete or hide the in-page breadcrumb component from Rule Set pages.

## Behavior

- Left cluster: Back, Forward, Up-one-level (`Alt+←`, `Alt+→`, `Alt+↑`).
- Middle: clickable segments derived from `useRouterState().location.pathname`
  - `matches` for human labels.
- `Ctrl+L` focuses an editable input version of the path; Enter navigates.
- No second breadcrumb anywhere below.

## Verification

- Screenshot diff shows only one breadcrumb on `/projects/:id/rulesets/:id`.
- Keyboard-only navigation via Back/Forward works.
