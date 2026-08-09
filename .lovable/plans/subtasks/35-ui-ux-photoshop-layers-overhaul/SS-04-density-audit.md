# SS-04 - Density + overlap audit

Slug: density-audit
Parent: 35-ui-ux-photoshop-layers-overhaul
Status: pending
Created: 2026-07-15

## Scope

Screen-by-screen visual audit at 1280x800 and 1920x1080 for:
`/`, `/setup`, `/setup/roi`, `/setup/reference`, `/projects`,
`/projects/:id`, `/projects/:id/rulesets`, `/projects/:id/rulesets/:id`,
`/trial-run`, `/ai-testing`, `/settings`, `/settings/camera`,
`/settings/trigger`, `/settings/lighting`, `/settings/license`,
`/run`, `/results`, `/errors`, `/ops`.

Output: `.lovable/memory/v2/plan35/00-density-audit.md` with one row
per screen: (viewport, overlap? y/n, duplicate-border? y/n, screenshot
path). Screenshots via Playwright to `/tmp/browser/plan35/*.png`.

## Fix pass

Any row flagged fixes SectionTopBar, HmiShell, or the offending panel
per Command 11 guardrails.
