# Spec: Branch and UI Fixes in CAT MY Project

**Slug:** branch-and-ui-fixes-in-cat-my-project
**Branch under review:** fix/15-oct-26-joy-release-workflow (author: YeasinKabirJoy, aka "Yasin")
**Branch HEAD (at spec writing):** 5d86dd77 — "fix(ui): remove GlobalSitemapBar from modern mode titlebar" (2026-10-16 02:14 +0600)
**Baseline:** origin/main at 1a22bbc4 ("relase workflow fix v1", 2026-10-15)
**Repo:** cat-my-v12
**Date:** 2026-10-16

## User Request (Verbatim)

Find the latest branch that Yasin had worked on in Cat MY project (via Gitmap LB, which shows the latest branch automatically). Switch to that branch, find the recent changes and UI fixes, and see if any other issues or anything can be improved. Also confirm that the installer has improved using the area2C, like the Gitmap or the Antigravity Manager (AGM) package. Also, the installation needs to pin to the Windows Start menu, and there are a lot of UI glitches like menu hover issue. A lot of things — this should be in the spec that was requested to fix. Check how many is fixed, how many is pending.

## Confirmed Task Breakdown

| ID | Task | State |
|----|------|-------|
| Task-01 | Find Yasin's latest branch via Gitmap LB | DONE — `gitmap lb` → fix/15-oct-26-joy-release-workflow (5d86dd77, 2026-10-16) |
| Task-02 | Switch to that branch | DONE — checked out `fix/15-oct-26-joy-release-workflow` tracking origin |
| Task-03 | Identify recent changes and UI fixes | IN PROGRESS — 2 discovery agents running (UI + installer) |
| Task-04 | Check fixed vs pending against the requested fix spec | IN PROGRESS — spec source: 02-spec/24-app-ui-design-system/09-UI-improvements-v2.md + 10-UI-improvements-v3.md |
| Task-05 | Confirm installer improvements (area2C, Gitmap, AGM package) | IN PROGRESS — installer agent running |
| Task-06 | Ensure installation pins to Windows Start menu | IN PROGRESS — installer agent verifying |
| Task-07 | Address remaining UI glitches (menu hover etc.) | QUEUED |
| Task-08 | Write this spec + enqueue plan task | IN PROGRESS |
| Task-09 | Commit and push | QUEUED |

## Branch commits ahead of origin/main (12)

1. 1a22bbc4 relase workflow fix v1 (baseline — already on main)
2. 3fd738d7 fix(release): generate route tree before typecheck
3. 7234dc57 fix(installer): mark shell installer executable
4. b421c9a8 fix(release): correct PyInstaller inventory quoting
5. 7ffe1409 fix(packaging): resolve PyInstaller entries from repo root
6. 25ff918c fix(release): normalize checksum manifest line endings
7. 403942f8 fix(release): generate valid PowerShell installer
8. d598593d fix(release): ship and verify complete local app
9. 37f83c67 fix(release): restore optional code signing
10. 15b476cd fix guided simulation and desktop release workflow
11. 038d6003 fix(ui): remove duplicate ModernMainNav from modern mode titlebar
12. 5d86dd77 fix(ui): remove GlobalSitemapBar from modern mode titlebar

Commits 2–10 are installer/release-workflow fixes. Commits 11–12 are UI fixes (the current UI-fix pass).

## Fixed vs Pending (against 02-spec/24-app-ui-design-system fix request)

### UI — on Yasin's branch

