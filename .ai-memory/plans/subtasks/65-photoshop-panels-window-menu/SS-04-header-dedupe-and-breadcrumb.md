---
Slug: header-dedupe-and-breadcrumb
Status: pending
Created: 2026-07-17
Parent: 65-photoshop-panels-window-menu
---

# SS-04: Collapse to a single header, thin breadcrumb strip

Deliverables:

- Remove the inner "Control Automation + secondary nav" bar (see issue 22, user-uploads://file-24).
- One `Titlebar.tsx`: app mark, breadcrumb slot on the left, WindowMenu + search + Save/Reset/Publish on the right.
- `AppBreadcrumb` becomes an inline component inside Titlebar (not a second bordered strip), 28px tall, `bg-transparent`.
- Worker-offline notice becomes a slim inline strip _inside content_, not a header band, and dismissable.
- Delete/inline duplicate nav in HmiShell.

Verification: at 1920x1080 and 375x812 there is exactly one horizontal bar above the canvas; DOM has a single `<header>` element.
