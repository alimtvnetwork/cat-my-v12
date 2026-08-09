---
name: Header breadcrumb single-mount
description: Exactly one AppBreadcrumb in the app shell, mounted inline inside Titlebar. Never a second row or band.
type: constraint
---

The app shell renders `AppBreadcrumb` exactly once, inline in the left cluster of `src/components/hmi/Titlebar.tsx`. Do not add:

- A second `<AppBreadcrumb />` (mobile band, secondary row, etc.).
- A route-level breadcrumb inside any `src/routes/*` file.
- A `<Breadcrumb />` legacy component render.

**Why:** The custom class `.app-titlebar-breadcrumb { display: flex }` in `src/styles.css` (line ~2001) overrides Tailwind's `md:hidden`, so a `md:hidden` mobile-band breadcrumb still renders at every viewport width. Users saw the same crumbs stacked twice. Fix is single-mount only.

**How to apply:** If a mobile-only breadcrumb behavior is ever needed, control it via conditional React rendering keyed off viewport (`useMediaQuery`) rather than Tailwind display utilities, and dismount the desktop copy.
