# Task 09 — Version display during run

Slug: pattern-search-and-ui-improvement - Task 09

Status: DONE — wave 3 diff-verified 31-Oct-26 (VER pill in StatusBar left cluster, VITE_APP_VERSION injected from version.json at build time, version.json untouched at 4.112.17); caveats for parent: define-through-Lovable-wrapper unverified until build (E2E must assert chip value; "unknown" = define failed), and StatusBar defaults hidden on fresh installs (showStatusBar default in ui-prefs-store, outside box) so the chip is not visible on every fresh launch until toggled — needs a default decision, not a silent flip.

## Spec

Spec file 03 §5 (version display).

## Scope

- Render the app version in StatusBar or HeaderActions via build-time
  injection (vite.config.ts defines no VITE_APP_VERSION today).
- Reconcile version.json 4.112.17 with the release line (branch reports
  v4.112.20; remote releases reach v4.113.7) before the next release.
- Installer APP_VERSION plumbing must not default to "unknown".
- Respect the version-sync checker
  (.agents/scripts/14-version-sync-checker.py): version.json,
  package.json, and changelog parity.

## File box (disjoint)

`src/components/hmi/StatusBar.tsx` or
`src/components/hmi/titlebar-parts.tsx`, `vite.config.ts` (version
injection only), `version.json` (read-only unless release),
`packaging/installers/*` (APP_VERSION plumbing). No package.json version
field (release process owns it).

## Acceptance

- [ ] Version visible in the run UI on every launch.
- [ ] Installed builds record a real version, never "unknown".
- [ ] Version-sync checker passes.
