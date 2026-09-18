# Issue 22: Duplicated header sections still present

Status: closed
Closed: 2026-07-17 (plan 66 SH-01)
Created: 2026-07-17

Symptom: Screenshot user-uploads://file-24 shows two header bands: the outer Titlebar with app name + top nav (Home / Project / Setup / Rules / Test / Run / Settings / Help) AND an inner bar with the breadcrumb + worker-offline banner. Together they read as two competing headers.

Expected: One Titlebar. Breadcrumb sits directly under it as a thin (28-32px) strip, not as a second bordered section. Status banners (worker offline) are toasts or a slim inline strip inside the content area, not a second header.

Actual: Titlebar + full-width bordered breadcrumb+banner = two headers stacked.

Related files:

- src/components/app-shell/Titlebar.tsx
- src/components/app-shell/AppBreadcrumb.tsx
- src/components/hmi/HmiShell.tsx

## Resolution

Verified: only one `header[data-app-shell="true"]` mounts across `/`, `/setup`, `/setup/rules`, `/projects`, `/run`, `/trial-run` (see `tests/reports/e2e-single-header.json` and screenshots under `tests/reports/screenshots/plan66/03-single-header/after/`). The orphaned `src/components/app-shell/AppHeader.tsx` that also carried `data-app-shell="true"` (and could have re-introduced a duplicate if any route imported it) was deleted. The new `tests/e2e/playwright_single_header.py` locks the invariant so any regression fails CI.
