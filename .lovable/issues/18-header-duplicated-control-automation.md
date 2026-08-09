# Header duplicates "Control Automation" and wastes vertical space

Slug: header-duplicated-control-automation
Status: closed
Closed: 2026-07-17 (plan 66 SH-01)
Reported: 2026-07-16

## Symptom

The global header repeats the "Control Automation" title/section on every page, and the header itself is tall. There is no breadcrumb and no Back / Forward navigation.

## Expected

- Single compact header row.
- The area currently used by "Control Automation" becomes a page-context breadcrumb.
- Browser-style Back and Forward buttons on the left of the header, wired to router history.

## Fix scope

Plan 64 steps 51-54.

## Resolution

Fix shipped in plan 64 (Titlebar consolidation with inline breadcrumb) and locked in plan 66 SH-01: dead `AppHeader.tsx` was removed and `tests/e2e/playwright_single_header.py` now asserts exactly one shell header and one "Control Automation" wordmark per route. See `tests/reports/e2e-single-header.json`.