| Fix request item | Status | Evidence |
|---|---|---|
| Duplicate header/nav in modern mode | **FIXED** | 038d6003 (removed duplicate ModernMainNav) + 5d86dd77 (removed GlobalSitemapBar from modern titlebar); modern titlebar = one dropdown TopMenuBar + utility cluster. `ModernMainNav`: zero remnants repo-wide |
| Menu hover jitter (SH-08 / issue 17) | **FIXED** | Closed 2026-07-18; current code uses color-only hovers (`hover:bg-ca-panel-2` in TopMenuRows.tsx), `transition-colors` only — stationary-hover rule holds |
| RunButton hover no-op (spec trap) | **FIXED** | RunButton.tsx now uses `hover:brightness-110`; `--ca-select` no longer duplicates primary; all `hover:bg-ca-select` usages tinted (`/40`, `/25`, `/15`) |
| `--font-hmi-display` undeclared (spec trap) | **FIXED** | Now defined (src/styles.css:117) |
| Orphan `--ca-accent` — 16 dead Tailwind classes | **FIXED (this session)** | Added `--color-ca-accent: var(--ca-accent, #2563eb)` theme token in src/styles.css; repairs `bg-ca-accent` progress bar (BatchEvalProgress.tsx:39), CTA background (VisionEmptyState.tsx:51), tool highlight (VisionDrawingToolbar.tsx:69), dead focus rings + `accent-ca-accent` (a11y) |
| Orphan `text-hmi-h3` — headings unstyled | **FIXED (this session)** | Added `--text-hmi-h3: var(--text-hmi-title)` in src/styles.css (aliases the canonical h2/h3 token); fixes EmptyState.tsx:98, RuleEditor.tsx:63, RuleMetadataBar.tsx:177 |
| Issue 16: project create flow edge cases | PENDING (open) | Open GitHub issue |
| Issue 27: properties panel + X/Y badges look | PENDING (open) | Open GitHub issue |
| Issue 34: rule-set toolbar zero padding | PENDING (open) | Open GitHub issue |
| Issue 37: right rail not collapsible/hideable | PENDING (open) | Open GitHub issue |
| Issue 40: properties+layers clip/overlap | PENDING (in-progress) | Turn 1 of 7 landed |
| v3 matrix leftovers (SU-04 lighting placeholder PARTIAL, SU-06 YAML parity MISSING, PS-04 ERD PARTIAL; PS-01/02/03, SU-07, PR-06/07) | PENDING / DEFERRED | Unchanged by this branch |
| HeaderCrumbs dead props (`showBreadcrumb`, `program` ignored) | PENDING (cleanup candidate) | titlebar-parts.tsx:64-76; left as-is — removing changes the Titlebar contract, no error impact |
| `--shadow-hmi-glow` hardcoded blue halo (spec trap) | PENDING | src/styles.css:113; won't follow accent reskin |
| View Transitions declared but never run | PENDING | src/styles.css:4916-4927; zero `document.startViewTransition()` call sites |
| Two shells coexist (HmiShell + StandardAppShell) | PENDING | Route→shell mapping still not centrally documented |

### Installer — on Yasin's branch

| Item | Status | Evidence |
|---|---|---|
| Route tree before typecheck | **FIXED** | 3fd738d7 — .github/workflows/release.yml |
| Shell installer executable bit | **FIXED** | 7234dc57 — packaging/installers/install.sh |
| PyInstaller inventory quoting | **FIXED** | b421c9a8 — release.yml |
| PyInstaller entries from repo root | **FIXED** | 7ffe1409 — db-bootstrap.spec, retention-run.spec |
| Checksum manifest line endings | **FIXED** | 25ff918c — SHA256SUMS |
| Valid PowerShell installer + pwsh syntax gate | **FIXED** | 403942f8 — release.yml |
| Complete local app shipped/verified | **FIXED** | d598593d — backend-server.spec/backend-server.py |
| Optional code signing restored | **FIXED** | 37f83c67 — release.yml |
| Desktop release workflow (zip + install scripts) | **FIXED** | 15b476cd — packaging/desktop/install.ps1, install.sh, start.ps1, start.sh |
| Windows Start menu **pinning** | **FIXED (this session)** | Added best-effort `Pin to Start` Shell verb to packaging/desktop/install.ps1 (previously only a Programs-folder shortcut existed; true pinning was MISSING — zero hits for `Pin to Start`/`Shell.Application` verbs across the repo) |
| Installer via **area2C** | **CANNOT CONFIRM** | Zero hits for "area2C" across the repo (code, config, specs) — the term appears only in this session's spec/plan docs quoting the user's instruction. Needs the user's definition of what area2C is |
| Gitmap / AGM package installer parity | **NOT EVIDENCED** | Zero references to Antigravity/AGM or gitmap installer packages in packaging/, release.yml, 02-spec/, docs/; no NSIS/WiX/MSIX configs. The installer is a custom GitHub-release-zip + script design, unrelated to Gitmap/AGM packages |
| Installer spec gaps (77-cli-powershell-and-release, 79-installer-retention-timing — both draft v0.1) | PENDING | Describe a different CLI-centric architecture (PATH junction, install.json manifest, doctor, -Uninstall, retention task registration) that packaging/desktop/* does not implement: no uninstall path, no SHA256 verification at install time, no PATH entry, no install.json manifest |

## Follow-ups needing the user

1. **Define "area2C"** — nothing in the repo matches this name; cannot confirm any installer improvement using it without a definition.
2. **Gitmap/AGM package parity** — not implemented anywhere in the repo; if there is a reference implementation, point to it.

## Acceptance Criteria

1. Every UI glitch named in 02-spec/24-app-ui-design-system/09-UI-improvements-v2.md and 10-UI-improvements-v3.md is classified FIXED or PENDING with evidence.
2. The two titlebar UI fixes (038d6003, 5d86dd77) are verified in code.
3. Installer area2C improvements are confirmed and described.
4. Windows Start menu pinning is confirmed implemented (file + mechanism) or explicitly flagged MISSING.
5. Remaining addressable issues get concrete improvement tasks; all changes committed and pushed on this branch.
