---
Slug: hide-clipped-floating-notices
Status: active
Created: 2026-07-17
---

# Command: hide clipped floating notices

Verbatim: "If this notification bar is cut, then hide it. There is no need to put it there."

## Scope

All fixed/floating notices, toasts, banners, and cards across the app.

## Rule

If a floating notification's bounding box would extend beyond the viewport (horizontally or vertically) at the current layout, do NOT render it. Never show a half-clipped notice. Route the message through the Error Modal / toast stack per `spec/03-error-manage/` instead.

## Applies when

- Rendering `WorkerHealthBanner` and similar floating status cards.
- Any new fixed-position UI added near the header/breadcrumb.
