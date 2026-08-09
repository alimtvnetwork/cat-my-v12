# Project Memory

## Core

Exactly one breadcrumb in the app shell. `AppBreadcrumb` is mounted only once inside `Titlebar` (inline variant). Never re-add a second breadcrumb row, band, or route-level breadcrumb. Custom class `.app-titlebar-breadcrumb { display: flex }` in `src/styles.css` overrides Tailwind `md:hidden`, so hide/show via conditional rendering, not utility classes.
Notifications: sonner Toaster is pinned to `position="bottom-right"`. Never move it, never render inline mid-page banner "hints"; use a bottom-right sonner toast with `closeButton` and per-key localStorage dismissal.
Selection overlay is the single source of truth for the selected ROI's on-screen name; the canvas renderer must skip the in-shape `${kind} ${name}` label when the rule is selected. Kind-C ROIs must not blur their inner region.

## Memories

- [Header breadcrumb](mem://layout/header-breadcrumb) — one breadcrumb only, mounted in Titlebar
