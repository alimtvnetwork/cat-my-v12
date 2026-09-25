---
Slug: home-workflow
Status: pending
Created: 2026-07-17
Parent: 65-photoshop-panels-window-menu
---

# SS-05: Home screen numbered workflow

Deliverables:

- `src/components/home/GettingStarted.tsx` — 5-step numbered card: 1) Create project, 2) Capture reference image, 3) Define rules, 4) Test, 5) Deploy. Each step: icon, title, one-line description, primary CTA linking into the flow, "done" state driven by store.
- `src/components/home/RecentProjects.tsx` — grid with thumbnails, last-edited, status pill.
- `src/components/home/Templates.tsx` — curated recipe cards.
- Home layout: single column on mobile, 12-col grid on desktop; matches the professional density tokens.

Verification: Playwright screenshot of `/` at 1440x900 and 375x812; visual review against user-uploads references.
